import {
  buildArcPoints,
  getRouteColor,
  getRouteWeight,
  getSortedYears,
  isValidCoordinates
} from "./utils.js";

/**
 * 文件说明：
 * 负责创建 Leaflet 地图，并在地图上绘制路线、城市点位和视野聚焦逻辑。
 */

/**
 * 创建地图视图，并返回供外部调用的聚焦能力。
 */
export function createMapView({ site, cities, routes, onCitySelect }) {
  const cityLookup = new Map(cities.map((city) => [city.name, city]));
  const years = getSortedYears(routes);
  const map = createMap(site);

  renderRoutes(map, routes, cityLookup, years);
  renderCityMarkers(map, cities, onCitySelect);
  fitMapToCities(map, cities);

  /**
   * 根据一条路线把地图聚焦到对应的起点和终点范围内。
   */
  function focusRoute(route) {
    const fromCity = cityLookup.get(route.from);
    const toCity = cityLookup.get(route.to);

    if (!fromCity || !toCity) {
      return;
    }

    map.fitBounds([fromCity.coordinates, toCity.coordinates], getBoundsOptions(true));
  }

  return {
    map,
    focusRoute
  };
}

/**
 * 用站点配置创建地图底图和缩放控件。
 */
function createMap(site) {
  const center = site.defaultView?.center || [20, 20];
  const zoom = site.defaultView?.zoom ?? 2;
  const tileLayer = site.tileLayer || {};

  const map = L.map("map", {
    zoomControl: false,
    worldCopyJump: true,
    minZoom: 2
  }).setView(center, zoom);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  const layerOptions = {
    attribution: tileLayer.attribution || "&copy; OpenStreetMap contributors",
    maxZoom: tileLayer.maxZoom || 20
  };

  if (tileLayer.subdomains) {
    layerOptions.subdomains = tileLayer.subdomains;
  }

  L.tileLayer(
    tileLayer.url || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    layerOptions
  ).addTo(map);

  return map;
}

/**
 * 把全部路线绘制到地图上，并按年份设置颜色和粗细。
 */
function renderRoutes(map, routes, cityLookup, years) {
  routes
    .slice()
    .sort((left, right) => left.year - right.year)
    .forEach((route) => {
      const fromCity = cityLookup.get(route.from);
      const toCity = cityLookup.get(route.to);

      if (!fromCity || !toCity) {
        console.warn("Route city not found:", route);
        return;
      }

      L.polyline(buildArcPoints(fromCity.coordinates, toCity.coordinates), {
        color: getRouteColor(route.year, years),
        weight: getRouteWeight(route.year, years),
        opacity: 0.7,
        lineCap: "round",
        lineJoin: "round",
        interactive: false
      }).addTo(map);
    });
}

/**
 * 把城市列表渲染为可点击的地图点位。
 */
function renderCityMarkers(map, cities, onCitySelect) {
  const markerIcon = L.divIcon({
    className: "city-marker",
    html: '<span class="pin"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 20]
  });

  cities.forEach((city) => {
    if (!isValidCoordinates(city.coordinates)) {
      return;
    }

    const marker = L.marker(city.coordinates, {
      icon: markerIcon,
      riseOnHover: true
    }).addTo(map);

    marker.bindTooltip(city.name, {
      direction: "top",
      offset: [0, -18]
    });

    marker.on("click", () => onCitySelect(city));
  });
}

/**
 * 根据全部城市坐标自动调整地图初始视野。
 */
function fitMapToCities(map, cities) {
  const coordinates = cities
    .map((city) => city.coordinates)
    .filter((coordinate) => isValidCoordinates(coordinate));

  if (!coordinates.length) {
    return;
  }

  const bounds = L.latLngBounds(coordinates);
  if (!bounds.isValid()) {
    return;
  }

  map.fitBounds(bounds, getBoundsOptions(false));
}

/**
 * 根据桌面端或移动端场景返回合适的地图留白参数。
 */
function getBoundsOptions(isRouteFocus) {
  if (window.innerWidth > 920) {
    // 桌面端要给左侧信息面板预留空间。
    return {
      paddingTopLeft: [420, 40],
      paddingBottomRight: [40, 40],
      maxZoom: 4
    };
  }

  return {
    padding: [32, 32],
    maxZoom: isRouteFocus ? 4 : 3
  };
}
