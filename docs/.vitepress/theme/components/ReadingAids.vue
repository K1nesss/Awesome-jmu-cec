<script setup lang="ts">
// 全站阅读辅助（挂在 layout-bottom 插槽，所有页面生效）
//   1. 回到顶部按钮：向下滚动超过半屏后出现；外圈是阅读进度环，按钮本身兼作“读到哪了”的提示
//   2. 跳转高亮：点击目录 / 锚点链接跳到某个小标题后，该标题背景短暂闪一下，帮助定位
// 滚动监听用 requestAnimationFrame 节流 + passive，不影响滚动性能；尊重“减少动态效果”系统设置
import { onBeforeUnmount, onMounted, ref } from 'vue'

const visible = ref(false)
const progress = ref(0) // 0 ~ 1

const R = 20
const CIRC = 2 * Math.PI * R

let ticking = false
function update() {
  ticking = false
  const y = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  progress.value = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
  visible.value = y > window.innerHeight * 0.5
}
function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(update)
  }
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function toTop() {
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' })
}

// 点击页内锚点（右侧目录、手机折叠目录、标题旁的 #）后高亮目标标题
function onClick(e: MouseEvent) {
  const a = (e.target as HTMLElement | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null
  if (!a || a.origin !== location.origin || a.pathname !== location.pathname || !a.hash) return
  const id = decodeURIComponent(a.hash.slice(1))
  // 等页面滚动到位后再闪
  setTimeout(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.classList.remove('jc-flash')
    void el.offsetWidth // 重新触发动画
    el.classList.add('jc-flash')
    setTimeout(() => el.classList.remove('jc-flash'), 1600)
  }, reduceMotion() ? 0 : 350)
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  document.addEventListener('click', onClick)
  update()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  document.removeEventListener('click', onClick)
})
</script>

<template>
  <button
    type="button"
    class="BackToTop"
    :class="{ show: visible }"
    :tabindex="visible ? 0 : -1"
    :aria-hidden="!visible"
    :title="`回到顶部（已读 ${Math.round(progress * 100)}%）`"
    aria-label="回到顶部"
    @click="toTop"
  >
    <svg class="ring" viewBox="0 0 48 48" aria-hidden="true">
      <circle class="track" cx="24" cy="24" :r="R" />
      <circle class="bar" cx="24" cy="24" :r="R" :stroke-dasharray="CIRC" :stroke-dashoffset="CIRC * (1 - progress)" />
    </svg>
    <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
  </button>
</template>

<style scoped>
.BackToTop {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 25; /* 低于顶栏与手机菜单（30），高于正文 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 4px 14px rgba(31, 30, 29, 0.12);
  color: var(--vp-c-text-1);
  opacity: 0;
  visibility: hidden;
  transform: translateY(12px) scale(0.9);
  transition: opacity 0.25s, transform 0.25s, visibility 0.25s;
}

.BackToTop.show {
  opacity: 1;
  visibility: visible;
  transform: none;
}

.BackToTop:hover .arrow {
  transform: translateY(-2px);
}

@media (max-width: 767px) {
  .BackToTop {
    right: 16px;
    bottom: max(16px, env(safe-area-inset-bottom));
  }
}

.ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg); /* 进度从 12 点方向开始 */
}

.ring circle {
  fill: none;
  stroke-width: 2.5;
}

.track {
  stroke: var(--vp-c-divider);
}

.bar {
  stroke: currentColor;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

.arrow {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .BackToTop,
  .bar,
  .arrow {
    transition: none;
  }
}
</style>
