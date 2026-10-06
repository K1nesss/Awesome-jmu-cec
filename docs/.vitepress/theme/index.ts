import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
// 标题衬线字体（npm 自托管，Google Fonts 国内不可用；PLAN.md §4.3）
import '@fontsource-variable/fraunces'
import '@fontsource/noto-serif-sc/600.css'
import './styles/vars.css'
import './styles/fonts.css'
import './styles/polish.css'

export default {
  extends: DefaultTheme,
  Layout,
}
