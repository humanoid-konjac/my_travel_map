import { DATA_FILES } from "./config.js";

/**
 * 文件说明：
 * 负责读取页面需要的 JSON 数据，并把加载结果统一返回给主入口模块。
 */

/**
 * 加载应用初始化所需的全部数据文件。
 */
export async function loadAppData() {
  const [site, countries, cities, routes] = await Promise.all([
    fetchJson(DATA_FILES.site),
    fetchJson(DATA_FILES.countries),
    fetchJson(DATA_FILES.cities),
    fetchJson(DATA_FILES.routes)
  ]);

  return {
    site,
    countries,
    cities: await ensureRouteCities(cities, routes),
    routes
  };
}

/**
 * 优先使用轻量城市数据；只有在路线引用缺失时才回退到全量城市库。
 */
async function ensureRouteCities(cities, routes) {
  const missingCityNames = getMissingRouteCityNames(cities, routes);

  if (!missingCityNames.length) {
    return cities;
  }

  const allCities = await fetchJson(DATA_FILES.allCities);
  const allCityLookup = new Map(allCities.map((city) => [city.name, city]));
  const missingCities = missingCityNames
    .map((name) => allCityLookup.get(name))
    .filter(Boolean);

  if (missingCities.length) {
    console.warn(
      `cities.json 缺少 ${missingCities.length} 个路线城市，已从 cities_all.json 补齐。`
    );
  }

  return dedupeCitiesByName([...cities, ...missingCities]);
}

/**
 * 找出路线里被引用、但当前轻量城市数据里还不存在的城市名称。
 */
function getMissingRouteCityNames(cities, routes) {
  const cityNames = new Set(cities.map((city) => city.name));
  const missing = new Set();

  routes.forEach((route) => {
    [route.from, route.to].forEach((name) => {
      if (name && !cityNames.has(name)) {
        missing.add(name);
      }
    });
  });

  return [...missing];
}

/**
 * 合并城市列表时按名称去重，避免 fallback 数据重复插入。
 */
function dedupeCitiesByName(cities) {
  const deduped = [];
  const names = new Set();

  cities.forEach((city) => {
    if (!city?.name || names.has(city.name)) {
      return;
    }

    names.add(city.name);
    deduped.push(city);
  });

  return deduped;
}

/**
 * 按给定地址请求 JSON，并在请求失败时抛出错误。
 */
async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
}
