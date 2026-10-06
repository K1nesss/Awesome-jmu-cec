// 板块清单：唯一真源（三个大类、12 个板块）。
// 顶栏的三个下拉菜单、手机 ☰ 菜单（config.mts）与首页的板块目录、四年路线（theme/components/HomePage.vue）都从这里读取。
// 新增板块：建目录 + index.md，再在这里对应大类下加一行。网址只有一层（/kaoyan/），大类只影响导航，不影响网址。

export interface Section {
  key: string // 目录名，也是网址
  text: string
  link: string
  desc: string
}

export interface SectionGroup {
  key: string
  text: string // 大类名称（首页目录标题、手机菜单分组）
  navText: string // 顶栏下拉按钮上的短名称
  desc: string
  sections: Section[]
}

const s = (key: string, text: string, desc: string): Section => ({ key, text, link: `/${key}/`, desc })

export const GROUPS: SectionGroup[] = [
  {
    key: 'know',
    text: '了解学院',
    navText: '了解学院',
    desc: '学院是什么样的',
    sections: [
      s('college', '学院与专业', '学院概况、各专业的培养方向与区别。'),
      s('mentors', '导师与科研', '导师研究方向、实验室、怎么进组做科研。'),
    ],
  },
  {
    key: 'study',
    text: '在校学习与生活',
    navText: '在校学习与生活',
    desc: '在这里怎么过好四年',
    sections: [
      s('planning', '大学四年规划', '每个阶段该做什么，关键时间节点怎么安排。'),
      s('academics', '课程与学业', '选课、培养方案、绩点、转专业与辅修。'),
      s('competitions', '竞赛', '含金量、报名时间、组队方式与备赛经验。'),
      s('scholarship', '奖学金', '各类奖学金的评定条件与综合测评规则。'),
      s('campus', '校园生活', '四六级、常用工具与校园里的实用信息。'),
    ],
  },
  {
    key: 'after',
    text: '毕业去向',
    navText: '毕业去向',
    desc: '毕业后去哪',
    sections: [
      s('baoyan', '保研', '推免资格、绩点排名、夏令营与预推免。'),
      s('kaoyan', '考研', '择校定专业、初试复习、复试与调剂。'),
      s('career', '就业与实习', '找实习、秋招春招、简历与面试准备。'),
      s('kaogong', '考公·选调', '国考、省考与选调的区别，备考时间线与面试。'),
      s('abroad', '留学', '地区选择、语言考试、申请材料与费用。'),
    ],
  },
]

export const SECTIONS: Section[] = GROUPS.flatMap((g) => g.sections)

export const sectionByKey = (key: string) => SECTIONS.find((x) => x.key === key)!
