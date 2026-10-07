// 构建期读取所有板块文章的 frontmatter，供板块首页的文章列表（ArticleList.vue）使用。
// 新增文章后无需改任何配置；开发模式下增删文件会自动刷新。
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createContentLoader } from 'vitepress'
import { SECTIONS } from '../sections'

export type ArticleType = 'guide' | 'experience'

export interface Article {
  url: string
  section: string // 板块 key，如 baoyan
  title: string
  type: ArticleType
  year: number | null
  author: string
  summary: string
  order: number
  updated: number // 最后更新时间（毫秒），用于首页「最近更新」
}

// 最后更新时间：优先取 git 最后一次提交时间（与页面底部「更新于」同源），
// 拿不到（新文件尚未提交、构建环境没有 git 历史）时退回文件修改时间
function lastUpdated(file: string): number {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (out) return Number(out) * 1000
  } catch {}
  try {
    return statSync(file).mtimeMs
  } catch {
    return 0
  }
}

// 文章 URL → 源文件路径（cleanUrls：/baoyan/timeline → docs/baoyan/timeline.md）
const SRC_DIR: string = (globalThis as any).VITEPRESS_CONFIG?.srcDir ?? resolve('docs')
function sourceFile(url: string): string {
  const p = decodeURIComponent(url).replace(/^\//, '').replace(/\.html$/, '')
  const md = join(SRC_DIR, `${p}.md`)
  return existsSync(md) ? md : join(SRC_DIR, p, 'index.md')
}

declare const data: Article[]
export { data }

const SECTION_KEYS = new Set(SECTIONS.map((s) => s.key))

export default createContentLoader('*/**/*.md', {
  includeSrc: true,
  transform(raw): Article[] {
    const list: Article[] = []
    for (const page of raw) {
      const fm = page.frontmatter || {}
      const segs = page.url.split('/').filter(Boolean)
      const section = segs[0]
      const file = segs[segs.length - 1] || ''
      // 跳过：非板块目录、各级 index（URL 以 / 结尾）、下划线开头的草稿、hidden
      if (!SECTION_KEYS.has(section) || page.url.endsWith('/') || file.startsWith('_') || fm.hidden === true) continue
      const h1 = page.src?.match(/^#\s+(.+?)\s*$/m)
      // 经验帖：type 显式写明，或放在 experiences/ 子目录下
      const type: ArticleType = fm.type === 'experience' || segs.includes('experiences') ? 'experience' : 'guide'
      list.push({
        url: page.url,
        section,
        title: String(fm.title || (h1 && h1[1]) || file),
        type,
        year: Number(fm.year) || null,
        author: fm.author ? String(fm.author) : '',
        summary: String(fm.summary || fm.description || ''),
        order: Number.isFinite(Number(fm.order)) ? Number(fm.order) : 999,
        updated: lastUpdated(sourceFile(page.url)),
      })
    }
    return list
  },
})
