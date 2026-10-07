// 首页「校园地图」卡片的平面预览：主校区（含北侧诚毅学院）的建筑与水面，投影成 SVG 路径（坐标取整，体积很小）。
import { readFileSync } from 'node:fs'
import { defineLoader } from 'vitepress'

export interface MapPreview {
  w: number
  h: number
  campus: string
  buildings: string // 普通建筑
  highlight: string // 图书馆、食堂（预览里用深色突出）
  water: string
}

declare const data: MapPreview
export { data }

// 首页预览：主校区（含北侧诚毅学院）范围内的建筑、水面，投影到 SVG 坐标
function buildPreview(geo: any) {
  const inZone = (f: any) => ['主校区', '诚毅学院'].includes(f.properties.name)
  const zone = geo.features.filter((f: any) => f.properties.k === 'campus' && inZone(f))
  let [x0, y0, x1, y1] = [180, 90, -180, -90]
  for (const f of zone)
    for (const [x, y] of f.geometry.coordinates[0]) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  const kx = Math.cos(((y0 + y1) / 2) * (Math.PI / 180))
  const W = 300
  const scale = W / ((x1 - x0) * kx)
  const H = Math.round((y1 - y0) * scale)
  const pt = ([x, y]: number[]) => `${Math.round((x - x0) * kx * scale)},${Math.round((y1 - y) * scale)}`
  const path = (fs: any[]) => fs.map((f) => 'M' + f.geometry.coordinates[0].map(pt).join('L') + 'Z').join('')
  const within = (f: any) => {
    const [x, y] = f.geometry.coordinates[0][0]
    return x >= x0 && x <= x1 && y >= y0 && y <= y1
  }
  const blds = geo.features.filter((f: any) => f.properties.k === 'building' && within(f))
  return {
    w: W,
    h: H,
    campus: path(zone),
    buildings: path(blds.filter((f: any) => !['图书馆', '食堂'].includes(f.properties.cat))),
    highlight: path(blds.filter((f: any) => ['图书馆', '食堂'].includes(f.properties.cat))),
    water: path(geo.features.filter((f: any) => f.properties.k === 'water' && within(f))),
  }
}

export default defineLoader({
  watch: ['../../public/map/campus.geojson'],
  load(files: string[]): MapPreview {
    return buildPreview(JSON.parse(readFileSync(files[0], 'utf8')))
  },
})
