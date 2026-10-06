<script setup lang="ts">
// 文章信息行 + 过时提醒（挂在 doc-before 插槽，只在板块文章页显示，板块首页 / 投稿 / 关于不显示）
//   信息行：类型（指南 / 经验帖）、适用年份或届次、作者
//   过时提醒：指南超过 12 个月没更新或适用年份已是两年前；经验帖距今 2 年及以上
// “现在几点”只能在浏览器里算（构建时间 ≠ 阅读时间），所以提醒在挂载后才计算，避免服务端渲染不一致
import { computed, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { SECTIONS } from '../../sections'

const { page, frontmatter } = useData()

const SECTION_KEYS = new Set(SECTIONS.map((s) => s.key))
const isArticle = computed(() => {
  const path = page.value.relativePath
  const segs = path.split('/')
  return SECTION_KEYS.has(segs[0]) && !path.endsWith('index.md') && !segs[segs.length - 1].startsWith('_')
})

const type = computed(() =>
  frontmatter.value.type === 'experience' || page.value.relativePath.includes('/experiences/') ? 'experience' : 'guide',
)
const year = computed(() => Number(frontmatter.value.year) || null)
const author = computed(() => (frontmatter.value.author ? String(frontmatter.value.author) : ''))

const notice = ref('')
onMounted(() => {
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
})
</script>

<template>
  <div v-if="isArticle" class="ArticleMeta">
    <p class="meta">
      <span class="type" :class="type">{{ type === 'experience' ? '经验帖' : '指南' }}</span>
      <span v-if="year">{{ type === 'experience' ? `${year} 届` : `适用于 ${year} 年` }}</span>
      <span v-if="author">作者：{{ author }}</span>
    </p>
    <p v-if="notice" class="notice" role="note">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
      <span>{{ notice }}</span>
    </p>
  </div>
</template>

<style scoped>
.ArticleMeta {
  margin-bottom: 20px;
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
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 3px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
</style>
