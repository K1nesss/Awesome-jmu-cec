// 图片温和校验（与 check-frontmatter 一样永不 exit 非零，只提示不阻断）：
//   1. 图片文件超过 500 KB：提醒压缩（仓库会永久保存每个版本，大图拖慢所有人）
//   2. 文件名带空格：Markdown 里引用容易写错
//   3. 文章里引用了微信公众号、知乎等外站图片：这些站点防盗链，放到本站上会显示不出来
//   4. 图片没写说明文字（![这里](...) 为空）：读屏软件读不出内容，加载失败时也看不出是什么
// 引用的本地图片不存在时，VitePress 构建本身会报错，这里不重复检查。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MAX_BYTES = 500 * 1024
const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i

// 常见的防盗链图床（外链到别的网站时图片会显示不出来或变成「此图片来自微信公众平台」）
const HOTLINK_HOSTS = [
  'mmbiz.qpic.cn', // 微信公众号
  'mmbiz.qlogo.cn',
  'zhimg.com', // 知乎
  'hdslb.com', // 哔哩哔哩
  'sinaimg.cn', // 微博
  'xhscdn.com', // 小红书
  'csdnimg.cn', // CSDN
  'bdstatic.com', // 百度
  'byteimg.com', // 抖音 / 今日头条
]

/** 找出一篇 Markdown 里的图片问题（纯函数，便于测试） */
export function findImageIssues(text) {
  const issues = []
  // 代码块、行内代码里的示例不算
  const body = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  for (const m of body.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const [, alt, src] = m
    check(alt, src)
  }
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const src = m[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
    const alt = m[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? ''
    if (src) check(alt, src)
  }
  return issues

  function check(alt, src) {
    if (/^https?:\/\//i.test(src)) {
      let host = ''
      try {
        host = new URL(src).hostname
      } catch {}
      if (HOTLINK_HOSTS.some((h) => host === h || host.endsWith('.' + h)))
        issues.push(`图片 ${src.length > 60 ? src.slice(0, 60) + "…" : src} 来自 ${host}，该站点禁止外链，在本站会显示不出来。请下载后放到文章旁的 images/ 目录里引用`)
    }
    if (!alt.trim()) issues.push(`图片 ${src.slice(0, 60)} 没写说明文字：在 ![ ] 的方括号里简单写一下图片内容`)
  }
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function main() {
  const DOCS = join(import.meta.dirname, '..', 'docs')
  const ROOT = join(DOCS, '..')
  const inCI = !!process.env.GITHUB_ACTIONS
  let warnings = 0
  const warn = (file, msg) => {
    warnings++
    const rel = relative(ROOT, file).replaceAll('\\', '/')
    if (inCI) console.log(`::warning file=${rel}::${msg}`)
    else console.warn(`⚠️ ${rel}：${msg}`)
  }

  const files = walk(DOCS)
  const images = files.filter((f) => IMAGE_RE.test(f))
  for (const f of images) {
    const size = statSync(f).size
    if (size > MAX_BYTES)
      warn(f, `图片有 ${(size / 1024 / 1024).toFixed(1)} MB，建议压缩到 500 KB 以内（宽度 1600 像素左右、存为 JPG 或 WebP 即可）`)
    if (/\s/.test(f.split(/[\\/]/).pop())) warn(f, '图片文件名里有空格，建议改成英文、数字和短横线，例如 summer-camp-1.png')
  }
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    for (const msg of findImageIssues(readFileSync(f, 'utf8'))) warn(f, msg)
  }
  console.log(`check-images: 检查 ${images.length} 张图片，${warnings ? `${warnings} 条提示（不阻断构建）` : '无问题'}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
