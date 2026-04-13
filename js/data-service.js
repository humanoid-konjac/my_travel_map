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

  return { site, countries, cities, routes };
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
