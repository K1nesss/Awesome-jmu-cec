<script setup lang="ts">
// 提问列表：数据是构建时读取的 GitHub「提问」issue（github.data.ts），只列出还没关闭的。
//   <QuestionList />                       问答页：全部提问，可按板块筛选
//   <QuestionList section="baoyan" :limit="5" />  板块首页：本板块最近的几条（ArticleList.vue 末尾）
// 只显示标题和纯文本摘要，不渲染提问里的任何 HTML；点开到 GitHub 阅读和回复。
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { REPO, SECTIONS, sectionByKey } from '../../sections'
import { data as gh } from '../github.data'
import { beijingDay } from '../calendar'

const props = defineProps<{ section?: string; limit?: number }>()

const all = computed(() => gh.questions ?? [])
const failed = computed(() => gh.questions === null)

// 问答页的板块筛选（只列出有提问的板块）
const filter = ref('')
const usedSections = computed(() => {
  const used = new Set(all.value.map((q) => q.section))
  return SECTIONS.filter((s) => used.has(s.key))
})
const hasOther = computed(() => all.value.some((q) => !q.section))

const list = computed(() => {
  let l = all.value
  if (props.section) l = l.filter((q) => q.section === props.section)
  else if (filter.value === '_other') l = l.filter((q) => !q.section)
  else if (filter.value) l = l.filter((q) => q.section === filter.value)
  return props.limit ? l.slice(0, props.limit) : l
})
const total = computed(() => (props.section ? all.value.filter((q) => q.section === props.section).length : all.value.length))

// 去提问：打开预填了标题和板块的表单
const askUrl = computed(() => {
  const text = props.section ? sectionByKey(props.section)?.text : ''
  return `${REPO}/issues/new?template=question.yml&title=${encodeURIComponent('[提问] ')}${text ? `&section=${encodeURIComponent(text)}` : ''}`
})
const githubList = `${REPO}/issues?q=${encodeURIComponent('is:issue is:open label:提问')}`

// 日期：先按构建时间显示「10月6日」，挂载后换成「3 天前」这类相对时间（与页脚更新时间同样的处理）
const now = ref(0)
onMounted(() => (now.value = Date.now()))
const DATE_FMT = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' })
function when(ms: number) {
  if (!now.value) {
    const p = Object.fromEntries(DATE_FMT.formatToParts(ms).map((x) => [x.type, x.value]))
    return `${p.month}月${p.day}日`
  }
  const days = Math.round((Date.parse(beijingDay(now.value)) - Date.parse(beijingDay(ms))) / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  const p = Object.fromEntries(DATE_FMT.formatToParts(ms).map((x) => [x.type, x.value]))
  return `${p.month}月${p.day}日`
}

</script>

<template>
  <section class="QuestionList vp-raw" :class="{ compact: !!section }">
    <!-- 板块首页：小标题 + 去提问 -->
    <header v-if="section" class="head">
      <h2 class="title">本板块的提问 <span v-if="total" class="count">{{ total }}</span></h2>
      <a class="ask no-icon" :href="askUrl" target="_blank" rel="noopener">在这个板块提问</a>
    </header>
    <!-- 问答页：去提问 + 筛选 -->
    <template v-else>
      <div class="intro-actions">
        <a class="ask primary no-icon" :href="askUrl" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          我要提问
        </a>
        <span class="ask-note">在 GitHub 填写，需要登录 GitHub 账号</span>
      </div>
      <div v-if="usedSections.length > 1 || (usedSections.length && hasOther)" class="filters" role="group" aria-label="按板块筛选">
        <button type="button" :class="{ on: !filter }" :aria-pressed="!filter" @click="filter = ''">全部 {{ all.length }}</button>
        <button
          v-for="s in usedSections"
          :key="s.key"
          type="button"
          :class="{ on: filter === s.key }"
          :aria-pressed="filter === s.key"
          @click="filter = s.key"
        >
          {{ s.text }}
        </button>
        <button v-if="hasOther" type="button" :class="{ on: filter === '_other' }" :aria-pressed="filter === '_other'" @click="filter = '_other'">
          其他
        </button>
      </div>
    </template>

    <p v-if="failed" class="state">
      暂时无法加载提问列表，可以<a class="no-icon" :href="githubList" target="_blank" rel="noopener">到 GitHub 查看</a>。
    </p>
    <p v-else-if="!list.length" class="state">
      {{ section ? '这个板块还没有人提问。' : '现在没有待解决的提问。' }}有问题就问吧，学长学姐会在下面回复。
    </p>

    <ul v-else class="rows">
      <li v-for="q in list" :key="q.number">
        <a class="row no-icon" :href="q.url" target="_blank" rel="noopener">
          <span class="row-title">{{ q.title }}</span>
          <span v-if="q.excerpt" class="row-excerpt">{{ q.excerpt }}</span>
          <span class="row-meta">
            <span v-if="!section && q.section" class="tag">{{ sectionByKey(q.section)?.text }}</span>
            <span :class="q.comments ? 'replies' : 'waiting'">{{ q.comments ? `${q.comments} 条回复` : '等待回答' }}</span>
            <time :datetime="new Date(q.created).toISOString()">{{ when(q.created) }}</time>
          </span>
        </a>
      </li>
    </ul>

    <p v-if="section && total > list.length" class="more">
      <a :href="withBase('/questions/')">查看全部 {{ total }} 条提问 →</a>
    </p>
    <p v-if="!section && !failed" class="foot">
      列表在有人提问或关闭提问后一两分钟内更新。问题解决后，请在 GitHub 上点击「Close issue」关闭，它会从这里消失。
    </p>
  </section>
</template>

<style scoped>
.QuestionList.compact {
  margin-top: 48px;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 16px;
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: none;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.count {
  font-size: 14px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.ask {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, opacity 0.2s;
}

.ask:hover {
  border-color: var(--vp-c-text-1);
}

.ask.primary {
  min-height: 44px;
  padding: 0 20px;
  border-color: var(--vp-c-text-1);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-size: 15px;
  font-weight: 600;
}

.ask.primary:hover {
  opacity: 0.88;
}

.ask svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin: 24px 0 8px;
}

.ask-note {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 24px 0 16px;
}

.filters button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, background-color 0.2s, color 0.2s;
}

.filters button:hover {
  border-color: var(--vp-c-text-1);
}

.filters button.on {
  border-color: var(--vp-c-text-1);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-weight: 600;
}

.state {
  margin: 16px 0 0;
  padding: 16px 18px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.state a,
.more a {
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rows {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--vp-c-border);
}

.compact .rows {
  margin-top: 0;
}

.rows li {
  border-bottom: 1px solid var(--vp-c-border);
}

.row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 0;
  color: inherit;
  text-decoration: none;
}

.row-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 5px;
  transition: text-decoration-color 0.2s;
}

.row:hover .row-title {
  text-decoration-color: currentColor;
}

.row-excerpt {
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 2px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.tag {
  padding: 0 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  color: var(--vp-c-text-2);
}

/* 还没人回复的提问：用实心小标签突出（不靠颜色） */
.waiting {
  padding: 0 8px;
  border-radius: 4px;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-weight: 600;
}

.more {
  margin: 12px 0 0;
  font-size: 14px;
}

.foot {
  margin: 20px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-3);
}

@media (prefers-reduced-motion: reduce) {
  .row-title,
  .ask,
  .filters button {
    transition: none;
  }
}
</style>
