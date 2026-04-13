import { formatCoordinates, formatValue } from "./utils.js";

/**
 * 文件说明：
 * 负责城市详情弹窗的打开、关闭、信息填充和照片切换逻辑。
 */

/**
 * 创建城市弹窗控制器，供外部打开或关闭弹窗。
 */
export function createCityModal(countryLookup) {
  const elements = getElements();
  const modalState = {
    activeCity: null,
    photoIndex: 0
  };

  bindEvents(elements, modalState);

  /**
   * 根据城市数据填充弹窗内容并显示弹窗。
   */
  function open(city) {
    modalState.activeCity = city;
    modalState.photoIndex = 0;

    const country = countryLookup.get(city.countryCode);

    elements.country.textContent = country
      ? `${country.name} · ${country.code}`
      : city.countryCode || "待补充";
    elements.cityName.textContent = city.name || "未命名城市";
    elements.coordinates.textContent = formatCoordinates(city.coordinates);
    elements.visitDate.textContent = formatValue(city.visitDate);
    elements.stayLength.textContent = formatValue(city.stayLength);
    elements.description.textContent = city.description || "这座城市的旅行描述还没有填写。";
    elements.notes.textContent = city.notes || "你可以继续在 data/cities.json 里补充 notes、photos 等字段。";

    if (country?.flag) {
      elements.flag.src = country.flag;
      elements.flag.alt = country.code || country.name || "flag";
      elements.flag.hidden = false;
    } else {
      elements.flag.hidden = true;
      elements.flag.removeAttribute("src");
    }

    updatePhotoViewer(elements, modalState);
    elements.modal.classList.remove("hidden");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  /**
   * 主动关闭当前城市弹窗。
   */
  function close() {
    closeModal(elements, modalState);
  }

  return {
    open,
    close
  };
}

/**
 * 收集弹窗相关的 DOM 节点，避免后续重复查询。
 */
function getElements() {
  return {
    modal: document.getElementById("city-modal"),
    flag: document.getElementById("modal-flag"),
    country: document.getElementById("modal-country"),
    cityName: document.getElementById("modal-city-name"),
    coordinates: document.getElementById("modal-coordinates"),
    visitDate: document.getElementById("modal-visit-date"),
    stayLength: document.getElementById("modal-stay-length"),
    description: document.getElementById("modal-description"),
    notes: document.getElementById("modal-notes"),
    closeButton: document.getElementById("modal-close"),
    photoFrame: document.getElementById("photo-frame"),
    photoImage: document.getElementById("photo-image"),
    photoEmpty: document.getElementById("photo-empty"),
    photoIndex: document.getElementById("photo-index"),
    prevPhoto: document.getElementById("prev-photo"),
    nextPhoto: document.getElementById("next-photo")
  };
}

/**
 * 为弹窗绑定关闭、键盘切换和照片切换事件。
 */
function bindEvents(elements, modalState) {
  elements.closeButton.addEventListener("click", () => closeModal(elements, modalState));
  elements.prevPhoto.addEventListener("click", () => stepPhoto(elements, modalState, -1));
  elements.nextPhoto.addEventListener("click", () => stepPhoto(elements, modalState, 1));

  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeModal(elements, modalState);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (elements.modal.classList.contains("hidden")) {
      return;
    }

    if (event.key === "Escape") {
      closeModal(elements, modalState);
    }

    if (event.key === "ArrowLeft") {
      stepPhoto(elements, modalState, -1);
    }

    if (event.key === "ArrowRight") {
      stepPhoto(elements, modalState, 1);
    }
  });
}

/**
 * 清空当前激活城市并隐藏弹窗。
 */
function closeModal(elements, modalState) {
  modalState.activeCity = null;
  modalState.photoIndex = 0;
  elements.modal.classList.add("hidden");
  elements.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

/**
 * 把照片索引向前或向后切换一张。
 */
function stepPhoto(elements, modalState, direction) {
  const photos = getActivePhotos(modalState);
  if (photos.length < 2) {
    return;
  }

  modalState.photoIndex = (modalState.photoIndex + direction + photos.length) % photos.length;
  updatePhotoViewer(elements, modalState);
}

/**
 * 根据当前城市和索引刷新照片区域的显示状态。
 */
function updatePhotoViewer(elements, modalState) {
  const photos = getActivePhotos(modalState);

  if (!photos.length) {
    elements.photoFrame.classList.add("empty");
    elements.photoImage.hidden = true;
    elements.photoImage.removeAttribute("src");
    elements.photoEmpty.hidden = false;
    elements.photoIndex.textContent = "0 / 0";
    elements.prevPhoto.disabled = true;
    elements.nextPhoto.disabled = true;
    return;
  }

  elements.photoFrame.classList.remove("empty");
  elements.photoImage.hidden = false;
  elements.photoImage.src = photos[modalState.photoIndex];
  elements.photoImage.alt = `${modalState.activeCity?.name || "city"} photo ${modalState.photoIndex + 1}`;
  elements.photoEmpty.hidden = true;
  elements.photoIndex.textContent = `${modalState.photoIndex + 1} / ${photos.length}`;
  elements.prevPhoto.disabled = photos.length < 2;
  elements.nextPhoto.disabled = photos.length < 2;
}

/**
 * 提取当前城市中可用的照片地址数组。
 */
function getActivePhotos(modalState) {
  if (!modalState.activeCity || !Array.isArray(modalState.activeCity.photos)) {
    return [];
  }

  return modalState.activeCity.photos
    .filter((photo) => typeof photo === "string" && photo.trim());
}
