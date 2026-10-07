<script setup lang="ts">
// 关于页的贡献者：
//   1. GitHub 头像墙——在仓库里提交过修改的人（构建时读取，头像随站点发布，见 scripts/github.mjs）
//   2. 文章作者——文章 frontmatter 里的 author。通过 Issue 投稿、由维护者代为发布的同学不会出现在 GitHub 名单里，在这里同样署名
// 不想出现在头像墙上：把 GitHub 用户名加进 docs/about/contributors.yaml 的 exclude
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { REPO } from '../../sections'
import { data as gh } from '../github.data'
import { data as articles } from '../articles.data'

const people = computed(() => gh.contributors ?? [])

// 开发服务器不发布头像副本，直接用 GitHub 地址
const DEV = import.meta.env.DEV
const src = (c: { local: string; avatar: string }) => (!DEV && c.local ? withBase(c.local) : c.avatar)
// 本站副本加载失败（极少见）时退回 GitHub 地址，只退一次
function fallback(e: Event, remote: string) {
  const img = e.target as HTMLImageElement
  if (img.src !== remote) img.src = remote
}

// 文章作者：按署名文章数从多到少；「匿名」和【示例】文章不列出
const authors = computed(() => {
  const n = new Map<string, number>()
  for (const a of articles) {
    if (a.title.startsWith('【示例】')) continue
    const name = a.author.trim()
    if (name && name !== '匿名') n.set(name, (n.get(name) || 0) + 1)
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
})
</script>

<template>
  <div class="Contributors vp-raw">
    <template v-if="people.length">
      <p class="label">在 GitHub 上参与修改</p>
      <ul class="wall">
        <li v-for="c in people" :key="c.login">
          <a class="person no-icon" :href="c.url" target="_blank" rel="noopener" :title="`${c.login}：${c.contributions} 次提交`">
            <img :src="src(c)" :alt="c.login" width="48" height="48" loading="lazy" @error="fallback($event, c.avatar)" />
            <span class="login">{{ c.login }}</span>
          </a>
        </li>
      </ul>
    </template>

    <template v-if="authors.length">
      <p class="label">文章作者</p>
      <ul class="authors">
        <li v-for="[name, count] in authors" :key="name">
          {{ name }}<span v-if="count > 1" class="n">{{ count }} 篇</span>
        </li>
      </ul>
    </template>

    <p class="note">
      名单根据 GitHub 提交记录和文章署名自动生成。不想在这里显示头像？在
      <a class="no-icon" :href="`${REPO}/edit/main/docs/about/contributors.yaml`" target="_blank" rel="noopener">contributors.yaml</a>
      里加上你的 GitHub 用户名即可。
    </p>
  </div>
</template>

<style scoped>
.label {
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 16px 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 2px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s;
}

.person:hover {
  background: var(--vp-c-default-soft);
}

.person img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  overflow: hidden;
  font-size: 0; /* 头像加载失败时不露出被截断的替代文字，只显示灰色圆形 */
}

.login {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.authors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.authors li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.n {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.note {
  margin: 20px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-3);
}

.note a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .person {
    transition: none;
  }
}
</style>
