// 重要日期数据：读取 docs/calendar/events.yaml，供「重要日期」页面与首页「下一个节点」使用。
// 开发模式下修改 events.yaml 会自动刷新；写错的条目会在终端给出中文提示，并被跳过（不影响构建）。
import { defineLoader } from 'vitepress'
import { loadEvents } from '../../../scripts/calendar.mjs'

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  end: string // YYYY-MM-DD，单日事件与 date 相同
  tentative: string // 非空 = 日期尚未正式公布
  category: string // 板块目录名
  note: string
  source: string
  link: string
}

export interface CalendarData {
  events: CalendarEvent[]
  builtAt: number // 构建时间：页面首次渲染用它划分“未开始 / 已结束”，挂载后再换成浏览器的当前时间
}

declare const data: CalendarData
export { data }

export default defineLoader({
  watch: ['../../calendar/events.yaml'],
  load(files: string[]): CalendarData {
    const file = files[0]
    const { events, warnings } = file ? loadEvents(file) : { events: [], warnings: ['找不到 docs/calendar/events.yaml'] }
    for (const w of warnings) console.warn(`⚠️ 重要日期：${w}`)
    return { events, builtAt: Date.now() }
  },
})
