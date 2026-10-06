<script setup lang="ts">
// 手机菜单（☰）顶部的「本板块文章」：挂在 nav-screen-content-before 插槽。
// 手机上不再使用默认主题的侧栏抽屉和「菜单」栏（见 polish.css），本板块的文章统一放在 ☰ 里，
// 一个入口就能看到：本板块文章 → 站点导航 → 主题切换。
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

interface Item {
  text: string
  link?: string
  items?: Item[]
}

const { theme, page } = useData()

const currentPath = computed(() => '/' + page.value.relativePath.replace(/(index)?\.md$/, ''))

// 当前页面所在板块的侧栏（gen-sidebar 生成，键为 '/<板块>/'）
const group = computed<Item | null>(() => {
  const sidebar = theme.value.sidebar as Record<string, Item[]> | undefined
  if (!sidebar || Array.isArray(sidebar)) return null
  const key = Object.keys(sidebar).find((k) => currentPath.value.startsWith(k))
  return key ? sidebar[key][0] : null
})

const isActive = (link?: string) => !!link && link.replace(/\/$/, '') === currentPath.value.replace(/\/$/, '')
</script>

<template>
  <nav v-if="group" class="SectionNav" aria-label="本板块文章">
    <p class="title">{{ group.text }}</p>
    <ul class="list">
      <template v-for="item in group.items" :key="item.text">
        <li v-if="item.link && !item.items">
          <a :href="withBase(item.link)" :class="{ active: isActive(item.link) }" :aria-current="isActive(item.link) ? 'page' : undefined">{{ item.text }}</a>
        </li>
        <li v-else-if="item.items" class="sub">
          <p class="sub-title">{{ item.text }}</p>
          <ul class="list">
            <li v-for="child in item.items" :key="child.text">
              <a :href="withBase(child.link || '')" :class="{ active: isActive(child.link) }" :aria-current="isActive(child.link) ? 'page' : undefined">{{ child.text }}</a>
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </nav>
</template>

<style scoped>
.SectionNav {
  padding: 16px 0 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 8px;
}

.title {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list a {
  display: block;
  padding: 10px 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  transition: color 0.2s;
}

.list a:hover {
  color: var(--vp-c-text-1);
}

/* 当前文章：亮色 + 左侧竖线 */
.list a.active {
  margin-left: -12px;
  padding-left: 10px;
  border-left: 2px solid var(--vp-c-text-1);
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sub-title {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.sub .list {
  padding-left: 12px;
  border-left: 1px solid var(--vp-c-divider);
}

.sub .list a.active {
  margin-left: -13px;
  padding-left: 11px;
}
</style>
