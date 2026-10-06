<script setup lang="ts">
// 主题切换：三态图标按钮「跟随系统 → 浅色 → 深色 → 跟随系统」
// 覆盖默认主题的 VPSwitchAppearance.vue（见 config.mts 的 vite alias），顶栏、「…」菜单、手机抽屉三处共用。
//
// 与 VitePress 的明暗状态如何同步：
//   VitePress 用 @vueuse/core 的 useDark 把选择存在 localStorage['vitepress-theme-appearance']（auto/light/dark）。
//   这里用同一个 key 的 useColorMode 写入，vueuse 会在同一页面内广播存储变更，VitePress 的 isDark 随之更新。
//   不能直接改 isDark：它在“所选模式恰好等于系统模式”时会存成 auto，选了「浅色」刷新后又变回「跟随系统」。
//
// 首屏不闪：config.mts 的 head 内联脚本在渲染前把当前模式写到 <html data-theme-mode>，
// 三个图标都渲染、由 CSS 按该属性显示其一，服务端渲染与客户端结果一致。
import { computed, watchEffect } from 'vue'
import { useColorMode } from '@vueuse/core'

type Mode = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'vitepress-theme-appearance'
const ORDER: Mode[] = ['auto', 'light', 'dark']
const LABEL: Record<Mode, string> = { auto: '跟随系统', light: '浅色', dark: '深色' }

const { store } = useColorMode({
  storageKey: STORAGE_KEY,
  initialValue: 'auto',
  modes: { dark: 'dark', light: '' },
})

const mode = computed<Mode>(() => (ORDER.includes(store.value as Mode) ? (store.value as Mode) : 'auto'))
const next = computed<Mode>(() => ORDER[(ORDER.indexOf(mode.value) + 1) % ORDER.length])
const title = computed(() => `主题：${LABEL[mode.value]}（点击切换为${LABEL[next.value]}）`)

watchEffect(() => {
  if (typeof document !== 'undefined') document.documentElement.dataset.themeMode = mode.value
})

function cycle() {
  store.value = next.value
}
</script>

<template>
  <button type="button" class="ThemeToggle" :title="title" :aria-label="title" @click="cycle">
    <!-- 当前模式文字：只在菜单里的「主题」行显示（顶栏里只显示图标），见 polish.css -->
    <span class="tt-text" aria-hidden="true">
      <span class="tt-text-auto">跟随系统</span>
      <span class="tt-text-light">浅色</span>
      <span class="tt-text-dark">深色</span>
    </span>
    <!-- 跟随系统：显示器 -->
    <svg class="icon tt-auto" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
    <!-- 浅色：太阳 -->
    <svg class="icon tt-light" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
    <!-- 深色：月亮 -->
    <svg class="icon tt-dark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.7 6.7 0 0 0 10.7 10.7z" />
    </svg>
  </button>
</template>

<style scoped>
.ThemeToggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--vp-c-text-2);
  transition: color 0.2s, background-color 0.2s;
}

.ThemeToggle:hover {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-default-soft);
}

.icon {
  display: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 文字标签默认隐藏；三段文字与图标一样按 <html data-theme-mode> 显示其一（避免首屏闪烁与 SSR 不一致） */
.tt-text {
  display: none;
  font-size: 14px;
}

.tt-text-light,
.tt-text-dark,
:global(html[data-theme-mode='light'] .ThemeToggle .tt-text-auto),
:global(html[data-theme-mode='dark'] .ThemeToggle .tt-text-auto) {
  display: none;
}

:global(html[data-theme-mode='light'] .ThemeToggle .tt-text-light),
:global(html[data-theme-mode='dark'] .ThemeToggle .tt-text-dark) {
  display: inline;
}

/* 默认（属性尚未写入时）显示「跟随系统」 */
.tt-auto,
:global(html[data-theme-mode='light'] .ThemeToggle .tt-light),
:global(html[data-theme-mode='dark'] .ThemeToggle .tt-dark) {
  display: block;
}

:global(html[data-theme-mode='light'] .ThemeToggle .tt-auto),
:global(html[data-theme-mode='dark'] .ThemeToggle .tt-auto) {
  display: none;
}
</style>
