<script setup lang="ts">
// 顶栏下拉菜单（覆盖默认主题的 VPFlyout.vue，见 config.mts 的 vite alias）
// 与默认行为的区别：
//   1. 只在点击时展开（默认主题鼠标移入就展开，移入后再点击反而会把菜单关掉）
//   2. 展开时下拉箭头旋转 180°，菜单淡入并轻微下移
//   3. 点击菜单外、按 Esc、焦点移出、切换页面时自动收起
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import VPMenu from 'vitepress/dist/client/theme-default/components/VPMenu.vue'

defineProps<{
  icon?: string
  button?: string
  label?: string
  items?: any[]
}>()

const open = ref(false)
const el = ref<HTMLElement>()
const buttonEl = ref<HTMLButtonElement>()

function close() {
  open.value = false
}

function onPointerDown(e: PointerEvent) {
  if (open.value && el.value && !el.value.contains(e.target as Node)) close()
}

function onFocusIn(e: FocusEvent) {
  if (open.value && el.value && !el.value.contains(e.target as Node)) close()
}

function onKeydown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') {
    close()
    buttonEl.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('focusin', onFocusIn)
  document.removeEventListener('keydown', onKeydown)
})

const route = useRoute()
watch(() => route.path, close)
</script>

<template>
  <div ref="el" class="VPFlyout" :class="{ open }">
    <button
      ref="buttonEl"
      type="button"
      class="button"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="label"
      @click="open = !open"
    >
      <span v-if="button || icon" class="text">
        <span v-if="icon" :class="[icon, 'option-icon']" />
        <span v-if="button" v-html="button"></span>
        <span class="vpi-chevron-down text-icon" />
      </span>

      <span v-else class="vpi-more-horizontal icon" />
    </button>

    <div class="menu">
      <VPMenu :items="items">
        <slot />
      </VPMenu>
    </div>
  </div>
</template>

<style scoped>
.VPFlyout {
  position: relative;
}

.button {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: var(--vp-nav-height);
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.button:hover .text,
.button:hover .icon {
  color: var(--vp-c-text-2);
}

.text {
  display: flex;
  align-items: center;
  line-height: var(--vp-nav-height);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.VPFlyout.active .text {
  color: var(--vp-c-brand-1);
}

.option-icon {
  margin-right: 0;
  font-size: 16px;
}

/* 下拉箭头：展开时翻转朝上。
   注意默认主题的 vpi-chevron-down 本身是“向右箭头 + rotate(90deg)”，所以朝上是 270deg 而不是 180deg */
.text-icon {
  margin-left: 4px;
  font-size: 14px;
  transform: rotate(90deg);
  transition: transform 0.25s ease;
}

.open .text-icon {
  transform: rotate(270deg);
}

.icon {
  font-size: 20px;
  transition: color 0.25s;
}

/* 菜单：只由 open 状态控制；淡入 + 从上方 6px 滑入 */
.menu {
  position: absolute;
  top: calc(var(--vp-nav-height) / 2 + 20px);
  right: 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
}

.open .menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .text-icon,
  .menu {
    transition: none;
  }
}
</style>
