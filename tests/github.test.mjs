// 构建时读取 GitHub 数据的解析逻辑（不访问网络）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formField, keepContributor, plainExcerpt, toQuestion } from '../scripts/github.mjs'

const SECTIONS = [
  { key: 'baoyan', text: '保研' },
  { key: 'kaogong', text: '考公·选调' },
]

// issue 表单提交后的正文格式
const BODY = '### 板块\n\n保研\n\n### 问题详情\n\n绩点排名 **前 20%** 能保研吗？\n\n见 [通知](https://example.com)。'

test('从表单正文取字段；未填写的字段为空', () => {
  assert.equal(formField(BODY, '板块'), '保研')
  assert.match(formField(BODY, '问题详情'), /^绩点排名/)
  assert.equal(formField('### 板块\n\n_No response_', '板块'), '')
  assert.equal(formField('随手写的正文', '板块'), '')
  assert.equal(formField(null, '板块'), '')
})

test('摘要只保留纯文本：去掉标记、HTML、代码块，过长截断', () => {
  assert.equal(plainExcerpt('**加粗** 和 [链接](https://x) <b>标签</b>\n\n```\ncode\n```'), '加粗 和 链接 标签')
  assert.equal(plainExcerpt('![截图](./a.png) 看图'), '［图片］ 看图')
  assert.equal(plainExcerpt('夏令营**必须**有推荐吗'), '夏令营必须有推荐吗', '加粗符号不留空格')
  assert.equal(plainExcerpt('- 2026-10-15 报名\n- 3. 面试'), '2026-10-15 报名 3. 面试', '日期里的短横线保留')
  const long = plainExcerpt('字'.repeat(200), 10)
  assert.equal(long, '字'.repeat(10) + '…')
})

test('issue 转为提问：去掉标题前缀、按板块名对应目录、没选板块时为空', () => {
  const q = toQuestion(
    { number: 7, title: '[提问] 绩点要求', html_url: 'https://github.com/x/y/issues/7', body: BODY, comments: 2, created_at: '2026-10-06T08:00:00Z', updated_at: '2026-10-07T08:00:00Z' },
    SECTIONS,
  )
  assert.equal(q.title, '绩点要求')
  assert.equal(q.section, 'baoyan')
  assert.equal(q.comments, 2)
  assert.equal(q.excerpt, '绩点排名 前 20% 能保研吗？ 见 通知。')
  assert.equal(q.created, Date.parse('2026-10-06T08:00:00Z'))

  const other = toQuestion({ number: 8, title: '随便问问', body: '### 板块\n\n不确定 / 其他\n\n### 问题详情\n\n内容' }, SECTIONS)
  assert.equal(other.section, '')
  assert.equal(other.excerpt, '内容')

  const skipped = toQuestion({ number: 9, title: 'x', body: '### 板块\n\n保研\n\n### 问题详情\n\n_No response_' }, SECTIONS)
  assert.equal(skipped.excerpt, '', '表单里没填问题详情时不把表单标题当摘要')
  assert.equal(toQuestion({ number: 10, title: 'x', body: '直接写的正文' }, SECTIONS).excerpt, '直接写的正文')
})

test('贡献者：去掉机器人和 exclude 名单（不区分大小写）', () => {
  const ex = ['Claude']
  assert.equal(keepContributor({ login: 'K1nesss', type: 'User' }, ex), true)
  assert.equal(keepContributor({ login: 'claude', type: 'User' }, ex), false)
  assert.equal(keepContributor({ login: 'dependabot[bot]', type: 'Bot' }, ex), false)
  assert.equal(keepContributor({ login: 'renovate[bot]', type: 'User' }, ex), false)
  assert.equal(keepContributor({}, ex), false)
})

test('读取数据（模拟 GitHub）：头像下载到缓存目录；提问失败不影响贡献者', async () => {
  const { mkdtempSync, readFileSync, existsSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { loadGitHubData } = await import('../scripts/github.mjs')
  const cacheDir = mkdtempSync(join(tmpdir(), 'jc-gh-'))
  const realFetch = globalThis.fetch
  const realWarn = console.warn
  console.warn = () => {}
  globalThis.fetch = async (url) => {
    url = String(url)
    if (url.includes('/issues')) return new Response('boom', { status: 500 })
    if (url.includes('/contributors'))
      return Response.json([
        { login: 'Alice', type: 'User', html_url: 'https://github.com/Alice', avatar_url: 'https://avatars.example/u/1?v=4', contributions: 5 },
        { login: 'claude', type: 'User', html_url: 'https://github.com/claude', avatar_url: 'https://avatars.example/u/2?v=4', contributions: 9 },
        { login: 'Bob', type: 'User', html_url: 'https://github.com/Bob', avatar_url: 'https://avatars.example/u/3?v=4', contributions: 1 },
      ])
    if (url.includes('/u/1')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } })
    return new Response('nope', { status: 404 }) // Bob 的头像下载失败
  }
  try {
    const data = await loadGitHubData({ sections: SECTIONS, exclude: ['claude'], cacheDir })
    assert.equal(data.questions, null)
    assert.deepEqual(data.contributors.map((c) => c.login), ['Alice', 'Bob'])
    const [alice, bob] = data.contributors
    assert.equal(alice.local, '/avatars/alice.png')
    assert.equal(alice.avatar, 'https://avatars.example/u/1?v=4&s=96')
    assert.ok(existsSync(join(cacheDir, 'avatars', 'alice.png')))
    assert.equal(bob.local, '', '下载失败时退回 GitHub 地址')
    assert.deepEqual(JSON.parse(readFileSync(join(cacheDir, 'github-data.json'), 'utf8')).contributors.length, 2)
  } finally {
    globalThis.fetch = realFetch
    console.warn = realWarn
  }
})
