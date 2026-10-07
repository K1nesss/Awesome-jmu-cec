<script setup lang="ts">
// 替换默认主题页脚的「最后更新于: 2026/10/6 19:55」（config.mts 的 vite alias 覆盖 VPDocFooterLastUpdated.vue）
// 显示「更新于 3 天前」这样的相对时间，鼠标悬停看完整日期。
// 构建时（服务端）先按北京时间显示日期，挂载后换成相对时间，避免服务端与浏览器渲染不一致
import { computed, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { beijingDay } from '../calendar'

const { page } = useData()
const ts = computed(() => page.value.lastUpdated || 0)

const DATE_FMT = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' })
const full = computed(() => (ts.value ? DATE_FMT.format(ts.value) : ''))

const now = ref(0)
onMounted(() => (now.value = Date.now()))

// 按北京时间的自然日计算：今天、昨天、N 天前、N 个月前、N 年前
function relative(t: number, n: number) {
  const days = Math.round((Date.parse(beijingDay(n)) - Date.parse(beijingDay(t))) / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

const text = computed(() => (now.value ? relative(ts.value, now.value) : full.value))
</script>

<template>
  <p v-if="ts" class="VPLastUpdated">
    更新于 <time :datetime="new Date(ts).toISOString()" :title="full">{{ text }}</time>
  </p>
</template>

<style scoped>
.VPLastUpdated {
  line-height: 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

@media (min-width: 640px) {
  .VPLastUpdated {
    line-height: 32px;
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
