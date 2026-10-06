<script setup lang="ts">
// 文章页正文上方（挂在 doc-before 插槽，只在板块文章页显示，板块首页 / 投稿 / 关于不显示）
//   1. 返回板块：「← 保研」，一步回到板块首页（那里有本板块全部文章）；仅 < 960px（无侧栏时）显示
//   2. 信息行：类型（指南 / 经验帖）、适用年份或届次、作者、预计阅读时间；右侧「复制链接」（方便转发到微信 / QQ 群）
//   3. 过时提醒：指南超过 12 个月没更新或适用年份已是两年前；经验帖距今 2 年及以上
//   4. 本页目录：可折叠，只在 < 1280px（右侧目录栏不显示时）且有 3 个及以上小标题时出现，
//      取代默认主题顶栏下方的「菜单 / 本页目录」栏
// “现在几点”和“页面有哪些标题”只能在浏览器里得到，所以 3、4 在挂载及每次切换文章后计算，
// 避免服务端渲染不一致；站内跳转时组件会复用，因此不能只在 onMounted 里算一次
import { computed, nextTick, ref } from 'vue'
import { onContentUpdated, useData, withBase } from 'vitepress'
import { SECTIONS, sectionByKey } from '../../sections'

const { page, frontmatter } = useData()

const SECTION_KEYS = new Set(SECTIONS.map((s) => s.key))
const isArticle = computed(() => {
  const path = page.value.relativePath
  const segs = path.split('/')
  return SECTION_KEYS.has(segs[0]) && !path.endsWith('index.md') && !segs[segs.length - 1].startsWith('_')
})
const section = computed(() => (isArticle.value ? sectionByKey(page.value.relativePath.split('/')[0]) : null))

const type = computed(() =>
  frontmatter.value.type === 'experience' || page.value.relativePath.includes('/experiences/') ? 'experience' : 'guide',
)
const year = computed(() => Number(frontmatter.value.year) || null)
const author = computed(() => (frontmatter.value.author ? String(frontmatter.value.author) : ''))

const notice = ref('')
const headings = ref<{ id: string; text: string; level: number }[]>([])
const tocOpen = ref(false)
const minutes = ref(0)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

// 预计阅读时间：中文按每分钟约 400 字、英文按每分钟约 200 词估算
function computeReadingTime() {
  const text = document.querySelector<HTMLElement>('.VPDoc .vp-doc')?.innerText || ''
  const cjk = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length
  const words = (text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  minutes.value = Math.max(1, Math.round(cjk / 400 + words / 200))
}

// 折叠目录里的跳转：先收起目录再滚动——否则收起会让页面上移，标题被顶出屏幕
async function goTo(id: string) {
  tocOpen.value = false
  await nextTick()
  const el = document.getElementById(id)
  if (!el) return
  // 顶栏在 ≥960px 时固定在顶部，需要额外留出它的高度
  const navFixed = window.matchMedia('(min-width: 960px)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - (navFixed ? 64 : 0) - 16
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
  history.replaceState(history.state, '', `#${encodeURIComponent(id)}`)
}

// 复制当前文章链接（不带页内锚点）；剪贴板 API 不可用时退回旧方法
async function copyLink() {
  const url = location.href.split('#')[0]
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 2000)
}

function computeNotice() {
  notice.value = ''
  const now = new Date()
  const thisYear = now.getFullYear()
  if (type.value === 'experience') {
    if (year.value && thisYear - year.value >= 2) {
      notice.value = `这是 ${year.value} 届同学的经验，距今已有 ${thisYear - year.value} 年，部分政策与流程可能已经变化，请结合最新通知参考。`
    }
    return
  }
  // 指南：两条规则任一满足即提醒——超过一年没有更新；或内容标注的适用年份已是两年前
  const updated = page.value.lastUpdated
  if (updated && (now.getTime() - updated) / 86400000 > 365) {
    const d = new Date(updated)
    notice.value = `本文已超过一年没有更新（最后更新于 ${d.getFullYear()} 年 ${d.getMonth() + 1} 月），政策、名额与时间节点可能已有变化，请以学校与学院最新通知为准。`
  } else if (year.value && thisYear - year.value >= 2) {
    notice.value = `本文内容适用于 ${year.value} 年，政策、名额与时间节点可能已有变化，请以学校与学院最新通知为准。`
  }
}

function collectHeadings() {
  headings.value = [...document.querySelectorAll<HTMLElement>('.VPDoc .vp-doc :is(h2, h3)')]
    .filter((h) => h.id)
    .map((h) => ({
      id: h.id,
      // 去掉标题末尾自动生成的 # 锚点符号
      text: (h.firstChild?.textContent || h.textContent || '').replace(/\s*#\s*$/, '').trim(),
      level: h.tagName === 'H3' ? 3 : 2,
    }))
}

onContentUpdated(() => {
  tocOpen.value = false
  if (!isArticle.value) return
  copied.value = false
  computeNotice()
  collectHeadings()
  computeReadingTime()
})
</script>

<template>
  <div v-if="isArticle" class="ArticleMeta">
    <a v-if="section" class="back" :href="withBase(section.link)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      {{ section.text }}
    </a>

    <p class="meta">
      <span class="type" :class="type">{{ type === 'experience' ? '经验帖' : '指南' }}</span>
      <span v-if="year">{{ type === 'experience' ? `${year} 届` : `适用于 ${year} 年` }}</span>
      <span v-if="author">作者：{{ author }}</span>
      <span v-if="minutes">约 {{ minutes }} 分钟读完</span>
      <button type="button" class="copy" :class="{ done: copied }" @click="copyLink">
        <svg v-if="!copied" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        <span aria-live="polite">{{ copied ? '已复制' : '复制链接' }}</span>
      </button>
    </p>

    <p v-if="notice" class="notice" role="note">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
      <span>{{ notice }}</span>
    </p>

    <details v-if="headings.length >= 3" class="toc" :open="tocOpen" @toggle="tocOpen = ($event.target as HTMLDetailsElement).open">
      <summary>
        <span>本页目录</span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      <!-- vp-raw：让 VitePress 路由不接管这些锚点（它会在目录收起前就算好滚动位置），由 goTo 处理 -->
      <ul class="vp-raw">
        <li v-for="h in headings" :key="h.id" :class="{ sub: h.level === 3 }">
          <a :href="`#${h.id}`" @click.prevent="goTo(h.id)">{{ h.text }}</a>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.ArticleMeta {
  margin-bottom: 20px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0 0 12px -4px;
  padding: 6px 8px 6px 2px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  transition: color 0.2s, background-color 0.2s;
}

/* 桌面端左侧侧栏常驻（含「板块概览」），不再重复显示 */
@media (min-width: 960px) {
  .back {
    display: none;
  }
}

.back:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.back svg,
.copy svg,
.chev,
.notice svg {
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.back svg {
  width: 18px;
  height: 18px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.type {
  padding: 1px 8px;
  border: 1px solid var(--vp-c-text-1);
  border-radius: 4px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* 复制链接：推到信息行最右侧 */
.copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  transition: color 0.2s, background-color 0.2s;
}

.copy:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.copy.done {
  color: var(--vp-c-text-1);
}

.copy svg {
  width: 15px;
  height: 15px;
}

/* 经验帖用实心标签与指南区分（不靠颜色，靠填充） */
.type.experience {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.notice {
  display: flex;
  gap: 10px;
  margin: 16px 0 0;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-border);
  border-left: 3px solid var(--vp-c-text-1);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

.notice svg {
  width: 18px;
  height: 18px;
  margin-top: 3px;
}

/* ---------- 可折叠的本页目录 ---------- */
.toc {
  margin-top: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
}

/* 宽屏右侧已有目录栏 */
@media (min-width: 1280px) {
  .toc {
    display: none;
  }
}

.toc summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  cursor: pointer;
  list-style: none;
}

.toc summary::-webkit-details-marker {
  display: none;
}

.chev {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.toc[open] .chev {
  transform: rotate(180deg);
}

.toc ul {
  margin: 0;
  padding: 4px 14px 10px;
  list-style: none;
  border-top: 1px solid var(--vp-c-border);
}

.toc li a {
  display: block;
  padding: 8px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.toc li a:hover {
  color: var(--vp-c-text-1);
}

.toc li.sub a {
  padding-left: 14px;
}

@media (prefers-reduced-motion: reduce) {
  .chev,
  .back {
    transition: none;
  }
}
</style>
