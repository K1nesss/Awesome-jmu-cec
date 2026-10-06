// frontmatter 温和校验（M3 将加入完整规则与 GitHub 中文注解，见 PLAN.md §7.2）。
// 设计原则：永不 exit 非零——校验只提示，不阻断构建。
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

let ok = 0
for (const f of files) {
  try {
    matter(readFileSync(f, 'utf8'))
    ok++
  } catch (e) {
    console.warn(`⚠️ ${f}：frontmatter 解析失败（${e.message}）——仅提示，不阻断构建`)
  }
}
console.log(`check-frontmatter: 检查 ${ok}/${files.length} 个 .md 文件，无阻断问题`)
