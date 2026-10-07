<script setup lang="ts">
// 搜索弹窗的空状态：还没输入时，弹窗里只有一个输入框，读者不知道能搜什么。
// 这里在输入框下方给几个常用搜索词，点一下就填进去并出结果。
// 默认主题的搜索弹窗没有提供插槽，所以等它出现后用 Teleport 放进去（挂在 layout-bottom，全站生效），
// 弹窗是纵向 flex 布局，本组件用 order 排在结果列表之后、快捷键提示之前（见 polish.css）
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// 只放站内确实有文章的词；同义词（推免、国奖……）也能搜到，见 search/synonyms.mjs
const WORDS = ['保研', '夏令营', '考研', '转专业', '国奖', '实习', '竞赛', '选调']

const open = ref(false) // 弹窗是否打开
const empty = ref(true) // 输入框是否为空

let observer: MutationObserver | undefined
const input = () => document.querySelector<HTMLInputElement>('.VPLocalSearchBox .search-input')

function sync() {
  const el = input()
  empty.value = !el?.value.trim()
}

function onInput(e: Event) {
  if ((e.target as Element)?.matches?.('.VPLocalSearchBox .search-input')) sync()
}

onMounted(() => {
  // 弹窗打开 / 关闭时 body 下会增删 .VPLocalSearchBox
  observer = new MutationObserver(async () => {
    const now = !!document.querySelector('.VPLocalSearchBox .shell')
    if (now === open.value) return
    open.value = now
    if (now) {
      await nextTick()
      sync() // 上次的搜索词会被保留，打开时可能不是空的
    }
  })
  observer.observe(document.body, { childList: true })
  document.addEventListener('input', onInput, true)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('input', onInput, true)
})

function pick(word: string) {
  const el = input()
  if (!el) return
  el.value = word
  el.dispatchEvent(new Event('input', { bubbles: true })) // 触发默认主题的 v-model
  el.focus()
}
</script>

<template>
  <Teleport v-if="open" to=".VPLocalSearchBox .shell">
    <div v-show="empty" class="SearchHints">
      <p class="label">试试搜索</p>
      <div class="words">
        <button v-for="w in WORDS" :key="w" type="button" @click="pick(w)">{{ w }}</button>
      </div>
      <p class="tip">关键词短一点更容易搜到；「绩点」「综测」「推免」这样的简称也可以。</p>
    </div>
  </Teleport>
</template>

<style scoped>
.SearchHints {
  order: 1;
  padding: 4px 4px 8px;
}

.label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.words button {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--vp-c-bg);
  font-size: 14px;
  color: var(--vp-c-text-1);
  transition: border-color 0.2s;
}

.words button:hover,
.words button:focus-visible {
  border-color: var(--vp-c-text-1);
}

.tip {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

@media (max-width: 767px) {
  .words button {
    min-height: 40px;
  }
}
</style>
