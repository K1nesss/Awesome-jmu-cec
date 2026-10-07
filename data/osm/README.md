# 校园地图的原始数据

`jmu-campus.osm` 是从 [OpenStreetMap](https://www.openstreetmap.org/) 导出的集美大学一带的地图数据，
校园地图页（`/map/`）的建筑轮廓、高度、道路、水面和地点名都由它生成。

## 许可

地图数据 © OpenStreetMap 贡献者，按 [开放数据库许可（ODbL）](https://www.openstreetmap.org/copyright) 使用。
由它生成的 `docs/public/map/campus.geojson` 与 `docs/map/places.generated.json` 同样遵循 ODbL，
地图页右下角保留了署名。

## 更新数据

1. 打开 openstreetmap.org，搜索「集美大学」，点击「导出」，选择「手动选择不同区域」框住所有校区，导出 `.osm` 文件。
2. 用导出的文件替换本目录的 `jmu-campus.osm`（文件名不变）。
3. 运行 `npm run map:build`，重新生成地图数据；再运行 `npm test` 检查。
4. 一起提交三个文件：`jmu-campus.osm`、`docs/public/map/campus.geojson`、`docs/map/places.generated.json`。

楼名写错、缺了某栋楼：最好直接在 OpenStreetMap 上修改（所有地图用户都能受益），下次更新数据时会带过来；
只想改本站的显示（改名、加别名、写简介、关联文章），编辑 `docs/map/places.yaml`。
