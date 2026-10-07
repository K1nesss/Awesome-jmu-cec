<script setup lang="ts">
// 重要日期页面（docs/calendar/index.md 写 <EventCalendar />）
//   - 订阅：webcal:// 链接（iPhone / Mac 点一下即订阅，之后自动同步）+ 下载 .ics + 复制订阅地址
//   - 按板块筛选；未开始的按月份分组，带倒计时；已结束的收进折叠区
//   - “今天”按北京时间计算；首次渲染用构建时间（与服务端一致），挂载后换成浏览器当前时间
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../events.data'
import type { CalendarEvent } from '../events.data'
import { REPO, SECTIONS } from '../../sections'
import { rangeText, singleEventICS, statusOf, statusText, weekday } from '../calendar'

const now = ref(data.builtAt)
const subscribeUrl = ref('') // webcal://<域名>/calendar.ics，挂载后才知道当前域名
const httpUrl = ref('')
const copied = ref(false)

onMounted(() => {
  now.value = Date.now()
  const base = `${location.host}${withBase('/calendar.ics')}`
  subscribeUrl.value = `webcal://${base}`
  httpUrl.value = `${location.protocol}//${base}`
})

const sectionName = (key: string) => SECTIONS.find((s) => s.key === key)?.text || ''
const sectionLink = (key: string) => SECTIONS.find((s) => s.key === key)?.link || ''

// 筛选：只列出实际出现过的板块
const filter = ref('')
const categories = computed(() => [...new Set(data.events.map((e) => e.category).filter((c) => sectionName(c)))])
const visible = computed(() => data.events.filter((e) => !filter.value || e.category === filter.value))

const withStatus = computed(() => visible.value.map((e) => ({ e, s: statusOf(e, now.value) })))
const upcoming = computed(() => withStatus.value.filter((x) => x.s.kind !== 'past'))
// 已结束：最近结束的排在前面
const past = computed(() => withStatus.value.filter((x) => x.s.kind === 'past').reverse())

// 未开始的按「年月」分组
const months = computed(() => {
  const groups: { key: string; label: string; items: typeof upcoming.value }[] = []
  for (const x of upcoming.value) {
    const [y, m] = x.e.date.split('-').map(Number)
    const key = `${y}-${m}`
    let g = groups.find((g) => g.key === key)
    if (!g) groups.push((g = { key, label: `${y} 年 ${m} 月`, items: [] }))
    g.items.push(x)
  }
  return groups
})

function download(e: CalendarEvent) {
  const blob = new Blob([singleEventICS(e)], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${e.title}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(httpUrl.value)
  } catch {
    window.prompt('复制下面的订阅地址：', httpUrl.value)
    return
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const day = (d: string) => Number(d.split('-')[2])
const month = (d: string) => Number(d.split('-')[1])
</script>

<template>
  <div class="EventCalendar vp-raw">
    <!-- 订阅 -->
    <section class="subscribe" aria-labelledby="sub-title">
      <div class="sub-text">
        <h2 id="sub-title" class="sub-title">把这些日期放进你的日历</h2>
        <p class="sub-desc">订阅后，新增或更正的日期会自动同步，并在前一天和三天前提醒你。</p>
      </div>
      <div class="sub-actions">
        <a class="btn primary no-icon" :href="subscribeUrl || withBase('/calendar.ics')">订阅日历</a>
        <a class="btn no-icon" :href="withBase('/calendar.ics')" download="awesome-jmu-cec.ics">下载 .ics</a>
        <button type="button" class="btn" @click="copyUrl">{{ copied ? '已复制' : '复制订阅地址' }}</button>
      </div>
      <details class="howto">
        <summary>怎么用？</summary>
        <ul>
          <li><strong>iPhone / Mac</strong>：点「订阅日历」，按提示确认，即可在系统日历里看到并自动更新。</li>
          <li><strong>安卓手机</strong>：点「下载 .ics」，用手机自带的日历打开导入。导入的是当时的版本，之后有更新需要重新导入。</li>
          <li><strong>Outlook / Google 日历 / 其他日历应用</strong>：点「复制订阅地址」，在应用里选择「通过网址添加日历 / 订阅日历」并粘贴。</li>
        </ul>
      </details>
    </section>

    <!-- 筛选 -->
    <div v-if="categories.length > 1" class="filters" role="group" aria-label="按板块筛选">
      <button type="button" :class="{ on: !filter }" :aria-pressed="!filter" @click="filter = ''">全部</button>
      <button
        v-for="c in categories"
        :key="c"
        type="button"
        :class="{ on: filter === c }"
        :aria-pressed="filter === c"
        @click="filter = c"
      >
        {{ sectionName(c) }}
      </button>
    </div>

    <!-- 未开始 / 进行中 -->
    <p v-if="!upcoming.length" class="empty">接下来暂时没有已收录的日期。</p>
    <section v-for="g in months" :key="g.key" class="month" :aria-label="g.label">
      <h2 class="month-title">{{ g.label }}</h2>
      <ol class="events">
        <li v-for="{ e, s } in g.items" :key="e.id" class="event" :class="[s.kind, { soon: s.kind === 'upcoming' && s.days <= 7 }]">
          <div class="when" aria-hidden="true">
            <span class="when-day">{{ day(e.date) }}</span>
            <span class="when-week">{{ e.tentative ? '待定' : weekday(e.date) }}</span>
          </div>
          <div class="what">
            <h3 class="title">{{ e.title }}</h3>
            <p class="meta">
              <span>{{ e.tentative ? `约 ${month(e.date)} 月` : rangeText(e) }}</span>
              <a v-if="sectionName(e.category)" :href="withBase(sectionLink(e.category))">{{ sectionName(e.category) }}</a>
            </p>
            <p v-if="e.note" class="note">{{ e.note }}</p>
            <p class="links">
              <button v-if="!e.tentative" type="button" class="link-btn" @click="download(e)">加入日历</button>
              <a v-if="e.source" :href="e.source" target="_blank" rel="noopener">官方来源</a>
            </p>
          </div>
          <span class="status">{{ statusText(s) }}</span>
        </li>
      </ol>
    </section>

    <!-- 已结束 -->
    <details v-if="past.length" class="past">
      <summary>已结束（{{ past.length }}）</summary>
      <ol class="events">
        <li v-for="{ e } in past" :key="e.id" class="event past">
          <div class="when" aria-hidden="true">
            <span class="when-day">{{ day(e.date) }}</span>
            <span class="when-week">{{ month(e.date) }} 月</span>
          </div>
          <div class="what">
            <h3 class="title">{{ e.title }}</h3>
            <p class="meta"><span>{{ rangeText(e) }}</span></p>
          </div>
          <span class="status">已结束</span>
        </li>
      </ol>
    </details>

    <p class="contribute">
      发现日期有误或想补充？编辑
      <a :href="`${REPO}/edit/main/docs/calendar/events.yaml`" target="_blank" rel="noopener">events.yaml</a>
      提交修改（请附官方来源），或在
      <a :href="`${REPO}/issues/new?title=${encodeURIComponent('重要日期：')}`" target="_blank" rel="noopener">Issues</a>
      里告诉我们。
    </p>
  </div>
</template>

<style scoped>
.EventCalendar {
  margin-top: 24px;
}

/* ---------- 订阅 ---------- */
.subscribe {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-alt);
}

@media (min-width: 768px) {
  .subscribe {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
  .howto {
    grid-column: 1 / -1;
  }
}

.sub-title {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.sub-desc {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.sub-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.btn:hover {
  border-color: var(--vp-c-text-1);
}

.btn.primary {
  border-color: var(--vp-button-brand-bg);
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}

.btn.primary:hover {
  background: var(--vp-button-brand-hover-bg);
}

.howto {
  margin-top: -4px;
}

.howto summary {
  display: inline-block;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.howto ul {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

/* ---------- 筛选 ---------- */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 28px 0 8px;
}

.filters button {
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}

.filters button:hover {
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-text-1);
}

.filters button.on {
  border-color: var(--vp-c-text-1);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

/* ---------- 列表 ---------- */
.month {
  margin-top: 32px;
}

.month-title {
  margin: 0 0 4px;
  padding: 0 0 8px;
  border: none;
  border-bottom: 2px solid var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.events {
  margin: 0;
  padding: 0;
  list-style: none;
}

.event {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 4px 16px;
  align-items: start;
  padding: 16px 0;
  border-bottom: 1px solid var(--vp-c-border);
}

.when {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}

.when-day {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}

.when-week {
  margin-top: 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.title {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.meta a,
.links a,
.contribute a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
  text-decoration-color: var(--vp-c-text-3);
  text-underline-offset: 3px;
}

.meta a:hover,
.links a:hover,
.contribute a:hover {
  color: var(--vp-c-text-1);
}

.note {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  margin: 8px 0 0;
  font-size: 13px;
}

.link-btn {
  padding: 4px 0;
  font-size: 13px;
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* 状态：未开始灰字；七天内加边框；进行中 / 今天实心；待定虚线 */
.status {
  padding: 2px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 13px;
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.event.soon .status {
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.event.ongoing .status,
.event.today .status {
  border-color: var(--vp-c-text-1);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-weight: 600;
}

.event.tentative .status {
  border-color: var(--vp-c-border);
  border-style: dashed;
}

.event.tentative .when-day {
  color: var(--vp-c-text-3);
}

/* 手机：状态挪到标题下方，避免挤压标题 */
@media (max-width: 639px) {
  .event {
    grid-template-columns: 44px 1fr;
  }
  .status {
    grid-column: 2;
    justify-self: start;
    margin-top: 4px;
  }
}

.empty {
  margin: 32px 0 0;
  color: var(--vp-c-text-2);
}

/* ---------- 已结束 ---------- */
.past {
  margin-top: 40px;
}

.past summary {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.past .event {
  opacity: 0.6;
}

.contribute {
  margin: 40px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--vp-c-text-3);
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .filters button {
    transition: none;
  }
}
</style>
