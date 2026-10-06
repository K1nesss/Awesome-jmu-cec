import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import './styles/vars.css'
import './styles/fonts.css'
import './styles/polish.css'

// 顶栏下拉（NavFlyout.vue）与主题切换（ThemeToggle.vue）通过 config.mts 的 vite alias 覆盖默认组件，无需在此注册
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
  },
} satisfies Theme
