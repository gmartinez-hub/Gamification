export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (min, max, value) => {
  const x = clamp((value - min) / Math.max(1e-6, max - min), 0, 1);
  return x * x * (3 - 2 * x);
};
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const normalize = (v) => {
  const length = Math.hypot(v.x, v.y);
  return length > 1e-6 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 };
};
export const parseShieldPercent = (element) => {
  const match = String(element?.textContent || "").match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? clamp(Number(match[1]), 0, 100) : 100;
};
export const nearestRegionIndex = (position, regions) => {
  let best = 0;
  let bestDistance = Infinity;
  regions.forEach((region, index) => {
    const d = distance(position, region.center);
    if (d < bestDistance) { best = index; bestDistance = d; }
  });
  return best;
};
export const assetUrl = (path) => `/${String(path).replace(/^\/+/, "")}`;
