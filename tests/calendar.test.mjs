// 重要日期：解析校验与 .ics 生成的回归测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEvents, toICS } from '../scripts/calendar.mjs'

const YAML = `
- title: 考研正式报名
  date: 2026-10-15
  end: 2026-10-24
  category: kaoyan
  source: https://yz.chsi.com.cn/
- title: 四六级笔试
  date: 2026-12-12
  note: 四级上午，六级下午
  source: https://cet.neea.edu.cn/
- title: 国考报名
  date: 2026-10-15
  tentative: 预计 10 月中旬
- title: 缺日期的条目
- title: 结束早于开始
  date: 2026-11-02
  end: 2026-11-01
`

test('解析：日期统一为 YYYY-MM-DD、按日期排序、坏条目跳过并提示', () => {
  const { events, warnings } = parseEvents(YAML)
  assert.deepEqual(events.map((e) => e.title), ['国考报名', '考研正式报名', '结束早于开始', '四六级笔试'])
  const ky = events.find((e) => e.title === '考研正式报名')
  assert.equal(ky.date, '2026-10-15')
  assert.equal(ky.end, '2026-10-24')
  assert.equal(events.find((e) => e.title === '四六级笔试').end, '2026-12-12') // 单日：end = date
  assert.equal(events.find((e) => e.title === '结束早于开始').end, '2026-11-02')
  assert.ok(warnings.some((w) => w.includes('缺日期的条目')))
  assert.ok(warnings.some((w) => w.includes('end 早于 date')))
})

test('解析：YAML 写坏不抛错，返回中文提示', () => {
  const { events, warnings } = parseEvents('- title: [坏')
  assert.equal(events.length, 0)
  assert.match(warnings[0], /格式有误/)
})

test('.ics：全天事件、结束日 +1、跳过未公布日期的条目、CRLF 换行、行长不超过 75 字节', () => {
  const { events } = parseEvents(YAML)
  const ics = toICS(events, { now: new Date('2026-10-07T00:00:00Z') })
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'))
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
  assert.match(ics, /DTSTART;VALUE=DATE:20261015\r\nDTEND;VALUE=DATE:20261025/)
  assert.match(ics, /DTSTART;VALUE=DATE:20261212\r\nDTEND;VALUE=DATE:20261213/)
  assert.ok(!ics.includes('国考报名'), '日期未公布的条目不写入日历')
  assert.ok(!/[^\r]\n/.test(ics), '只使用 CRLF 换行')
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `行过长：${line}`)
  // 折行后拼回去，中文不被截断
  assert.ok(ics.replace(/\r\n /g, '').includes('SUMMARY:考研正式报名'))
})

test('.ics：UID 稳定（重复构建不变），特殊字符转义', () => {
  const { events } = parseEvents('- title: "Apply, confirm; pay"\n  date: 2026-10-15\n')
  const a = toICS(events, { now: new Date('2026-10-07T00:00:00Z') })
  const b = toICS(events, { now: new Date('2026-10-08T00:00:00Z') })
  const uid = (s) => s.match(/UID:(.+)/)[1]
  assert.equal(uid(a), uid(b))
  assert.ok(a.includes('SUMMARY:Apply\\, confirm\\; pay'), 'ASCII 逗号、分号需要转义')
})
