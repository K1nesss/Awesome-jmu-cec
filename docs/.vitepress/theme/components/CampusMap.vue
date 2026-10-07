<script setup lang="ts">
// 校园地图（/map/）：3D 建筑、地点搜索与分类、地点卡片、显示「我的位置」。
//   - 地图引擎 MapLibre GL（开源，随站点发布，不请求第三方地图服务）；只在本页加载
//   - 底图不用瓦片，全部来自 docs/public/map/campus.geojson（OpenStreetMap 数据，scripts/build-campus-map.mjs 生成）
//   - 地点列表来自 map.data.ts，服务端也会渲染，所以不支持 WebGL 的设备至少能看到列表
//   - 定位只在浏览器里计算，不上传、不保存；OpenStreetMap 与浏览器定位都用 WGS-84 坐标，无需纠偏
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useData, withBase } from 'vitepress'
import 'maplibre-gl/dist/maplibre-gl.css'
import { data as mapData, type Place } from '../map.data'
import { data as articles } from '../articles.data'

const { isDark } = useData()

const CATS = ['教学', '宿舍', '食堂', '图书馆', '运动', '生活'] as const
const places = mapData.places

// ---------- 列表：搜索、分类、排序 ----------
const query = ref('')
const cat = ref('')
const selectedId = ref<string | null>(null)
const selected = computed(() => places.find((p) => p.id === selectedId.value) || null)
const sheetOpen = ref(false) // 手机：底部面板是否展开

// ---------- 手机底部面板：拖动顶部的横条上拉展开、下拉收起 ----------
// 拖动时面板高度跟手；松手后按速度或位置吸附到「收起 / 展开」。轻点横条也能切换
const panelEl = ref<HTMLElement>()
const dragH = ref<number | null>(null)
const SHEET_COLLAPSED = 168 // 与样式里的收起高度一致
const sheetExpanded = () => Math.round((panelEl.value?.parentElement?.clientHeight || window.innerHeight) * 0.62)
let drag: { startY: number; startH: number; lastY: number; lastT: number; v: number; moved: boolean } | null = null
let suppressClick = false

function onGrabDown(e: PointerEvent) {
  if (!isNarrow() || !panelEl.value) return
  drag = { startY: e.clientY, startH: panelEl.value.getBoundingClientRect().height, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onGrabMove(e: PointerEvent) {
  if (!drag) return
  const dy = e.clientY - drag.startY
  if (Math.abs(dy) > 4) drag.moved = true
  if (!drag.moved) return
  dragH.value = Math.min(sheetExpanded() + 24, Math.max(SHEET_COLLAPSED - 40, drag.startH - dy))
  const dt = e.timeStamp - drag.lastT
  if (dt > 0) drag.v = (e.clientY - drag.lastY) / dt // 像素/毫秒，正数表示向下
  drag.lastY = e.clientY
  drag.lastT = e.timeStamp
}
function onGrabUp() {
  if (!drag) return
  if (drag.moved) {
    const mid = (SHEET_COLLAPSED + sheetExpanded()) / 2
    sheetOpen.value = drag.v < -0.35 ? true : drag.v > 0.35 ? false : (dragH.value ?? 0) > mid
    suppressClick = true
  }
  dragH.value = null
  drag = null
}
function onGrabClick() {
  if (suppressClick) {
    suppressClick = false
    return
  }
  sheetOpen.value = !sheetOpen.value
}

const me = ref<{ lon: number; lat: number; acc: number } | null>(null)

function distance(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const R = 6371000
  const toR = Math.PI / 180
  const dLat = (b.lat - a.lat) * toR
  const dLon = (b.lon - a.lon) * toR
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} 米` : `${(m / 1000).toFixed(1)} 公里`)
const distTo = (p: Place) => (me.value ? distance(me.value, p) : null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let l = places.filter((p) => (!cat.value || p.cat === cat.value) && (!q || [p.label, p.name, p.area, p.cat, ...p.aliases].some((s) => s.toLowerCase().includes(q))))
  if (me.value) l = [...l].sort((a, b) => distTo(a)! - distTo(b)!)
  return l
})

const relatedLinks = computed(() =>
  (selected.value?.links || []).map((url) => {
    const clean = url.replace(/\.html$/, '').replace(/\/$/, '/')
    const a = articles.find((x) => x.url === clean || x.url === clean.replace(/\/$/, ''))
    return { url, title: a?.title || url }
  }),
)

// ---------- 地图 ----------
const mapEl = ref<HTMLDivElement>()
const map = shallowRef<any>(null)
const noWebGL = ref(false)
const loadFailed = ref(false)
const pitched = ref(true)
const bearing = ref(0)
const zoomLevel = ref(16)
let lib: any = null
const pins = new Map<string, any>()

const COLORS = {
  light: { bg: '#ebe8e0', campus: '#f7f5ef', green: '#e7e8dc', water: '#d3dde2', pitch: '#e4e2d8', pitchLine: '#cfcbc0', track: '#dcd7cc', major: '#ffffff', majorCase: '#d5d1c6', road: '#ffffff', path: '#ffffff', building: '#efede7', catBuilding: '#bdb8ad', selected: '#1f1e1d', me: '#1f1e1d', meFill: 'rgba(31,30,29,0.08)', meLine: 'rgba(31,30,29,0.35)' },
  dark: { bg: '#121110', campus: '#1b1a19', green: '#1f211d', water: '#20282c', pitch: '#232220', pitchLine: '#34322e', track: '#2a2825', major: '#3a3835', majorCase: '#2a2825', road: '#2e2c29', path: '#2e2c29', building: '#3b3936', catBuilding: '#6b675f', selected: '#faf9f5', me: '#faf9f5', meFill: 'rgba(250,249,245,0.08)', meLine: 'rgba(250,249,245,0.4)' },
}
const palette = () => (isDark.value ? COLORS.dark : COLORS.light)

function buildingColor() {
  const c = palette()
  return ['case', ['boolean', ['feature-state', 'sel'], false], c.selected, cat.value ? ['case', ['==', ['get', 'cat'], cat.value], c.catBuilding, c.building] : c.building]
}

function styleFor() {
  const c = palette()
  const src = withBase('/map/campus.geojson')
  const isK = (k: string) => ['==', ['get', 'k'], k]
  return {
    version: 8,
    // 光照弱一些：建筑侧面只比顶面略深，接近手绘示意图的效果
    light: { anchor: 'viewport', color: '#ffffff', intensity: 0.22, position: [1.2, 210, 30] },
    sources: { campus: { type: 'geojson', data: src }, me: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
      { id: 'campus', type: 'fill', source: 'campus', filter: isK('campus'), paint: { 'fill-color': c.campus } },
      { id: 'green', type: 'fill', source: 'campus', filter: isK('green'), paint: { 'fill-color': c.green } },
      { id: 'water', type: 'fill', source: 'campus', filter: isK('water'), paint: { 'fill-color': c.water } },
      { id: 'pitch', type: 'fill', source: 'campus', filter: isK('pitch'), paint: { 'fill-color': c.pitch, 'fill-outline-color': c.pitchLine } },
      { id: 'track', type: 'fill', source: 'campus', filter: isK('track'), paint: { 'fill-color': c.track } },
      { id: 'major-case', type: 'line', source: 'campus', filter: isK('major'), paint: { 'line-color': c.majorCase, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 4, 18, 22] }, layout: { 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'major', type: 'line', source: 'campus', filter: isK('major'), paint: { 'line-color': c.major, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2.5, 18, 18] }, layout: { 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road', type: 'line', source: 'campus', filter: isK('road'), paint: { 'line-color': c.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1, 18, 9] }, layout: { 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'path', type: 'line', source: 'campus', filter: isK('path'), paint: { 'line-color': c.path, 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.6, 18, 3], 'line-dasharray': [2, 1.5] } },
      { id: 'me-acc', type: 'fill', source: 'me', paint: { 'fill-color': c.meFill, 'fill-outline-color': c.meLine } },
      {
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'campus',
        filter: isK('building'),
        paint: { 'fill-extrusion-color': buildingColor(), 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.94, 'fill-extrusion-vertical-gradient': true },
      },
    ],
  }
}

function applyColors() {
  const m = map.value
  if (!m || !m.isStyleLoaded()) return
  const c = palette()
  const set = (id: string, prop: string, v: unknown) => m.getLayer(id) && m.setPaintProperty(id, prop, v)
  set('bg', 'background-color', c.bg)
  set('campus', 'fill-color', c.campus)
  set('green', 'fill-color', c.green)
  set('water', 'fill-color', c.water)
  set('pitch', 'fill-color', c.pitch)
  set('pitch', 'fill-outline-color', c.pitchLine)
  set('track', 'fill-color', c.track)
  set('major-case', 'line-color', c.majorCase)
  set('major', 'line-color', c.major)
  set('road', 'line-color', c.road)
  set('path', 'line-color', c.path)
  set('me-acc', 'fill-color', c.meFill)
  set('me-acc', 'fill-outline-color', c.meLine)
  set('buildings', 'fill-extrusion-color', buildingColor())
}

watch(isDark, applyColors)
watch(cat, () => {
  applyColors()
  updatePins()
})
watch(query, updatePins)

// 地点标签：HTML 元素，跟随地图移动；优先级越低（数字越大）的标签只在放大后显示
function makePins() {
  for (const p of places) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `jc-pin p${p.priority}`
    el.textContent = p.label
    el.setAttribute('aria-label', `${p.label}（${p.cat}）`)
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      select(p.id, false)
    })
    const mk = new lib.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lon, p.lat]).addTo(map.value)
    pins.set(p.id, mk)
  }
  updatePins()
}

function updatePins() {
  const visible = new Set(filtered.value.map((p) => p.id))
  for (const [id, mk] of pins) {
    const el = mk.getElement() as HTMLElement
    el.classList.toggle('off', !visible.has(id))
    el.classList.toggle('sel', id === selectedId.value)
  }
  declutter()
}

// 标签避让：按「选中 > 优先级 > 列表顺序」依次放置，和已放置的标签重叠就先藏起来（地图停下来后计算）
const ORDER = new Map(places.map((p, i) => [p.id, i]))
function declutter() {
  const items = [...pins.entries()]
    .map(([id, mk]) => ({ id, el: mk.getElement() as HTMLElement, p: places[ORDER.get(id)!] }))
    .sort((a, b) => Number(b.id === selectedId.value) - Number(a.id === selectedId.value) || a.p.priority - b.p.priority || ORDER.get(a.id)! - ORDER.get(b.id)!)
  for (const it of items) it.el.classList.remove('clash')
  const placed: DOMRect[] = []
  for (const it of items) {
    if (getComputedStyle(it.el).display === 'none') continue
    const r = it.el.getBoundingClientRect()
    if (placed.some((q) => r.left < q.right + 4 && r.right > q.left - 4 && r.top < q.bottom + 2 && r.bottom > q.top - 2)) it.el.classList.add('clash')
    else placed.push(r)
  }
}

// 选中地点：高亮建筑、移动视角、更新地址栏（?p=编号，方便分享）
let lastSel: string | null = null
function select(id: string | null, fly = true) {
  const m = map.value
  if (m && lastSel && /^\d+$/.test(lastSel)) m.setFeatureState({ source: 'campus', id: Number(lastSel) }, { sel: false })
  selectedId.value = id
  lastSel = id
  if (m && id && /^\d+$/.test(id)) m.setFeatureState({ source: 'campus', id: Number(id) }, { sel: true })
  updatePins()
  const url = new URL(location.href)
  if (id) url.searchParams.set('p', id)
  else url.searchParams.delete('p')
  history.replaceState(history.state, '', url)
  const p = selected.value
  if (p) {
    sheetOpen.value = true
    if (m && fly) m.flyTo({ center: [p.lon, p.lat], zoom: Math.max(m.getZoom(), 17.2), duration: reduceMotion() ? 0 : 900, essential: true })
    else if (m) m.easeTo({ center: [p.lon, p.lat], duration: reduceMotion() ? 0 : 500 })
  }
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isNarrow = () => window.matchMedia('(max-width: 767px)').matches

// 默认视角：主校区（含北侧诚毅学院）
const HOME = { center: [118.0898, 24.5846] as [number, number], bearing: -16 }

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

onMounted(async () => {
  // 地图页不需要整页滚动：锁住页面，避免在手机上拖面板或地图时整页跟着上下滑
  document.documentElement.classList.add('jc-map-page')
  if (!hasWebGL()) {
    noWebGL.value = true
    return
  }
  try {
    lib = (await import('maplibre-gl')).default
  } catch {
    loadFailed.value = true
    return
  }
  const bbox = mapData.bbox
  const m = new lib.Map({
    container: mapEl.value!,
    style: styleFor(),
    center: HOME.center,
    zoom: isNarrow() ? 15.3 : 15.9,
    pitch: 50,
    bearing: HOME.bearing,
    maxPitch: 70,
    minZoom: 13.5,
    maxZoom: 19.5,
    maxBounds: bbox ? [[bbox[0] - 0.02, bbox[1] - 0.015], [bbox[2] + 0.02, bbox[3] + 0.015]] : undefined,
    attributionControl: false,
    dragRotate: true,
    pitchWithRotate: true,
    cooperativeGestures: false,
  })
  map.value = m
  // 手机上底部面板挡住了地图下方，告诉地图这部分不可见，居中和飞到地点时会避开它
  if (isNarrow()) m.setPadding({ top: 0, left: 0, right: 0, bottom: 170 })
  m.on('rotate', () => (bearing.value = m.getBearing()))
  m.on('pitch', () => (pitched.value = m.getPitch() > 5))
  m.on('zoom', () => (zoomLevel.value = m.getZoom()))
  m.on('moveend', () => nextTick(declutter))
  // 点建筑：有名字的选中它；点空白处：关闭地点卡片、收起手机面板
  m.on('click', (e: any) => {
    const f = m.queryRenderedFeatures(e.point, { layers: ['buildings'] })[0]
    const id = f ? String(f.id) : ''
    if (id && places.some((p) => p.id === id)) return select(id, false)
    if (selectedId.value) select(null)
    sheetOpen.value = false
  })
  m.on('mouseenter', 'buildings', () => (m.getCanvas().style.cursor = 'pointer'))
  m.on('mouseleave', 'buildings', () => (m.getCanvas().style.cursor = ''))
  m.on('error', (e: any) => console.warn('地图加载出错', e?.error?.message || e))
  m.on('load', () => {
    zoomLevel.value = m.getZoom()
    makePins()
    const p = new URL(location.href).searchParams.get('p')
    if (p && places.some((x) => x.id === p)) select(p)
  })
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('jc-map-page')
  stopLocate()
  map.value?.remove()
})

// ---------- 地图控制 ----------
const zoomIn = () => map.value?.zoomIn()
const zoomOut = () => map.value?.zoomOut()
function togglePitch() {
  const m = map.value
  if (!m) return
  m.easeTo({ pitch: pitched.value ? 0 : 50, duration: reduceMotion() ? 0 : 600 })
}
function resetNorth() {
  map.value?.easeTo({ bearing: 0, duration: reduceMotion() ? 0 : 500 })
}
function resetView() {
  select(null)
  map.value?.flyTo({ center: HOME.center, zoom: isNarrow() ? 15.3 : 15.9, pitch: 50, bearing: HOME.bearing, duration: reduceMotion() ? 0 : 900 })
}

// ---------- 定位 ----------
type LocState = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable' | 'outside' | 'unsupported'
const loc = ref<LocState>('idle')
let watchId: number | null = null
let meMarker: any = null
let coneMarker: any = null
let heading: number | null = null
let firstFix = true

const locText = computed(() => {
  switch (loc.value) {
    case 'asking':
      return '正在获取位置…'
    case 'ok':
      return `你在这里 · 精度约 ${Math.max(5, Math.round(me.value!.acc))} 米`
    case 'outside':
      return me.value ? `你现在不在校园内（距主校区约 ${fmtDist(distance(me.value, { lon: HOME.center[0], lat: HOME.center[1] }))}）` : '你现在不在校园内'
    case 'denied':
      return '没有获得位置权限。可以在浏览器设置里允许本站使用位置'
    case 'unavailable':
      return '暂时无法获取位置。电脑浏览器在国内常常无法定位，建议用手机打开'
    case 'unsupported':
      return '这个浏览器不支持定位'
    default:
      return ''
  }
})

function inCampus(lon: number, lat: number) {
  const m = 0.004 // 约 400 米的余量
  const [x0, y0, x1, y1] = mapData.bbox
  return lon > x0 - m && lon < x1 + m && lat > y0 - m && lat < y1 + m
}

function circle(lon: number, lat: number, r: number) {
  const pts = []
  const k = 111320 * Math.cos((lat * Math.PI) / 180)
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    pts.push([lon + (Math.cos(a) * r) / k, lat + (Math.sin(a) * r) / 110540])
  }
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [pts] } }] }
}

function onOrientation(e: any) {
  const h = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : e.absolute && typeof e.alpha === 'number' ? 360 - e.alpha : null
  if (h == null) return
  heading = h
  if (coneMarker) {
    coneMarker.setRotation(h)
    coneMarker.getElement().classList.add('on')
  }
}

async function locate() {
  const m = map.value
  if (!('geolocation' in navigator)) {
    loc.value = 'unsupported'
    return
  }
  // 已在定位：再点一次回到自己的位置
  if (watchId != null && me.value && m) {
    if (inCampus(me.value.lon, me.value.lat)) m.flyTo({ center: [me.value.lon, me.value.lat], zoom: Math.max(m.getZoom(), 17), duration: reduceMotion() ? 0 : 800 })
    return
  }
  // iOS 需要在点击时申请方向权限
  const DOE = (window as any).DeviceOrientationEvent
  if (DOE && typeof DOE.requestPermission === 'function') {
    DOE.requestPermission().then((s: string) => s === 'granted' && window.addEventListener('deviceorientation', onOrientation)).catch(() => {})
  } else if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute' as any, onOrientation)
  } else {
    window.addEventListener('deviceorientation', onOrientation)
  }
  loc.value = 'asking'
  firstFix = true
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { longitude: lon, latitude: lat, accuracy } = pos.coords
      me.value = { lon, lat, acc: accuracy }
      const inside = inCampus(lon, lat)
      loc.value = inside ? 'ok' : 'outside'
      if (!m) return
      if (inside) {
        m.getSource('me')?.setData(circle(lon, lat, Math.max(accuracy, 5)))
        if (!meMarker) {
          const dot = document.createElement('div')
          dot.className = 'jc-me'
          meMarker = new lib.Marker({ element: dot }).setLngLat([lon, lat]).addTo(m)
          const cone = document.createElement('div')
          cone.className = 'jc-cone'
          coneMarker = new lib.Marker({ element: cone, rotationAlignment: 'map', pitchAlignment: 'map', anchor: 'bottom' }).setLngLat([lon, lat]).addTo(m)
          if (heading != null) onOrientation({ webkitCompassHeading: heading })
        } else {
          meMarker.setLngLat([lon, lat])
          coneMarker.setLngLat([lon, lat])
        }
        if (firstFix) m.flyTo({ center: [lon, lat], zoom: Math.max(m.getZoom(), 16.8), duration: reduceMotion() ? 0 : 900 })
      }
      firstFix = false
    },
    (err) => {
      loc.value = err.code === 1 ? 'denied' : 'unavailable'
      stopLocate(false)
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  )
}

function stopLocate(clear = true) {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  window.removeEventListener('deviceorientation', onOrientation)
  window.removeEventListener('deviceorientationabsolute' as any, onOrientation)
  if (clear) {
    meMarker?.remove()
    coneMarker?.remove()
    meMarker = coneMarker = null
  }
}

// ---------- 地点卡片 ----------
const copied = ref(false)
async function copyLink() {
  const url = new URL(location.href)
  try {
    await navigator.clipboard.writeText(url.toString())
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {}
}

function pickFromList(p: Place) {
  select(p.id)
  if (isNarrow()) nextTick(() => (sheetOpen.value = true))
}

const levelText = (p: Place) => (p.levels ? `${p.levels} 层` : '')
</script>

<template>
  <div class="CampusMap" :class="{ 'sheet-open': sheetOpen, 'has-sel': !!selected }" :data-z="zoomLevel >= 18 ? 3 : zoomLevel >= 16.6 ? 2 : 1">
    <div ref="mapEl" class="map" role="region" aria-label="校园 3D 地图：拖动平移，双指或滚轮缩放，右键或双指旋转" />

    <p v-if="noWebGL || loadFailed" class="fallback">
      {{ noWebGL ? '这台设备的浏览器不支持 3D 地图（WebGL），可以先用左侧的地点列表。' : '地图加载失败，请刷新重试。' }}
    </p>

    <!-- 地点面板：桌面在左侧，手机是底部可展开的面板 -->
    <section ref="panelEl" class="panel" :class="{ dragging: dragH != null }" :style="dragH != null ? { maxHeight: `${dragH}px` } : undefined" aria-label="地点">
      <button
        type="button"
        class="grab"
        :aria-expanded="sheetOpen"
        :aria-label="sheetOpen ? '收起地点面板' : '展开地点面板'"
        @pointerdown="onGrabDown"
        @pointermove="onGrabMove"
        @pointerup="onGrabUp"
        @pointercancel="onGrabUp"
        @click="onGrabClick"
      >
        <span />
      </button>

      <template v-if="selected">
        <div class="detail">
          <button type="button" class="back" @click="select(null)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            全部地点
          </button>
          <h1 class="d-name">{{ selected.name }}</h1>
          <p class="d-meta">
            <span>{{ selected.area }}</span><span>{{ selected.cat }}</span><span v-if="levelText(selected)">{{ levelText(selected) }}</span>
          </p>
          <p v-if="me" class="d-dist">距离你直线约 {{ fmtDist(distTo(selected)!) }}</p>
          <p v-if="selected.note" class="d-note">{{ selected.note }}</p>
          <div v-if="relatedLinks.length" class="d-links">
            <p class="label">相关文章</p>
            <a v-for="l in relatedLinks" :key="l.url" :href="withBase(l.url)">{{ l.title }}</a>
          </div>
          <div class="d-actions">
            <button type="button" class="btn" @click="copyLink">{{ copied ? '已复制' : '复制这个地点的链接' }}</button>
          </div>
        </div>
      </template>

      <template v-else>
        <h1 class="title">校园地图</h1>
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input v-model="query" type="search" placeholder="搜索楼名、食堂、宿舍…" aria-label="搜索地点" @focus="sheetOpen = true" />
        </label>
        <div class="chips" role="group" aria-label="按类型筛选">
          <button type="button" :class="{ on: !cat }" :aria-pressed="!cat" @click="cat = ''">全部</button>
          <button v-for="c in CATS" :key="c" type="button" :class="{ on: cat === c }" :aria-pressed="cat === c" @click="cat = cat === c ? '' : c">{{ c }}</button>
        </div>
        <ul class="list">
          <li v-for="p in filtered" :key="p.id">
            <button type="button" @click="pickFromList(p)">
              <span class="l-name">{{ p.label }}</span>
              <span class="l-meta">{{ me ? fmtDist(distTo(p)!) : p.cat }}</span>
            </button>
          </li>
          <li v-if="!filtered.length" class="empty">没有找到「{{ query }}」。地图上还没有的地点，可以到问答页告诉我们。</li>
        </ul>
      </template>
    </section>

    <!-- 地图控制 -->
    <div class="controls" aria-label="地图控制">
      <button type="button" class="ctl" aria-label="放大" @click="zoomIn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
      <button type="button" class="ctl" aria-label="缩小" @click="zoomOut"><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
      <button type="button" class="ctl txt" :aria-pressed="pitched" :aria-label="pitched ? '切换到平面视图' : '切换到 3D 视图'" @click="togglePitch">{{ pitched ? '2D' : '3D' }}</button>
      <button type="button" class="ctl" aria-label="指北（重置方向）" title="指北" @click="resetNorth">
        <svg viewBox="0 0 24 24" :style="{ transform: `rotate(${-bearing}deg)` }"><path d="M12 3l4 9h-8z" class="n" /><path d="M12 21l-4-9h8z" /></svg>
      </button>
      <button type="button" class="ctl" aria-label="回到全校视图" title="回到全校视图" @click="resetView">
        <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
      <button type="button" class="ctl loc" :class="{ active: loc === 'ok' }" aria-label="显示我的位置" title="显示我的位置" @click="locate">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
      </button>
    </div>

    <p v-if="locText" class="status" role="status">
      <span v-if="loc === 'ok'" class="dot" />{{ locText }}
    </p>

    <p class="attr">
      地图数据 © <a class="no-icon" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap 贡献者</a> · 示意图，非学校官方地图
    </p>
  </div>
</template>

<style scoped>
.CampusMap {
  position: relative;
  height: calc(100vh - var(--vp-nav-height));
  height: calc(100dvh - var(--vp-nav-height));
  min-height: 420px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}

.map {
  position: absolute;
  inset: 0;
}

.fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  max-width: 320px;
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
  color: var(--vp-c-text-2);
}

/* ---------- 面板 ---------- */
.panel {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
}

@media (min-width: 768px) {
  .panel {
    top: 16px;
    left: 16px;
    bottom: 16px;
    width: 300px;
    border-radius: 12px;
    padding: 16px 16px 8px;
  }
}

@media (max-width: 767px) {
  .panel {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 168px;
    padding: 0 16px calc(12px + env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0;
    border-bottom: none;
    transition: max-height 0.28s ease;
  }
  .sheet-open .panel {
    max-height: 62%;
  }
  /* 拖动时高度跟手，不要过渡动画 */
  .panel.dragging {
    transition: none;
  }
}

/* 拖动条只在手机的底部面板上显示 */
.grab {
  display: none;
}

@media (max-width: 767px) {
  /* 整条都能拖：比看到的小横条高得多，手指容易按到 */
  .grab {
    display: flex;
    justify-content: center;
    flex: none;
    width: calc(100% + 32px);
    margin: 0 -16px;
    padding: 12px 0 10px;
    touch-action: none;
    cursor: grab;
  }
  .panel.dragging .grab {
    cursor: grabbing;
  }
}

.grab span {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--vp-c-border);
}

.title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}

@media (max-width: 767px) {
  .title {
    display: none;
  }
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-text-1);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.search svg {
  flex: none;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 16px; /* 小于 16px 时 iOS 会自动放大页面 */
  background: transparent;
  color: var(--vp-c-text-1);
}

.chips {
  display: flex;
  gap: 6px;
  flex: none;
  margin: 10px 0 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) {
  .chips {
    flex-wrap: wrap;
    overflow: visible;
  }
}

.chips button {
  flex: none;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, background-color 0.2s, color 0.2s;
}

.chips button:hover {
  border-color: var(--vp-c-text-1);
}

.chips button.on {
  border-color: var(--vp-c-text-1);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-weight: 600;
}

.list {
  flex: 1;
  min-height: 0;
  margin: 4px -4px 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.list li + li {
  border-top: 1px solid var(--vp-c-divider);
}

.list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0 4px;
  text-align: left;
  border-radius: 6px;
}

.list button:hover {
  background: var(--vp-c-default-soft);
}

.l-name {
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.l-meta {
  flex: none;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.empty {
  padding: 16px 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

/* 地点卡片 */
.detail {
  overflow-y: auto;
  padding-bottom: 8px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 36px;
  margin-left: -6px;
  padding: 0 8px 0 2px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.back:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.back svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.d-name {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
}

.d-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.d-dist {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 600;
}

.d-note {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.d-links {
  margin-top: 14px;
}

.d-links .label {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.d-links a {
  display: block;
  padding: 6px 0;
  font-size: 14px;
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.d-actions {
  margin-top: 16px;
}

.btn {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.btn:hover {
  border-color: var(--vp-c-text-1);
}

/* ---------- 控制按钮 ---------- */
.controls {
  position: absolute;
  z-index: 3;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ctl {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s;
}

.ctl:hover {
  border-color: var(--vp-c-text-1);
}

.ctl svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ctl svg .n {
  fill: currentColor;
}

.ctl.txt {
  font-size: 13px;
  font-weight: 700;
}

.ctl.loc {
  background: var(--vp-c-text-1);
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.ctl.loc.active svg circle {
  fill: currentColor;
}

/* ---------- 状态与署名 ---------- */
.status {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100% - 96px));
  margin: 0;
  padding: 6px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--vp-c-bg);
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

@media (min-width: 768px) {
  .status {
    left: 332px;
    bottom: 16px;
  }
}

@media (max-width: 767px) {
  .status {
    top: 16px;
    left: 16px;
    border-radius: 12px;
  }
}

.status .dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-text-1);
}

.attr {
  position: absolute;
  z-index: 2;
  right: 8px;
  bottom: 6px;
  margin: 0;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.attr a {
  color: inherit;
  text-decoration: underline;
}

@media (max-width: 767px) {
  .attr {
    bottom: 174px;
    right: 6px;
  }
  .sheet-open .attr,
  .has-sel .attr {
    display: none;
  }
}

/* ---------- 地图上的标签（MapLibre 创建的元素，不受 scoped 限制） ---------- */
:deep(.jc-pin) {
  max-width: 13em;
  padding: 2px 10px;
  border: 1px solid var(--vp-c-text-1);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

:deep(.jc-pin.sel) {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-weight: 700;
  z-index: 2;
}

:deep(.jc-pin.off) {
  display: none;
}

/* 与其他标签重叠时暂时隐藏（选中的标签永远显示） */
:deep(.jc-pin.clash:not(.sel)) {
  visibility: hidden;
}

/* 缩放级别不够时隐藏次要标签 */
.CampusMap[data-z='1'] :deep(.jc-pin.p2:not(.sel)),
.CampusMap[data-z='1'] :deep(.jc-pin.p3:not(.sel)),
.CampusMap[data-z='2'] :deep(.jc-pin.p3:not(.sel)) {
  display: none;
}

:deep(.jc-me) {
  width: 18px;
  height: 18px;
  border: 3px solid var(--vp-c-bg);
  border-radius: 50%;
  background: var(--vp-c-text-1);
  box-shadow: 0 0 0 1px var(--vp-c-text-1), 0 2px 6px rgba(0, 0, 0, 0.25);
}

:deep(.jc-cone) {
  display: none;
  width: 44px;
  height: 52px;
  background: linear-gradient(to top, color-mix(in srgb, var(--vp-c-text-1) 35%, transparent), transparent);
  clip-path: polygon(50% 100%, 0 0, 100% 0);
  pointer-events: none;
}

:deep(.jc-cone.on) {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .panel,
  .chips button,
  .ctl {
    transition: none;
  }
}
</style>
