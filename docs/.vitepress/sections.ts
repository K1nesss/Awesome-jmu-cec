// 板块清单：唯一真源。
// 顶栏「板块」下拉（config.mts）与首页的板块目录、四年路线（theme/components/HomePage.vue）都从这里读取。
// 新增顶级板块：建目录 + index.md，再在这里加一行。

export interface Section {
  key: string
  text: string
  link: string
  desc: string
}

export const SECTIONS: Section[] = [
  { key: 'planning', text: '大学四年规划', link: '/planning/', desc: '每个阶段该做什么，关键时间节点怎么安排。' },
  { key: 'competitions', text: '竞赛', link: '/competitions/', desc: '含金量、报名时间、组队方式与备赛经验。' },
  { key: 'baoyan', text: '保研', link: '/baoyan/', desc: '推免资格、绩点排名、夏令营与预推免。' },
  { key: 'kaogong', text: '考公·选调', link: '/kaogong/', desc: '国考、省考与选调的区别，备考时间线与面试。' },
  { key: 'abroad', text: '留学', link: '/abroad/', desc: '地区选择、语言考试、申请材料与费用。' },
  { key: 'scholarship', text: '奖学金', link: '/scholarship/', desc: '各类奖学金的评定条件与综合测评规则。' },
  { key: 'campus', text: '校园信息差', link: '/campus/', desc: '选课、转专业、实习渠道与好用的工具。' },
]

export const sectionByKey = (key: string) => SECTIONS.find((s) => s.key === key)!
