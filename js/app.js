import { loadAppData } from "./data-service.js";
import { createMapView } from "./map-view.js";
import { renderPanel } from "./panel.js";
import { createCityModal } from "./city-modal.js";

/**
 * 文件说明：
 * 作为应用主入口，负责加载数据、创建各功能模块，并在初始化失败时给出提示。
 */

/**
 * 页面 DOM 就绪后启动整个应用。
 */
document.addEventListener("DOMContentLoaded", initializeApp);

/**
 * 初始化应用，把数据层、地图、面板和弹窗模块连接起来。
 */
async function initializeApp() {
  try {
    const appData = await loadAppData();
    const countryLookup = new Map(appData.countries.map((country) => [country.code, country]));
    const cityModal = createCityModal(countryLookup);
    const mapView = createMapView({
      site: appData.site,
      cities: appData.cities,
      routes: appData.routes,
      onCitySelect: cityModal.open
    });

    renderPanel({
      site: appData.site,
      countries: appData.countries,
      cities: appData.cities,
      routes: appData.routes,
      onRouteSelect: mapView.focusRoute
    });
  } catch (error) {
    console.error(error);
    document.getElementById("site-subtitle").textContent = "数据加载失败";
    showMessage(
      "JSON 数据加载失败。若你是直接双击打开 index.html，请改用本地静态服务器运行，例如 python3 -m http.server。"
    );
  }
}

/**
 * 在页面顶部显示初始化失败或其他全局提示信息。
 */
function showMessage(message) {
  const element = document.getElementById("app-message");
  element.textContent = message;
  element.classList.remove("hidden");
}
