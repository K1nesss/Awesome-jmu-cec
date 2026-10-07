<script setup lang="ts">
// 顶栏的「校园地图」图标：紧挨主题切换按钮（宽屏）；手机上在菜单按钮左边
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

const { page } = useData()
const active = computed(() => page.value.relativePath === 'map/index.md')
</script>

<template>
  <a class="NavMapLink" :class="{ active }" :href="withBase('/map/')" aria-label="校园地图" title="校园地图" :aria-current="active ? 'page' : undefined">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
  </a>
</template>

<style scoped>
.NavMapLink {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  color: var(--vp-c-text-1);
  transition: background-color 0.2s;
}

.NavMapLink:hover,
.NavMapLink.active {
  background: var(--vp-c-default-soft);
}

.NavMapLink.active {
  outline: 1px solid currentColor;
}

.NavMapLink svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 宽屏：排在主题切换按钮右侧、GitHub 图标左侧（顶栏内容区是 flex，用 order 调整位置） */
@media (min-width: 1280px) {
  .NavMapLink {
    order: 1;
    margin-left: 4px;
  }
}

@media (max-width: 767px) {
  .NavMapLink {
    margin-right: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .NavMapLink {
    transition: none;
  }
}
</style>
