// cjkTokenize 回归测试（node --test，零额外依赖）
// 与 docs/.vitepress/search/cjkTokenize.mjs 同源导入，防搜索回归（PLAN.md §5.5）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cjkTokenize } from '../docs/.vitepress/search/cjkTokenize.mjs'

test('CJK：连续汉字产生 unigram + bigram', () => {
  assert.deepEqual(cjkTokenize('保研'), ['保', '研', '保研'])
})

test('CJK：bigram 召回——「夏令营」命中「优秀大学生夏令营」', () => {
  const tokens = cjkTokenize('优秀大学生夏令营')
  assert.ok(tokens.includes('夏令'))
  assert.ok(tokens.includes('令营'))
})

test('单字查询可用（unigram）', () => {
  assert.deepEqual(cjkTokenize('卷'), ['卷'])
})

test('拉丁/数字按整词切分', () => {
  const tokens = cjkTokenize('CET-6 备考')
  assert.ok(tokens.includes('cet'))
  assert.ok(tokens.includes('6'))
  assert.ok(tokens.includes('备'))
})

test('混排：CJK 与拉丁各按规则处理', () => {
  const tokens = cjkTokenize('ICPC 组队')
  assert.ok(tokens.includes('icpc'))
  assert.ok(tokens.includes('组队'))
})

test('空输入返回空数组', () => {
  assert.deepEqual(cjkTokenize(''), [])
})
