<script setup lang="ts">
// 顶栏右侧的图标按钮（挂在 nav-bar-content-after 插槽）：
//   - 校园地图：宽屏排在主题切换按钮右侧；平板在「…」菜单旁；手机在 ☰ 左侧
//   - 主题切换：手机上也直接放在顶栏（宽屏由默认主题的位置显示，平板在「…」菜单里），不再藏进 ☰ 菜单
// 两个按钮用同一套尺寸和配色（与 ThemeToggle.vue 一致：36px、图标 18px、线宽 1.8、灰色→悬停变亮）
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import ThemeToggle from './ThemeToggle.vue'

const { page } = useData()
const active = computed(() => page.value.relativePath === 'map/index.md')
</script>

<template>
  <span class="NavIcons">
    <span class="mobile-theme"><ThemeToggle /></span>
    <a class="NavMapLink" :class="{ active }" :href="withBase('/map/')" aria-label="校园地图" title="校园地图" :aria-current="active ? 'page' : undefined">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
    </a>
  </span>
</template>

<style scoped>
.NavIcons {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 主题按钮只在手机顶栏显示 */
.mobile-theme {
  display: none;
}

@media (max-width: 767px) {
  .mobile-theme {
    display: flex;
  }
}

.NavMapLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--vp-c-text-2);
  transition: color 0.2s, background-color 0.2s;
}

.NavMapLink:hover {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-default-soft);
}

/* 当前就在地图页：图标变亮（不加边框，和主题按钮保持同一种样子） */
.NavMapLink.active {
  color: var(--vp-c-text-1);
}

.NavMapLink svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (prefers-reduced-motion: reduce) {
  .NavMapLink {
    transition: none;
  }
}
</style>
