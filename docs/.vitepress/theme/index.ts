import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import ArticleList from './components/ArticleList.vue'
import EventCalendar from './components/EventCalendar.vue'
import ArticleMeta from './components/ArticleMeta.vue'
import SectionNav from './components/SectionNav.vue'
import ReadingAids from './components/ReadingAids.vue'
import './styles/vars.css'
import './styles/fonts.css'
import './styles/polish.css'

// 顶栏下拉（NavFlyout.vue）与主题切换（ThemeToggle.vue）通过 config.mts 的 vite alias 覆盖默认组件，无需在此注册
export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      // 文章页正文上方：返回板块、类型 / 年份 / 作者、过时提醒、可折叠目录
      'doc-before': () => h(ArticleMeta),
      // 手机菜单（☰）顶部：本板块文章列表
      'nav-screen-content-before': () => h(SectionNav),
      // 全站：回到顶部（带阅读进度环）、锚点跳转高亮
      'layout-bottom': () => h(ReadingAids),
    }),
  enhanceApp({ app }) {
    app.component('HomePage', HomePage) // 首页
    app.component('ArticleList', ArticleList) // 板块首页的文章列表
    app.component('EventCalendar', EventCalendar) // 重要日期页面
  },
} satisfies Theme
