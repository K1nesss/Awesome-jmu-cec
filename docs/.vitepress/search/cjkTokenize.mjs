// 中文搜索分词器：构建索引与浏览器查询共用本函数（通过 themeConfig 自动序列化下发）。
// 警告：VitePress 会把配置中的函数以 toString() 序列化、浏览器端 new Function 还原，
// 因此本函数必须完全自包含——不得引用本文件以外的任何变量、常量或导入！
export function cjkTokenize(text) {
  const CJK = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/
  const out = []
  const runs = String(text).toLowerCase().match(
    /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]+|[^㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]+/g
  )
  if (!runs) return out
  for (const run of runs) {
    if (CJK.test(run.charAt(0))) {
      const chars = Array.from(run)
      for (const c of chars) out.push(c)                       // unigram：单字查询可用
      for (let i = 0; i + 1 < chars.length; i++) out.push(chars[i] + chars[i + 1])  // bigram：词组/生造词
    } else {
      for (const w of run.split(/[^a-z0-9À-ɏ]+/)) if (w) out.push(w)     // 拉丁/数字整词
    }
  }
  return out
}
