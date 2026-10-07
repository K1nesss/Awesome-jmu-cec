import { defineAsyncComponent, h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import ArticleList from './components/ArticleList.vue'
import EventCalendar from './components/EventCalendar.vue'
import QuestionList from './components/QuestionList.vue'
import Contributors from './components/Contributors.vue'
import ArticleMeta from './components/ArticleMeta.vue'
import SectionNav from './components/SectionNav.vue'
import ReadingAids from './components/ReadingAids.vue'
import ArticleFeedback from './components/ArticleFeedback.vue'
import SearchHints from './components/SearchHints.vue'
import NotFound from './components/NotFound.vue'
import ImageZoom from './components/ImageZoom.vue'
import NavMapLink from './components/NavMapLink.vue'
import './styles/vars.css'
import './styles/fonts.css'
import './styles/polish.css'

// 顶栏下拉（NavFlyout.vue）、主题切换（ThemeToggle.vue）与页脚更新时间（LastUpdated.vue）
// 通过 config.mts 的 vite alias 覆盖默认组件，无需在此注册
export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      // 文章页正文上方：返回板块、类型 / 年份 / 作者、过时提醒、可折叠目录
      'doc-before': () => h(ArticleMeta),
      // 文章页正文末尾：报告错误 / 补充内容（跳到 GitHub 预填的 Issue 表单）
      'doc-footer-before': () => h(ArticleFeedback),
      // 顶栏：校园地图图标（宽屏在主题切换旁，手机在菜单按钮旁）
      'nav-bar-content-after': () => h(NavMapLink),
      // 手机菜单（☰）顶部：本板块文章列表
      'nav-screen-content-before': () => h(SectionNav),
      // 全站：回到顶部（带阅读进度环）、锚点跳转高亮；搜索弹窗还没输入时的推荐搜索词；文章图片点击放大
      'layout-bottom': () => [h(ReadingAids), h(SearchHints), h(ImageZoom)],
      // 404：搜索、按地址猜板块、常看的板块
      'not-found': () => h(NotFound),
    }),
  enhanceApp({ app }) {
    app.component('HomePage', HomePage) // 首页
    app.component('ArticleList', ArticleList) // 板块首页的文章列表
    app.component('EventCalendar', EventCalendar) // 重要日期页面
    app.component('QuestionList', QuestionList) // 问答页（板块首页的「本板块的提问」由 ArticleList 引用）
    app.component('Contributors', Contributors) // 关于页的贡献者
    // 校园地图：地图引擎较大，按需加载，只有打开 /map/ 时才下载
    app.component('CampusMap', defineAsyncComponent(() => import('./components/CampusMap.vue')))
  },
} satisfies Theme
