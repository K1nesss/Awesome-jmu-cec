<script setup lang="ts">
// 板块首页的文章列表：在 docs/<板块>/index.md 里写 <ArticleList /> 即可。
// - 自动列出本板块的「指南」与「经验帖」（数据来自 articles.data.ts，新增 .md 自动出现）
// - frontmatter.planned 里的选题若还没人写，显示在「待认领选题」中；写好后（标题一致）自动从待认领移除
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as articles } from '../articles.data'

const { page, frontmatter } = useData()

const section = computed(() => page.value.relativePath.split('/')[0])
const mine = computed(() => articles.filter((a) => a.section === section.value))

const guides = computed(() =>
  mine.value
    .filter((a) => a.type === 'guide')
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-Hans-CN')),
)
const experiences = computed(() =>
  mine.value
    .filter((a) => a.type === 'experience')
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title, 'zh-Hans-CN')),
)

const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()
const planned = computed(() => {
  const written = new Set(mine.value.map((a) => normalize(a.title)))
  const list: unknown = frontmatter.value.planned
  return (Array.isArray(list) ? list : []).map(String).filter((t) => !written.has(normalize(t)))
})

const expMeta = (a: { year: number | null; author: string }) =>
  [a.year ? `${a.year} 届` : '', a.author].filter(Boolean).join('，')
</script>

<template>
  <div class="ArticleList vp-raw">
    <p v-if="mine.length === 0" class="empty">这个板块还没有文章，下面这些选题等你来写。</p>

    <section v-if="guides.length" class="group">
      <h2 class="group-title">指南 <span class="count">{{ guides.length }}</span></h2>
      <p class="group-note">长期维护、每年更新的整理型文章。</p>
      <ul class="rows">
        <li v-for="a in guides" :key="a.url">
          <a class="row" :href="withBase(a.url)">
            <span class="row-title">{{ a.title }}</span>
            <span v-if="a.summary" class="row-summary">{{ a.summary }}</span>
            <span v-if="a.year" class="row-meta">适用于 {{ a.year }} 年</span>
          </a>
        </li>
      </ul>
    </section>

    <section v-if="experiences.length" class="group">
      <h2 class="group-title">经验帖 <span class="count">{{ experiences.length }}</span></h2>
      <p class="group-note">个人经历分享，发布后保持原样，按届次从新到旧排列。</p>
      <ul class="rows">
        <li v-for="a in experiences" :key="a.url">
          <a class="row" :href="withBase(a.url)">
            <span class="row-title">{{ a.title }}</span>
            <span v-if="a.summary" class="row-summary">{{ a.summary }}</span>
            <span v-if="expMeta(a)" class="row-meta">{{ expMeta(a) }}</span>
          </a>
        </li>
      </ul>
    </section>

    <section v-if="planned.length" class="group">
      <h2 class="group-title">待认领选题 <span class="count">{{ planned.length }}</span></h2>
      <p class="group-note">
        还没人写的话题。想写其中一篇，看看<a class="inline-link" :href="withBase('/contribute/')">投稿指南</a>。
      </p>
      <ul class="planned">
        <li v-for="t in planned" :key="t">{{ t }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ArticleList {
  margin-top: 32px;
}

.empty {
  margin: 0 0 32px;
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.group + .group {
  margin-top: 48px;
}

.group-title {
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

.group-note {
  margin: 4px 0 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.rows,
.planned {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--vp-c-border);
}

.rows li,
.planned li {
  border-bottom: 1px solid var(--vp-c-border);
}

.row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 0;
  color: inherit;
  text-decoration: none;
}

.row-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 5px;
  transition: text-decoration-color 0.2s;
}

.row:hover .row-title {
  text-decoration-color: currentColor;
}

.row-summary {
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.row-meta {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.planned li {
  padding: 12px 0;
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.inline-link {
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .row-title {
    transition: none;
  }
}
</style>
