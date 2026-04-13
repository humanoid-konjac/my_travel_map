/**
 * 文件说明：
 * 存放与 DOM 无关的通用工具函数，例如年份计算、颜色插值、经纬度处理和路线曲线采样。
 */

/**
 * 从路线数据里提取去重后的年份，并按从小到大排序。
 */
export function getSortedYears(routes) {
  return [...new Set(routes.map((route) => route.year).filter(Boolean))]
    .sort((left, right) => left - right);
}

/**
 * 根据年份生成路线颜色，让不同年份的路线有明显区分。
 */
export function getRouteColor(year, years = []) {
  if (!years.length) {
    return "rgb(37, 99, 235)";
  }

  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const ratio = maxYear === minYear ? 0.5 : clamp((year - minYear) / (maxYear - minYear), 0, 1);

  return interpolateColor("#7dd3fc", "#1d4ed8", ratio);
}

/**
 * 根据年份生成路线线宽，让较新的路线视觉上更突出。
 */
export function getRouteWeight(year, years = []) {
  if (!years.length) {
    return 2;
  }

  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const ratio = maxYear === minYear ? 0.5 : clamp((year - minYear) / (maxYear - minYear), 0, 1);

  return 1.2 + ratio * 2.1;
}

/**
 * 根据起点和终点生成一组贝塞尔曲线点，用来绘制弧形路线。
 */
export function buildArcPoints(fromCoords, toCoords) {
  const [adjustedFrom, adjustedTo] = adjustForDateline(fromCoords, toCoords);
  const distance = calculateDistanceKm(adjustedFrom, adjustedTo);
  const offset = Math.min(Math.pow(Math.log(distance + 1) * 0.16, 8), 48);
  const controlPoint = getOffsetControlPoint(
    adjustedFrom,
    adjustedTo,
    Number.isFinite(offset) ? offset : 0
  );

  return sampleQuadraticBezier(adjustedFrom, controlPoint, adjustedTo, 56);
}

/**
 * 把空字符串等无效内容转换成统一的占位文案。
 */
export function formatValue(value) {
  return typeof value === "string" && value.trim() ? value : "待补充";
}

/**
 * 把经纬度数组格式化成适合在界面展示的文本。
 */
export function formatCoordinates(coordinates) {
  if (!isValidCoordinates(coordinates)) {
    return "经纬度待补充";
  }

  return `${Number(coordinates[0]).toFixed(4)}, ${Number(coordinates[1]).toFixed(4)}`;
}

/**
 * 判断一组经纬度是否是合法的二维数字数组。
 */
export function isValidCoordinates(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

/**
 * 处理跨国际日期变更线的路线，避免折线绕地球一大圈。
 */
function adjustForDateline(fromCoords, toCoords) {
  const adjustedFrom = [...fromCoords];
  const adjustedTo = [...toCoords];
  const longitudeDiff = adjustedTo[1] - adjustedFrom[1];

  if (longitudeDiff > 180) {
    adjustedFrom[1] += 360;
  } else if (longitudeDiff < -180) {
    adjustedTo[1] += 360;
  }

  return [adjustedFrom, adjustedTo];
}

/**
 * 用球面距离公式计算两组经纬度之间的大致距离，单位为千米。
 */
function calculateDistanceKm(fromCoords, toCoords) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(fromCoords[0]);
  const lat2 = toRadians(toCoords[0]);
  const deltaLat = toRadians(toCoords[0] - fromCoords[0]);
  const deltaLng = toRadians(toCoords[1] - fromCoords[1]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * 计算弧线的控制点，让直线变成向外鼓起的曲线。
 */
function getOffsetControlPoint(fromCoords, toCoords, offset) {
  const midpoint = [
    (fromCoords[0] + toCoords[0]) * 0.5,
    (fromCoords[1] + toCoords[1]) * 0.5
  ];
  const deltaLat = toCoords[0] - fromCoords[0];
  const deltaLng = toCoords[1] - fromCoords[1];
  const length = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) || 1;
  const perpendicular = [-deltaLng / length, deltaLat / length];

  return [
    midpoint[0] + perpendicular[0] * offset,
    midpoint[1] + perpendicular[1] * offset
  ];
}

/**
 * 采样二次贝塞尔曲线，返回绘制折线所需的点集合。
 */
function sampleQuadraticBezier(start, control, end, segments) {
  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    const lat = inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0];
    const lng = inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1];
    points.push([lat, lng]);
  }

  return points;
}

/**
 * 在两个十六进制颜色之间做线性插值，得到中间颜色。
 */
function interpolateColor(fromHex, toHex, ratio) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const safeRatio = clamp(ratio, 0, 1);

  const red = Math.round(from.r + (to.r - from.r) * safeRatio);
  const green = Math.round(from.g + (to.g - from.g) * safeRatio);
  const blue = Math.round(from.b + (to.b - from.b) * safeRatio);

  return `rgb(${red}, ${green}, ${blue})`;
}

/**
 * 把十六进制颜色转换成 RGB 数值对象。
 */
function hexToRgb(hex) {
  const clean = hex.replace("#", "");

  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

/**
 * 把数值限制在指定区间内。
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 把角度转换成弧度，便于三角函数计算。
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
