// GitHub 数据：「提问」issue（问答页、板块首页）与贡献者（关于页）。
// 只在构建时（和开发服务器启动时）读取一次，详见 scripts/github.mjs；读取失败对应字段为 null。
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { readFileSync } from 'node:fs'
import { defineLoader } from 'vitepress'
import { loadGitHubData } from '../../../scripts/github.mjs'
import { SECTIONS } from '../sections'

export interface Question {
  number: number
  title: string
  url: string
  section: string // 板块目录名；提问时没选板块则为空
  excerpt: string // 纯文本摘要
  comments: number
  created: number
  updated: number
}

export interface Contributor {
  login: string
  url: string
  avatar: string // GitHub 头像地址（96px）
  local: string // 随站点发布的头像副本；下载失败时为空
  contributions: number
}

export interface GitHubData {
  fetchedAt: number
  questions: Question[] | null
  contributors: Contributor[] | null
}

declare const data: GitHubData
export { data }

export const CACHE_DIR = fileURLToPath(new URL('../cache/github', import.meta.url))

function readExclude(file?: string): string[] {
  if (!file) return []
  try {
    const raw = matter.engines.yaml.parse(readFileSync(file, 'utf8')) as { exclude?: unknown }
    return Array.isArray(raw?.exclude) ? raw.exclude.map(String) : []
  } catch (e) {
    console.warn(`⚠️ docs/about/contributors.yaml 格式有误，已忽略：${(e as Error).message.split('\n')[0]}`)
    return []
  }
}

export default defineLoader({
  watch: ['../../about/contributors.yaml'],
  async load(files: string[]): Promise<GitHubData> {
    return loadGitHubData({ sections: SECTIONS, exclude: readExclude(files[0]), cacheDir: CACHE_DIR })
  },
})
