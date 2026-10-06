---
title: 参与贡献
description: 把你的经验写下来：在 GitHub 网页上新建一个 Markdown 文件即可投稿，不需要安装任何软件。
---

# 参与贡献

本站的每一篇文章都来自同学投稿。你不需要会写代码，也不需要在电脑上安装任何东西。

## 先选一个题目

每个板块首页底部都有「待认领选题」，是还没人写的文章。从里面挑一个，或者写你自己想写的话题都可以。

文章分两种，写之前先想好是哪一种：

<div class="label-table">

| | 指南 | 经验帖 |
|---|---|---|
| 写什么 | 整理型内容：流程、时间线、规则、清单 | 个人经历：我是怎么准备的、踩过什么坑 |
| 例子 | 保研全流程时间线 | 2026 届保研上岸经验 |
| 发布之后 | 长期维护，每年有人更新 | 保持原样，不再改动 |
| 放在哪里 | `docs/<板块>/` | `docs/<板块>/experiences/` |

</div>

## 方式一：在 GitHub 网页上直接投稿

1. 注册并登录 [GitHub](https://github.com/)。
2. 打开模板，复制全部内容：[指南模板](https://github.com/K1nesss/Awesome-jmu-cec/blob/main/templates/guide.md)、[经验帖模板](https://github.com/K1nesss/Awesome-jmu-cec/blob/main/templates/experience.md)。
3. 打开本站仓库的 [`docs` 目录](https://github.com/K1nesss/Awesome-jmu-cec/tree/main/docs)，进入你要投稿的板块文件夹（例如保研是 `baoyan`）。
4. 点击右上角 **Add file → Create new file**，文件名用英文或拼音，以 `.md` 结尾，例如 `xia-ling-ying.md`。经验帖在文件名前加上 `experiences/`，例如 `experiences/2026-xiaoming.md`，GitHub 会自动建好子目录。
5. 粘贴模板，改成你的内容。
6. 点击 **Commit changes**，按提示提交 Pull Request。维护者审核通过后，文章会自动上线，并出现在板块首页和左侧目录里。

想修改已有页面？点击页面底部的「在 GitHub 上编辑此页」，流程完全相同。

## 方式二：不会用 GitHub

在仓库的 [Issues](https://github.com/K1nesss/Awesome-jmu-cec/issues/new) 新建一条，把正文直接粘贴进去，维护者会代为发布并保留你的署名。

## 文章开头的信息（可选）

模板开头 `---` 之间的几行叫 frontmatter，全部可以不填，填了会让文章更好找：

<div class="label-table">

| 字段 | 作用 |
|---|---|
| `title` | 文章标题。与「待认领选题」里的标题一致时，该选题会自动从待认领中移除 |
| `type` | `guide`（指南）或 `experience`（经验帖）；放在 `experiences/` 目录下的文章自动算经验帖 |
| `year` | 指南写内容适用的年份，经验帖写你的届次 |
| `author` | 署名 |
| `summary` | 一句话简介，显示在板块首页的文章列表里 |

</div>

指南超过一年没有更新（或标注的适用年份已是两年前）、经验帖距今两年以上时，文章顶部会自动提示读者「内容可能已过时」。

## 写作建议

- **写清时间**：政策、名额、时间线每年都会变，请注明是哪一年的情况。
- **只写自己确认过的信息**：不确定的内容请标明「据了解」，并尽量附上学院通知或官方链接。
- **保护隐私**：不要出现他人的姓名、学号、联系方式或聊天截图。
- **一篇只讲一件事**：太短（几百字）的内容可以并进相近的文章，太长的可以拆开。
- **板块对应目录**：规划 `planning`、竞赛 `competitions`、保研 `baoyan`、考公 `kaogong`、留学 `abroad`、奖学金 `scholarship`、校园信息差 `campus`。
