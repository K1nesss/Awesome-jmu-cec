<script setup lang="ts">
// 文章页正文末尾（挂在 doc-footer-before 插槽，只在板块文章页显示）：
// 「报告错误」「补充内容」两个按钮，跳到 GitHub 预填好的 Issue 表单（.github/ISSUE_TEMPLATE/），
// 标题和页面地址已经带上，读者只需写清问题。
// 页面完整地址只能在浏览器里得到，所以挂载后再补全，服务端渲染时先用站内路径
import { computed, ref } from 'vue'
import { onContentUpdated, useData, withBase } from 'vitepress'
import { REPO, isArticlePath } from '../../sections'

const { page } = useData()
const isArticle = computed(() => isArticlePath(page.value.relativePath))

const origin = ref('')
onContentUpdated(() => (origin.value = location.origin))

const pageUrl = computed(() => {
  const path = withBase('/' + page.value.relativePath.replace(/(index)?\.md$/, ''))
  return origin.value + path
})

function issueLink(template: string, prefix: string) {
  // 键名对应 Issue 表单里各字段的 id；空格编码成 %20（不用 URLSearchParams 的 +）
  const q = Object.entries({
    template,
    title: `${prefix} ${page.value.title}`,
    page: pageUrl.value,
    file: `docs/${page.value.relativePath}`,
  })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return `${REPO}/issues/new?${q}`
}
</script>

<template>
  <aside v-if="isArticle" class="ArticleFeedback" aria-label="反馈">
    <p class="ask">内容有误、已经过时，或者你知道更多？</p>
    <div class="actions">
      <a class="btn no-icon" :href="issueLink('correction.yml', '[纠错]')" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
        报告错误
      </a>
      <a class="btn no-icon" :href="issueLink('addition.yml', '[补充]')" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        补充内容
      </a>
    </div>
    <p class="hint">会在 GitHub 打开一个已填好标题和页面地址的表单，需要登录 GitHub 账号。</p>
  </aside>
</template>

<style scoped>
.ArticleFeedback {
  margin: 48px 0 32px;
  padding: 18px 20px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}

.ask {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.btn:hover {
  border-color: var(--vp-c-text-1);
}

.btn:focus-visible {
  outline: 2px solid var(--vp-c-text-1);
  outline-offset: 2px;
}

.btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

/* 手机上两个按钮各占一半，好点 */
@media (max-width: 480px) {
  .btn {
    flex: 1;
    justify-content: center;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
  }
}
</style>
