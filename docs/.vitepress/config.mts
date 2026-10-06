import { defineConfig } from 'vitepress'

// 站点部署基路径：GitHub 项目页固定为 /<repo>/；绑定自定义域名时改为 '/'
// （M3 起 sitemap/OG/verify-build 均从本常量读取，见 PLAN.md §12-10）
export const BASE = '/Awesome-jmu-cec/'

export default defineConfig({
  title: 'Awesome JMU CEC',
  description: '面向集美大学计算机工程学院本科生的信息差百科：大学四年规划、竞赛、保研、考公、留学、奖学金。',
  lang: 'zh-Hans',
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    // TODO(M1)：Claude 风格主题系统（vars.css + 5 套主题色 + AccentSwitcher + 字体）
    // TODO(M2)：接入中文分词（miniSearch options.tokenize / searchOptions.tokenize 共用 cjkTokenize）
    search: { provider: 'local', options: { detailedView: true } },
    // TODO(M3)：自动侧栏（gen-sidebar.mjs）、中文 UI 字符串、404、OG/sitemap
    nav: [
      { text: '大学四年规划', link: '/planning/' },
      { text: '竞赛', link: '/competitions/' },
      { text: '保研', link: '/baoyan/' },
      { text: '考公', link: '/kaogong/' },
      { text: '留学', link: '/abroad/' },
      { text: '奖学金', link: '/scholarship/' },
    ],
    outline: { level: [2, 3], label: '本页目录' },
  },
})
