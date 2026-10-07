// 侧栏自动生成：扫描 docs/<板块>/ 下的 .md，读 frontmatter，产出 VitePress 多侧栏对象。
// 贡献者新增文章 = 新建一个 .md，无需改任何配置。
//
// 规则：
//   - 只处理传入的板块目录（config.mts 从 sections.ts 传入）；板块没有任何文章时不生成侧栏（保持无侧栏的简洁版式）
//   - 页面标题：frontmatter.title → 正文第一个「# 标题」→ 文件名
//   - 侧栏短标题：frontmatter.sidebarTitle 优先
//   - 排序：frontmatter.order（默认 999）升序；同值时经验帖按 year 倒序，其余按文件名
//   - 子目录成为可折叠分组（如 baoyan/experiences/ →「经验帖」），分组标题取子目录 index.md 的 title
//   - hidden: true 不进侧栏（页面仍可访问）；以 _ 开头的文件忽略
//   - 任何异常都降级为“没有侧栏”，绝不让构建失败
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

// 常见子目录的默认分组名（子目录 index.md 写了 title 时以 title 为准）
const GROUP_NAMES = { experiences: '经验帖' }

function readPage(file, name) {
  let data = {}
  let content = ''
  try {
    const parsed = matter(readFileSync(file, 'utf8'))
    data = parsed.data || {}
    content = parsed.content
  } catch {
    // frontmatter 写坏：仍然收录，只是拿不到字段
    try { content = readFileSync(file, 'utf8') } catch {}
  }
  const h1 = content.match(/^#\s+(.+?)\s*$/m)
  const title = String(data.title || (h1 && h1[1]) || name.replace(/\.md$/, ''))
  return {
    title,
    text: String(data.sidebarTitle || title),
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 999,
    year: Number(data.year) || 0,
    hidden: data.hidden === true,
    name,
  }
}

function sortPages(pages, byYear) {
  return pages.sort((a, b) =>
    a.order - b.order || (byYear ? b.year - a.year : 0) || a.name.localeCompare(b.name, 'zh-Hans-CN'),
  )
}

function scanDir(dir, urlBase, isSub) {
  const pages = []
  const groups = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || ent.name.startsWith('_')) continue
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      const sub = scanDir(full, `${urlBase}${ent.name}/`, true)
      if (sub.items.length === 0) continue
      const indexFile = join(full, 'index.md')
      const meta = existsSync(indexFile) ? readPage(indexFile, 'index.md') : null
      groups.push({
        text: (meta && meta.title !== 'index' && meta.title) || GROUP_NAMES[ent.name] || ent.name,
        link: meta ? `${urlBase}${ent.name}/` : undefined,
        order: meta ? meta.order : 999,
        name: ent.name,
        collapsed: false,
        items: sub.items,
      })
    } else if (ent.name.endsWith('.md') && ent.name !== 'index.md') {
      const page = readPage(full, ent.name)
      if (!page.hidden) pages.push(page)
    }
  }
  const isExperience = isSub && /experiences?$/.test(urlBase.replace(/\/$/, ''))
  const items = sortPages(pages, isExperience).map((p) => ({
    text: p.text,
    link: `${urlBase}${p.name.replace(/\.md$/, '')}`,
  }))
  groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  for (const g of groups) items.push({ text: g.text, link: g.link, collapsed: g.collapsed, items: g.items })
  return { items }
}

/**
 * @param {string} docsDir  docs 目录绝对路径
 * @param {{ key: string, text: string, link: string }[]} sections  板块清单（sections.ts）
 * @returns {Record<string, any[]>} VitePress 多侧栏对象，键为 '/<板块>/'
 */
export function genSidebar(docsDir, sections) {
  const sidebar = {}
  for (const s of sections) {
    try {
      const dir = join(docsDir, s.key)
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
      const { items } = scanDir(dir, `/${s.key}/`, false)
      if (items.length === 0) continue // 板块还没有文章：不出侧栏
      sidebar[`/${s.key}/`] = [
        { text: s.text, items: [{ text: '板块概览', link: s.link }, ...items] },
      ]
    } catch (e) {
      console.warn(`⚠️ gen-sidebar：板块 ${s.key} 生成侧栏失败（${e.message}），该板块暂不显示侧栏`)
    }
  }
  return sidebar
}

/**
 * 统计每个板块已发布的文章数（规则与侧栏一致：不含各级 index.md、下划线开头的草稿、hidden: true）
 * 供顶栏下拉与手机菜单标注「征稿中」。任何异常按 0 篇处理。
 * @returns {Record<string, number>} 键为板块目录名
 */
export function countArticles(docsDir, sections) {
  const counts = {}
  const walk = (dir) => {
    let n = 0
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.') || ent.name.startsWith('_')) continue
      const full = join(dir, ent.name)
      if (ent.isDirectory()) n += walk(full)
      else if (ent.name.endsWith('.md') && ent.name !== 'index.md' && !readPage(full, ent.name).hidden) n++
    }
    return n
  }
  for (const s of sections) {
    try {
      const dir = join(docsDir, s.key)
      counts[s.key] = existsSync(dir) ? walk(dir) : 0
    } catch {
      counts[s.key] = 0
    }
  }
  return counts
}
