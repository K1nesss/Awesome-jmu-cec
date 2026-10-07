// frontmatter 温和校验。
// 设计原则：永不 exit 非零——校验只提示，不阻断构建。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import matter from 'gray-matter'

const DOCS = join(import.meta.dirname, '..', 'docs')
const files = []
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith('.') || name.name === 'public') continue
    const p = join(dir, name.name)
    if (name.isDirectory()) walk(p)
    else if (name.name.endsWith('.md')) files.push(p)
  }
}
walk(DOCS)

// 温和提示（不阻断）：type 只能是 guide / experience；year 应为四位年份；keywords 为字符串或列表
// 在 GitHub Actions 中以 ::warning 注解输出，会直接标在 PR 的文件上
const inCI = !!process.env.GITHUB_ACTIONS
function warn(file, msg) {
  const rel = relative(join(DOCS, '..'), file).replaceAll('\\', '/')
  if (inCI) console.log(`::warning file=${rel}::${msg}`)
  else console.warn(`⚠️ ${rel}：${msg}`)
}

let ok = 0
let warnings = 0
for (const f of files) {
  let data
  try {
    data = matter(readFileSync(f, 'utf8')).data || {}
    ok++
  } catch (e) {
    warn(f, `frontmatter 解析失败（${e.message.split('\n')[0]}）——文章仍会发布，但标题、作者等信息读不到`)
    warnings++
    continue
  }
  if (data.type !== undefined && !['guide', 'experience'].includes(data.type)) {
    warn(f, `type 应为 guide（指南）或 experience（经验帖），当前是「${data.type}」`)
    warnings++
  }
  if (data.year !== undefined && !/^(19|20)\d{2}$/.test(String(data.year))) {
    warn(f, `year 应为四位年份（例如 2026），当前是「${data.year}」`)
    warnings++
  }
  const kw = data.keywords
  if (kw !== undefined && kw !== null && typeof kw !== 'string' && !(Array.isArray(kw) && kw.every((x) => typeof x === 'string' || typeof x === 'number'))) {
    warn(f, 'keywords 应写成「词1, 词2」或列表形式，当前格式读不出来，这些词不会进入搜索')
    warnings++
  }
}
console.log(`check-frontmatter: 检查 ${files.length} 个 .md 文件，${warnings ? `${warnings} 条提示（不阻断构建）` : '无问题'}`)
