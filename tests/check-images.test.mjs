// 图片校验的回归测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findImageIssues } from '../scripts/check-images.mjs'

test('防盗链图床给出提示，普通外链与本地图片不提示', () => {
  const issues = findImageIssues(
    '![a](https://mmbiz.qpic.cn/x.jpg)\n![b](https://pic1.zhimg.com/y.png)\n![c](https://example.com/z.png)\n![d](./images/d.png "图注")',
  )
  assert.equal(issues.length, 2)
  assert.match(issues[0], /mmbiz\.qpic\.cn/)
  assert.match(issues[1], /pic1\.zhimg\.com/)
})

test('缺少说明文字给出提示（Markdown 与 HTML 写法都检查）', () => {
  assert.equal(findImageIssues('![](./a.png)').length, 1)
  assert.equal(findImageIssues('![ ](./a.png)').length, 1)
  assert.equal(findImageIssues('<img src="./a.png">').length, 1)
  assert.equal(findImageIssues('<img src="./a.png" alt="时间线">').length, 0)
})

test('代码块里的示例不检查', () => {
  assert.equal(findImageIssues('```md\n![](https://mmbiz.qpic.cn/x.jpg)\n```').length, 0)
  assert.equal(findImageIssues('写法是 `![](./a.png)`').length, 0)
})
