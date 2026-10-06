import { defineConfig } from 'vitepress'

// 站点部署基路径：Cloudflare Pages 根路径托管，固定 '/'（2026-10 起主托管，见 PLAN.md §8.7）
// 若回退 GitHub Pages 项目页：改回 '/Awesome-jmu-cec/'，并同步 verify-build.mjs 的 STALE_BASE
// （M3 起 sitemap/OG 均从本常量读取，见 PLAN.md §12-10）
export const BASE = '/'

export default defineConfig({
  title: 'Awesome JMU CEC',
  description: '面向集美大学计算机工程学院本科生的信息差百科：大学四年规划、竞赛、保研、考公、留学、奖学金。',
  lang: 'zh-Hans',
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    // 主题色防闪：首屏前恢复 localStorage 中的 accent 选择（PLAN.md §4）
    ['script', {}, `try{var a=localStorage.getItem('accent');if(a)document.documentElement.dataset.accent=a}catch(e){}`],
  ],
  themeConfig: {
    // TODO(M2)：接入中文分词（miniSearch options.tokenize / searchOptions.tokenize 共用 cjkTokenize）
    search: { provider: 'local', options: { detailedView: true } },
    nav: [
      { text: '首页', link: '/' },
      {
        text: '板块',
        items: [
          { text: '大学四年规划', link: '/planning/' },
          { text: '竞赛', link: '/competitions/' },
          { text: '保研', link: '/baoyan/' },
          { text: '考公·选调', link: '/kaogong/' },
          { text: '留学', link: '/abroad/' },
          { text: '奖学金', link: '/scholarship/' },
          { text: '校园信息差', link: '/campus/' },
        ],
      },
      { text: '投稿', link: '/contribute/' },
      { text: '关于', link: '/about/' },
    ],
    outline: { level: [2, 3], label: '本页目录' },
  },
})
