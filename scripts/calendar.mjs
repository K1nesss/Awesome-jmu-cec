// 重要日期（docs/calendar/events.yaml）的读取、校验与 .ics 日历生成。
// 页面（theme/events.data.ts）、构建（config.mts 的 buildEnd 写出 calendar.ics）与测试共用本文件。
import { readFileSync } from 'node:fs'
import matter from 'gray-matter'
export { toICS } from './ics.mjs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// YAML 里的日期会被解析成 Date（UTC 零点），统一转回 'YYYY-MM-DD'
function toDay(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && DATE_RE.test(v.trim())) return v.trim()
  return null
}

/**
 * 解析并校验事件列表。不合格的条目跳过并给出中文提示，不让构建失败。
 * @param {string} yamlText
 * @returns {{ events: object[], warnings: string[] }}
 */
export function parseEvents(yamlText) {
  const warnings = []
  let raw
  try {
    raw = matter.engines.yaml.parse(yamlText)
  } catch (e) {
    return { events: [], warnings: [`events.yaml 格式有误，无法解析：${e.message.split('\n')[0]}`] }
  }
  if (!Array.isArray(raw)) return { events: [], warnings: raw == null ? [] : ['events.yaml 的最外层应该是一个列表（每项以「- 」开头）'] }

  const events = []
  raw.forEach((item, i) => {
    const where = `第 ${i + 1} 项${item?.title ? `「${item.title}」` : ''}`
    if (!item || typeof item !== 'object') return warnings.push(`${where}：不是有效的条目，已跳过`)
    if (!item.title) return warnings.push(`${where}：缺少 title，已跳过`)
    const date = toDay(item.date)
    if (!date) return warnings.push(`${where}：date 应写成 2026-10-15 这样的日期，已跳过`)
    let end = item.end == null ? date : toDay(item.end)
    if (!end) {
      warnings.push(`${where}：end 日期格式不对，已按单日处理`)
      end = date
    }
    if (end < date) {
      warnings.push(`${where}：end 早于 date，已按单日处理`)
      end = date
    }
    if (!item.source) warnings.push(`${where}：建议补充官方来源 source`)
    events.push({
      id: `${date}-${String(item.title)}`,
      title: String(item.title),
      date,
      end,
      // 日期未正式公布时写 tentative（如「预计 10 月中旬」）：页面显示这段文字而不显示倒计时，也不写进 .ics
      tentative: item.tentative ? String(item.tentative) : '',
      category: item.category ? String(item.category) : '',
      note: item.note ? String(item.note) : '',
      source: item.source ? String(item.source) : '',
      link: item.link ? String(item.link) : '',
    })
  })
  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'zh-Hans-CN'))
  return { events, warnings }
}

export function loadEvents(file) {
  try {
    return parseEvents(readFileSync(file, 'utf8'))
  } catch (e) {
    return { events: [], warnings: [`读取 ${file} 失败：${e.message}`] }
  }
}
