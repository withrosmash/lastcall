// A real map drawn straight into a canvas, for the share card.
//
// Leaflet can't be used here: screenshotting its DOM is exactly the
// cross-origin taint that would break export. Instead tiles are fetched as
// images with crossOrigin set — Esri serves Access-Control-Allow-Origin: * —
// and painted onto the card, so the canvas stays exportable.
//
// The route is projected with the same Web Mercator maths as the tiles. The
// outline elsewhere uses a simpler equirectangular fit, which at city scale
// would visibly drift the line off the streets it follows.

const TILE = 256;
const MAX_Z = 16; // Esri's dark canvas has no data past this
const tileUrl = (z, x, y) =>
  `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`;

// Longitude/latitude → pixels in a world TILE·2^z wide.
export function project(lat, lng, z) {
  const size = TILE * 2 ** z;
  const s = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size,
  };
}

/** Choose a zoom and scale so the trail fits `region` (card pixels). */
export function frame(trail, region) {
  const pts0 = trail.map((p) => project(p.lat, p.lng, 0));
  const xs = pts0.map((p) => p.x), ys = pts0.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 60;
  const fit = Math.min(
    (region.w - pad * 2) / Math.max(maxX - minX, 1e-9),
    (region.h - pad * 2) / Math.max(maxY - minY, 1e-9),
  );
  // Rounding keeps tiles drawn at k in [0.71, 1.41): never blown up far enough
  // to go soft, never shrunk far enough to lose street names. A tiny trail
  // would ask for more zoom than exists; cap it rather than upscale into mush.
  let z = Math.round(Math.log2(fit));
  z = Math.max(3, Math.min(MAX_Z, z));
  const k = Math.min(fit / 2 ** z, 2.5);
  const c0 = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  return {
    z, k,
    cx: c0.x * 2 ** z, cy: c0.y * 2 ** z,
    rcx: region.x + region.w / 2, rcy: region.y + region.h / 2,
  };
}

export function toCard(f, lat, lng) {
  const p = project(lat, lng, f.z);
  return { x: f.rcx + (p.x - f.cx) * f.k, y: f.rcy + (p.y - f.cy) * f.k };
}

/** Every tile needed to cover a w×h card, with where each one lands. */
export function tilesFor(f, w, h) {
  const n = 2 ** f.z;
  const left = f.cx + (0 - f.rcx) / f.k, right = f.cx + (w - f.rcx) / f.k;
  const top = f.cy + (0 - f.rcy) / f.k, bottom = f.cy + (h - f.rcy) / f.k;
  const out = [];
  for (let ty = Math.floor(top / TILE); ty <= Math.floor(bottom / TILE); ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor(right / TILE); tx++) {
      const wx = ((tx % n) + n) % n;
      out.push({
        url: tileUrl(f.z, wx, ty),
        dx: f.rcx + (tx * TILE - f.cx) * f.k,
        dy: f.rcy + (ty * TILE - f.cy) * f.k,
        size: TILE * f.k,
      });
    }
  }
  return out;
}

// Shared across redraws: dragging an element redraws dozens of times a second
// and must never refetch.
const cache = new Map();

/** Returns an image once loaded, else null; `onReady` fires when one lands. */
export function tile(url, onReady) {
  let entry = cache.get(url);
  if (!entry) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    entry = { img, state: 'loading' };
    img.onload = () => { entry.state = 'ok'; onReady?.(); };
    img.onerror = () => { entry.state = 'err'; onReady?.(); };
    img.src = url;
    cache.set(url, entry);
  }
  return entry.state === 'ok' ? entry.img : null;
}

/** 'ok' | 'loading' | 'failed' for a tile set, so callers can fall back. */
export function status(list) {
  const states = list.map((t) => cache.get(t.url)?.state || 'loading');
  if (states.every((s) => s === 'ok')) return 'ok';
  if (states.some((s) => s === 'loading')) return 'loading';
  return states.some((s) => s === 'ok') ? 'ok' : 'failed';
}
