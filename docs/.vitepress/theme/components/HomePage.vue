<script setup lang="ts">
// 首页（docs/index.md 使用 layout: page 并只渲染本组件）
// 结构：开场 + 搜索入口（右侧最近更新）→ 四年路线（本页的视觉重心）→ 全部板块目录（按三个大类分栏）→ 投稿号召
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { GROUPS, sectionByKey } from '../../sections'
import { data as articles } from '../articles.data'
import { data as calendar } from '../events.data'
import { statusOf, statusText } from '../calendar'

// 下一个节点：最近一个尚未结束、且日期已确定的事件（日历页的第一项）
// 首次渲染用构建时间，挂载后换成浏览器当前时间，避免服务端与浏览器渲染不一致
const now = ref(calendar.builtAt)
onMounted(() => (now.value = Date.now()))
const nextEvent = computed(() => {
  for (const e of calendar.events) {
    const s = statusOf(e, now.value)
    if (s.kind !== 'past' && s.kind !== 'tentative') return { e, text: statusText(s), urgent: s.kind !== 'upcoming' || s.days <= 7 }
  }
  return null
})

// 每个板块的文章数（目录里显示「N 篇」或「征稿中」）
const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const a of articles) c[a.section] = (c[a.section] || 0) + 1
  return c
})

// 最近更新：按最后更新时间取前 5 篇
const recent = computed(() => [...articles].sort((a, b) => b.updated - a.updated || a.title.localeCompare(b.title, 'zh-Hans-CN')).slice(0, 5))

// 日期按北京时间格式化：服务端渲染（构建机可能是 UTC）与浏览器结果一致，不会出现日期差一天
const DATE_FMT = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' })
const fmtDate = (ms: number) => {
  if (!ms) return ''
  const parts = Object.fromEntries(DATE_FMT.formatToParts(ms).map((x) => [x.type, x.value]))
  return `${parts.month}月${parts.day}日`
}

interface Stage {
  year: string
  theme: string
  points: string[]
  links: string[] // 板块 key
}

// 四年路线：只写通用、长期成立的建议；具体政策与时间以各板块文章为准
const STAGES: Stage[] = [
  {
    year: '大一',
    theme: '适应节奏，打好基础',
    points: ['弄清培养方案和毕业学分要求', '数学、程序设计等基础课决定了绩点的底子', '了解综合测评与奖学金怎么评'],
    links: ['college', 'planning', 'academics', 'scholarship'],
  },
  {
    year: '大二',
    theme: '试方向，攒经历',
    points: ['参加第一个竞赛或项目，找到感兴趣的方向', '考虑转专业、辅修的同学留意时间节点', '着手准备英语四六级'],
    links: ['competitions', 'mentors', 'academics'],
  },
  {
    year: '大三',
    theme: '做选择，提前准备',
    points: ['在保研、考研、考公、留学、就业之间做决定', '保研看排名与夏令营，留学准备语言考试', '争取第一份实习'],
    links: ['baoyan', 'kaoyan', 'career', 'abroad', 'kaogong'],
  },
  {
    year: '大四',
    theme: '落实去向，完成收尾',
    points: ['推免、研究生考试、公务员考试与留学申请陆续进行', '完成毕业设计', '把经验写下来，留给下一届'],
    links: ['kaoyan', 'career', 'kaogong'],
  },
]

// 打开站内搜索：直接点击顶栏的搜索按钮，与 Ctrl/⌘ + K 打开的是同一个弹窗
function openSearch() {
  document.querySelector<HTMLButtonElement>('#local-search .DocSearch-Button')?.click()
}
</script>

<template>
  <div class="Home">
    <!-- 开场 -->
    <section class="intro">
      <div class="wrap intro-grid">
        <div class="intro-main">
          <h1 class="headline">大学四年，<br />少走一点弯路。</h1>
          <p class="lede">
            导师与科研、竞赛、保研、考研、求职——学长学姐踩过的坑和摸清的门道，整理成可以搜索的文章。面向集美大学计算机工程学院本科生。
          </p>
          <button type="button" class="search" @click="openSearch">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span class="search-text">搜索保研、竞赛、转专业……</span>
            <kbd class="search-key">Ctrl K</kbd>
          </button>
          <a v-if="nextEvent" class="next" :class="{ urgent: nextEvent.urgent }" :href="withBase('/calendar/')">
            <span class="next-label">下一个节点</span>
            <span class="next-title">{{ nextEvent.e.title }}</span>
            <span class="next-when">{{ nextEvent.text }}</span>
            <svg class="next-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </a>
        </div>

        <!-- 最近更新 -->
        <aside v-if="recent.length" class="recent" aria-labelledby="recent-title">
          <h2 id="recent-title" class="recent-title">最近更新</h2>
          <ol class="recent-list">
            <li v-for="a in recent" :key="a.url">
              <a class="recent-item" :href="withBase(a.url)">
                <span class="recent-name">{{ a.title }}</span>
                <span class="recent-meta">
                  <span>{{ sectionByKey(a.section).text }}</span>
                  <time v-if="a.updated" :datetime="new Date(a.updated).toISOString()">{{ fmtDate(a.updated) }}</time>
                </span>
              </a>
            </li>
          </ol>
        </aside>
      </div>
    </section>

    <!-- 四年路线 -->
    <section class="route" aria-labelledby="route-title">
      <div class="wrap">
        <h2 id="route-title" class="section-title">四年里，每个阶段该关心什么</h2>
        <ol class="stages">
          <li v-for="s in STAGES" :key="s.year" class="stage">
            <p class="year">{{ s.year }}</p>
            <h3 class="stage-theme">{{ s.theme }}</h3>
            <ul class="points">
              <li v-for="p in s.points" :key="p">{{ p }}</li>
            </ul>
            <p class="stage-links">
              <a v-for="k in s.links" :key="k" :href="withBase(sectionByKey(k).link)">{{ sectionByKey(k).text }}</a>
            </p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 板块目录 -->
    <section class="directory" aria-labelledby="dir-title">
      <div class="wrap">
        <h2 id="dir-title" class="section-title">全部板块</h2>
        <div class="groups">
          <section v-for="g in GROUPS" :key="g.key" class="group" :aria-labelledby="`group-${g.key}`">
            <h3 :id="`group-${g.key}`" class="group-title">{{ g.text }}</h3>
            <p class="group-desc">{{ g.desc }}</p>
            <ul class="dir-list">
              <li v-for="s in g.sections" :key="s.key">
                <a class="dir-item" :class="{ empty: !counts[s.key] }" :href="withBase(s.link)">
                  <span class="dir-head">
                    <span class="dir-name">{{ s.text }}</span>
                    <span class="dir-count">{{ counts[s.key] ? `${counts[s.key]} 篇` : '征稿中' }}</span>
                  </span>
                  <span class="dir-desc">{{ s.desc }}</span>
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>

    <!-- 投稿 -->
    <section class="contribute">
      <div class="wrap contribute-inner">
        <div>
          <h2 class="contribute-title">这里的每一篇文章，都来自同学投稿</h2>
          <p class="contribute-text">哪怕只是一份时间线或几条踩坑提醒，也能帮到下一届。不会用 GitHub 也可以投稿。</p>
        </div>
        <div class="contribute-actions">
          <a class="btn-primary" :href="withBase('/contribute/')">写一篇投稿</a>
          <a class="btn-plain" :href="withBase('/about/')">关于本站</a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.Home {
  --home-ink: var(--vp-c-text-1);
  --home-muted: var(--vp-c-text-2);
  --home-rule: var(--vp-c-border);
}

.wrap {
  margin: 0 auto;
  max-width: 1152px;
  padding: 0 24px;
}

@media (min-width: 640px) {
  .wrap { padding: 0 48px; }
}

@media (min-width: 960px) {
  .wrap { padding: 0 64px; }
}

/* ---------- 开场 ---------- */
.intro {
  padding: 56px 0 64px;
}

@media (min-width: 960px) {
  .intro { padding: 96px 0 88px; }
}

.headline {
  margin: 0;
  font-size: 36px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--home-ink);
}

@media (min-width: 640px) {
  .headline { font-size: 48px; }
}

@media (min-width: 960px) {
  .headline { font-size: 60px; line-height: 1.2; }
}

.lede {
  margin: 20px 0 0;
  max-width: 36em;
  font-size: 16px;
  line-height: 1.8;
  color: var(--home-muted);
}

@media (min-width: 640px) {
  .lede { font-size: 17px; }
}

.search {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
  width: 100%;
  max-width: 560px;
  height: 52px;
  padding: 0 14px 0 18px;
  border: 1px solid var(--home-ink);
  border-radius: 10px;
  background: var(--vp-c-bg-elv);
  color: var(--home-muted);
  font-size: 15px;
  text-align: left;
  cursor: text;
  transition: box-shadow 0.2s;
}

.search:hover {
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.search-icon {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--home-ink);
  stroke-width: 2;
  stroke-linecap: round;
}

.search-text {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.search-key {
  flex: none;
  padding: 2px 8px;
  border: 1px solid var(--home-rule);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

@media (max-width: 639px) {
  .search-key { display: none; }
}

/* 下一个节点：搜索框下方一行，链接到重要日期页 */
.next {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin-top: 16px;
  max-width: 560px;
  padding: 10px 2px;
  font-size: 14px;
  color: var(--home-muted);
}

.next-label {
  padding: 1px 8px;
  border: 1px solid var(--home-rule);
  border-radius: 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.next-title {
  font-weight: 600;
  color: var(--home-ink);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: text-decoration-color 0.2s;
}

.next:hover .next-title {
  text-decoration-color: currentColor;
}

.next.urgent .next-when {
  font-weight: 600;
  color: var(--home-ink);
}

.next-arrow {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 开场两栏：左侧标题与搜索，右侧最近更新（< 960px 时上下排列） */
.intro-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
}

@media (min-width: 960px) {
  .intro-grid {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: center;
    gap: 64px;
  }
}

.recent-title {
  margin: 0 0 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--home-ink);
  font-size: 14px;
  font-weight: 600;
  color: var(--home-ink);
}

.recent-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recent-list li + li {
  border-top: 1px solid var(--home-rule);
}

.recent-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 0;
  color: inherit;
}

.recent-name {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--home-ink);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: text-decoration-color 0.2s;
}

.recent-item:hover .recent-name {
  text-decoration-color: currentColor;
}

.recent-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* ---------- 四年路线 ---------- */
.route {
  padding: 56px 0 64px;
  border-top: 1px solid var(--home-rule);
}

.section-title {
  margin: 0 0 32px;
  font-size: 22px;
  font-weight: 600;
  color: var(--home-ink);
}

.stages {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .stages { grid-template-columns: repeat(2, 1fr); gap: 48px 40px; }
}

@media (min-width: 1024px) {
  .stages { grid-template-columns: repeat(4, 1fr); gap: 32px; }
}

/* 每个阶段顶部一条粗墨线；年级用超大字号作为本页的视觉重心 */
.stage {
  padding-top: 16px;
  border-top: 3px solid var(--home-ink);
}

.year {
  margin: 0;
  font-size: 64px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--home-ink);
}

@media (min-width: 1024px) {
  .year { font-size: 72px; }
}

.stage-theme {
  margin: 16px 0 12px;
  font-size: 17px;
  font-weight: 600;
  color: var(--home-ink);
}

.points {
  margin: 0;
  padding: 0;
  list-style: none;
}

.points li {
  position: relative;
  padding-left: 14px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--home-muted);
}

.points li + li {
  margin-top: 6px;
}

.points li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.8em;
  width: 6px;
  height: 1px;
  background: var(--home-muted);
}

.stage-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 0;
}

.stage-links a {
  padding: 3px 10px;
  border: 1px solid var(--home-rule);
  border-radius: 999px;
  font-size: 13px;
  color: var(--home-ink);
  transition: border-color 0.2s;
}

.stage-links a:hover {
  border-color: var(--home-ink);
}

/* ---------- 板块目录 ---------- */
.directory {
  padding: 56px 0 72px;
  border-top: 1px solid var(--home-rule);
}

/* 三个大类：桌面三栏，平板及以下上下排列 */
.groups {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

@media (min-width: 960px) {
  .groups {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px;
  }
}

.group-title {
  margin: 0;
  padding-top: 14px;
  border-top: 3px solid var(--home-ink);
  font-size: 18px;
  font-weight: 700;
  color: var(--home-ink);
}

.group-desc {
  margin: 4px 0 8px;
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.dir-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dir-list li {
  border-bottom: 1px solid var(--home-rule);
}

.dir-list li:last-child {
  border-bottom: none;
}

.dir-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 0;
  color: inherit;
}

.dir-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.dir-count {
  flex: none;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 还没有文章的板块：标题变淡，提示「征稿中」 */
.dir-item.empty .dir-name {
  color: var(--vp-c-text-2);
}

.dir-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--home-ink);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 5px;
  transition: text-decoration-color 0.2s;
}

.dir-item:hover .dir-name {
  text-decoration-color: currentColor;
}

.dir-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--home-muted);
}

/* ---------- 投稿 ---------- */
/* 与黑顶栏首尾呼应的深色色带；明暗模式下都是“墨底纸字” */
.contribute {
  padding: 56px 0;
  background: #1f1e1d;
  color: #faf9f5;
}

.contribute-inner {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 960px) {
  .contribute-inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 48px;
  }
}

.contribute-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #faf9f5;
}

.contribute-text {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(250, 249, 245, 0.72);
}

.contribute-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 20px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 22px;
  border-radius: 8px;
  background: #faf9f5;
  color: #1f1e1d;
  font-size: 15px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: #ffffff;
}

.btn-plain {
  font-size: 15px;
  color: rgba(250, 249, 245, 0.82);
  text-decoration: underline;
  text-underline-offset: 5px;
  text-decoration-color: rgba(250, 249, 245, 0.35);
}

.btn-plain:hover {
  color: #faf9f5;
  text-decoration-color: currentColor;
}

.contribute :focus-visible {
  outline-color: #faf9f5;
}

@media (prefers-reduced-motion: reduce) {
  .search,
  .stage-links a,
  .dir-name,
  .recent-name,
  .btn-primary {
    transition: none;
  }
}
</style>
