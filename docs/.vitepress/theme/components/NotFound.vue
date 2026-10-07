<script setup lang="ts">
// 404 页面（挂在默认主题的 not-found 插槽）：
//   1. 地址里带着某个板块（如 /baoyan/旧文章名）时，优先推荐该板块——文章多半只是改了名
//   2. 搜索全站 / 返回首页
//   3. 文章最多的几个板块
//   4. 从站内链接点进来的，可以一键报告失效链接
// 访问的地址只能在浏览器里得到，所以 1、4 在挂载后计算
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { REPO, SECTIONS, sectionByKey } from '../../sections'
import { data as articles } from '../articles.data'

const path = ref('')
const fromSite = ref(false)
onMounted(() => {
  path.value = decodeURI(location.pathname)
  fromSite.value = !!document.referrer && new URL(document.referrer).origin === location.origin
})

const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const a of articles) c[a.section] = (c[a.section] || 0) + 1
  return c
})

// 地址第一段是板块目录名时，推荐这个板块
const guess = computed(() => {
  const key = path.value.replace(withBase('/'), '/').split('/')[1]
  return SECTIONS.some((s) => s.key === key) ? sectionByKey(key) : null
})

// 文章最多的 6 个板块（不含已推荐的那个）
const popular = computed(() =>
  SECTIONS.filter((s) => counts.value[s.key] && s.key !== guess.value?.key)
    .sort((a, b) => counts.value[b.key] - counts.value[a.key])
    .slice(0, 6),
)

const reportLink = computed(
  () =>
    `${REPO}/issues/new?template=correction.yml&title=${encodeURIComponent(`[失效链接] ${path.value}`)}` +
    `&page=${encodeURIComponent(path.value)}` +
    `&problem=${encodeURIComponent(`从这个页面点进来时遇到 404：${document.referrer}`)}`,
)

function openSearch() {
  document.querySelector<HTMLButtonElement>('#local-search .DocSearch-Button')?.click()
}
</script>

<template>
  <div class="NotFound">
    <p class="code">404</p>
    <h1 class="title">页面不存在</h1>
    <p class="text">
      这个地址没有对应的文章，它可能被移动、改名，或者还没写出来。
      <code v-if="path" class="path">{{ path }}</code>
    </p>

    <div class="actions">
      <button type="button" class="btn primary" @click="openSearch">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        搜索全站
      </button>
      <a class="btn" :href="withBase('/')">返回首页</a>
    </div>

    <a v-if="guess" class="guess" :href="withBase(guess.link)">
      <span class="guess-label">你可能在找</span>
      <span class="guess-name">{{ guess.text }}</span>
      <span class="guess-desc">{{ guess.desc }}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </a>

    <section v-if="popular.length" class="popular" aria-labelledby="nf-popular">
      <h2 id="nf-popular">{{ guess ? '其他常看的板块' : '常看的板块' }}</h2>
      <ul>
        <li v-for="s in popular" :key="s.key">
          <a :href="withBase(s.link)">
            <span class="name">{{ s.text }}</span>
            <span class="count">{{ counts[s.key] }} 篇</span>
          </a>
        </li>
      </ul>
    </section>

    <p v-if="fromSite" class="report">
      是从本站的链接点进来的？<a class="no-icon" :href="reportLink" target="_blank" rel="noopener">告诉我们这个链接失效了</a>
    </p>
  </div>
</template>

<style scoped>
.NotFound {
  margin: 0 auto;
  max-width: 640px;
  padding: 64px 24px 96px;
}

@media (min-width: 768px) {
  .NotFound {
    padding: 96px 32px 128px;
  }
}

.code {
  margin: 0;
  font-size: 88px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
}

@media (min-width: 768px) {
  .code {
    font-size: 120px;
  }
}

.title {
  margin: 20px 0 0;
  padding-top: 16px;
  border-top: 3px solid var(--vp-c-text-1);
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.text {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.path {
  display: block;
  margin-top: 8px;
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid var(--vp-c-text-1);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  transition: background-color 0.2s, color 0.2s;
}

.btn:hover {
  background: var(--vp-c-default-soft);
}

.btn.primary {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.btn.primary:hover {
  opacity: 0.88;
}

.btn svg,
.guess svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 479px) {
  .btn {
    flex: 1;
  }
}

.guess {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 2px 12px;
  margin-top: 36px;
  padding: 16px 18px;
  border: 1px solid var(--vp-c-border);
  border-left: 3px solid var(--vp-c-text-1);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  color: inherit;
  transition: border-color 0.2s;
}

.guess:hover {
  border-color: var(--vp-c-text-1);
}

.guess-label {
  grid-column: 1;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.guess-name {
  grid-column: 1;
  font-size: 17px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.guess-desc {
  grid-column: 1;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.guess svg {
  grid-column: 2;
  grid-row: 1 / span 3;
  color: var(--vp-c-text-2);
}

.popular {
  margin-top: 40px;
}

.popular h2 {
  margin: 0 0 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.popular ul {
  display: grid;
  grid-template-columns: 1fr;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 560px) {
  .popular ul {
    grid-template-columns: 1fr 1fr;
    column-gap: 32px;
  }
}

.popular li {
  border-bottom: 1px solid var(--vp-c-border);
}

.popular a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.popular a:hover .name {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.count {
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.report {
  margin: 32px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.report a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .guess {
    transition: none;
  }
}
</style>
