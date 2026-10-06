import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { cjkTokenize } from './search/cjkTokenize.mjs'
import { GROUPS, SECTIONS } from './sections'
import { genSidebar } from '../../scripts/gen-sidebar.mjs'

// 站点部署基路径：Cloudflare Pages 根路径托管，固定 '/'（2026-10 起主托管，见 PLAN.md §8.7）
// 若回退 GitHub Pages 项目页：改回 '/Awesome-jmu-cec/'，并同步 verify-build.mjs 的 STALE_BASE
// （M3 起 sitemap/OG 均从本常量读取，见 PLAN.md §12-10）
export const BASE = '/'

const REPO = 'https://github.com/K1nesss/Awesome-jmu-cec'

export default defineConfig({
  title: 'Awesome JMU CEC',
  description: '面向集美大学计算机工程学院本科生的信息差百科：学院与导师、四年规划、竞赛、保研、考研、就业、考公、留学。',
  lang: 'zh-Hans',
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,
  // 明暗模式：初始跟随系统（'auto'），用户手动切换后记住选择
  appearance: true,

  vite: {
    resolve: {
      // 覆盖默认主题的内部组件（VitePress 官方支持的方式）：
      // - VPSwitchAppearance：明暗滑块 → 三态主题图标按钮（跟随系统 / 浅色 / 深色）
      // - VPFlyout：顶栏下拉 → 只在点击时展开，箭头带旋转动画
      alias: [
        {
          find: /^.*\/VPSwitchAppearance\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/ThemeToggle.vue', import.meta.url)),
        },
        {
          find: /^.*\/VPFlyout\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/NavFlyout.vue', import.meta.url)),
        },
      ],
    },
  },

  // head 条目不会自动补 base（PLAN.md §12-1），手动拼接
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#1f1e1d' }],
    // 首屏渲染前写入当前主题模式（auto/light/dark），主题按钮据此显示对应图标，避免闪烁（见 ThemeToggle.vue）
    [
      'script',
      {},
      `(()=>{let m='auto';try{m=localStorage.getItem('vitepress-theme-appearance')||'auto'}catch(e){}document.documentElement.dataset.themeMode=m})()`,
    ],
  ],

  markdown: {
    image: { lazyLoading: true },
    // 自定义容器默认是英文标题（TIP/WARNING…），统一中文
    container: {
      tipLabel: '提示',
      warningLabel: '注意',
      dangerLabel: '警告',
      infoLabel: '说明',
      detailsLabel: '展开详情',
    },
  },

  themeConfig: {
    // 中文搜索：索引端与查询端必须是同一个分词函数（PLAN.md §5.2）
    // cjkTokenize 会被序列化下发到浏览器，务必保持自包含（见该文件顶部警告）
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          options: { tokenize: cjkTokenize },
          searchOptions: {
            tokenize: cjkTokenize,
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 },
          },
        },
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索全站' },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清空搜索',
            backButtonTitle: '关闭搜索',
            noResultsText: '没有找到相关结果',
            footer: {
              selectText: '打开',
              selectKeyAriaLabel: '回车',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '上方向键',
              navigateDownKeyAriaLabel: '下方向键',
              closeText: '关闭',
              closeKeyAriaLabel: 'Esc 键',
            },
          },
        },
      },
    },

    nav: [
      { text: '首页', link: '/' },
      // 三个大类各一个下拉菜单（sections.ts）；当前页面所在大类的按钮带下划线
      ...GROUPS.map((g) => ({
        text: g.navText,
        items: g.sections.map(({ text, link }) => ({ text, link })),
        activeMatch: `^/(${g.sections.map((x) => x.key).join('|')})/`,
      })),
      { text: '投稿', link: '/contribute/' },
      { text: '关于', link: '/about/' },
    ],

    socialLinks: [{ icon: 'github', link: REPO, ariaLabel: 'GitHub 仓库' }],

    editLink: {
      pattern: `${REPO}/edit/main/docs/:path`,
      text: '在 GitHub 上编辑此页',
    },

    footer: {
      message: '非集美大学官方项目，内容来自同学投稿，仅供参考，请以学校与学院最新通知为准。',
    },

    // 默认主题在 zh-Hans 下不会自动翻译这些 UI 文案（PLAN.md §12-2）
    // 侧栏：按目录自动生成（scripts/gen-sidebar.mjs）；板块还没有文章时不显示侧栏
    // 新增文章后需重启 npm run dev 才会进侧栏（线上构建不受影响）
    sidebar: genSidebar(fileURLToPath(new URL('..', import.meta.url)), SECTIONS),

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: {
      text: '最后更新于',
      formatOptions: { dateStyle: 'medium', timeStyle: 'short', forceLocale: true },
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    skipToContentLabel: '跳到正文',
    externalLinkIcon: true,
    notFound: {
      title: '页面不存在',
      quote: '这篇文章可能已被移动、改名或还没写出来。试试顶栏的搜索，或者从首页重新出发。',
      linkLabel: '返回首页',
      linkText: '返回首页',
    },
  },
})
