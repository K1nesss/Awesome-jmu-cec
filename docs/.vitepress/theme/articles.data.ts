// 构建期读取所有板块文章的 frontmatter，供板块首页的文章列表（ArticleList.vue）使用。
// 新增文章后无需改任何配置；开发模式下增删文件会自动刷新。
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
      })
    }
    return list
  },
})
