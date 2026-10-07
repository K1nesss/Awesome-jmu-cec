// 重要日期的时间计算（页面 EventCalendar.vue 与首页 HomePage.vue 共用）
// 一律按北京时间计算“今天”，避免读者的设备时区不同导致倒计时差一天。
import type { CalendarEvent } from './events.data'
// @ts-ignore 纯 JS 模块
import { toICS } from '../../../scripts/ics.mjs'

const DAY = 86400000

// 某个时刻在北京时间是哪一天（YYYY-MM-DD）
export function beijingDay(ms: number): string {
  return new Date(ms + 8 * 3600000).toISOString().slice(0, 10)
}

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY)

export type EventStatus =
  | { kind: 'tentative'; text: string }
  | { kind: 'upcoming'; days: number }
  | { kind: 'today' }
  | { kind: 'ongoing'; daysLeft: number }
  | { kind: 'past' }

export function statusOf(e: CalendarEvent, now: number): EventStatus {
  const today = dayNumber(beijingDay(now))
  const start = dayNumber(e.date)
  const end = dayNumber(e.end)
  // 日期未公布的条目永远不算「已结束」：预计日期过了还没人更新时，提醒读者去看官方公告
  if (e.tentative) return { kind: 'tentative', text: today <= end ? e.tentative : '预计时间已过，本站尚未更新，请以官方公告为准' }
  if (today > end) return { kind: 'past' }
  if (today < start) return { kind: 'upcoming', days: start - today }
  if (start === end) return { kind: 'today' }
  return { kind: 'ongoing', daysLeft: end - today }
}

export function statusText(s: EventStatus): string {
  switch (s.kind) {
    case 'tentative':
      return s.text
    case 'upcoming':
      return s.days === 1 ? '明天' : `还有 ${s.days} 天`
    case 'today':
      return '就是今天'
    case 'ongoing':
      return s.daysLeft === 0 ? '进行中 · 今天截止' : `进行中 · 还剩 ${s.daysLeft} 天`
    case 'past':
      return '已结束'
  }
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export function weekday(day: string): string {
  return WEEK[new Date(`${day}T00:00:00Z`).getUTCDay()]
}

// 「10月15日」或跨天「10月15日—24日」「11月30日—12月2日」
export function rangeText(e: CalendarEvent): string {
  const [, m1, d1] = e.date.split('-').map(Number)
  if (e.end === e.date) return `${m1}月${d1}日`
  const [, m2, d2] = e.end.split('-').map(Number)
  return m1 === m2 ? `${m1}月${d1}日—${d2}日` : `${m1}月${d1}日—${m2}月${d2}日`
}

// 单个事件的 .ics 文本（「加入日历」按钮下载用）：与全站订阅 calendar.ics 用同一个生成器
export function singleEventICS(e: CalendarEvent): string {
  return toICS([e], { name: e.title })
}
