<script setup lang="ts">
// 明暗切换：图标按钮，替换默认主题的滑块开关（通过 config.mts 的 vite alias 覆盖 VPSwitchAppearance.vue）
// 初始跟随系统（appearance: true → 'auto'）；手动切换后记住选择，切回与系统一致时自动恢复“跟随系统”
import { inject, ref, watchPostEffect } from 'vue'
import { useData } from 'vitepress'

const { isDark, theme } = useData()

// 默认主题在 Layout 中 provide 了带过渡动画的切换函数，拿不到时直接翻转
const toggleAppearance = inject('toggle-appearance', () => {
  isDark.value = !isDark.value
})

const title = ref('')
watchPostEffect(() => {
  title.value = isDark.value
    ? theme.value.lightModeSwitchTitle || '切换到浅色模式'
    : theme.value.darkModeSwitchTitle || '切换到深色模式'
})
</script>

<template>
  <button
    type="button"
    class="ThemeToggle"
    :title="title"
    :aria-label="title"
    :aria-pressed="isDark"
    @click="toggleAppearance"
  >
    <!-- 两个图标都渲染、用 .dark 类切换显示，避免服务端渲染与首屏系统主题不一致导致闪烁 -->
    <span class="vpi-sun icon sun" aria-hidden="true" />
    <span class="vpi-moon icon moon" aria-hidden="true" />
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
  width: 18px;
  height: 18px;
}

.moon,
:global(.dark) .sun {
  display: none;
}

:global(.dark) .moon {
  display: inline-block;
}
</style>
