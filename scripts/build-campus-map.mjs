// 校园地图数据生成：把 OpenStreetMap 导出文件（data/osm/jmu-campus.osm）转换成网页用的数据。
//   node scripts/build-campus-map.mjs        （npm run map:build）
// 输出：
//   docs/public/map/campus.geojson   地图图层：校区范围、建筑（含高度）、水面、运动场、道路
//   docs/map/places.generated.json   地点列表：有名字的建筑与场地（搜索、列表、标签用）
// 地点的改名、分类、隐藏、简介、相关文章写在 docs/map/places.yaml（人工维护，优先于这里的自动结果）。
//
// 只保留「集美大学」各校区范围内的内容：不画城市、行政区界线，也不画校外的建筑。
// 地图数据 © OpenStreetMap 贡献者，按 ODbL 许可使用（页面右下角有署名）。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SRC = join(ROOT, 'data', 'osm', 'jmu-campus.osm')
const OUT_GEO = join(ROOT, 'docs', 'public', 'map', 'campus.geojson')
const OUT_PLACES = join(ROOT, 'docs', 'map', 'places.generated.json')

// 校区：OSM 里 amenity=university/college 且名字含「集美大学」的范围；简称用于同名建筑的区分
const AREA_SHORT = (name) =>
  name.replace(/^集美大学/, '').replace(/[（(]主校区[)）]/, '主校区').replace(/^$/, '主校区') || '主校区'

// ---------- 解析 OSM XML（格式固定，用正则即可，不引入依赖） ----------
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

export function parseOSM(xml) {
  const nodes = new Map()
  for (const m of xml.matchAll(/<node\b([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
    const a = m[1]
    const id = a.match(/\bid="(-?\d+)"/)[1]
    nodes.set(id, [Number(a.match(/\blon="([^"]+)"/)[1]), Number(a.match(/\blat="([^"]+)"/)[1])])
  }
  const ways = []
  for (const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const id = m[1].match(/\bid="(-?\d+)"/)[1]
    const refs = [...m[2].matchAll(/<nd ref="(-?\d+)"\s*\/>/g)].map((x) => x[1])
    const tags = {}
    for (const t of m[2].matchAll(/<tag k="([^"]*)" v="([^"]*)"\s*\/>/g)) tags[unesc(t[1])] = unesc(t[2])
    const coords = refs.map((r) => nodes.get(r)).filter(Boolean)
    if (coords.length >= 2) ways.push({ id, tags, coords, closed: refs.length > 3 && refs[0] === refs[refs.length - 1] })
  }
  return { nodes, ways }
}

// ---------- 几何工具 ----------
export function pointInPolygon([x, y], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 多边形质心（面积加权）；退化时用顶点平均 */
export function centroid(poly) {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]
    a += f
    cx += (poly[j][0] + poly[i][0]) * f
    cy += (poly[j][1] + poly[i][1]) * f
  }
  if (Math.abs(a) < 1e-14) {
    const n = poly.length
    return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * a), cy / (3 * a)]
}

/** 多边形面积（平方米，按纬度做等距近似，校园尺度足够） */
export function areaM2(poly) {
  const lat0 = (poly.reduce((s, p) => s + p[1], 0) / poly.length) * (Math.PI / 180)
  const kx = 111320 * Math.cos(lat0)
  const ky = 110540
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * kx * (poly[i][1] * ky) - poly[i][0] * kx * (poly[j][1] * ky)
  return Math.abs(a / 2)
}

/** 标签显示优先级：1 = 缩小时也显示（图书馆、食堂、体育场馆、大楼），2 = 放大后显示，3 = 只在最近时显示（连廊、驿站等） */
export function priorityOf(name, cat, footprint) {
  if (/连廊|上下客点|驿站|快递/.test(name)) return 3
  if (['图书馆', '食堂', '运动'].includes(cat) || footprint >= 2500) return 1
  return 2
}

const round = (c) => [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6]

// ---------- 分类与高度 ----------
/** 地点分类：教学 / 宿舍 / 食堂 / 图书馆 / 运动 / 生活 / 其他 */
export function categorize(tags) {
  const n = tags.name || ''
  const b = tags.building || ''
  if (/图书馆/.test(n) || tags.amenity === 'library') return '图书馆'
  if (/食堂|餐厅|膳厅/.test(n) || b === 'restaurant' || tags.amenity === 'restaurant') return '食堂'
  if (b === 'dormitory' || /公寓|宿舍|社区\d*号楼|集友楼/.test(n)) return '宿舍'
  // 生活服务放在运动前面：「体育场快递驿站」是驿站，不是运动场
  if (/超市|驿站|快递|商店|银行|医院|医务|门诊|酒店|印刷|上下客点/.test(n) || ['retail', 'shed', 'warehouse', 'commercial'].includes(b)) return '生活'
  if (/体育|运动|游泳|球场|田径/.test(n) || b === 'gym' || tags.leisure) return '运动'
  if (/楼|堂|馆|学院|中心/.test(n) || ['university', 'college', 'school', 'yes', 'public'].includes(b)) return '教学'
  return '其他'
}

/** 建筑高度（米）：有层数按每层 3.6 米；没有时按类型估一个 */
export function heightOf(tags) {
  const h = parseFloat(tags.height)
  if (h > 0) return { h, estimated: false }
  const lv = parseFloat(tags['building:levels'])
  if (lv > 0) return { h: lv * 3.6, estimated: false }
  const b = tags.building
  const n = tags.name || ''
  const guess =
    b === 'dormitory' || /公寓|社区/.test(n) ? 6
    : b === 'shed' || b === 'warehouse' || b === 'kiosk' || /驿站|上下客点/.test(n) ? 1
    : b === 'gym' || /体育馆/.test(n) ? 3 // 大跨度，按 3 层高度近似
    : b === 'retail' || b === 'restaurant' || /食堂|餐厅|膳厅|超市/.test(n) ? 2
    : /图书馆/.test(n) ? 5
    : ['university', 'college', 'school'].includes(b) || /楼$/.test(n) ? 5
    : 4
  return { h: guess * 3.6, estimated: true }
}

// ---------- 转换 ----------
export function buildCampus(xml) {
  const { ways } = parseOSM(xml)
  const areas = ways
    .filter((w) => w.closed && ['university', 'college'].includes(w.tags.amenity) && /^集美大学/.test(w.tags.name || ''))
    .map((w) => ({ id: w.id, name: w.tags.name, short: AREA_SHORT(w.tags.name), poly: w.coords }))
  const areaOf = (pt) => areas.find((a) => pointInPolygon(pt, a.poly))
  const touchesCampus = (coords) => coords.some((c) => areaOf(c))

  const features = []
  const places = []
  for (const a of areas) {
    features.push({ type: 'Feature', properties: { k: 'campus', name: a.short }, geometry: { type: 'Polygon', coordinates: [a.poly.map(round)] } })
  }

  for (const w of ways) {
    const t = w.tags
    if (t.boundary || t.route || t.amenity === 'university' || t.amenity === 'college') continue
    if (t.building && w.closed) {
      const c = centroid(w.coords)
      const area = areaOf(c)
      if (!area) continue
      const { h, estimated } = heightOf(t)
      const cat = categorize(t)
      const props = { k: 'building', id: Number(w.id), h: Math.round(h * 10) / 10, cat }
      if (t.name) props.name = t.name
      features.push({ type: 'Feature', id: Number(w.id), properties: props, geometry: { type: 'Polygon', coordinates: [w.coords.map(round)] } })
      if (t.name) {
        const fp = areaM2(w.coords)
        places.push({ id: Number(w.id), name: t.name, cat, area: area.short, lon: round(c)[0], lat: round(c)[1], levels: t['building:levels'] ? Number(t['building:levels']) : null, heightEstimated: estimated, priority: priorityOf(t.name, cat, fp) })
      }
      continue
    }
    if (w.closed && (t.natural === 'water' || t.water || t.landuse === 'reservoir')) {
      if (!touchesCampus(w.coords)) continue
      features.push({ type: 'Feature', properties: { k: 'water', ...(t.name ? { name: t.name } : {}) }, geometry: { type: 'Polygon', coordinates: [w.coords.map(round)] } })
      continue
    }
    if (w.closed && ['pitch', 'stadium', 'track', 'sports_centre'].includes(t.leisure)) {
      const c = centroid(w.coords)
      const area = areaOf(c)
      if (!area) continue
      const kind = t.leisure === 'track' ? 'track' : 'pitch'
      features.push({ type: 'Feature', properties: { k: kind, ...(t.name ? { name: t.name } : {}) }, geometry: { type: 'Polygon', coordinates: [w.coords.map(round)] } })
      if (t.name) places.push({ id: Number(w.id), name: t.name, cat: '运动', area: area.short, lon: round(c)[0], lat: round(c)[1], levels: null, heightEstimated: false, priority: 1 })
      continue
    }
    if (w.closed && (['park', 'garden'].includes(t.leisure) || ['grass', 'forest'].includes(t.landuse))) {
      if (!areaOf(centroid(w.coords))) continue
      features.push({ type: 'Feature', properties: { k: 'green' }, geometry: { type: 'Polygon', coordinates: [w.coords.map(round)] } })
      continue
    }
    if (t.highway) {
      const major = ['trunk', 'primary', 'secondary', 'tertiary', 'trunk_link', 'secondary_link'].includes(t.highway)
      // 校内道路全部保留；校外只保留贴着校区的主干道，作为方位参照
      if (!touchesCampus(w.coords) && !major) continue
      if (major && !w.coords.some((c) => areas.some((a) => nearArea(c, a.poly)))) continue
      const cls = major ? 'major' : ['footway', 'path', 'steps', 'pedestrian', 'cycleway'].includes(t.highway) ? 'path' : 'road'
      features.push({ type: 'Feature', properties: { k: cls }, geometry: { type: 'LineString', coordinates: w.coords.map(round) } })
    }
  }

  // 同名地点（如各校区都有「3号楼」）在列表里加上校区区分
  const count = new Map()
  for (const p of places) count.set(p.name, (count.get(p.name) || 0) + 1)
  for (const p of places) if (count.get(p.name) > 1) p.duplicate = true
  places.sort((a, b) => a.area.localeCompare(b.area, 'zh-Hans-CN') || a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))

  const bbox = [180, 90, -180, -90]
  for (const a of areas)
    for (const [x, y] of a.poly) {
      bbox[0] = Math.min(bbox[0], x)
      bbox[1] = Math.min(bbox[1], y)
      bbox[2] = Math.max(bbox[2], x)
      bbox[3] = Math.max(bbox[3], y)
    }
  return {
    geojson: { type: 'FeatureCollection', bbox: bbox.map((v) => Math.round(v * 1e5) / 1e5), features },
    places,
    areas: areas.map((a) => ({ name: a.name, short: a.short })),
  }
}

// 粗略判断点是否在校区附近（约 120 米内的外包框）
function nearArea([x, y], poly) {
  const m = 0.0012
  let [x0, y0, x1, y1] = [180, 90, -180, -90]
  for (const [px, py] of poly) {
    x0 = Math.min(x0, px)
    y0 = Math.min(y0, py)
    x1 = Math.max(x1, px)
    y1 = Math.max(y1, py)
  }
  return x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { geojson, places, areas } = buildCampus(readFileSync(SRC, 'utf8'))
  mkdirSync(dirname(OUT_GEO), { recursive: true })
  writeFileSync(OUT_GEO, JSON.stringify(geojson))
  writeFileSync(OUT_PLACES, JSON.stringify({ areas, places }, null, 1) + '\n')
  const n = (k) => geojson.features.filter((f) => f.properties.k === k).length
  console.log(
    `校园地图：${areas.length} 个校区，${n('building')} 栋建筑，${places.length} 个有名字的地点，` +
      `${n('water')} 处水面，${n('pitch') + n('track')} 处运动场，${n('road') + n('path') + n('major')} 条道路`,
  )
}
