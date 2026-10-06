import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import ArticleList from './components/ArticleList.vue'
import ArticleMeta from './components/ArticleMeta.vue'
import './styles/vars.css'
import './styles/fonts.css'
import './styles/polish.css'

// 顶栏下拉（NavFlyout.vue）与主题切换（ThemeToggle.vue）通过 config.mts 的 vite alias 覆盖默认组件，无需在此注册
export default {
  extends: DefaultTheme,
  // 文章页正文上方：类型 / 年份 / 作者 + 过时提醒
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-before': () => h(ArticleMeta) }),
  enhanceApp({ app }) {
    app.component('HomePage', HomePage) // 首页
    app.component('ArticleList', ArticleList) // 板块首页的文章列表
  },
} satisfies Theme
