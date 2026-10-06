<script setup>
// 扩展默认主题：在顶栏（桌面）与移动端抽屉挂载主题色切换器
import DefaultTheme from 'vitepress/theme'
import AccentSwitcher from './components/AccentSwitcher.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <AccentSwitcher />
    </template>
    <template #nav-screen-content-after>
      <AccentSwitcher />
    </template>
  </Layout>
</template>
