// 搜索同义词表：同一组里的词互为同义词。
// 构建搜索索引时，一篇文章只要出现了组里的任意一个词，就把同组其他词也记进这篇文章的索引，
// 于是搜「推免」能找到只写了「保研」的文章，搜「国奖」能找到只写了「国家奖学金」的文章。
// 只影响搜索，不改变页面显示。新增同义词：在下面加一组或往已有的组里加词即可。
export const SYNONYM_GROUPS = [
  // 毕业去向
  ['保研', '推免', '推荐免试'],
  ['预推免', '九推'],
  ['考研', '研究生考试', '硕士研究生招生考试'],
  ['考公', '公务员考试'],
  ['国考', '国家公务员考试'],
  ['省考', '地方公务员考试'],
  ['秋招', '秋季校园招聘'],
  ['春招', '春季校园招聘'],
  ['三方', '三方协议'],
  ['雅思', 'IELTS'],
  ['托福', 'TOEFL'],
  // 在校
  ['国奖', '国家奖学金'],
  ['国励', '国家励志奖学金'],
  ['助学金', '国家助学金'],
  ['综测', '综合测评'],
  ['绩点', 'GPA'],
  ['四级', 'CET-4', 'CET4'],
  ['六级', 'CET-6', 'CET6'],
  ['大创', '创新创业训练计划'],
  // 竞赛
  ['数模', '数学建模'],
  ['美赛', '美国大学生数学建模竞赛', 'MCM', 'ICM'],
  ['ICPC', '国际大学生程序设计竞赛'],
  ['CCPC', '中国大学生程序设计竞赛'],
  ['互联网+', '中国国际大学生创新大赛'],
]

// 拉丁词按“整词、不区分大小写”匹配（避免 MCM 命中某个长单词的一部分），中文按包含匹配
function contains(text, term) {
  if (/^[\x00-\x7f]+$/.test(term)) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^A-Za-z0-9])${esc}($|[^A-Za-z0-9])`, 'i').test(text)
  }
  return text.includes(term)
}

/**
 * 返回需要额外写进索引的同义词（文中已经出现的词不再重复）
 * @param {string} text 文章原文
 * @returns {string[]}
 */
export function expandSynonyms(text) {
  const extra = new Set()
  for (const group of SYNONYM_GROUPS) {
    if (!group.some((t) => contains(text, t))) continue
    for (const t of group) if (!contains(text, t)) extra.add(t)
  }
  return [...extra]
}

/**
 * 把额外的搜索词写进「标题所在的那一段」索引文本（紧跟第一个标题之后），
 * 只用于构建搜索索引，页面本身不受影响。
 * 本地搜索按标题切段，第一个标题之前的内容会被丢弃，所以不能放在最前面。
 * @param {string} html  markdown 渲染出的 html
 * @param {string[]} terms
 */
export function injectSearchTerms(html, terms) {
  if (!terms.length) return html
  const p = `<p>（相关词：${terms.join('、').replace(/</g, '&lt;')}）</p>`
  const m = html.match(/<\/h[1-6]>/)
  if (!m) return p + html
  const at = m.index + m[0].length
  return html.slice(0, at) + p + html.slice(at)
}

/** frontmatter 里的 keywords：字符串（逗号/顿号/空格分隔）或数组 */
export function normalizeKeywords(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean)
  return []
}
