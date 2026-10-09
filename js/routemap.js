// The small maps on the recap and History: the same Esri tiles as the share
// card, drawn into a canvas with the route over them. With no signal the
// tiles never arrive and the route sits on the plain ground, as it always did.

import * as SM from './staticmap.js';
import { el, currentTheme } from './ui.js';

const INSET = 16; // CSS px of clear space round the routes

// Inks per theme, matching the route card: mint on an under-stroke, and on a
// walk the left-out stretches faint underneath.
const INK = {
  dark: { wash: 'rgba(0,0,0,.35)', ground: '#000000', route: '#7EE0C0', under: 'rgba(0,0,0,.55)', faint: 'rgba(255,255,255,.3)', underFaint: 'rgba(0,0,0,.55)', pink: '#F06C9B', end: '#FFFFFF', credit: 'rgba(255,255,255,.5)' },
  light: { wash: 'rgba(238,242,248,.35)', ground: '#EEF2F8', route: '#7EE0C0', under: '#0B6E55', faint: 'rgba(11,21,38,.26)', underFaint: 'rgba(255,255,255,.75)', pink: '#C92F68', end: '#0B1526', credit: 'rgba(11,21,38,.5)' },
};

/** A frame that fits every point inside a w×h box (CSS px). */
export function fitFrame(points, w, h) {
  return SM.frame(points, { x: INSET, y: INSET, w: w - INSET * 2, h: h - INSET * 2 }, 0);
}

/** The same frame from the next zoom down at half size: crisper on a dense screen. */
export function sharper(f) {
  return f.z >= 16 ? f : { ...f, z: f.z + 1, k: f.k / 2, cx: f.cx * 2, cy: f.cy * 2 };
}

/**
 * The route as runs of counted and left-out stretches. `excluded[i]` is for the
 * segment from point i-1 to point i; neighbouring runs share their join.
 */
export function routeRuns(pts, excluded) {
  const runs = [];
  for (let i = 1; i < pts.length; i++) {
    const counted = !excluded?.[i];
    const last = runs.at(-1);
    if (last && last.counted === counted) last.pts.push(pts[i]);
    else runs.push({ counted, pts: [pts[i - 1], pts[i]] });
  }
  return runs;
}

const pathOf = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };

/**
 * A map with routes on it, `height` CSS px tall and as wide as its box.
 * routes: [{ trail, excluded?, pins? }]. `end` marks where the last route
 * finished; `alpha` dims the lines when many overlap.
 */
export function routeMap(routes, { height = 190, end = false, alpha = 1, label = 'Map of your route' } = {}) {
  const canvas = el('canvas', { style: `display:block;width:100%;height:${height}px`, role: 'img', 'aria-label': label });
  const points = routes.flatMap((r) => r.trail);
  let queued = false, waits = 0;
  const draw = () => {
    queued = false;
    const w = canvas.clientWidth;
    // Not on screen yet: try again for a second or so, then give up quietly.
    if (!canvas.isConnected || !w) { if (waits++ < 60) requestAnimationFrame(draw); return; }
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ink = INK[currentTheme()] || INK.dark;
    g.fillStyle = ink.ground;
    g.fillRect(0, 0, w, height);
    if (points.length < 2) return;
    const f = fitFrame(points, w, height);
    const light = currentTheme() === 'light';
    const tf = dpr >= 2 ? sharper(f) : f;
    const tiles = SM.tilesFor(tf, w, height, light);
    let drawn = 0;
    for (const t of tiles) {
      const img = SM.tile(t.url, later);
      if (!img) continue;
      g.drawImage(img, Math.floor(t.dx), Math.floor(t.dy), Math.ceil(t.size) + 1, Math.ceil(t.size) + 1);
      drawn++;
    }
    if (drawn) { g.fillStyle = ink.wash; g.fillRect(0, 0, w, height); }

    g.save();
    g.globalAlpha = alpha;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of routes) {
      if (r.trail.length < 2) continue;
      const pts = r.trail.map((p) => SM.toCard(f, p.lat, p.lng));
      const runs = r.excluded?.some(Boolean) ? routeRuns(pts, r.excluded) : [{ counted: true, pts }];
      const stroke = (list, under, top) => {
        pathOf(g, list);
        g.strokeStyle = under; g.lineWidth = 5; g.stroke();
        g.strokeStyle = top; g.lineWidth = 2.6; g.stroke();
      };
      if (runs.some((x) => !x.counted)) stroke(pts, ink.underFaint, ink.faint);
      for (const run of runs.filter((x) => x.counted)) stroke(run.pts, ink.under, ink.route);
      for (const pin of r.pins || []) {
        const p = SM.toCard(f, pin.lat, pin.lng);
        g.beginPath(); g.arc(p.x, p.y, 3.6, 0, Math.PI * 2); g.fillStyle = ink.pink; g.fill();
      }
    }
    g.restore();
    if (end) {
      const last = routes.at(-1).trail.at(-1);
      const p = SM.toCard(f, last.lat, last.lng);
      g.beginPath(); g.arc(p.x, p.y, 4.5, 0, Math.PI * 2); g.fillStyle = ink.end; g.fill();
    }
    // The tiles' terms require a credit on anything that shows them.
    if (drawn) {
      g.font = `400 9px system-ui, sans-serif`;
      g.textAlign = 'right';
      g.textBaseline = 'bottom';
      g.fillStyle = ink.credit;
      g.fillText('© Esri · OpenStreetMap', w - 8, height - 6);
    }
  };
  // Tiles land one by one; redraw once per frame however many arrive.
  function later() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(draw);
  }
  queueMicrotask(later);
  return el('div', { class: 'routemap' }, canvas);
}
