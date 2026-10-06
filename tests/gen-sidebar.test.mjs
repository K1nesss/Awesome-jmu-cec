// gen-sidebar 回归测试：用临时目录造一个迷你 docs/，验证标题回退、排序、隐藏、子目录分组与降级
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { genSidebar } from '../scripts/gen-sidebar.mjs'

const SECTIONS = [
  { key: 'baoyan', text: '保研', link: '/baoyan/' },
  { key: 'abroad', text: '留学', link: '/abroad/' },
]

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jc-sidebar-'))
  const w = (p, s) => {
    mkdirSync(join(root, p, '..'), { recursive: true })
    writeFileSync(join(root, p), s)
  }
  w('baoyan/index.md', '---\ntitle: 保研\n---\n# 保研\n')
  w('baoyan/timeline.md', '---\ntitle: 保研时间线\norder: 1\n---\n正文')
  w('baoyan/camp.md', '# 夏令营怎么准备\n正文') // 无 frontmatter：取 H1
  w('baoyan/no-title.md', '正文没有标题') // 取文件名
  w('baoyan/secret.md', '---\ntitle: 隐藏\nhidden: true\n---\n')
  w('baoyan/_draft.md', '# 草稿') // 下划线开头忽略
  w('baoyan/broken.md', '---\ntitle: [坏掉的\n---\n# 坏 frontmatter 的文章\n')
  w('baoyan/experiences/2024-a.md', '---\ntitle: 2024 届经验\nyear: 2024\n---\n')
  w('baoyan/experiences/2025-b.md', '---\ntitle: 2025 届经验\nyear: 2025\n---\n')
  w('abroad/index.md', '# 留学\n') // 只有 index：不生成侧栏
  return root
}

test('生成板块侧栏：标题回退、排序、隐藏与忽略', () => {
  const root = fixture()
  try {
    const sb = genSidebar(root, SECTIONS)
    const items = sb['/baoyan/'][0].items
    const texts = items.map((i) => i.text)
    assert.equal(texts[0], '板块概览')
    assert.equal(texts[1], '保研时间线') // order: 1 排最前
    assert.ok(texts.includes('夏令营怎么准备')) // H1 回退
    assert.ok(texts.includes('no-title')) // 文件名回退
    assert.ok(texts.includes('坏 frontmatter 的文章')) // frontmatter 写坏仍收录
    assert.ok(!texts.includes('隐藏'))
    assert.ok(!texts.some((t) => t.includes('草稿')))
    assert.equal(items.find((i) => i.text === '保研时间线').link, '/baoyan/timeline')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('子目录成为分组：experiences →「经验帖」，按年份倒序', () => {
  const root = fixture()
  try {
    const group = genSidebar(root, SECTIONS)['/baoyan/'][0].items.find((i) => i.items)
    assert.equal(group.text, '经验帖')
    assert.deepEqual(group.items.map((i) => i.text), ['2025 届经验', '2024 届经验'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('没有文章的板块、不存在的板块不生成侧栏', () => {
  const root = fixture()
  try {
    const sb = genSidebar(root, [...SECTIONS, { key: 'nope', text: '不存在', link: '/nope/' }])
    assert.equal(sb['/abroad/'], undefined)
    assert.equal(sb['/nope/'], undefined)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
