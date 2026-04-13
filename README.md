# My Travel Map

一个基于 Leaflet 的个人旅行地图项目，用于展示到访城市、国家和旅行路线。

## 本地运行

1. 在项目根目录启动静态服务器：

```bash
python3 -m http.server 8000
```

2. 在浏览器打开 `http://localhost:8000`

不要直接双击 `index.html`，否则浏览器可能无法读取本地 JSON 数据。

## 数据文件

- `data/site.json`：站点标题、副标题和默认地图视角
- `data/cities.json`：城市、坐标和旅行信息
- `data/routes.json`：城市之间的路线与年份
- `data/countries.json`：国家名称和旗帜信息

## 目录

- `index.html`：页面入口
- `js/`：前端逻辑
- `style.css`：页面样式
- `util/`：数据处理脚本
