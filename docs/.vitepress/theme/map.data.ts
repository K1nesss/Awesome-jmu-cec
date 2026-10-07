// 校园地图的地点数据：OpenStreetMap 自动结果（docs/map/places.generated.json）+ 人工修正（docs/map/places.yaml）。
// 首页卡片里的平面预览在 mapPreview.data.ts（分开放，首页不必加载全部地点数据）。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { defineLoader } from 'vitepress'

export type PlaceCat = '教学' | '宿舍' | '食堂' | '图书馆' | '运动' | '生活' | '其他'

export interface Place {
  id: string // OSM 编号；人工新增的地点为 custom-序号
  name: string
  cat: PlaceCat
  area: string // 所在校区简称
  label: string // 列表与标签上显示的名字：同名地点带上校区
  lon: number
  lat: number
  priority: number
  aliases: string[]
  note: string
  links: string[]
  levels: number | null
}

export interface MapData {
  places: Place[]
  bbox: [number, number, number, number] // 各校区范围的外包框 [西, 南, 东, 北]
  areas: string[]
}

declare const data: MapData
export { data }

const CATS = ['教学', '宿舍', '食堂', '图书馆', '运动', '生活', '其他']
const GEO = fileURLToPath(new URL('../../public/map/campus.geojson', import.meta.url))

function readOverrides(file: string): any[] {
  try {
    const raw = matter.engines.yaml.parse(readFileSync(file, 'utf8'))
    return Array.isArray(raw) ? raw : []
  } catch (e) {
    console.warn(`⚠️ docs/map/places.yaml 格式有误，已忽略：${(e as Error).message.split('\n')[0]}`)
    return []
  }
}

const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? [v] : [])

export function mergePlaces(generated: any[], overrides: any[]): Place[] {
  const places: Place[] = generated.map((p) => ({
    id: String(p.id),
    name: p.name,
    cat: p.cat,
    area: p.area,
    label: p.name,
    lon: p.lon,
    lat: p.lat,
    priority: p.priority ?? 2,
    aliases: [],
    note: '',
    links: [],
    levels: p.levels ?? null,
  }))
  const hidden = new Set<string>()
  overrides.forEach((o, i) => {
    if (!o || typeof o !== 'object') return
    let targets: Place[]
    if (o.match != null) {
      const m = String(o.match)
      targets = places.filter((p) => p.id === m || p.name === m)
      if (!targets.length) {
        console.warn(`⚠️ places.yaml 第 ${i + 1} 项：找不到「${m}」，已跳过`)
        return
      }
    } else {
      const lon = Number(o.lon)
      const lat = Number(o.lat)
      if (!o.name || !(lon > 118 && lon < 118.2 && lat > 24.5 && lat < 24.7)) {
        console.warn(`⚠️ places.yaml 第 ${i + 1} 项：新增地点需要 name 和校园范围内的 lon、lat，已跳过`)
        return
      }
      const p: Place = { id: `custom-${i + 1}`, name: String(o.name), cat: '其他', area: String(o.area || '主校区'), label: '', lon, lat, priority: 2, aliases: [], note: '', links: [], levels: null }
      places.push(p)
      targets = [p]
    }
    for (const p of targets) {
      if (o.name) p.name = String(o.name)
      if (o.cat) {
        if (CATS.includes(String(o.cat))) p.cat = o.cat
        else console.warn(`⚠️ places.yaml 第 ${i + 1} 项：分类「${o.cat}」不存在，可选：${CATS.join(' / ')}`)
      }
      if (o.aliases) p.aliases = list(o.aliases)
      if (o.note) p.note = String(o.note)
      if (o.links) p.links = list(o.links)
      if ([1, 2, 3].includes(Number(o.priority))) p.priority = Number(o.priority)
      if (o.hide) hidden.add(p.id)
    }
  })
  const visible = places.filter((p) => !hidden.has(p.id))
  const count = new Map<string, number>()
  for (const p of visible) count.set(p.name, (count.get(p.name) || 0) + 1)
  for (const p of visible) p.label = count.get(p.name)! > 1 ? `${p.area} ${p.name}` : p.name
  // 列表顺序：地点多的校区在前（主校区、诚毅学院……），同一校区内按名字
  const per = new Map<string, number>()
  for (const p of visible) per.set(p.area, (per.get(p.area) || 0) + 1)
  return visible.sort(
    (a, b) => per.get(b.area)! - per.get(a.area)! || a.area.localeCompare(b.area, 'zh-Hans-CN') || a.label.localeCompare(b.label, 'zh-Hans-CN', { numeric: true }),
  )
}

export default defineLoader({
  watch: ['../../map/places.yaml', '../../map/places.generated.json'],
  load(files: string[]): MapData {
    const genFile = files.find((f) => f.endsWith('places.generated.json'))
    const ymlFile = files.find((f) => f.endsWith('places.yaml'))
    const gen = genFile ? JSON.parse(readFileSync(genFile, 'utf8')) : { places: [], areas: [] }
    const places = mergePlaces(gen.places, ymlFile ? readOverrides(ymlFile) : [])
    const geo = JSON.parse(readFileSync(GEO, 'utf8'))
    return { places, bbox: geo.bbox, areas: gen.areas.map((a: any) => a.short) }
  },
})
