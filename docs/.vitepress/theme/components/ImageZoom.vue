<script setup lang="ts">
// 文章图片点击放大。
//   宽屏（≥ 768px）：medium-zoom，图片平滑放大到适合窗口的大小，点击或滚动即收起。
//   手机：放大到“适合屏幕宽度”对横向截图几乎没有帮助，所以改用全屏查看器——
//         打开时先完整显示，双击图片放大到可以看清小字的尺寸，手指拖动查看各处，再双击还原；
//         点 × 、点图片外的空白处或按 Esc 关闭。浏览器自带的双指缩放也照常可用。
// 不想被放大的图片（如图标、徽章）在 Markdown 里写 ![说明](./a.png){.no-zoom}；链接里的图片也不放大
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onContentUpdated } from 'vitepress'
import mediumZoom, { type Zoom } from 'medium-zoom'

const SELECTOR = '.vp-doc :not(a) > img:not(.no-zoom)'
const NARROW = '(max-width: 767px)'

let zoom: Zoom | undefined
let mq: MediaQueryList | undefined

// ---------- 宽屏：medium-zoom ----------
function bind() {
  zoom?.detach()
  zoom = undefined
  if (mq?.matches) {
    // 手机上图片也显示放大镜光标提示可点（触屏上看不到光标，主要给窄窗口的桌面浏览器）
    document.querySelectorAll<HTMLImageElement>(SELECTOR).forEach((img) => img.classList.add('jc-zoomable'))
    return
  }
  zoom = mediumZoom(SELECTOR, { background: 'var(--vp-c-bg)', margin: 24 })
}

onContentUpdated(bind)

// ---------- 手机：全屏查看器 ----------
const viewer = ref<{ src: string; alt: string; caption: string } | null>(null)
const zoomed = ref(false)
const scroller = ref<HTMLDivElement>()
const image = ref<HTMLImageElement>()
let lastTap = 0

function onDocClick(e: MouseEvent) {
  if (!mq?.matches) return
  const img = (e.target as Element)?.closest?.('img')
  if (!img || !img.matches(SELECTOR)) return
  e.preventDefault()
  const caption = img.closest('figure')?.querySelector('figcaption')?.textContent || ''
  viewer.value = { src: img.currentSrc || img.src, alt: img.alt, caption }
  zoomed.value = false
  document.documentElement.classList.add('jc-viewer-open')
}

function close() {
  viewer.value = null
  document.documentElement.classList.remove('jc-viewer-open')
}

// 双击（两次点按间隔 < 300ms）在“完整显示”和“放大”之间切换；放大后让点按的位置留在手指下
async function onImageTap(e: MouseEvent) {
  const now = Date.now()
  const isDouble = now - lastTap < 300
  lastTap = isDouble ? 0 : now
  if (!isDouble) return
  const el = image.value
  const box = scroller.value
  if (!el || !box) return
  const r = el.getBoundingClientRect()
  const fx = (e.clientX - r.left) / r.width
  const fy = (e.clientY - r.top) / r.height
  zoomed.value = !zoomed.value
  await nextTick()
  if (zoomed.value) {
    box.scrollLeft = fx * el.offsetWidth - box.clientWidth / 2
    box.scrollTop = fy * el.offsetHeight - box.clientHeight / 2
  }
}

// 放大后的宽度：一般放大到屏幕宽度的 3 倍（不超过原图尺寸），至少 2 倍
function zoomedWidth() {
  const natural = image.value?.naturalWidth || 0
  const vw = window.innerWidth
  return Math.max(vw * 2, Math.min(natural, vw * 3))
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && viewer.value) close()
}

function onMqChange() {
  close()
  bind()
}

onMounted(() => {
  mq = window.matchMedia(NARROW)
  mq.addEventListener('change', onMqChange)
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('keydown', onKey)
  bind()
})

onBeforeUnmount(() => {
  zoom?.detach()
  mq?.removeEventListener('change', onMqChange)
  document.removeEventListener('click', onDocClick, true)
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('jc-viewer-open')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="jc-viewer">
      <div v-if="viewer" class="ImageViewer" role="dialog" aria-modal="true" :aria-label="viewer.alt || '查看图片'">
        <div ref="scroller" class="scroller" :class="{ zoomed }" @click.self="close">
          <img
            ref="image"
            :src="viewer.src"
            :alt="viewer.alt"
            :style="zoomed ? { width: `${zoomedWidth()}px`, maxWidth: 'none' } : undefined"
            @click="onImageTap"
          />
        </div>
        <button type="button" class="close" aria-label="关闭图片" @click="close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <p class="bar">
          <span v-if="viewer.caption" class="cap">{{ viewer.caption }}</span>
          <span class="hint">{{ zoomed ? '拖动查看 · 双击还原' : '双击图片放大' }}</span>
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 查看器在明暗模式下都用深色底，和顶栏一致，也更适合看图 */
.ImageViewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #141312;
  color: #faf9f5;
}

.scroller {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 56px 12px 72px;
}

.scroller.zoomed {
  display: block;
  padding: 56px 0 72px;
}

.scroller img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  height: auto;
  border-radius: 4px;
  background: #fff;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation; /* 关掉浏览器自己的双击缩放，双击交给查看器；双指缩放不受影响 */
}

.scroller.zoomed img {
  max-height: none;
  margin: 0 auto;
}

.close {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: #faf9f5;
}

.close svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.close:focus-visible {
  outline: 2px solid #faf9f5;
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 12px 20px calc(16px + env(safe-area-inset-bottom));
  text-align: center;
  pointer-events: none;
  background: linear-gradient(transparent, rgba(20, 19, 18, 0.9) 40%);
}

.cap {
  font-size: 14px;
  line-height: 1.6;
}

.hint {
  font-size: 12px;
  color: rgba(250, 249, 245, 0.6);
}

.jc-viewer-enter-active,
.jc-viewer-leave-active {
  transition: opacity 0.2s ease;
}

.jc-viewer-enter-from,
.jc-viewer-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .jc-viewer-enter-active,
  .jc-viewer-leave-active {
    transition: none;
  }
}
</style>
