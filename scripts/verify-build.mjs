// 构建后断言：dist 存在 + base 前缀正确 + 本地搜索索引存在。
// 用法：npm run build 之后执行 `node scripts/verify-build.mjs`（CI 已接入 deploy/ci 工作流）。
// M4 种子内容落地后，在 KEYWORDS 填入中文关键词表以启用索引内容冒烟检查。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cjkTokenize } from '../docs/.vitepress/search/cjkTokenize.mjs'

const BASE = '/' // 与 docs/.vitepress/config.mts 的 BASE 保持一致（Cloudflare Pages 根路径）
const SITE_URL = 'https://awesome-jmu-cec.pages.dev' // 与 config.mts 的 SITE_URL 保持一致
const STALE_BASE = '/Awesome-jmu-cec/' // 回退 GitHub Pages 托管时需与 config.mts 同步修改
const DIST = join(import.meta.dirname, '..', 'docs', '.vitepress', 'dist')
// 搜索索引冒烟：这些词必须出现在索引里（M4 种子文章上线后可追加 '蓝桥杯' 等）
const KEYWORDS = ['保研', '推免', '夏令营', '选调', '转专业', '绩点']
// 正文里没有、只靠同义词表（search/synonyms.mjs）进索引的词：检查同义词扩展确实生效
const SYNONYM_ONLY = ['国奖', 'GPA']
// 只匹配“作为站内路径开头”的旧 base（引号或括号后紧跟），
// 避免把 editLink / socialLinks 里的 github.com/K1nesss/Awesome-jmu-cec/ 误判为残留
const STALE_RE = new RegExp(`["'(]${STALE_BASE.replaceAll('.', '\\.')}`)

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
// 日历订阅文件（config.mts 的 buildEnd 写出）
const ics = existsSync(join(DIST, 'calendar.ics')) ? readFileSync(join(DIST, 'calendar.ics'), 'utf8') : ''
if (!ics.startsWith('BEGIN:VCALENDAR') || !ics.includes('END:VCALENDAR')) fail('dist/calendar.ics 不存在或格式不对')

// 资源引用检查放在 HTML 上：base 为 '/' 时 HTML 用绝对路径 /assets/，JS chunk 之间是相对引用
let assetRefs = 0
for (const f of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const text = readFileSync(f, 'utf8')
  if (STALE_RE.test(text)) fail(`产物中残留旧 base 前缀：${f}`)
  assetRefs += text.split('/assets/').length - 1
}
if (assetRefs === 0) fail('产物 HTML 中没有任何 /assets/ 资源引用（构建异常）')

const jsFiles = walk(join(DIST, 'assets')).filter((f) => f.endsWith('.js'))
let searchIndex = null
for (const f of jsFiles) {
  const text = readFileSync(f, 'utf8')
  if (STALE_RE.test(text)) fail(`产物中残留旧 base 前缀：${f}`)
  if (f.split(/[\\/]/).pop().startsWith('@localSearchIndex')) searchIndex = text
}
if (!searchIndex) fail('未找到本地搜索索引块（@localSearchIndex*.js）')

// 索引里存的是分词后的词元（unigram + bigram），所以按同一分词器拆开逐个检查
const escape = (t) => t.split('').map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
for (const kw of KEYWORDS) {
  const missing = cjkTokenize(kw).filter((t) => !searchIndex.includes(t) && !searchIndex.includes(escape(t)))
  if (missing.length) fail(`搜索索引缺少关键词「${kw}」的词元：${missing.join('、')}`)
}
for (const kw of SYNONYM_ONLY) {
  const missing = cjkTokenize(kw).filter((t) => !searchIndex.toLowerCase().includes(t.toLowerCase()) && !searchIndex.includes(escape(t)))
  if (missing.length) fail(`同义词「${kw}」没有进入搜索索引，检查 config.mts 的 search._render`)
}
// 贡献者头像：构建时下载成功的头像必须随站点发布（否则关于页会退回 GitHub 地址，国内加载慢）
const ghCache = join(DIST, '..', 'cache', 'github', 'github-data.json')
if (existsSync(ghCache)) {
  const gh = JSON.parse(readFileSync(ghCache, 'utf8'))
  for (const c of gh.contributors ?? []) {
    if (c.local && !existsSync(join(DIST, c.local))) fail(`贡献者 ${c.login} 的头像 ${c.local} 没有发布到构建产物里`)
  }
}
// 站点地图、robots.txt 与分享卡片
const sitemap = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : ''
if (!sitemap.includes(`<loc>${SITE_URL}${BASE}baoyan/</loc>`)) fail('sitemap.xml 缺失，或其中的地址没有使用 SITE_URL + BASE')
if (/<loc>[^<]*404/.test(sitemap)) fail('404 页不应出现在 sitemap.xml 里')
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : ''
if (!robots.includes(`Sitemap: ${SITE_URL}${BASE}sitemap.xml`)) fail('robots.txt 缺失或没有指向 sitemap.xml')
if (!existsSync(join(DIST, 'og.png'))) fail('缺少分享配图 og.png')
for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png', 'site.webmanifest']) {
  if (!existsSync(join(DIST, f))) fail(`缺少网站图标文件 ${f}`)
}
const articleHtml = readFileSync(join(DIST, 'baoyan', 'timeline.html'), 'utf8')
for (const needle of [
  `<meta property="og:url" content="${SITE_URL}${BASE}baoyan/timeline">`,
  `<meta property="og:image" content="${SITE_URL}${BASE}og.png">`,
  `<link rel="canonical" href="${SITE_URL}${BASE}baoyan/timeline">`,
  '<meta property="og:type" content="article">',
]) {
  if (!articleHtml.includes(needle)) fail(`文章页缺少分享卡片标签：${needle}`)
}
// 校园地图：数据文件随站点发布；places.yaml 的人工修正生效（服务端渲染的地点列表里能看到改过的名字）
if (!existsSync(join(DIST, 'map', 'campus.geojson'))) fail('缺少校园地图数据 map/campus.geojson（运行 npm run map:build）')
const mapHtml = existsSync(join(DIST, 'map', 'index.html')) ? readFileSync(join(DIST, 'map', 'index.html'), 'utf8') : ''
if (!mapHtml.includes('嘉庚图书馆')) fail('校园地图页没有渲染出地点列表')
if (mapHtml.includes('拼多多')) fail('docs/map/places.yaml 的改名没有生效')
const extra = KEYWORDS.length ? `、关键词 ${KEYWORDS.length} 项、同义词 ${SYNONYM_ONLY.length} 项全部命中` : ''
console.log(`✅ verify-build：dist 存在、无残留旧 base、资源引用正常、搜索索引存在、日历订阅文件正常、站点地图与分享卡片正常、校园地图数据正常${extra}`)
