// 构建后断言：dist 存在 + base 前缀正确 + 本地搜索索引存在（PLAN.md §8.5）。
// 用法：npm run build 之后执行 `node scripts/verify-build.mjs`（CI 已接入 deploy/ci 工作流）。
// M4 种子内容落地后，在 KEYWORDS 填入中文关键词表以启用索引内容冒烟检查。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BASE = '/' // 与 docs/.vitepress/config.mts 的 BASE 保持一致（Cloudflare Pages 根路径）
const STALE_BASE = '/Awesome-jmu-cec/' // 回退 GitHub Pages 托管时需与 config.mts 同步修改
const DIST = join(import.meta.dirname, '..', 'docs', '.vitepress', 'dist')
// TODO(M4)：种子内容上线后填入，例如 ['保研', '推免', '夏令营', '选调', '蓝桥杯', '转专业', '绩点']
const KEYWORDS = []

function fail(msg) {
  console.error(`❌ verify-build 失败：${msg}`)
  process.exit(1)
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

if (!existsSync(join(DIST, 'index.html'))) fail('dist/index.html 不存在（构建未产出）')

// 资源引用检查放在 HTML 上：base 为 '/' 时 HTML 用绝对路径 /assets/，JS chunk 之间是相对引用
let assetRefs = 0
for (const f of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const text = readFileSync(f, 'utf8')
  if (text.includes(STALE_BASE)) fail(`产物中残留旧 base 前缀：${f}`)
  assetRefs += text.split('/assets/').length - 1
}
if (assetRefs === 0) fail('产物 HTML 中没有任何 /assets/ 资源引用（构建异常）')

const jsFiles = walk(join(DIST, 'assets')).filter((f) => f.endsWith('.js'))
let searchIndex = null
for (const f of jsFiles) {
  const text = readFileSync(f, 'utf8')
  if (text.includes(STALE_BASE)) fail(`产物中残留旧 base 前缀：${f}`)
  if (f.split(/[\\/]/).pop().startsWith('@localSearchIndex')) searchIndex = text
}
if (!searchIndex) fail('未找到本地搜索索引块（@localSearchIndex*.js）')

for (const kw of KEYWORDS) {
  const escaped = kw.split('').map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
  if (!searchIndex.includes(kw) && !searchIndex.includes(escaped)) {
    fail(`搜索索引缺少关键词「${kw}」`)
  }
}
const extra = KEYWORDS.length ? `、关键词 ${KEYWORDS.length} 项全部命中` : ''
console.log(`✅ verify-build：dist 存在、无残留旧 base、资源引用正常、搜索索引存在${extra}`)
