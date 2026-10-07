import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { cjkTokenize } from './search/cjkTokenize.mjs'
import { figurePlugin } from './markdown/figure.mjs'
import { expandSynonyms, injectSearchTerms, normalizeKeywords } from './search/synonyms.mjs'
import { GROUPS, REPO, SECTIONS, isArticlePath } from './sections'
import { cpSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { countArticles, genSidebar } from '../../scripts/gen-sidebar.mjs'
import { loadEvents, toICS } from '../../scripts/calendar.mjs'
import { readCachedData } from '../../scripts/github.mjs'

// 站点部署基路径：Cloudflare Pages 根路径托管，固定 '/'（2026-10 起主托管）
// 若回退 GitHub Pages 项目页：改回 '/Awesome-jmu-cec/'，并同步 verify-build.mjs 的 STALE_BASE
export const BASE = '/'

// 站点正式地址（不带结尾斜杠）：sitemap、分享卡片的绝对链接都从这里拼。换自定义域名时只改这一处
export const SITE_URL = 'https://awesome-jmu-cec.pages.dev'
const SITE_DESC = '面向集美大学计算机工程学院本科生的信息差百科：学院与导师、四年规划、竞赛、保研、考研、就业、考公、留学。'


const DOCS_DIR = fileURLToPath(new URL('..', import.meta.url))

// 每个板块的文章数：还没有文章的板块，在顶栏下拉和手机菜单里标注「征稿中」并降低存在感
// （菜单项文字由默认主题以 HTML 渲染，所以可以带一个小标签；样式见 polish.css 的 .jc-empty-tag）
const ARTICLE_COUNTS = countArticles(DOCS_DIR, SECTIONS)
const navLabel = (text: string, key: string) =>
  ARTICLE_COUNTS[key] ? text : `<span class="jc-empty">${text}</span><span class="jc-empty-tag">征稿中</span>`

export default defineConfig({
  title: 'Awesome JMU CEC',
  description: SITE_DESC,
  lang: 'zh-Hans',
  base: BASE,
  cleanUrls: true,

  // 站点地图：/sitemap.xml，供百度、必应、谷歌收录（robots.txt 里指向它）
  sitemap: {
    hostname: SITE_URL + BASE,
    // 404 页不进站点地图
    transformItems: (items) => items.filter((it) => !/(^|\/)404(\.html)?$/.test(it.url)),
  },

  // 文章只写了 summary 没写 description 时，用 summary 作为页面描述（搜索引擎摘要、分享卡片都用它）
  transformPageData(pageData) {
    const fm = pageData.frontmatter
    if (!fm.description && fm.summary) pageData.description = String(fm.summary)
  },

  // 分享卡片（Open Graph / Twitter Card）与规范链接：链接发到 QQ、Telegram、微博等时显示标题、简介和配图。
  // 每页一份；配图统一用 public/og.png（1200×630）
  transformHead({ pageData, siteData }) {
    if (pageData.isNotFound || pageData.relativePath === '404.md') return []
    const path = BASE + pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = SITE_URL + encodeURI(path)
    const isHome = pageData.relativePath === 'index.md'
    const title = isHome ? siteData.title : `${pageData.title} | ${siteData.title}`
    const desc = pageData.description || siteData.description
    const image = `${SITE_URL}${BASE}og.png`
    const isArticle = isArticlePath(pageData.relativePath)
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:type', content: isArticle ? 'article' : 'website' }],
      ['meta', { property: 'og:site_name', content: siteData.title }],
      ['meta', { property: 'og:locale', content: 'zh_CN' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: desc }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:image', content: image }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:alt', content: 'Awesome JMU CEC：大学四年，少走一点弯路。' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: desc }],
      ['meta', { name: 'twitter:image', content: image }],
    ]
  },
  lastUpdated: true,
  // 明暗模式：初始跟随系统（'auto'），用户手动切换后记住选择
  appearance: true,

  vite: {
    // 校园地图的地图引擎（maplibre-gl，约 1 MB）单独成块、只在 /map/ 页加载，不必为它报体积警告
    build: { chunkSizeWarningLimit: 1100 },
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
          find: /^.*\/VPDocFooterLastUpdated\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/LastUpdated.vue', import.meta.url)),
        },
        {
          find: /^.*\/VPFlyout\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/NavFlyout.vue', import.meta.url)),
        },
      ],
    },
  },

  // 构建结束后写出日历订阅文件 /calendar.ics（数据来自 docs/calendar/events.yaml；日期未公布的条目不写入）
  buildEnd(siteConfig) {
    const { events, warnings } = loadEvents(join(DOCS_DIR, 'calendar', 'events.yaml'))
    for (const w of warnings) console.warn(`⚠️ 重要日期：${w}`)
    writeFileSync(join(siteConfig.outDir, 'calendar.ics'), toICS(events))

    // robots.txt：允许收录，并指向站点地图（地址从 SITE_URL 生成，换域名时自动跟着变）
    writeFileSync(join(siteConfig.outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}${BASE}sitemap.xml\n`)

    // 贡献者头像：构建时下载到缓存目录（theme/github.data.ts），这里随站点一起发布到 /avatars/
    const ghCache = join(DOCS_DIR, '.vitepress', 'cache', 'github')
    const gh = readCachedData(ghCache)
    // 只发布当前名单里的头像（缓存目录里可能还留着已加入 exclude 名单的人的头像）
    for (const c of gh?.contributors ?? []) {
      const name = c.local?.replace(/^\/avatars\//, '')
      if (name && existsSync(join(ghCache, 'avatars', name))) {
        cpSync(join(ghCache, 'avatars', name), join(siteConfig.outDir, 'avatars', name))
      }
    }
  },

  // head 条目不会自动补 base，手动拼接
  head: [
    // 网站图标「J_」：终端光标风格（JetBrains Mono Bold 的 J + 与笔画同粗的光标条，四边对称留白）
    // SVG 给现代浏览器；32px PNG 给不支持 SVG 图标的浏览器；180px 给苹果设备「添加到主屏幕」；manifest 给安卓
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${BASE}favicon-32.png` }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${BASE}apple-touch-icon.png` }],
    ['link', { rel: 'manifest', href: `${BASE}site.webmanifest` }],
    ['meta', { name: 'theme-color', content: '#1f1e1d' }],
    // 首屏渲染前：
    //   1. 写入当前主题模式（auto/light/dark），主题按钮据此显示对应图标，避免闪烁（见 ThemeToggle.vue）
    //   2. 苹果设备给 <html> 加 mac 类：搜索快捷键提示显示 ⌘ K 而不是 Ctrl K（默认主题只写了样式，没有加这个类）
    [
      'script',
      {},
      `(()=>{const d=document.documentElement;let m='auto';try{m=localStorage.getItem('vitepress-theme-appearance')||'auto'}catch(e){}d.dataset.themeMode=m;if(/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent))d.classList.add('mac')})()`,
    ],
  ],

  markdown: {
    image: { lazyLoading: true },
    // ![说明](./images/a.png "图注")：单独成段且写了标题的图片显示为带图注的 figure
    config: (md) => {
      md.use(figurePlugin)
    },
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
    // 中文搜索：索引端与查询端必须是同一个分词函数
    // cjkTokenize 会被序列化下发到浏览器，务必保持自包含（见该文件顶部警告）
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        // 建索引时补上同义词和 frontmatter 的 keywords：搜「推免」也能找到只写了「保研」的文章
        _render(src, env, md) {
          const html = md.render(src, env)
          const fm = env.frontmatter ?? {}
          if (fm.search === false) return ''
          const have = new Set()
          const terms = [...normalizeKeywords(fm.keywords), ...expandSynonyms(`${fm.title ?? ''}\n${src}`)]
            .filter((t) => !have.has(t) && have.add(t))
          return injectSearchTerms(html, terms)
        },
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
        items: g.sections.map(({ text, link, key }) => ({ text: navLabel(text, key), link })),
        activeMatch: `^/(${g.sections.map((x) => x.key).join('|')})/`,
      })),
      { text: '日历', link: '/calendar/' },
      { text: '问答', link: '/questions/' },
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

    // 默认主题在 zh-Hans 下不会自动翻译这些 UI 文案
    // 侧栏：按目录自动生成（scripts/gen-sidebar.mjs）；板块还没有文章时不显示侧栏
    // 新增文章后需重启 npm run dev 才会进侧栏（线上构建不受影响）
    sidebar: genSidebar(DOCS_DIR, SECTIONS),

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    // 页脚更新时间由 LastUpdated.vue 显示为「更新于 3 天前」，这里的文案不再使用
    lastUpdated: { text: '更新于' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    skipToContentLabel: '跳到正文',
    externalLinkIcon: true,
  },
})
