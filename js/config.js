/**
 * 文件说明：
 * 统一维护页面会读取的 JSON 数据路径，避免路径分散在各个模块里。
 */

/**
 * 页面运行时要读取的 JSON 文件地址集合。
 */
export const DATA_FILES = {
  site: new URL("../data/site.json", import.meta.url),
  countries: new URL("../data/countries.json", import.meta.url),
  cities: new URL("../data/cities_all.json", import.meta.url),
  routes: new URL("../data/routes.json", import.meta.url)
};
