// 图注插件的回归测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMarkdownRenderer } from 'vitepress'
import { figurePlugin } from '../docs/.vitepress/markdown/figure.mjs'

// 用 VitePress 自己的渲染器（含 attrs 等内置插件），与线上构建一致
const md = await createMarkdownRenderer('docs', { config: (m) => m.use(figurePlugin) })

test('单独成段且有标题的图片包成 figure，标题变图注', () => {
  const html = md.render('![时间线](./a.png "2026 年保研时间线")')
  assert.equal(html, '<figure><img src="./a.png" alt="时间线"><figcaption>2026 年保研时间线</figcaption>\n</figure>\n')
})

test('没有标题、或与文字同段的图片保持原样', () => {
  assert.equal(md.render('![时间线](./a.png)'), '<p><img src="./a.png" alt="时间线"></p>\n')
  assert.match(md.render('见下图 ![x](./a.png "t")'), /^<p>见下图 <img src="\.\/a\.png" alt="x" title="t"><\/p>/)
})

test('图注里的特殊字符会被转义', () => {
  assert.match(md.render('![x](./a.png "<b>&")'), /<figcaption>&lt;b&gt;&amp;<\/figcaption>/)
})
