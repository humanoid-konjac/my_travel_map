import { getRouteColor, getSortedYears } from "./utils.js";

/**
 * 文件说明：
 * 负责渲染左侧信息面板，包括标题、统计信息、年份图例、国家旗帜和路线列表。
 */

/**
 * 按当前数据刷新整个信息面板。
 */
export function renderPanel({ site, countries, cities, routes, onRouteSelect }) {
  document.getElementById("site-title").textContent = site.title || "Travel Map";
  document.getElementById("site-subtitle").textContent = site.subtitle || "";
  document.getElementById("panel-note").textContent = site.panelNote || "";

  renderStats(countries, cities, routes);
  renderYearLegend(routes);
  renderCountries(countries);
  renderRouteList(routes, onRouteSelect);
}

/**
 * 渲染国家数、城市数、路线数和年份数这几张统计卡片。
 */
function renderStats(countries, cities, routes) {
  const stats = [
    { label: "Countries", value: countries.length },
    { label: "Cities", value: cities.length },
    { label: "Routes", value: routes.length },
    { label: "Years", value: getSortedYears(routes).length }
  ];

  const container = document.getElementById("stats");
  container.innerHTML = "";

  stats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "stat-card";

    const value = document.createElement("div");
    value.className = "stat-value";
    value.textContent = String(stat.value);

    const label = document.createElement("div");
    label.className = "stat-label";
    label.textContent = stat.label;

    card.append(value, label);
    container.appendChild(card);
  });
}

/**
 * 渲染按年份分类的颜色图例，帮助理解路线颜色含义。
 */
function renderYearLegend(routes) {
  const years = getSortedYears(routes);
  const container = document.getElementById("year-legend");

  document.getElementById("year-count").textContent = `${years.length} 年`;
  container.innerHTML = "";

  years
    .slice()
    .sort((left, right) => right - left)
    .forEach((year) => {
      const chip = document.createElement("div");
      chip.className = "year-chip";

      const dot = document.createElement("span");
      dot.className = "year-dot";
      dot.style.backgroundColor = getRouteColor(year, years);

      const text = document.createElement("span");
      text.textContent = `${year} · ${routes.filter((route) => route.year === year).length}`;

      chip.append(dot, text);
      container.append(chip);
    });
}

/**
 * 渲染国家旗帜网格，用于展示去过的国家列表。
 */
function renderCountries(countries) {
  const container = document.getElementById("flag-list");
  container.innerHTML = "";

  document.getElementById("country-count").textContent = `${countries.length} 个`;

  countries.forEach((country) => {
    const item = document.createElement("div");
    item.className = "flag-item";
    item.title = country.name || country.code;

    const image = document.createElement("img");
    image.alt = country.code || country.name || "flag";

    if (country.flag) {
      image.src = country.flag;
    } else {
      image.hidden = true;
    }

    const code = document.createElement("div");
    code.className = "flag-code";
    code.textContent = country.code || "--";

    const name = document.createElement("div");
    name.className = "flag-name";
    name.textContent = country.name || "待补充";

    item.append(image, code, name);
    container.appendChild(item);
  });
}

/**
 * 渲染路线列表，并把点击事件交给外部回调处理。
 */
function renderRouteList(routes, onRouteSelect) {
  const years = getSortedYears(routes);
  const container = document.getElementById("route-list");
  const routesByYear = new Map();

  document.getElementById("route-count").textContent = `${routes.length} 段`;
  container.innerHTML = "";

  routes.forEach((route) => {
    if (!routesByYear.has(route.year)) {
      routesByYear.set(route.year, []);
    }

    routesByYear.get(route.year).push(route);
  });

  Array.from(routesByYear.keys())
    .sort((left, right) => right - left)
    .forEach((year) => {
      const group = document.createElement("section");
      group.className = "route-year-group";

      const title = document.createElement("h3");
      title.textContent = String(year);
      group.appendChild(title);

      routesByYear.get(year).forEach((route) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "route-item";
        item.addEventListener("click", () => onRouteSelect(route));

        const swatch = document.createElement("span");
        swatch.className = "route-swatch";
        swatch.style.backgroundColor = getRouteColor(route.year, years);

        const copy = document.createElement("div");

        const routeTitle = document.createElement("strong");
        routeTitle.textContent = `${route.from} → ${route.to}`;

        const meta = document.createElement("p");
        meta.textContent = route.transport || route.note || "交通方式待补充";

        copy.append(routeTitle, meta);
        item.append(swatch, copy);
        group.appendChild(item);
      });

      container.appendChild(group);
    });
}
