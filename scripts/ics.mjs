// .ics（iCalendar, RFC 5545）生成：纯函数、无 Node 依赖，构建期（全站订阅 calendar.ics）与浏览器（单个事件「加入日历」）共用。

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// 每行不超过 75 字节，超出时折行（续行以空格开头）；按字符切分，不会把一个汉字劈成两半
function fold(line) {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    const limit = out.length === 0 ? 75 : 74 // 续行开头的空格占 1 字节
    if (bytes + n > limit) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += n
  }
  out.push(cur)
  return out.join('\r\n ')
}

const compact = (day) => day.replace(/-/g, '')
function nextDay(day) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// 简单稳定的哈希，用于生成不随构建变化的 UID（同一事件反复订阅不会重复）
function hash(s) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0
  return h.toString(36)
}

/**
 * @param {object[]} events parseEvents 的结果；tentative（日期未公布）的条目不写入
 * @param {{ name?: string, now?: Date, siteUrl?: string }} opts
 */
export function toICS(events, opts = {}) {
  const name = opts.name || 'Awesome JMU CEC 重要日期'
  const stamp = (opts.now || new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Awesome JMU CEC//重要日期//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    'X-WR-TIMEZONE:Asia/Shanghai',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
  ]
  for (const e of events) {
    if (e.tentative) continue
    const desc = [e.note, e.source && `来源：${e.source}`, '以官方通知为准。——Awesome JMU CEC'].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${hash(e.id)}@awesome-jmu-cec`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(e.end))}`, // 全天事件的结束日期是“不含”的，所以 +1 天
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      ...(e.source ? [`URL:${e.source}`] : []),
      'TRANSP:TRANSPARENT',
      // 提醒：前一天 9:00、三天前 9:00（全天事件以当天 0 点为基准）
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`明天：${e.title}`)}`,
      'TRIGGER:-PT15H',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`3 天后：${e.title}`)}`,
      'TRIGGER:-P2DT15H',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
