// markdown-it 插件：给图片加图注。
// 单独成段、并且写了标题的图片——![图片说明](./images/a.png "图注文字")——
// 会被包成 <figure>，引号里的标题显示为图片下方居中的小字图注（不再作为鼠标悬停提示）。
// 没写标题、或者和文字写在同一段里的图片保持原样。
export function figurePlugin(md) {
  md.core.ruler.push('jc_figure', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length - 2; i++) {
      const open = tokens[i]
      const inline = tokens[i + 1]
      const close = tokens[i + 2]
      if (open.type !== 'paragraph_open' || inline.type !== 'inline' || close.type !== 'paragraph_close') continue
      // 段落里只有一张图片（允许前后空白）
      const kids = (inline.children || []).filter((t) => !(t.type === 'text' && !t.content.trim()))
      if (kids.length !== 1 || kids[0].type !== 'image') continue
      const img = kids[0]
      const title = img.attrGet('title')
      if (!title) continue

      img.attrs = img.attrs.filter(([k]) => k !== 'title')
      open.tag = close.tag = 'figure'
      const cap = new state.Token('html_block', '', 0)
      cap.content = `<figcaption>${md.utils.escapeHtml(title)}</figcaption>\n`
      tokens.splice(i + 2, 0, cap)
      i += 3
    }
  })
}
