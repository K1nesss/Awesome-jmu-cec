// 搜索同义词扩展的回归测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expandSynonyms, injectSearchTerms, normalizeKeywords } from '../docs/.vitepress/search/synonyms.mjs'

test('出现组内任一词，补上同组其他词', () => {
  const extra = expandSynonyms('保研全流程时间线')
  assert.ok(extra.includes('推免'))
  assert.ok(extra.includes('推荐免试'))
  assert.ok(!extra.includes('保研'), '文中已有的词不重复')
})

test('反向也成立：只写了全称，也能用简称搜到', () => {
  assert.ok(expandSynonyms('国家奖学金的评定条件').includes('国奖'))
  assert.ok(expandSynonyms('综合测评怎么算').includes('综测'))
})

test('拉丁缩写按整词、不区分大小写匹配', () => {
  assert.ok(expandSynonyms('雅思和 toefl 都可以').includes('托福'))
  assert.ok(!expandSynonyms('ICMP 协议').includes('美赛'), 'ICMP 不应命中 ICM')
  assert.ok(expandSynonyms('参加 ICM 比赛').includes('美赛'))
})

test('无关文本不产生同义词', () => {
  assert.deepEqual(expandSynonyms('今天天气不错'), [])
})

test('额外搜索词插在第一个标题之后（标题之前的内容不进索引）', () => {
  const html = '<h1 id="a">保研<a href="#a">#</a></h1><p>正文</p>'
  assert.equal(injectSearchTerms(html, ['推免', '推荐免试']), '<h1 id="a">保研<a href="#a">#</a></h1><p>（相关词：推免、推荐免试）</p><p>正文</p>')
  assert.equal(injectSearchTerms(html, []), html)
  assert.ok(injectSearchTerms('<p>无标题</p>', ['x']).startsWith('<p>（相关词：x）</p>'))
})

test('keywords 支持字符串和数组两种写法', () => {
  assert.deepEqual(normalizeKeywords('夏令营, 预推免、面试'), ['夏令营', '预推免', '面试'])
  assert.deepEqual(normalizeKeywords(['夏令营', ' 面试 ', '']), ['夏令营', '面试'])
  assert.deepEqual(normalizeKeywords(undefined), [])
})
