# Awesome-jmu-cec 实施计划

> 面向 JMU 计算机工程学院本科生的一站式信息差百科：大学四年规划、竞赛、保研、考公、留学、奖学金与校园信息差。
> 部署于 GitHub Pages，Claude 风格界面，中文全文搜索，Markdown + 侧栏目录，多主题色切换。
> **贡献模型：任何人在 GitHub 网页上改 Markdown → PR → 维护者审核 → 合并 → 自动部署上线。**

- **状态**：已定稿，待动工（M0 起）
- **定稿日期**：2026-10-06
- **制定方式**：多智能体设计流程产出 —— 4 套独立技术方案 × 3 个视角评审（视觉还原度 / 贡献者体验 / 搜索与运维）→ 综合定稿 + 完整性审查。关键机制（中文分词类型支持、函数序列化、Action 版本、head base 行为等）均已在真实软件包/构建产物上实测验证，非纸上推测。
- **本机环境（已核验）**：Node 24.13.0 / npm 11.9.0 / git 2.47.0；仓库 `D:\repos\Awesome-jmu-cec` 当前为空。

---

## 1. 需求 → 方案映射

| 硬需求 | 满足方式 |
|---|---|
| GitHub Pages 自动部署 | 官方 Pages artifact 流程（configure-pages / upload-pages-artifact / deploy-pages），push main 即发布；贡献者与维护者**永不本地构建** |
| Claude 风格 UI | 扩展默认主题，全量覆盖 VitePress CSS 变量 + 少量官方插槽，不 fork 组件；任何地方不出现默认蓝 |
| 中文搜索 | 内置 MiniSearch + 自定义 bigram/unigram 中文分词器（索引端与查询端共用同一函数），零外部服务、零成本、无国内可达性问题 |
| Markdown + 目录 | 渲染、右侧 TOC + scroll-spy、自动侧栏、⌘K 搜索弹窗、上一页/下一页、最后更新于——全部内置，只换肤 |
| 主题色切换 | 5 套强调色（四角色变量）× 明暗模式正交组合，localStorage 持久化 + 首屏防闪 |
| 贡献者只需提 Markdown | 丢一个 .md 自动进侧栏；frontmatter 无任何必填字段，写坏不阻断构建；中文报错注解 + 死链门禁；Issue 投稿兜底 |
| 长期可维护 | 仅 5 个锁定依赖、零服务零密钥；自定义面 = 2 个 Vue 组件 + 3 个 CSS + 1 个约 30 行 Layout + 3 个纯 JS 脚本 |
| 移动端 | 默认主题自带汉堡抽屉、移动端 TOC 弹层、全屏搜索，同一套变量重绘 |
| 中国网络 | 字体 fontsource npm 自托管（Google Fonts 被墙）、无 Google Analytics、运行时零第三方请求 |

---

## 2. 技术选型

**结论：VitePress 1.6.4（精确锁定，不加 `^`）+ 自定义 Claude 风格主题（CSS 变量 + 官方插槽）。**

三位评审全票第一（9.5 / 9 / 9）。单 Node 工具链（`engines: node >= 20`，CI 与本地统一 Node 24，`.nvmrc` 写 24）、单一依赖树、纯静态产物。部署为项目页 `https://<org>.github.io/Awesome-jmu-cec/`（`base: '/Awesome-jmu-cec/'`）。

### 依赖清单（共 5 个，全部 devDependencies，提交 lockfile，CI 用 `npm ci`）

| 包 | 版本 | 用途 |
|---|---|---|
| `vitepress` | **1.6.4（精确锁定）** | 框架。内部已含 vue 3.5 / vite 5.4 / minisearch 7.1 / shiki 2.1，**不要再装 vue** |
| `@fontsource-variable/fraunces` | `^5.3.0` | 拉丁衬线标题字体（自托管） |
| `@fontsource-variable/inter` | `^5.1.0` | 拉丁正文/UI 字体（自托管；落地时实测与默认主题自带 Inter 是否重复，重复则删） |
| `@fontsource/noto-serif-sc` | `^5.2.9` | 中文衬线标题字体（只 import 600 字重） |
| `gray-matter` | `^4.0.3` | 仅供 `scripts/gen-sidebar.mjs` 与 `scripts/check-frontmatter.mjs` 使用 |

npm scripts：`dev` = `vitepress dev docs`；`build` = `npm run check && vitepress build docs`；`check` = `node scripts/check-frontmatter.mjs`；`test` = `node --test`（默认测试发现；`node --test tests/` 在 Windows 上路径解析有问题，M0 实测已弃用）；`preview` = `vitepress preview docs`。

### 已在本机官方包内验证的三个关键机制

1. **中文搜索可自定义分词**：`types/default-theme.d.ts`（第 416-427 行）确认本地搜索开放 `miniSearch.options: Pick<MiniSearchOptions, 'extractField' | 'tokenize' | 'processTerm'>` 与完整 `miniSearch.searchOptions` —— 索引端与查询端都能挂自定义 tokenizer。
2. **函数序列化机制**：构建端对配置函数做 `value.toString()` 以 `_vp-fn_` 前缀写入客户端 bundle，浏览器端 `new Function` 还原 —— 分词函数**必须完全自包含**；已实测 `export function` 的 `toString()` 不含 `export` 关键字，往返安全。
3. **依赖内置**：1.6.4 自带 vue 3.5 / vite 5.4 / minisearch 7.1 / shiki 2.1。

### 落选方案（结论留档，避免未来反复争论）

| 方案 | 落选原因 |
|---|---|
| Astro Starlight + Pagefind | 唯一硬需求（CJK 搜索）最不可控：Pagefind 索引端 n-gram 与查询端 `Intl.Segmenter` 分词分歧是未闭合公开 issue（词组/生造词查询会漏）；Astro 一年一大版本、Starlight 连续破坏性改动，维护面四者中最重 |
| MkDocs Material + jieba | jieba 分词质量是真优势，但每篇新文章都要在 nav.yml 加一行（永久摩擦 + 多人改同一文件的合并冲突）；Material 已进入维护模式 |
| 自研 Vite SPA | 视觉上限最高，但 ~3300 行自研代码、16 个直接依赖、无逐页静态 HTML（搜索引擎收录与微信/QQ 分享卡退化）、无死链检查、bus factor 全押在一个懂 Vue/TS 的接力者身上 |

---

## 3. 仓库结构

```text
Awesome-jmu-cec/
├─ .github/
│  ├─ workflows/
│  │  ├─ deploy.yml              # push main：校验 + 构建 + 产物部署到 Pages
│  │  └─ ci.yml                  # PR：校验 + 构建（不部署），红色即拦截合并
│  ├─ ISSUE_TEMPLATE/
│  │  ├─ submit-article.yml      # 「我不会 git」投稿通道：粘贴正文，维护者代为提交
│  │  ├─ content-review.yml      # 内容年检：超过 12 个月未更新的文章清单
│  │  └─ bug-report.yml
│  ├─ PULL_REQUEST_TEMPLATE.md   # 提交前自检清单（标题/链接/隐私/相对路径）
│  └─ dependabot.yml             # actions 每周；npm 每月分组（字体归一组）
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts              # 站点 + 主题配置（nav、outline、search、head 防闪脚本）
│  │  ├─ search/
│  │  │  └─ cjkTokenize.mjs      # 中文分词器唯一真源（纯 JS，索引+查询共用，测试同源导入）
│  │  ├─ theme/
│  │  │  ├─ index.ts             # 直接导出默认主题 + 导入字体与样式（极简后无自定义组件）
│  │  │  ├─ components/
│  │  │  │  └─ ArticleMeta.vue     # (M3) 标题下：作者 / 日期 / 标签 chips
│  │  │  └─ styles/
│  │  │     ├─ vars.css          # 浅/深色令牌（黑顶栏 + 米白底 + 黑白灰强调）
│  │  │     ├─ fonts.css         # 字体栈与中文排版微调
│  │  │     └─ polish.css        # 卡片/按钮/搜索弹窗/代码块/表格/导航细节
│  │  └─ cache/                  # （gitignore）
│  ├─ index.md                   # 首页（layout: home；hero + 8 张功能卡 + 伪搜索条）
│  ├─ planning/                  # 《大学四年规划》
│  ├─ competitions/              # 《竞赛》
│  ├─ baoyan/                    # 《保研》（含 experiences/ 经验帖子目录）
│  ├─ kaogong/                   # 《考公·选调》
│  ├─ abroad/                    # 《留学》
│  ├─ scholarship/               # 《奖学金》
│  ├─ campus/                    # 《校园信息差》（兜底板块 + 待认领话题清单）
│  ├─ contribute/                # 《参与贡献》
│  ├─ about/                     # 《关于本站》+ 免责声明
│  └─ public/
│     ├─ logo.svg
│     ├─ icons/*.svg             # 卡片图标（线性、暖色描边）
│     └─ images/<section>/*      # 文章配图（按板块分目录）
├─ scripts/
│  ├─ gen-sidebar.mjs            # 扫描 docs/ 读 frontmatter → 多侧栏对象（try/catch 降级，永不失败）
│  ├─ check-frontmatter.mjs      # 温和校验，输出 GitHub 中文注解，永不 exit 非零
│  └─ verify-build.mjs           # 构建后断言：dist 存在 + base 前缀正确 + 搜索索引含关键词表
├─ tests/
│  └─ tokenize.test.mjs          # 分词器单测（node --test，零额外依赖）
├─ package.json / package-lock.json
├─ .gitignore                    # node_modules/ docs/.vitepress/dist docs/.vitepress/cache
├─ .nvmrc                        # 24
├─ .editorconfig
├─ README.md                     # 部署清单 + 投稿入口 + 性能预算表
├─ CONTRIBUTING.md               # 面向零基础同学的中文贡献指南（含报错排查表）
├─ LICENSE                       # 代码：MIT
├─ LICENSE-CONTENT.md            # 文章内容：CC BY-SA 4.0
└─ PLAN.md                       # 本文件
```

**设计边界（写入 README）**：贡献者只碰 `docs/<板块>/**`（新增文章 = 一个 .md，不动任何配置）；维护者只碰 `docs/.vitepress/**`、`scripts/**`、`.github/**`。

---

## 4. 主题系统

> ⚠️ **2026-10 需求变更（定稿）**：放弃 Claude 全仿风格与主题色切换，改为**极简方案**——黑顶栏 + 米白底 + 衬线标题 + 黑白灰强调，详见 §4.6（已实现）。以下 4.1-4.5 为历史方案，其中**基础色板（4.1）、字体自托管（4.3）、明暗防闪仍适用**；5 套主题色四角色变量（4.2）作废；卡片/毛玻璃/伪搜索条等装饰项作废。

历史方案目标：暖奶油底、墨色文字、单一陶土系强调色、发丝暖边框、16px 圆角卡片、克制的「高级感」。

### 4.1 基础令牌（styles/vars.css）

```css
:root {
  --vp-c-bg: #FAF9F5;        /* 主背景 米白 */
  --vp-c-bg-alt: #F0EEE6;    /* 侧栏 / 次表面 */
  --vp-c-bg-soft: #F4F2EA;
  --vp-c-bg-elv: #FFFFFF;    /* 卡片 / 弹层 */
  --vp-c-text-1: #1F1E1D;
  --vp-c-text-2: #5C594F;
  --vp-c-text-3: #8A8678;
  --vp-c-divider: #E6E2D6;
  --vp-c-border: #E0DCCE;
  --vp-c-gutter: #EBE8DD;
}
.dark {
  --vp-c-bg: #262624;  --vp-c-bg-alt: #1F1E1D;  --vp-c-bg-soft: #30302E;  --vp-c-bg-elv: #30302E;
  --vp-c-text-1: #F0EEE6;  --vp-c-text-2: #B8B4A8;  --vp-c-text-3: #8B8779;
  --vp-c-divider: #3E3D38;  --vp-c-gutter: #2E2D2A;
}
```

### 4.2 五套可切换主题色（四角色模型，浅/深各一套）

四角色规则：`--accent-ink` 专供正文链接/小字（浅色下 ≥4.5:1）；`--accent-strong` 专供按钮底 + 白字；`--accent` 只用于大色块/图标/装饰；`--accent-soft` 用于浅色底（活动项、高亮）。

| 主题色 | 模式 | ink 链接文字 | strong 按钮 | accent 装饰 | soft 浅底 |
|---|---|---|---|---|---|
| **陶土 terracotta（默认）** | 浅 | `#B4552F` | `#C15F3C` | `#D97757` | `rgba(217,119,87,.12)` |
| | 深 | `#E08A6A` | `#D97757` | `#E08A6A` | `rgba(224,138,106,.16)` |
| **鼠尾草 sage** | 浅 | `#4F6B44` | `#5E7D52` | `#7C9C6E` | `rgba(124,156,110,.13)` |
| | 深 | `#A3B894` | `#7C9C6E` | `#8FAE81` | `rgba(143,174,129,.16)` |
| **墨青 teal** | 浅 | `#3B7C89` | `#4C929F` | `#5FA3B2` | `rgba(95,163,178,.13)` |
| | 深 | `#8FC3CE` | `#4C929F` | `#6FB5C2` | `rgba(111,181,194,.16)` |
| **藕紫 plum** | 浅 | `#8C5C79` | `#A26E8F` | `#B47FA1` | `rgba(180,127,161,.13)` |
| | 深 | `#D0AAC3` | `#A26E8F` | `#B98BA8` | `rgba(185,139,168,.16)` |
| **琥珀 amber** | 浅 | `#8F6A1E` | `#A87F2C` | `#D3A54C` | `rgba(211,165,76,.15)` |
| | 深 | `#E0BC72` | `#C1953C` | `#D3A54C` | `rgba(211,165,76,.16)` |

> ⚠️ **落地校准（已实测发现，必须做）**：上表中部分「白字按钮底」对比度实测不达标（teal 3.55 / amber 3.66 / plum 4.07 / terracotta 4.23，普通字号需 ≥4.5:1）；`text-3` 浅色 3.46:1 亦不足。落地时：按钮底加深，或仅用于 ≥18.66px 加粗文字；`text-3` 调深至 ≥4.5:1；仓库内置约 30 行零依赖对比度断言脚本（进 `npm test`），校正后的最终值写回 vars.css 注释与本表。

接线：

```css
html[data-accent='terracotta'] { --accent-ink:#B4552F; --accent-strong:#C15F3C; --accent:#D97757; --accent-soft:rgba(217,119,87,.12); }
html.dark[data-accent='terracotta'] { --accent-ink:#E08A6A; --accent-strong:#D97757; --accent:#E08A6A; --accent-soft:rgba(224,138,106,.16); }
/* …其余 4 套同理 */
:root {
  --vp-c-brand-1: var(--accent-ink);      /* 链接、活动态文字 */
  --vp-c-brand-2: var(--accent-strong);   /* hover */
  --vp-c-brand-3: var(--accent-strong);   /* 纯色按钮底 */
  --vp-c-brand-soft: var(--accent-soft);  /* 软底高亮、custom-block tip 边框 */
  --vp-button-brand-bg: var(--accent-strong);
  --vp-button-brand-hover-bg: color-mix(in oklab, var(--accent-strong) 88%, black);
  --vp-local-search-highlight-bg: var(--accent-soft);
}
```

**切换机制**：`AccentSwitcher.vue`（5 圆点 popover，`role="radiogroup"` + 方向键 + `aria-checked`，触控区 ≥44px）挂载 `nav-bar-content-after`（桌面）与 `nav-screen-content-after`（移动抽屉）插槽；点击写 `document.documentElement.dataset.accent` 与 `localStorage['accent']`；`config.mts` 的 `head` 内联脚本在首屏前恢复存储值（防闪）。明暗模式交回 VitePress 自带三态切换（`appearance: true`），**主题色与明暗正交，自由组合**。

### 4.3 字体（全部 npm 自托管，零 Google Fonts 请求）

```css
--vp-font-family-base: 'Inter Variable', -apple-system, 'PingFang SC', 'HarmonyOS Sans SC',
  'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans CJK SC', sans-serif;
/* 标题（polish.css 中给 h1-h4 单独指定）：
   'Fraunces Variable', 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', SimSun, Georgia, serif; */
--vp-font-family-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; /* 零下载 */
```

- Noto Serif SC 按 unicode-range 分块（每块约 43KB），浏览器只拉当前页面标题用到的块；**只用于标题**，正文中文走系统黑体栈零字节。禁用 CJK 字体只需注释一行 import。
- 落地时实测：默认主题自带并预加载 `inter-roman-latin.woff2`，若与 fontsource Inter 重复则删除 fontsource 版。
- 给标题栈补 metric 适配 fallback，控制 CLS。

### 4.4 关键 UI 表面（polish.css，CSS 优先）

- **导航栏**：半透明奶油底 + `backdrop-filter: blur(12px)` + 发丝暖色下边框；衬线 wordmark；右侧 = 伪搜索条 + AccentSwitcher + 明暗切换 + GitHub。
- **首页 hero（签名视觉）**：Fraunces 大标题 + 中文副标题 +「开始阅读」陶土胶囊按钮 + **仿 claude 输入框的伪搜索条**（点击/⌘K 打开搜索弹窗）；下方 8 张功能卡（规划/竞赛/保研/考公/留学/奖学金/信息差/贡献）。
- **卡片**：16px 圆角、1px 暖边框、`box-shadow: 0 1px 2px rgba(31,30,29,.05)`，hover 边框转 accent-strong + 轻微上浮。
- **按钮**：胶囊（radius 9999px），accent-strong 底 + 白字。
- **搜索弹窗**：16px 圆角暖色浮层 + 暖色模糊遮罩，命中项 accent-soft 底 + 3px 左侧 accent 竖条（重绘内置组件样式，不 fork）。
- **代码块**：shiki 主题 `rose-pine-dawn`（浅）/ `rose-pine`（深），12px 圆角；自绘 claude 风格 shiki 主题记为 v2 项。
- **表格**：暖色斑马纹；引用块 3px accent 竖条；行内代码暖底。
- **中文排版**：正文 line-height 1.75、段落间距 1em、标题 font-weight 600、CJK letter-spacing 0。
- **`ArticleMeta.vue`**（doc-before 插槽）：标题下渲染「作者 · 日期 · 标签 chips」一行。
- **明暗与防闪**：浅色写在 `:root`，深色写在 `.dark`（`appearance: true` 维护 `<html class="dark">`）；主题色防闪由 head 内联脚本完成。验收：刷新、切换、系统偏好变化三场景均不闪白/闪回默认色。

### 4.6 极简方案（2026-10 定稿，已实现）

- **顶栏**：纯黑 `#1F1E1D`（明暗模式统一）；左 = 项目名；中 = 导航（首页 · 板块▾（7 个板块）· 投稿 · 关于）；右 = 搜索框样式按钮（点击/⌘K 打开内置搜索弹窗）+ 明暗切换。布局用 flex `order` + 菜单 `margin: 0 auto` 居中实现
- **底色**：米白 `#FAF9F5`；深色 `#262624`
- **字体**：全站 PingFang SC（mac）+ 微软雅黑（Windows），零字体下载（已删除全部 fontsource 自托管字体，依赖降至 2 个：vitepress + gray-matter）
- **强调色**：黑白灰无彩色——链接深灰 `#4A4842`、按钮纯黑 `#1F1E1D`（深色模式链接浅灰、按钮反白）
- **首页（2026-10 重做）**：`layout: page` + `theme/components/HomePage.vue`——开场标题 + 大搜索入口 → 「四年路线」（大一至大四超大字号四栏，每栏 2-3 条要点 + 相关板块链接，本页视觉重心）→ 全部板块目录（双栏细线列表）→ 黑色投稿色带。板块清单唯一真源为 `docs/.vitepress/sections.ts`（顶栏下拉与首页共用）
- **无主题色切换**：AccentSwitcher 组件已删除
- **明暗切换（2026-10）**：三态图标按钮「跟随系统 → 浅色 → 深色」（`ThemeToggle.vue`，vite alias 覆盖 `VPSwitchAppearance.vue`），初始跟随系统；与 VitePress 共用 localStorage `vitepress-theme-appearance`，经 `@vueuse/core` 的 useColorMode 同步；head 内联脚本写 `<html data-theme-mode>` 防图标闪烁
- **顶栏下拉（2026-10）**：`NavFlyout.vue` 覆盖 `VPFlyout.vue`，只在点击时展开、箭头旋转动画、点外部 / Esc / 切页自动收起；「板块」菜单在按钮正下方居中
- **实现方式（2026-10 重构）**：顶栏不再逐组件写字面量 + `!important`（旧写法漏掉了「板块」下拉按钮文字、「…」更多菜单与移动端抽屉开关，且搜索框固定 200px 在手机上撑出横向滚动）。改为在 `.VPNav` 上整体重定义一套“黑底浅字”配色令牌，顶栏内所有子组件自动跟随；菜单居中仅在 ≥1024px 生效，搜索框紧凑宽度仅在 ≥768px 生效。页面级变量覆盖仍用 `html:root` / `html.dark`；首页卡片规则需加一层 `.VPFeatures` 才能压过默认主题的 scoped 样式

---

## 5. 中文搜索方案（本项目唯一真正的技术风险）

保留 VitePress 内置本地搜索（MiniSearch 7，随 vitepress 捆绑，零新增包），自定义 **n-gram（unigram + 重叠 bigram）分词器同时配置在索引端与查询端**。两侧同函数是关键（axios 文档仓库 PR #11097 踩过的坑：只改索引端不改查询端，多字中文查询依然搜不到）。

### 5.1 分词器（唯一真源：docs/.vitepress/search/cjkTokenize.mjs）

```js
// 中文搜索分词器：构建索引与浏览器查询共用本函数（通过 themeConfig 自动序列化下发）。
// 警告：VitePress 会把配置中的函数以 toString() 序列化、浏览器端 new Function 还原，
// 因此本函数必须完全自包含——不得引用本文件以外的任何变量、常量或导入！
export function cjkTokenize(text) {
  const CJK = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/
  const out = []
  const runs = String(text).toLowerCase().match(
    /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]+|[^㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]+/g
  )
  if (!runs) return out
  for (const run of runs) {
    if (CJK.test(run.charAt(0))) {
      const chars = Array.from(run)
      for (const c of chars) out.push(c)                       // unigram：单字查询可用
      for (let i = 0; i + 1 < chars.length; i++) out.push(chars[i] + chars[i + 1])  // bigram：词组/生造词
    } else {
      for (const w of run.split(/[^a-z0-9À-ɏ]+/)) if (w) out.push(w)     // 拉丁/数字整词
    }
  }
  return out
}
```

示例：查询「保研」→ `[保, 研, 保研]`；文档「保研经验分享」→ `[保,研,经,验,分,享, 保研,研经,经验,验分,分享]` → bigram 精确命中。单字查询靠 unigram；混排查询（`CET-6`、`ICPC 组队`）靠拉丁整词。

### 5.2 配置（config.mts 的 themeConfig.search）

> ⚠️ **M0 实测修正**：`provider: 'local'` **必须显式设置**——1.6.4 没有默认值，不设置则本地搜索插件直接短路，不生成 `@localSearchIndex` 索引块、也没有搜索 UI（已读包源码确认：`provider !== "local"` 时插件提前返回）。M0 已显式开启 `search: { provider: 'local', options: { detailedView: true } }`；2026-10 已接入分词器（索引端与查询端同函数），并补充 `tests/` 中的 toString → new Function 往返测试与 verify-build 关键词冒烟。

```ts
import { cjkTokenize } from './search/cjkTokenize.mjs'
search: {
  provider: 'local',
  options: {
    detailedView: true,
    miniSearch: {
      options:       { tokenize: cjkTokenize },   // 建索引时
      searchOptions: { tokenize: cjkTokenize,     // 查询时：必须是同一函数
                       fuzzy: 0.2, prefix: true,
                       boost: { title: 4, text: 2, titles: 1 } }
    }
  }
}
```

### 5.3 三条工程纪律

1. **函数必须自包含**：文件顶部写死警告注释；搜索任何改动必须在 `npm run preview` 生产产物上验证（dev 行为不代表产物）。
2. **只改生产构建后验收**：首次接好后不要轻易改动该函数；任何改动重跑验收。
3. **升级即重验**：VitePress 小版本升级后跑一次 12 条验收查询。未来若加严格 CSP，搜索需要 `'unsafe-eval'`（文档化，v1 不设 CSP）。

### 5.4 验收标准（发布前在 preview 产物上跑）

12 条查询全部要求目标文章进 **top 3**：保研 / 夏令营 / 国奖 / 奖学金评定 / 转专业 / 选课 / 数模 / 蓝桥杯 / 行测 / 「留学 香港」/ CET-6 / 限宽墩（生造词测试）。另测：单字查询、输入法拼音组合态、移动端 375px 弹窗、无结果中文文案。

### 5.5 自动化防回归

- `tests/tokenize.test.mjs`（`node --test`，零额外依赖）：bigram 召回（「夏令营」命中「优秀大学生夏令营」）、单字前缀、混排 AND、全角归一、与索引端配置一致性。
- `scripts/verify-build.mjs`（构建后，CI 中运行）：断言 `dist/index.html` 存在、资源路径带 base 前缀、`dist/assets/**/@localSearchIndex*` 索引块存在且包含关键词（保研/推免/夏令营/选调/蓝桥杯/转专业/绩点，含 `\uXXXX` 转义形兜底），否则红字失败。

### 5.6 IME（输入法）保护

上线前用微软拼音/搜狗实测拼音组合态。若体验不佳：复制官方 MIT 的 `VPLocalSearchBox.vue` 为本地组件（alias 替换），加 `compositionstart/compositionend` 守卫（约 40 行，查询在 compositionend + 200ms 防抖后触发）。

### 5.7 分级后备（写入仓库文档）

Plan A 本方案；Plan B 升级破坏内置搜索时自维护官方搜索组件副本；Plan C 核选项换 `vitepress-plugin-pagefind@0.4.25` + `pagefind >=1.5.2` + `forceLanguage 'zh-cn'`（接受其已知召回局限）。最坏是搜索降级，不是站点故障。**明确拒绝**：Algolia（外部服务、付费、国内不可控）、jieba 词库（体积/维护不成比例）。

**能力边界（对外说明）**：按汉字匹配，**不支持拼音**（如 `baoyan`）——写入关于/贡献页明示；二期可选 keywords/aliases frontmatter 并入索引。

---

## 6. 目录（TOC）与侧栏

### 6.1 文章目录（右侧 TOC）—— 100% 内置

- `themeConfig.outline: { level: [2, 3], label: '本页目录' }`：桌面 ≥1280px 渲染 sticky 右栏，自带 scroll-spy；单页可覆盖 `outline: [2, 4]` 或 `outline: false`。
- 中文标题自动生成中文锚点，贡献者不用管 ID。
- 换肤：发丝左框线、活动项 2px accent 竖条 + accent-ink 文字。
- 移动端：默认折叠为正文顶部悬浮「本页目录」弹层。

### 6.2 全局侧栏 —— 自动生成

`scripts/gen-sidebar.mjs` 在 config 加载时被 import 调用（dev 与 CI 行为一致），扫描 `docs/` 读 frontmatter，产出按顶级目录分组的多侧栏对象。

生成规则（全部带兜底，不可能失败）：
1. 分组标题与顺序来自该目录 `index.md` 的 frontmatter `title` / `order`（每个板块必须有 index.md 的原因）；
2. 页面标题 = frontmatter `title` → 文件第一个 `# H1` → 文件名（三级回退）；
3. 排序 = `order`（默认 999），同值按文件名；
4. 子目录成为可折叠分组（如 `baoyan/experiences/`）；
5. `sidebarTitle` 可给侧栏短标题（手机友好）；
6. `hidden: true` 不进侧栏但页面仍可访问；
7. 整个生成器包在 try/catch 中，任何异常返回空侧栏——最坏情况是没有侧栏，站点照常部署。

> **2026-10 已实现**：`scripts/gen-sidebar.mjs`（含 `tests/gen-sidebar.test.mjs`）；板块没有文章时不出侧栏。板块首页用 `<ArticleList />` 自动列出「指南 / 经验帖 / 待认领选题」（数据来自 `theme/articles.data.ts`，待认领选题写在各板块 `index.md` 的 `planned` 字段）；文章页顶部 `ArticleMeta.vue` 显示类型、年份、作者，并在指南超过 12 个月未更新（或适用年份已是两年前）、经验帖距今 ≥2 年时提示可能过时；投稿模板在仓库根目录 `templates/`。
> **手机导航（2026-10）**：不使用默认主题顶栏下方的「菜单 / 本页目录」栏；本板块文章并入 ☰ 菜单顶部（`SectionNav.vue`，nav-screen-content-before 插槽），本页目录改为文章标题上方的可折叠列表（≥3 个小标题、<1280px 时显示），<960px 时标题上方有「← 板块」返回链接。菜单里的「主题」行整行可点（只显示图标）。
> **阅读体验（2026-10）**：`ReadingAids.vue`（layout-bottom 插槽）——回到顶部按钮外圈即阅读进度环、锚点跳转后标题短暂高亮；文章信息行显示预计阅读时间与「复制链接」；明暗切换用 View Transitions 从按钮位置扩散；上一篇 / 下一篇在手机上也并排一行。

> **板块结构（2026-10 重组）**：三个大类、12 个板块，唯一真源 `docs/.vitepress/sections.ts`（`GROUPS`）。了解学院：学院与专业 `college`、导师与科研 `mentors`；在校学习与生活：大学四年规划 `planning`、课程与学业 `academics`、竞赛 `competitions`、奖学金 `scholarship`、校园生活 `campus`；毕业去向：保研 `baoyan`、考研 `kaoyan`、就业与实习 `career`、考公·选调 `kaogong`、留学 `abroad`。网址仍为一层，大类只影响导航（顶栏三个下拉、手机菜单分组、首页三栏目录）。768–1279px 时搜索框收成图标、隐藏「首页」以容纳较长的大类名。涉及具体老师的内容只写公开信息，不写评分 / 评价 / 传闻（投稿页与导师与科研板块首页均有说明）。

> **内容状态提示（2026-10）**：首页板块目录显示每个板块的文章数或「征稿中」；顶栏下拉与手机菜单里没有文章的板块文字变淡并带「征稿中」标签（`countArticles`，构建时统计）；首页开场右侧「最近更新」列出最近 5 篇（时间取 git 最后提交，拿不到时退回文件修改时间，按北京时间显示）。

> **重要日期（2026-10）**：数据在 `docs/calendar/events.yaml`（只收有官方来源的日期；未正式公布的写 `tentative`，不显示倒计时、不写进订阅），页面 `/calendar/`（`EventCalendar.vue`：按板块筛选、按月分组、倒计时按北京时间、已结束自动折叠、单条「加入日历」），首页搜索框下方「下一个节点」，构建时写出 `/calendar.ics` 供订阅（前一天与三天前 9:00 提醒；`docs/public/_headers` 声明 text/calendar）。解析与 .ics 生成在 `scripts/calendar.mjs`、`scripts/ics.mjs`，含单元测试；verify-build 检查 calendar.ics。

净贡献成本：**在已有目录新增/更新文章 = 一个 .md，零配置编辑**；只有新增顶级板块才需要维护者加一行 nav + 建目录 + index.md。

### 6.3 顶部导航（写死一次）

`大学四年规划 / 竞赛 / 保研 / 考公 / 留学 / 奖学金 / 更多 ▾（校园信息差、参与贡献、关于本站）/ GitHub 图标`；移动端自动折叠进汉堡抽屉。

### 6.4 阅读体验配套

- `editLink`：每页「在 GitHub 上编辑此页」直链网页编辑器——最高性价比的贡献入口。
- `lastUpdated: true`：页脚「最后更新于」（依赖 git 历史，CI 必须 `fetch-depth: 0`）。
- `locales.root.lang: 'zh-Hans'` + 显式中文 UI 字符串（见第 12 节实测坑 #2）。
- **纠错与补充（2026-10）**：文章页正文末尾（`doc-footer-before` 插槽，`ArticleFeedback.vue`）有「报告错误」「补充内容」两个按钮，跳到 `.github/ISSUE_TEMPLATE/correction.yml` / `addition.yml` 表单，通过 URL 参数预填标题、页面地址（`page`）和源文件路径（`file`）；表单字段 id 与参数名必须一致。
- **搜索同义词（2026-10）**：`docs/.vitepress/search/synonyms.mjs` 维护同义词组（保研/推免、国奖/国家奖学金……）；`search.options._render` 建索引时把文中出现词的同组其他词、以及 frontmatter `keywords` 写进标题所在段（只进索引、不改页面）。verify-build 检查只靠同义词进索引的词（国奖、GPA）确实可搜到。
- **小改进（2026-10）**：首页「四年路线」在 < 640px 时改为横向滑动（吸附滚动 + 上方「大一…大四」标签）；页脚更新时间改为「更新于 3 天前」（`LastUpdated.vue` 经 alias 覆盖默认组件，悬停看完整日期）；苹果设备搜索快捷键显示 ⌘ K（首屏脚本给 `<html>` 加 `mac` 类）；搜索弹窗未输入时显示推荐搜索词（`SearchHints.vue`，Teleport 进弹窗）；404 页（`NotFound.vue`）提供搜索、按地址猜板块、常看板块和失效链接报告。
- **文章图片（2026-10）**：图片放在文章旁的 `images/` 里相对引用；`![说明](./images/a.png "图注")` 单独成段时渲染为带图注的 `<figure>`（`docs/.vitepress/markdown/figure.mjs`）；文章图片统一居中、圆角、细边框（polish.css）。点击放大（`ImageZoom.vue`）：宽屏用 medium-zoom，< 768px 用全屏查看器（双击放大到约 3 倍、拖动查看）；`{.no-zoom}` 或链接里的图片不放大。`scripts/check-images.mjs`（并入 `npm run check`，只提示不阻断）：超过 500 KB、文件名带空格、防盗链图床外链、缺少说明文字。
- **问答与贡献者（2026-10）**：构建时读取 GitHub（`scripts/github.mjs` → `theme/github.data.ts`），读者浏览器不访问 GitHub。问答：带「提问」标签的 open issue（表单 `.github/ISSUE_TEMPLATE/question.yml`，按「板块」字段归类）显示在 `/questions/` 与各板块首页末尾，只显示标题和纯文本摘要；关闭或去掉标签即消失。`.github/workflows/rebuild-on-issues.yml` 在提问相关事件后调用 `CLOUDFLARE_DEPLOY_HOOK` 重新构建。贡献者：仓库 contributors（去掉机器人与 `docs/about/contributors.yaml` 的 exclude 名单）+ 文章 frontmatter 作者，头像构建时下载到缓存、buildEnd 发布到 `/avatars/`，失败退回 GitHub 地址。令牌：Cloudflare 环境变量 `GITHUB_READ_TOKEN`（失效时自动退回未登录读取）；`JC_OFFLINE=1` 跳过网络，`JC_QUESTIONS_FIXTURE` 用假数据预览。任何读取失败都不让构建失败。
- **收录与分享（2026-10）**：`SITE_URL`（config.mts，换域名只改这里和 verify-build.mjs 的同名常量）→ `sitemap.xml`（排除 404）、buildEnd 生成 `robots.txt`；`transformHead` 按页输出 canonical、Open Graph、Twitter Card，配图统一 `public/og.png`（1200×630）；只写 summary 的文章用 summary 作页面描述。verify-build 断言以上产物。
- **访问统计（2026-10）**：Cloudflare Web Analytics，在 Cloudflare 后台 Pages 项目 → Metrics → Web Analytics 开启，部署时自动注入，无需改代码；不使用 Cookie。关于页「隐私」一节有说明。这是全站唯一的第三方请求（static.cloudflareinsights.com）。
- **校园地图（2026-10）**：`/map/`（`CampusMap.vue`，异步组件，MapLibre GL 单独成块只在本页加载）。数据：`data/osm/jmu-campus.osm`（OpenStreetMap 导出，ODbL）→ `npm run map:build`（`scripts/build-campus-map.mjs`）→ `docs/public/map/campus.geojson`（只含集美大学各校区内的建筑/水面/运动场/道路，不含行政界线和校外建筑）+ `docs/map/places.generated.json`；人工修正在 `docs/map/places.yaml`（`theme/map.data.ts` 合并）。无瓦片、无第三方地图服务；定位用浏览器 Geolocation（WGS-84 与 OSM 一致，无需纠偏），只在浏览器内使用。入口：顶栏地图图标（`NavMapLink.vue`，nav-bar-content-after 插槽）、首页卡片（`mapPreview.data.ts` 生成平面预览）。测试检查提交的数据与 .osm 同步；verify-build 检查数据与人工修正生效。
- `cleanUrls: true`。已知 dev 细节：新增文件要重启 `npm run dev` 才进侧栏（对贡献者无影响，写入维护者文档）。

---

## 7. 内容体系与 Frontmatter 规范

### 7.1 目录结构（目录名固定 ASCII，中文标题在 index.md / frontmatter）

```text
docs/
├─ index.md                          # 首页（layout: home；hero + 8 卡片 + 伪搜索条）
├─ planning/                         # 《大学四年规划》
│  ├─ index.md                       # 总览：一张图看懂四年（含术语表）
│  ├─ year-1.md ~ year-4.md          # 大一~大四各自的重点
│  └─ timeline.md                    # 四年大事时间轴
├─ competitions/                     # 《竞赛》
│  ├─ index.md                       # 竞赛全景表：含金量/难度/报名时间/组队方式
│  ├─ calendar.md                    # 全年赛历（报名/校赛/省赛/国赛）
│  ├─ acm-xcpc.md                    # ICPC/CCPC/蓝桥杯/天梯赛
│  ├─ math-modeling.md               # 数学建模：国赛/美赛
│  ├─ innovation.md                  # 大创/互联网+/挑战杯
│  └─ others.md                      # 信安/嵌入式及其他专业赛
├─ baoyan/                           # 《保研》
│  ├─ index.md                       # 保研资格与流程（含本院规则解读）
│  ├─ timeline.md                    # 时间线：大三下 → 推免系统开放
│  ├─ gpa-ranking.md                 # 绩点/排名计算与提升策略
│  ├─ research.md                    # 进组科研、论文、联系导师（含邮件模板）
│  ├─ summer-camp.md                 # 夏令营/预推免
│  ├─ interview.md / materials.md    # 面试机试 / 材料清单与文书模板
│  └─ experiences/
│     ├─ index.md                    # 上岸经验帖索引（按年份/院校）
│     └─ 2026-xxx.md                 # 往届经验（每位作者一篇）
├─ kaogong/                          # 《考公·选调》
│  ├─ index.md                       # 国考/省考/选调/事业单位全景（计算机专业对口岗）
│  ├─ timeline.md / xingce.md / shenlun.md / interview.md
│  └─ selection.md                   # 选调生专题
├─ abroad/                           # 《留学》
│  ├─ index.md                       # 留学全景与自评（地区/费用/难度）
│  ├─ regions.md                     # 港新/欧洲/美加/日韩怎么选
│  ├─ gpa-language.md                # 绩点换算、托福/雅思
│  ├─ application.md                 # CV/PS/推荐信与申请流程
│  └─ funding.md                     # 费用与奖学金
├─ scholarship/                      # 《奖学金》
│  ├─ index.md                       # 全览与评选日历
│  ├─ national.md                    # 国奖/国励
│  ├─ school.md                      # 校级奖学金与综测规则
│  └─ external.md                    # 企业/社会奖学金与申请技巧
├─ campus/                           # 《校园信息差》（兜底板块）
│  ├─ index.md                       # 还有哪些值得知道的事 + 待认领话题清单
│  ├─ courses.md / change-major.md / internship.md / tools.md / life.md
├─ contribute/                       # 《参与贡献》
│  ├─ index.md                       # 五分钟上手：如何写一篇文章
│  ├─ template.md                    # 文章模板（复制即用）
│  ├─ style-guide.md                 # 写作规范与内容边界
│  └─ review.md                      # 审核与发布流程
├─ about/
│  ├─ index.md                       # 关于本站 + 联系方式 + 招募接班人
│  └─ disclaimer.md                  # 免责声明
└─ public/                           # logo.svg / icons/*.svg / images/<section>/*
```

规则：文件名建议 ASCII 小写连字符（中文文件名可用但校验器给提示不阻断）；每个板块必须有 index.md（写作范式 = 导读 + 时间线 + 术语表——这三样本身就是「信息差」的载体）；经验帖进 `experiences/` 按「年份-院校」命名堆叠成档案；首发核心团队写 **12-15 篇种子文章**（每板块至少 1 篇旗舰），站点上线即有用。

### 7.2 Frontmatter 规范（设计原则：没有任何字段是必填的）

漏写或写坏 frontmatter **永远不会让构建失败**（侧栏生成器与搜索逐级降级：title → H1 → 文件名）。

```yaml
---
title: 保研全流程时间线                   # 推荐：侧栏与搜索显示的标题
description: 从大三下到大四推免系统的完整时间线，附材料清单。   # 可选：搜索摘要/分享卡片
order: 20                                # 可选：排序，越小越靠前（默认 999）
tags: [保研, 时间线]                     # 可选
author: 小明                             # 可选：可写「匿名」或「计院某学长」
updated: 2026-09-01                      # 可选：内容更新日期（YYYY-MM-DD）
sidebarTitle: 保研时间线                 # 可选：侧栏短标题
hidden: false                            # 可选：true = 不进侧栏但页面仍可访问
keywords: 夏令营, 预推免                 # 可选：正文里没写、但读者会搜的词（常见简称/全称已由同义词表处理）
---

# 保研全流程时间线        ← 正文从一级标题开始，与 title 一致即可
正文用普通 Markdown。::: tip 提示 支持 tip / info / warning / danger 提示框。:::
```

`scripts/check-frontmatter.mjs`（CI 先于构建运行，**永不 exit 非零**）：以 GitHub 注解输出，问题直接标在 PR 的对应文件/行上，全中文、每条附具体修复建议（title 缺失或超 60 字、order 非数字、tags 非数组、updated 格式错、description 建议 30-200 字、未知字段仅 info、文件名含空格/大写提示），同时回显到 Actions job summary。

### 7.3 内容边界（contribute/style-guide.md）

- 不写对具体老师的负面评价；不泄露他人隐私（含成绩单、联系方式）；
- 政策类信息必须标注年份与来源链接（「2026 年政策」）；
- 每篇文末鼓励加「我踩过的坑」小节（也是最好的搜索素材）；
- 个人经验须为本人经历或已注明来源；文末附免责声明（经验非官方口径、不保证时效）；
- 图片统一放 `docs/public/images/<板块>/`，正文用 `![](/images/baoyan/xxx.png)`；宽度 ≤1200px、单图 ≤200-300KB、优先 WebP、必须有说明性 alt；
- **站内链接用相对路径**（`../baoyan/timeline.md`），不要写 `/保研/...` 根路径（项目页部署在子路径下会 404——最容易踩的坑）。

---

## 8. CI/CD 与部署

### 8.1 一次性仓库设置（写入 README 清单）

1. 建公共仓库 `Awesome-jmu-cec`，推入脚手架；
2. Settings → Pages → **Source = "GitHub Actions"**（不要选 Deploy from a branch）；
3. 无需任何 Secrets（公共仓库 Actions 免费额度无限）；
4. 分支保护（Settings → Branches）：main 要求 PR + 1 approval + status checks（`ci`）+ 禁 force push；CODEOWNERS 指向 `docs/**` 与 `.vitepress/**`；
5. 未来改仓库名 → 同步改 `config.mts` 的 `base`；绑自定义域名 → 加 `docs/public/CNAME`、`base` 改 `'/'`、更新 sitemap/OG 绝对地址（步骤清单文档化）。

### 8.2 .github/workflows/deploy.yml（push main + 手动触发）

```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }                 # 完整 git 历史，「最后更新于」才有值
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm test                            # node --test tests/（分词器回归）
      - run: npm run build                       # check（中文注解，不阻断）+ vitepress build（死链=失败）
      - run: node scripts/verify-build.mjs       # dist / base 前缀 / 搜索索引冒烟断言
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with: { path: docs/.vitepress/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

### 8.3 .github/workflows/ci.yml（PR 门禁）

`on: pull_request`（target main）；步骤与 build 作业相同，**不含 configure/upload/deploy**；`permissions: { contents: read }`。效果：死链、Markdown/Vue 语法错、构建失败把 PR 变红并在失败日志给出**文件 + 行号**，坏改动永远到不了 main；构建不过就不部署，线上始终保持上一版好产物。回滚 = revert 提交（或重跑上一次成功的 run）。

### 8.4 Action 版本纪律（2026-10 重要背景）

- 当前 major：`checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`（Pages 两件套务必成对升降）。
- **不要照抄 GitHub 官方 static.yml 模板的旧 pin**（checkout@v4 / configure-pages@v5 / upload-pages-artifact@v3 已落后）；GitHub 自 2026-06-16 强制 Node 24 运行时、2026-09-16 移除 Node 20，旧 pin 会静默腐烂。
- 落地时用 `gh api repos/actions/<name>/releases/latest` 核对一次当前 major。
- `.github/dependabot.yml`：github-actions 每周、npm 每月分组（`@fontsource*` 归一组）。

### 8.5 scripts/verify-build.mjs（构建后断言）

1. `docs/.vitepress/dist/index.html` 存在；
2. 页面资源引用带 `/Awesome-jmu-cec/` 前缀（项目页子路径正确）；
3. 本地搜索索引块存在且包含关键词表（含 `\uXXXX` 转义形兜底检索）。
任一失败 → 红字中文报错并 exit 1。

### 8.6 部署后验收（每次大改/升级后跑）

1. 首页样式与字体正确，DevTools Network 过滤 `google`/`gstatic` 为空（零第三方请求）；
2. 中文搜索抽查通过；
3. 深色模式 + 5 套主题色切换、刷新不闪回、状态不丢；
4. 手机 375px：汉堡菜单、TOC、搜索弹窗可用；
5. 任意页面「编辑此页」跳到对应 .md 的 GitHub 编辑器；
6. 搜索索引与字体均从本站域（含 base 前缀）加载成功；
7. 全站无英文 UI 残留（含 title/aria 属性）。

### 8.7 托管切换：Cloudflare Pages（2026-10 起主托管）

- **主托管**：Cloudflare Pages（https://awesome-jmu-cec.pages.dev/），GitHub 仍是代码与审核中枢。CF Pages 直连 GitHub（Workers & Pages → Pages → Git integration）：Build command `npm ci && npm run build`、Output `docs/.vitepress/dist`、生产分支 main；push main 自动构建，免费附带 **PR 预览部署**与**一键瞬时回滚**。
- **base 已改 `'/'`**（config.mts 的 BASE）；verify-build 断言「无残留旧 base + HTML 含 /assets/ 引用」；deploy.yml 已删除，GitHub Pages 旧地址冻结在最后构建。
- **回退方案**：恢复 deploy.yml + BASE 改回 '/Awesome-jmu-cec/' + 重启 GitHub Pages。
- **注意**：Cloudflare 的统一 GitHub App（`cloudflare-workers-and-pages`）为每个连接的项目发检查；删除 CF 侧项目后旧检查记录会残留（无法删除、不阻塞合并），新提交不再产生。Pages 预览检查保留（PR 预览）。

---

## 9. 贡献者工作流与审核机制

### 9.1 新增文章（黄金路径：5-10 分钟、纯 GitHub 网页操作、零本地环境）

1. 打开网站任意页面 → 点「在 GitHub 上编辑此页」；或直接进 GitHub 仓库 `docs/<板块>/` 文件夹；
2. **Add file → Create new file**；文件名英文小写 + 连字符（如 `baoyan/my-experience-2026.md`）；
3. 打开 `docs/contribute/template.md` 复制模板粘贴进新文件——模板自带注释版 frontmatter（只需填 title）+ 常用语法小抄 + `::: tip` 示例；
4. 写正文；配图先上传到 `docs/public/images/<板块>/`（Add file → Upload files），正文写 `![说明](/images/baoyan/xxx.png)`；GitHub 编辑器的 Preview 标签即时预览；
5. 拉到底写提交说明 → **Commit changes** → 选 *"Create a new branch for this commit and start a pull request"* → Propose changes；
6. 1-2 分钟后 CI 出结果：绿 = 可合并；红 = 点 Details 看中文报错注解（标明文件+行号+怎么改），同一分支再提交即可（不用重开 PR）；
7. 维护者 Review 并合并 → deploy 自动构建部署（约 2 分钟）→ 网站更新，作者在页面上看到自己的署名。

**一键深链**：`contribute/index.md` 提供每个板块的「新建文件」深链（带 URL 编码模板），点一下带着模板进入编辑器。

### 9.2 更新页面（与新增流程完全一致）

1. 打开该页面 → 点「在 GitHub 上编辑此页」直达对应 .md 的网页编辑器；
2. 改正文，顺手更新 frontmatter `updated: 2026-10-06`（内容更新日期声明）；
3. 提交说明写清改了什么（如「更新 2026 年国奖评定规则」）→ PR → CI 校验 → 维护者合并 → 约 2 分钟线上生效；
4. 「最后更新于」页脚时间戳基于 git 提交历史自动刷新（CI 有 `fetch-depth: 0`），作者不用管；
5. 文件名不变 URL 就不变，小改/更新不产生死链；整篇重写且主题变了 → 建议新开一页，旧页加「本文已过时，请看 xxx」指引（经验帖按「年份-院校」命名天然堆叠成档案）；
6. 更新别人的文章：同样提 PR 说明改动原因，按 review 规则注明共同作者。

### 9.3 审核机制（默认存在 + 四道防线）

**防线 1：合并前人工审核（天生的）**——除维护者外任何人都不能直接改 main，所有改动必须 PR → 维护者 Review（看每一处 diff）→ 合并。没有任何路径可以绕过审核改线上内容。

**防线 2：分支保护规则**（2026-10 起按「管理员直推 + 贡献者 PR」模型配置）：

| 规则 | 作用 |
|---|---|
| Require a pull request before merging + 1 approval | **贡献者**（无写权限）必须 fork + PR + 至少 1 名维护者批准才能合并 |
| Require status checks to pass（context = `build`） | PR 的 CI 红了（死链、语法错）点不了合并按钮 |
| `enforce_admins: false`（允许管理员绕过） | **维护者本人可直推 main 开发**，不受 PR/审核约束；2026-10 开发期工作流：本地合并分支 → 直推 main |
| 禁止 force push / 禁止删除分支 | 防覆盖历史、防毁仓库 |

> 若未来要恢复「连维护者也必须走 PR」：把 enforce_admins 改回 true 即可（一行 API 调用）。

**防线 3：内容风险面天然很小**——知识文章站不是代码执行环境，markdown 里塞 `<script>` 不会执行；恶意改动的最坏后果是「发布了一篇坏内容」，不会破坏站点本身。

**防线 4：可逆性分钟级**——坏内容进 main → deploy 构建失败 → 线上保留上一版；真上线了 → revert 提交，约 2 分钟恢复。恶意 PR / 垃圾 Issue 刷屏 → GitHub 设置里的互动限制（Interaction limits）可临时只允许老用户互动。

**审核组织**（contribute/review.md）：
- 审核清单：标题已填 / 站内链接可点 / 无隐私泄露（成绩单、他人联系方式）/ 本人经验或注明来源 / 政策信息带年份 / 图片已压缩且有 alt；
- 审核 SLA：承诺 72 小时内处理，写进 CONTRIBUTING；
- 修改他人文章须注明共同作者；被拒稿有复核路径；
- 后期招 2-3 个共同维护人互相审核（about 页「招募接班人」入口），维护者不在时站也能运转。

### 9.4 报错体验（CONTRIBUTING.md 内置排查表）

| 症状 | 原因与修法 |
|---|---|
| `Found dead link ...`（红） | 内部链接指向不存在的页面：报错给出文件与行号，改路径或先删链接 |
| `Element is missing end tag` / `Unexpected token`（红） | 正文有裸的 `<`、`{{ }}`（如「分数线 < 600」）：用反引号包成 `` `< 600` `` 或改全角符号 |
| frontmatter 黄色注解 | 不影响构建：按提示补 title 等即可，可改可不改 |
| 图片不显示 | 路径拼写/大小写不一致；统一小写文件名 |
| 完全不会 git | 仓库内置 Issue 模板「投稿文章」：粘贴正文 + 期望板块，维护者代为提交——兜底通道 |

### 9.5 维护者路径（极少用）

`npm i && npm run dev` 本地预览；涉及搜索的改动必须在 `npm run build && npm run preview`（生产产物）上验证。升级依赖 → 跑 `npm test` + 12 条搜索验收 + 上线验收清单。二期可选：CI 失败时用 `actions/github-script` 给 PR 自动贴一条中文「修复指南」评论（`continue-on-error: true`；fork PR 只读 token 自动跳过）。

---

## 10. 里程碑与验收门

单人熟练开发 + AI 协助约 **3.5-4.5 个专注日**；长期维护近乎为零（Dependabot 自动更新 + 内容凭 PR 流入）。

| 里程碑 | 内容 | 工时 | 验收门（必须实测通过） |
|---|---|---|---|
| **M0 骨架与 CI** | 初始化仓库与 package.json（5 依赖 + lockfile）、`.nvmrc`、config.mts 骨架、deploy.yml + ci.yml、启用 Pages、分支保护 + CODEOWNERS | 0.5 天 | 空站成功部署到 `https://<org>.github.io/Awesome-jmu-cec/`，base 路径正确，Actions 全绿 |
| **M1 主题系统** | vars.css 浅/深 + 5 套主题色（含对比度校准脚本）、字体三件、AccentSwitcher、ArticleMeta、首页 hero + 8 卡片、各 UI 表面细节、移动端 | 1-1.5 天 | 桌面 + 375px 双端视觉验收；明暗 × 5 色自由组合、刷新不闪回；零第三方请求；**全站无英文 UI 残留** |
| **M2 搜索** | cjkTokenize.mjs + 两侧同函数配置 + tests + verify-build | 0.5-1 天 | **在 preview 产物上** 12 条验收查询全部 top-3；`npm test` 绿；verify-build 绿；IME 实测通过（不通过则启用 compositionend 守卫备用方案） |
| **M3 结构化自动化** | gen-sidebar.mjs、check-frontmatter.mjs、dependabot、PR/Issue 模板、中文 404、OG/sitemap/robots/favicon、RSS | 0.5 天 | 丢一个 .md 即出现在侧栏；故意写坏 frontmatter 后 PR 出现中文注解；故意造死链后 PR 变红；分享卡与 sitemap 带 base 前缀 |
| **M4 内容与文档** | contribute/ 全四页 + 各板块 index.md + 12-15 篇种子文章 + README/CONTRIBUTING/双 LICENSE | 1-1.5 天 | 每板块至少 1 篇旗舰文章；模板可直接复制使用；**邀请一位非 git 用户完成端到端投稿演练**，把每一处困惑回填进 CONTRIBUTING；首波作者征稿排期落实 |
| **M5 打磨上线** | 移动端/a11y（reduced-motion、focus-visible）、对比度复核、404 页、性能预算（Lighthouse 留档）、验收清单全跑 | 0.5-1 天 | 上线验收清单全绿；宣布上线，进入运营期 |

分阶段顺序的用意：M0 先跑通部署链路（一切的地基）；搜索排在内容之前（唯一技术风险，越早暴露越好）；M3 用真实 PR 演练校验自动化；M4 种子内容让站点上线即「有用」而不是「空壳」。

### v1 范围冻结（防蔓延）

v1 = 上述全部，**不做**：评论系统、统计埋点（GA 被墙且涉隐私）、PWA/离线、PR 预览部署、自绘 shiki 主题、多语言。任何新增运行时依赖需在 PR 中说明理由。

---

## 11. 风险与对策（按严重度排序）

| # | 风险 | 对策 |
|---|---|---|
| 1 | **中文搜索召回质量**（中高，唯一真正的技术风险） | 索引端与查询端共用同一分词函数（已实测类型与序列化机制），按构造保证查询词元必然存在于索引；`node --test` 回归 + 12 条验收 + CI 索引冒烟；三级后备（见 5.7） |
| 2 | **themeConfig 函数序列化坑**（中） | cjkTokenize.mjs 整文件只含一个自包含函数，文件顶部写死警告注释；任何改动在 preview 产物上验证；v1 不设 CSP（未来加需 `'unsafe-eval'`，文档化） |
| 3 | **GitHub Actions 运行时变动导致部署腐烂**（中） | 使用当前 major、不照抄官方旧模板；Dependabot 每周更新 actions；失败是响亮的、修复是改版本号级别的；部署无状态，随时可重跑 |
| 4 | **新手贡献者写坏站点**（中） | frontmatter 全可选；校验器只警告不阻断 + 中文注解；PR 门禁保证 main 永远可部署；构建失败不部署、线上保留上一版；Issue 投稿兜底；M4 非 git 用户端到端演练 |
| 5 | **中国大陆对 github.io 的可达性波动**（中高，残余风险） | 全站零第三方请求，域名可达时体验完整；页面轻（HTML 优先、系统字体正文、图片懒加载）；**提前向使用者说明预期**，避免把网络波动误判为「网站坏了」。二期可选：绑自定义域名、Cloudflare Pages 镜像。此风险任何静态托管方案都无法根除 |
| 6 | **搜索索引体积增长**（低中） | bigram 使中文词项约 2.5 倍，但数百篇文章 = 数百 KB gzip；VitePress 自动分片；verify-build 输出体积便于监控 |
| 7 | **维护者换届 / bus factor**（结构性） | 5 个锁定依赖、零服务零密钥；自定义面极小且全部中文注释；文档全中文；README 有「30 秒部署清单」与「招募接班人」入口；**不要在 VitePress 2.x 稳定前升级 alpha** |
| 8 | **搜索弹窗 IME 体验**（低中） | M2 用微软拼音/搜狗实测列为验收门；不达标即启用 compositionend + 防抖守卫的官方组件副本方案 |
| 9 | **内容质量与隐私**（中） | style-guide 明确边界；PR 模板勾选清单 + 维护者 Review；CC BY-SA 4.0 授权说明；撤稿与更正 Issue 模板 |
| 10 | **范围蔓延**（结构性） | v1 功能清单冻结写入 README；新增运行时依赖必须 PR 说明理由；主题改动只允许动 CSS 变量与既有组件文件 |

---

## 12. 已实测的坑与对策（完整性审查发现，落地时必须处理）

以下问题在真实构建产物 / 官方包源码上**实测确认**，非推测：

1. **head 条目不自动补 base**：实测产物里 `<link rel="icon" href="/logo.svg">` 没有 base 前缀会 404 —— favicon/apple-touch-icon 的 href 手写含 base 的绝对路径。同理 `sitemap.hostname` 必须写成 `https://<org>.github.io/Awesome-jmu-cec/`（写 `...github.io/` 会丢失 base），verify-build 断言 sitemap 的 loc 与页面 og:url 都带 base 前缀。按页注入 og:title/og:description/og:url/og:image/twitter:card（`transformHead`），public/ 放 1200×630 默认分享图，仓库 social preview 用同款图。
2. **zh-Hans 不会自动翻译 UI**：实测组件文案全是英文兜底（Previous page/Next page、Last updated、Return to top、搜索弹窗全套）。需显式配置 `docFooter.prev/next`、`lastUpdated.text`、`returnToTopLabel`、`sidebarMenuLabel`、`darkModeSwitchLabel`、`outline.label`、搜索 `translations`（buttonText + modal.*）——M1 验收加「全站无英文 UI 残留」走查。
3. **404 页默认全英文**：VitePress 自动生成 dist/404.html，但默认英文文案且只有「回首页」。用 `themeConfig.notFound` 全中文定制（code/title/quote/linkLabel/linkText），或建 `docs/404.md` 做带搜索入口的 404 页；**不要用 public/404.html**（与自动生成的冲突）。cleanUrls 深链边缘 404 案例实测，必要时回退 `cleanUrls: false`。
4. **对比度实测不达标**：详见 4.2 校准框（text-3、多套按钮底、teal ink 均不足）。落地内置对比度断言脚本进 `npm test`，校正后的值写回 vars.css 注释与验收清单。
5. **图片懒加载默认关闭**：实测 `markdown.image.lazyLoading` 仅在显式开启后才写 `loading='lazy'`——config 开启之；verify-build 扫描 `.md` 中 `/images/` 引用是否存在 + 图片体积超阈值报警。
6. **公开仓库治理**：分支保护、CODEOWNERS、审核 SLA、代改与认领规则写进 M0 一次性清单与 review.md（见 9.3）。
7. **双许可机制**：单个 LICENSE 表达不了「代码 MIT + 文章 CC BY-SA 4.0」——放 `LICENSE`（MIT）+ `LICENSE-CONTENT.md`（CC BY-SA 4.0 摘要），README/页脚注明；CONTRIBUTING 写明「投稿即同意以 CC BY-SA 4.0 发布」；加「撤稿与更正」Issue 模板；页脚/关于页/README 三处写清「非学校官方项目、不代表学校立场」；不使用校徽等商标资产。
8. **外链腐烂**：VitePress 只校验站内链接。加每月定时 workflow（lychee-action 固定版本）检查外部链接，失效开 Issue 而不是让 PR 变红（外网波动不应阻断贡献）；政策类文章强制 `updated` 年份；年度「内容年检」Issue 模板列出超过 12 个月未更新的文章。
9. **性能预算**：README 写性能预算表（首页 JS gzip、单页字体字节、搜索索引体积、单图大小），verify-build 输出 dist 指标并断言阈值；M5 用 Lighthouse 移动端限速跑首页 + 一篇长文留档；M1 实测首屏字体下载量（确认 fontsource Inter 与默认主题自带 Inter 是否重复，重复则删）。
10. **自定义域名切换**：host/base 抽成 config 单一常量（verify-build/sitemap/OG 从 config 读取）；`docs/maintainers/custom-domain.md` 写清 DNS 记录、Enforce HTTPS、base 改 `/`、重跑验收清单全流程。**Actions 部署方式的关键坑**：Settings 里填的自定义域名不会写进仓库，每次部署会把 GitHub 自动生成的 CNAME 冲掉导致域名失效——必须在 `docs/public/CNAME` 自己放一个内容为域名的文件（推荐子域名 CNAME 指向 `k1nesss.github.io`，比 apex A 记录简单；解析到境外无需 ICP 备案，但建议避开 .cn）。
11. **RSS/更新订阅**：构建期约 20 行脚本从 frontmatter（title/updated/description）生成 `/feed.xml`（Atom），head 加 alternate link，页脚放订阅入口；顺带做 `/updates` 页按 updated 倒序（给不熟悉 RSS 的用户「最近更新」入口）。
12. **隐私立场**：文档化「数据源 = GitHub Insights/Traffic（14 天窗口）+ Issue/PR 量」；若需细粒度统计，评估自托管 Umami/Plausible（单独决策，不进 v1）；「无 Cookie、无追踪、零第三方脚本」写成隐私立场与验收项，防止未来有人随手塞回 GA。
13. **冷启动运营**：M4 定首波作者与截止时间（覆盖 8 个板块）、学院群/新生群/竞赛群征稿、「署名 + 贡献者墙/作者页」做成可见激励、每月发一次选题 Issue（用 campus/index.md 的待认领清单）、关于页公示成为作者/维护者的路径。
14. **无障碍补全**：`@media (prefers-reduced-motion: reduce)` 关闭位移/缩放动画；卡片、popover、伪搜索条补 `:focus-visible` 轮廓（accent 系且 ≥3:1）；style-guide 规定图片必须有说明性 alt 并给正反例；M5 用 Lighthouse a11y + axe 抽查并留档。
15. **搜索能力边界**：明示「按汉字匹配，不支持拼音」；首页伪搜索条实现为 `<button aria-label="搜索">`（显示 ⌘K / `/` 快捷键提示，点击派发与内置弹窗相同的快捷键事件），不要做成真 input 造成不可用控件；模板加 keywords 示例字段（二期并入索引时注意函数仍需自包含）。
16. **工作流 YAML 流式映射内嵌表达式会被拒绝**（M0 实测踩坑）：`concurrency: { group: ${{ github.ref }}, ... }` 这类流式写法中的 `{{ }}` 会触发解析器报错（表现：push 后该 workflow 0s 失败、GitHub 提示 "workflow file issue"，且 Dependabot 的 github-actions 更新会连带失败）。**凡含 `${{ }}` 的值一律用块式写法**；`${{ }}` 出现在块式值中（如 deploy.yml 的 `url: ${{ steps.deployment.outputs.page_url }}`）则没有问题。

---

## 13. 附：部署与运维速查

- **改内容**：PR → 合并 → 约 2 分钟上线（见 9.1 / 9.2）
- **回滚**：revert 提交，或 Actions 里重跑上一次成功的 deploy run
- **加顶级板块**：维护者建目录 + index.md + config.mts 的 nav 加一行 + 首页卡片加一张
- **升级依赖**：Dependabot 自动提 PR → 跑 `npm test` + 12 条搜索验收 + 上线验收清单 → 合并
- **换域名/仓库名**：见 8.1 第 5 条与第 12 节坑 #10
