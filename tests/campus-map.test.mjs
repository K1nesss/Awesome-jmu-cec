// 校园地图数据转换（OpenStreetMap → 网页数据）的回归测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SRC, areaM2, buildCampus, categorize, centroid, heightOf, parseOSM, pointInPolygon, priorityOf } from '../scripts/build-campus-map.mjs'

const XML = `<?xml version="1.0"?><osm>
<node id="1" lat="24.580" lon="118.080"/><node id="2" lat="24.580" lon="118.090"/><node id="3" lat="24.590" lon="118.090"/><node id="4" lat="24.590" lon="118.080"/>
<node id="11" lat="24.584" lon="118.084"/><node id="12" lat="24.584" lon="118.085"/><node id="13" lat="24.585" lon="118.085"/><node id="14" lat="24.585" lon="118.084"/>
<node id="21" lat="24.600" lon="118.100"/><node id="22" lat="24.600" lon="118.101"/><node id="23" lat="24.601" lon="118.101"/>
<way id="100"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="amenity" v="university"/><tag k="name" v="集美大学（主校区）"/></way>
<way id="200"><nd ref="11"/><nd ref="12"/><nd ref="13"/><nd ref="14"/><nd ref="11"/><tag k="building" v="dormitory"/><tag k="name" v="测试&amp;公寓"/></way>
<way id="300"><nd ref="21"/><nd ref="22"/><nd ref="23"/><nd ref="21"/><tag k="building" v="yes"/><tag k="name" v="校外大楼"/></way>
<way id="400"><nd ref="1"/><nd ref="3"/><tag k="boundary" v="administrative"/></way>
</osm>`

test('解析 OSM：节点、路径、标签（含转义字符）', () => {
  const { ways } = parseOSM(XML)
  assert.equal(ways.length, 4)
  assert.equal(ways.find((w) => w.id === '200').tags.name, '测试&公寓')
  assert.equal(ways.find((w) => w.id === '200').closed, true)
})

test('只保留校区内的建筑；不输出行政界线；校区简称', () => {
  const { geojson, places, areas } = buildCampus(XML)
  assert.deepEqual(areas, [{ name: '集美大学（主校区）', short: '主校区' }])
  const blds = geojson.features.filter((f) => f.properties.k === 'building')
  assert.deepEqual(blds.map((f) => f.properties.name), ['测试&公寓'])
  assert.ok(!geojson.features.some((f) => JSON.stringify(f).includes('administrative')))
  assert.equal(places[0].cat, '宿舍')
  assert.equal(places[0].area, '主校区')
  assert.equal(blds[0].properties.h, 6 * 3.6, '宿舍没有层数时按 6 层估算')
})

test('分类：驿站算生活而不是运动；食堂、图书馆、宿舍', () => {
  assert.equal(categorize({ name: '集美大学庄重文体育场拼多多快递驿站', building: 'shed' }), '生活')
  assert.equal(categorize({ name: '材塗膳厅', building: 'restaurant' }), '食堂')
  assert.equal(categorize({ name: '嘉庚图书馆', building: 'yes' }), '图书馆')
  assert.equal(categorize({ name: '第五社区3号楼', building: 'dormitory' }), '宿舍')
  assert.equal(categorize({ name: '光前体育馆', building: 'yes' }), '运动')
  assert.equal(categorize({ name: '尚大楼', building: 'yes' }), '教学')
})

test('高度：有层数按每层 3.6 米，没有时估算并标记', () => {
  assert.deepEqual(heightOf({ building: 'yes', 'building:levels': '5' }), { h: 18, estimated: false })
  assert.equal(heightOf({ building: 'yes', height: '30' }).h, 30)
  assert.equal(heightOf({ building: 'shed' }).estimated, true)
  assert.equal(heightOf({ building: 'shed' }).h, 3.6)
})

test('几何：点在多边形内、质心、面积、标签优先级', () => {
  const sq = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
  assert.equal(pointInPolygon([0.5, 0.5], sq), true)
  assert.equal(pointInPolygon([1.5, 0.5], sq), false)
  assert.deepEqual(centroid(sq).map((v) => Math.round(v * 100) / 100), [0.5, 0.5])
  const a = areaM2([[118.084, 24.584], [118.085, 24.584], [118.085, 24.585], [118.084, 24.585], [118.084, 24.584]])
  assert.ok(a > 10000 && a < 11500, `约 100 米 × 110 米，实际 ${a}`)
  assert.equal(priorityOf('尚大楼连廊', '教学', 9000), 3)
  assert.equal(priorityOf('西苑餐厅', '食堂', 100), 1)
  assert.equal(priorityOf('小楼', '教学', 300), 2)
})

test('仓库里的真实数据可以转换，且主校区有地点', () => {
  const { geojson, places, areas } = buildCampus(readFileSync(SRC, 'utf8'))
  assert.ok(areas.some((a) => a.short === '主校区'))
  assert.ok(geojson.features.filter((f) => f.properties.k === 'building').length > 100)
  assert.ok(places.some((p) => p.name === '嘉庚图书馆' && p.cat === '图书馆'))
  assert.ok(!geojson.features.some((f) => f.properties.k === 'building' && f.properties.name === '厦门集美万达广场'), '校外建筑不应出现')
})

test('提交到仓库的地图数据与 OSM 源文件一致（改了 .osm 记得运行 npm run map:build）', () => {
  const { geojson, places } = buildCampus(readFileSync(SRC, 'utf8'))
  const root = new URL('../docs/', import.meta.url)
  const committedGeo = JSON.parse(readFileSync(new URL('public/map/campus.geojson', root), 'utf8'))
  const committedPlaces = JSON.parse(readFileSync(new URL('map/places.generated.json', root), 'utf8')).places
  assert.equal(committedGeo.features.length, geojson.features.length)
  assert.deepEqual(committedPlaces, JSON.parse(JSON.stringify(places)))
})
