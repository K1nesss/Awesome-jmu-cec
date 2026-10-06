<script setup>
// 5 套主题色切换（PLAN.md §4.2 / §4.6）：行内 5 个色点，点击切换。
// localStorage 持久化；config.mts 的 head 内联脚本负责首屏前恢复（防闪）。
import { ref, onMounted } from 'vue'

const ACCENTS = [
  { id: 'terracotta', label: '陶土', color: '#D97757' },
  { id: 'sage', label: '鼠尾草', color: '#7C9C6E' },
  { id: 'teal', label: '墨青', color: '#5FA3B2' },
  { id: 'plum', label: '藕紫', color: '#B47FA1' },
  { id: 'amber', label: '琥珀', color: '#D3A54C' },
]

const current = ref('terracotta')

function pick(id) {
  document.documentElement.dataset.accent = id
  try { localStorage.setItem('accent', id) } catch { /* 隐私模式忽略 */ }
  current.value = id
}

onMounted(() => {
  current.value = document.documentElement.dataset.accent || 'terracotta'
})
</script>

<template>
  <div class="accent-switcher" role="radiogroup" aria-label="切换主题色">
    <button
      v-for="a in ACCENTS"
      :key="a.id"
      class="accent-dot"
      :class="{ active: a.id === current }"
      :style="{ background: a.color }"
      :title="a.label"
      :aria-label="a.label"
      role="radio"
      :aria-checked="a.id === current"
      @click="pick(a.id)"
    />
  </div>
</template>

<style scoped>
.accent-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}
.accent-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(250, 249, 245, 0.35);
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s;
}
.accent-dot:hover {
  transform: scale(1.2);
}
.accent-dot.active {
  outline: 2px solid #faf9f5;
  outline-offset: 2px;
}
</style>
