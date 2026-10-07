// 构建时从 GitHub 读取「提问」issue 与贡献者，写进页面（不在读者浏览器里请求 GitHub）。
//   - 读者打开页面不访问 GitHub：不受 GitHub 接口频率限制，国内网络也能正常显示
//   - 页面内容随构建更新：有人提问 / 关闭提问时，.github/workflows/rebuild-on-issues.yml 会触发 Cloudflare 重新构建
//   - 任何一步失败都不让构建失败：拿不到数据时，对应列表显示「暂时无法加载」并给出 GitHub 链接
// 令牌：Cloudflare Pages 环境变量 GITHUB_READ_TOKEN（只读即可）；没有令牌也能用，但每小时只能请求 60 次。
// 设置 JC_OFFLINE=1 可完全跳过网络请求（本地调试、测试用）；
// 设置 JC_QUESTIONS_FIXTURE=<json 文件> 可用一组假的 issue 代替真实提问，本地预览问答页样式用。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const OWNER = 'K1nesss'
export const REPO_NAME = 'Awesome-jmu-cec'
export const QUESTION_LABEL = '提问'

const API = 'https://api.github.com'
const TIMEOUT_MS = 15000

let tokenRejected = false

async function gh(path, token) {
  // 令牌失效（过期、被撤销）时退回未登录请求，构建照常，只在日志里提示
  if (token && tokenRejected) token = ''
  const res = await fetch(API + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'awesome-jmu-cec-build',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 401 && token) {
    if (!tokenRejected) console.warn('⚠️ GITHUB_READ_TOKEN 无效或已过期，改为未登录读取。请在 Cloudflare Pages 里更新这个变量')
    tokenRejected = true
    return gh(path, '')
  }
  if (!res.ok) throw new Error(`GitHub ${path} 返回 ${res.status}`)
  return res.json()
}

// ---------- 提问 ----------

/**
 * 从 issue 表单生成的正文里取出某个字段的内容。
 * 表单提交后正文形如「### 板块\n\n保研\n\n### 问题详情\n\n……」
 */
export function formField(body, label) {
  if (!body) return ''
  const parts = body.split(/^###\s+/m)
  for (const part of parts) {
    const nl = part.indexOf('\n')
    if (nl < 0) continue
    if (part.slice(0, nl).trim() === label) {
      const v = part.slice(nl + 1).trim()
      return v === '_No response_' ? '' : v
    }
  }
  return ''
}

/** Markdown 正文转成一行纯文本摘要（只在页面上显示文字，不渲染任何 HTML） */
export function plainExcerpt(md, max = 90) {
  const text = String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '［图片］')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, ' ') // 列表符号
    .replace(/[`*_~]+/g, '') // 加粗、斜体、删除线、行内代码的符号直接去掉，不留空格
    .replace(/[>#|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

/**
 * 把 GitHub issue 转成页面需要的字段。
 * @param {object} issue GitHub API 返回的 issue
 * @param {{ key: string, text: string }[]} sections 板块列表（按板块名对应到目录名）
 */
export function toQuestion(issue, sections) {
  const sectionText = formField(issue.body, '板块')
  const section = sections.find((s) => s.text === sectionText)?.key ?? ''
  // 用表单提交的取「问题详情」（没填就没有摘要）；不是用表单写的 issue 取整个正文
  const isForm = /^###\s+问题详情\s*$/m.test(issue.body || '')
  const detail = isForm ? formField(issue.body, '问题详情') : issue.body || ''
  return {
    number: issue.number,
    title: String(issue.title || '').replace(/^\s*\[提问\]\s*/, '').trim() || '（无标题）',
    url: issue.html_url,
    section,
    excerpt: plainExcerpt(detail),
    comments: issue.comments || 0,
    created: Date.parse(issue.created_at) || 0,
    updated: Date.parse(issue.updated_at) || 0,
  }
}

async function fetchQuestions(token, sections) {
  if (process.env.JC_QUESTIONS_FIXTURE) {
    const list = JSON.parse(readFileSync(process.env.JC_QUESTIONS_FIXTURE, 'utf8'))
    return list.filter((it) => !it.pull_request && it.state !== 'closed').map((it) => toQuestion(it, sections))
  }
  const out = []
  for (let page = 1; page <= 5; page++) {
    const list = await gh(
      `/repos/${OWNER}/${REPO_NAME}/issues?state=open&labels=${encodeURIComponent(QUESTION_LABEL)}&sort=created&direction=desc&per_page=100&page=${page}`,
      token,
    )
    for (const it of list) if (!it.pull_request) out.push(toQuestion(it, sections))
    if (list.length < 100) break
  }
  return out
}

// ---------- 贡献者 ----------

/** 是否列入贡献者墙：去掉机器人账号和 exclude 名单里的账号（不区分大小写） */
export function keepContributor(c, exclude) {
  if (!c?.login) return false
  if (c.type === 'Bot' || /\[bot\]$/i.test(c.login)) return false
  return !exclude.some((x) => String(x).toLowerCase() === c.login.toLowerCase())
}

async function fetchContributors(token, exclude, cacheDir) {
  const list = await gh(`/repos/${OWNER}/${REPO_NAME}/contributors?per_page=100`, token)
  const people = list.filter((c) => keepContributor(c, exclude))
  const avatarDir = join(cacheDir, 'avatars')
  mkdirSync(avatarDir, { recursive: true })
  // 头像下载到本站一起发布（GitHub 头像服务器在国内经常很慢）；下载失败时页面退回 GitHub 地址
  return Promise.all(
    people.map(async (c) => {
      const remote = `${c.avatar_url}${c.avatar_url.includes('?') ? '&' : '?'}s=96`
      let local = ''
      try {
        const res = await fetch(remote, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (res.ok) {
          const type = res.headers.get('content-type') || ''
          const ext = type.includes('png') ? 'png' : type.includes('gif') ? 'gif' : type.includes('webp') ? 'webp' : 'jpg'
          const name = `${c.login.toLowerCase()}.${ext}`
          writeFileSync(join(avatarDir, name), Buffer.from(await res.arrayBuffer()))
          local = `/avatars/${name}`
        }
      } catch {}
      return { login: c.login, url: c.html_url, avatar: remote, local, contributions: c.contributions }
    }),
  )
}

// ---------- 入口 ----------

/**
 * 读取提问与贡献者。两部分互不影响，一部分失败另一部分照常显示。
 * 结果同时写入 cacheDir/github-data.json，供 buildEnd 复制头像时使用。
 */
export async function loadGitHubData({ sections, exclude = [], cacheDir }) {
  const token = process.env.GITHUB_READ_TOKEN || ''
  const data = { fetchedAt: Date.now(), questions: null, contributors: null }
  if (process.env.JC_OFFLINE) return save(data)

  const [q, c] = await Promise.allSettled([fetchQuestions(token, sections), fetchContributors(token, exclude, cacheDir)])
  if (q.status === 'fulfilled') data.questions = q.value
  else console.warn(`⚠️ 读取提问失败，问答列表将显示为「暂时无法加载」：${q.reason?.message || q.reason}`)
  if (c.status === 'fulfilled') data.contributors = c.value
  else console.warn(`⚠️ 读取贡献者失败，关于页将不显示头像墙：${c.reason?.message || c.reason}`)

  if (!token) console.warn('ℹ️ 未设置 GITHUB_READ_TOKEN，以未登录身份读取 GitHub（每小时 60 次上限）')
  return save(data)

  function save(d) {
    try {
      mkdirSync(cacheDir, { recursive: true })
      writeFileSync(join(cacheDir, 'github-data.json'), JSON.stringify(d))
    } catch {}
    return d
  }
}

/** buildEnd 用：把下载好的头像复制进构建输出 */
export function readCachedData(cacheDir) {
  const f = join(cacheDir, 'github-data.json')
  if (!existsSync(f)) return null
  try {
    return JSON.parse(readFileSync(f, 'utf8'))
  } catch {
    return null
  }
}
