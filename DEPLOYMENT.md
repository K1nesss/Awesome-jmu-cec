# 部署与改造指南

> [!IMPORTANT]
> **集美大学计算机工程学院的同学不需要看这份文档，也不需要自己部署。**
> 投稿、纠错、提问都直接在 [网站](https://awesome-jmu-cec.pages.dev/) 和本仓库完成，参见 [投稿指南](https://awesome-jmu-cec.pages.dev/contribute/)。
> 多一份部署就多一份要维护、会过时的内容，请不要另起炉灶。

这份文档写给**想为自己学校或学院搭一个同类网站**的人：怎么在本地运行、哪些地方要改成你们学校的、怎么部署上线。

## 目录

- [本地运行](#本地运行)
- [目录结构](#目录结构)
- [改成你们学校](#改成你们学校)
- [部署到 Cloudflare Pages](#部署到-cloudflare-pages)
- [可选功能](#可选功能)
- [许可要求](#许可要求)

## 本地运行

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/K1nesss/Awesome-jmu-cec.git
cd Awesome-jmu-cec
npm install
npm run dev        # 本地预览：http://localhost:5173
```

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发预览，改文章实时刷新（新增文件后重启才会进侧栏） |
| `npm run build` | 检查 frontmatter 与图片，然后构建到 `docs/.vitepress/dist` |
| `npm run preview` | 预览构建结果 |
| `npm test` | 运行测试（搜索分词、日历、地图数据等） |
| `npm run map:build` | 更新 OpenStreetMap 数据后，重新生成校园地图数据 |

构建时会从 GitHub 读取「提问」issue 和贡献者。本地没有令牌也能用（未登录每小时 60 次请求）；设置 `JC_OFFLINE=1` 可以完全跳过网络请求。

## 目录结构

```
docs/
├─ <板块>/            每个板块一个目录：index.md 是板块首页，其余 .md 是文章
│  └─ experiences/    经验帖
├─ calendar/          重要日期（events.yaml）
├─ map/               校园地图（places.yaml 是人工修正，places.generated.json 自动生成）
├─ questions/         问答页
├─ contribute/        投稿指南
├─ about/             关于本站（contributors.yaml：贡献者头像墙的排除名单）
├─ public/            图标、分享图、地图数据等静态文件
└─ .vitepress/
   ├─ config.mts      站点配置：标题、顶栏、搜索、页脚、分享卡片、站点地图
   ├─ sections.ts     三个大类、十二个板块的唯一来源（顶栏、首页、侧栏都从这里读）
   ├─ search/         中文分词与搜索同义词
   └─ theme/          主题：组件、样式、数据加载（文章列表、日历、问答、地图）
data/osm/             校园地图的 OpenStreetMap 原始数据
scripts/              侧栏生成、构建检查、日历、地图数据转换等脚本
templates/            投稿模板
tests/                测试
.github/              CI、Issue 表单、问答同步工作流
```

## 改成你们学校

按下面的清单逐项修改。改完运行 `npm test` 和 `npm run build`，测试和构建检查会指出遗漏的地方。

### 必须改

| 文件 | 改什么 |
| --- | --- |
| `docs/.vitepress/config.mts` | `SITE_URL`（你们的网址）、`title`、`SITE_DESC`、页脚文字 |
| `docs/.vitepress/sections.ts` | `REPO`（你们的仓库地址）；大类与板块的名称、目录名和简介 |
| `scripts/github.mjs` | `OWNER`、`REPO_NAME`（问答与贡献者从这个仓库读取） |
| `scripts/verify-build.mjs` | `SITE_URL`（与 config.mts 一致）；`KEYWORDS` / `SYNONYM_ONLY` 换成你们文章里会出现的词 |
| `.github/ISSUE_TEMPLATE/` | `question.yml` 的板块下拉选项；`config.yml` 里的投稿链接 |
| `docs/.vitepress/theme/components/HomePage.vue` | 首页标题、简介和「四年路线」的内容 |
| `docs/` 下的文章 | 删除示例文章，各板块 `index.md` 里的「待认领选题」换成你们的 |
| `docs/about/`、`docs/contribute/` | 关于页、投稿指南里的学校名和仓库链接 |
| `docs/calendar/events.yaml` | 清空后填你们的重要日期（每条都要有官方来源） |
| `docs/.vitepress/search/synonyms.mjs` | 同义词表：保留通用的，换掉学校特有的简称 |
| `docs/public/` | 图标（`favicon.svg`、`favicon-32.png`、`apple-touch-icon.png`、`icon-512.png`）、分享图 `og.png`、`site.webmanifest` |
| `scripts/ics.mjs` | 日历订阅的名称 |
| `LICENSE`、`LICENSE-CONTENT.md` | 版权方与许可说明 |

### 校园地图

地图数据来自 OpenStreetMap，先在 [openstreetmap.org](https://www.openstreetmap.org/) 上确认你们校园的建筑已经画好（没有的话可以自己补上，所有人都能受益）。

1. 在 openstreetmap.org 框住校园范围，点「导出」，用导出的 `.osm` 文件替换 `data/osm/jmu-campus.osm`（文件名可以改，同时改 `scripts/build-campus-map.mjs` 里的 `SRC`）。
2. `scripts/build-campus-map.mjs`：把识别校区的 `/^集美大学/` 换成你们学校的名字，并调整 `AREA_SHORT` 校区简称的规则。
3. 运行 `npm run map:build`，生成 `docs/public/map/campus.geojson` 和 `docs/map/places.generated.json`。
4. `docs/.vitepress/theme/components/CampusMap.vue`：`HOME`（地图默认中心和朝向）。
5. `docs/.vitepress/theme/mapPreview.data.ts`：首页平面预览要显示的校区名。
6. `docs/.vitepress/theme/map.data.ts`：新增地点的经纬度范围检查。
7. `docs/map/places.yaml`：清空后按需写改名、别名和简介。
8. `tests/campus-map.test.mjs`：把测试里的地点名换成你们校园里有的。

### 问答与贡献者

- 在仓库里创建标签 `提问`、`纠错`、`补充`——Issue 表单只会自动加上已经存在的标签。
- `docs/about/contributors.yaml`：清空排除名单，或者加上不想出现在头像墙上的账号。

## 部署到 Cloudflare Pages

网站是纯静态的，任何静态托管都可以；下面以本站使用的 Cloudflare Pages 为例（自带 PR 预览部署和一键回滚）。

1. Cloudflare 后台 → Workers & Pages → Pages → 连接 GitHub 仓库。
2. 构建命令 `npm ci && npm run build`，输出目录 `docs/.vitepress/dist`，生产分支 `main`。
3. 环境变量 `GITHUB_READ_TOKEN`：一个只读的 GitHub 令牌，构建时读取问答和贡献者，避开未登录的请求次数限制。
4. 在 Pages 项目里创建一个 Deploy hook，把地址存成 GitHub 仓库的 Secret `CLOUDFLARE_DEPLOY_HOOK`。有人提问、回复或关闭提问时，`.github/workflows/rebuild-on-issues.yml` 会调用它重新构建，问答页一两分钟内同步。
5. 可选：Metrics → Web Analytics → 启用，统计访问量（不使用 Cookie）。启用后请保留关于页里的隐私说明。

推送到 `main` 后自动构建；Pull Request 会生成预览地址。CI（`.github/workflows/ci.yml`）在每个 PR 上运行测试和构建检查。

绑定自定义域名后，记得同步修改 `config.mts` 和 `verify-build.mjs` 里的 `SITE_URL`。

## 可选功能

不需要的功能可以去掉：

- **校园地图**：删除 `docs/map/`、`data/osm/`、`docs/public/map/`、`CampusMap.vue`、`NavMapLink.vue` 里的地图链接、`HomePage.vue` 的地图卡片，以及 `verify-build.mjs` 和 `tests/` 里与地图有关的检查。
- **问答**：删除 `docs/questions/`、`QuestionList.vue`（以及 `ArticleList.vue` 里对它的引用）、`question.yml` 和 `rebuild-on-issues.yml`，并去掉顶栏的「问答」。
- **重要日期**：删除 `docs/calendar/`、`EventCalendar.vue`、首页的「下一个节点」，以及 `config.mts` 里生成 `calendar.ics` 的部分。

## 许可要求

- 代码按 [MIT](LICENSE) 许可，可以自由使用，保留版权声明即可。
- 本站文章按 [CC BY-SA 4.0](LICENSE-CONTENT.md) 许可：转载或改写需要署名，并以相同许可共享。
- 地图数据按 ODbL 许可，必须保留「© OpenStreetMap 贡献者」署名。

欢迎在你们的 README 里注明「基于 [Awesome JMU CEC](https://github.com/K1nesss/Awesome-jmu-cec)」。
