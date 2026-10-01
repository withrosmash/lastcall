// Draws every icon and splash image the app ships, from the avatar engine
// itself, with a tiny self-contained PNG encoder. No ImageMagick, no rsvg, no
// npm image deps.
//
// Round 2, direction A (design/round2/designs/Extras, 8d): the default
// avatar's face, happy, on the forest bloom. The launcher and the system
// splash can't show the user's own avatar (Android reads them from fixed files
// before any app code runs), so they use this default face and the app's
// first frame hands over to the user's own avatar (js/app.js, handoff).
//
//   node scripts/icons.mjs    (rerun if the avatar's default look changes)

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, toFrame, normaliseLook, DEFAULT_LOOK } from '../js/avatar.js';
import { rects as wordmarkRects, wordmarkWidth } from '../js/wordmark.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RES = resolve(root, 'android/app/src/main/res');

/* ---------- the face ---------- */

const LOOK = normaliseLook({ ...DEFAULT_LOOK, glasses: 'none' });
const FACE = build(LOOK, toFrame({ eyes: 'happy', mouth: 'cat', blush: 2 }, { still: false }));
// The head. The design's crop ran one row lower, which caught the top of the
// shoulders as stray blocks under the chin.
const CROP = [2, 3, 28, 26];
const cellAt = (x, y) => FACE[y * 32 + x];

/* ---------- colour ---------- */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const STOPS = [[0, hex('#35A26F')], [0.45, hex('#17553B')], [1, hex('#061710')]];

// The forest bloom: a radial glow from near the top, as in the design.
function bloom(P, x, y) {
  const d = Math.hypot(x + 0.5 - P / 2, y + 0.5 - P * 0.15) / (P * 0.95);
  const t = Math.min(1, d);
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) return lerp(STOPS[i - 1][1], STOPS[i][1], (t - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]));
  }
  return STOPS[STOPS.length - 1][1];
}

// Coverage of a mask at a pixel, 4 x 4 supersampled so curved edges are smooth.
function coverage(mask, P, x, y) {
  if (mask === 'none') return 1;
  let n = 0;
  for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
    const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4;
    if (mask === 'circle') { if (Math.hypot(px - P / 2, py - P / 2) <= P / 2) n++; continue; }
    // rounded square, corner radius 30%
    const r = P * 0.3;
    const cx = Math.min(Math.max(px, r), P - r), cy = Math.min(Math.max(py, r), P - r);
    if (Math.hypot(px - cx, py - cy) <= r) n++;
  }
  return n / 16;
}

/**
 * One square image. `face` places the head at whole-pixel scale `s`, centred;
 * `bg` paints the bloom; `mask` clips it (none, circle, round).
 */
function iconPixels(P, { bg = true, face = true, mask = 'none', s = null } = {}) {
  const out = Buffer.alloc(P * P * 4);
  const scale = s ?? Math.max(1, Math.floor((P * 0.66) / CROP[2]));
  const ox = Math.round((P - CROP[2] * scale) / 2), oy = Math.round((P - CROP[3] * scale) / 2);
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    let c = null, a = 0;
    if (bg) { c = bloom(P, x, y); a = 1; }
    if (face) {
      const gx = Math.floor((x - ox) / scale), gy = Math.floor((y - oy) / scale);
      if (x >= ox && y >= oy && gx < CROP[2] && gy < CROP[3]) {
        const p = cellAt(gx + CROP[0], gy + CROP[1]);
        if (p) { c = p.c; a = 1; }
      }
    }
    const k = (y * P + x) * 4;
    if (!c) continue;
    const cov = coverage(mask, P, x, y);
    out[k] = Math.round(c[0]); out[k + 1] = Math.round(c[1]); out[k + 2] = Math.round(c[2]);
    out[k + 3] = Math.round(255 * a * cov);
  }
  return out;
}

// Splash: black ground, the icon as a disc in the middle, 160dp across.
function splashPixels(w, h) {
  const out = Buffer.alloc(w * h * 4);
  const D = Math.min(w, h) / 2;
  const disc = iconPixels(Math.round(D), { mask: 'circle' });
  const P = Math.round(D), x0 = Math.round((w - P) / 2), y0 = Math.round((h - P) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4;
    out[k + 3] = 255;
    const ix = x - x0, iy = y - y0;
    if (ix < 0 || iy < 0 || ix >= P || iy >= P) continue;
    const j = (iy * P + ix) * 4, a = disc[j + 3] / 255;
    out[k] = Math.round(disc[j] * a); out[k + 1] = Math.round(disc[j + 1] * a); out[k + 2] = Math.round(disc[j + 2] * a);
  }
  return out;
}

/* ---------- PNG ---------- */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(tag, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(tag, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

async function png(path, w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const buf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  console.log(`${path.replace(root + '/', '')}  ${w}x${h}  ${buf.length}b`);
}
const square = (path, P, opts) => png(path, P, P, iconPixels(P, opts));

/* ---------- web ---------- */

await square(resolve(root, 'icons/icon-192.png'), 192, {});
await square(resolve(root, 'icons/icon-512.png'), 512, {});
// Maskable icons can be cropped to a circle 80% across, so the face sits further in.
await square(resolve(root, 'icons/icon-512-maskable.png'), 512, { s: Math.floor((512 * 0.5) / 28) });
await square(resolve(root, 'icons/apple-touch-icon.png'), 180, {});
// For the Play listing later.
await square(resolve(root, 'design/round2/icon-1024.png'), 1024, {});

/* ---------- store images ----------
   The Leit wordmark beside the icon. The wordmark is all right angles, so it
   fills as rectangles, supersampled at the edges. */

function paintWordmark(out, W, x0, y0, height, rgb) {
  for (const r of wordmarkRects(height)) {
    const ax = x0 + r.x, ay = y0 + r.y, bx = ax + r.w, by = ay + r.h;
    for (let y = Math.floor(ay); y < Math.ceil(by); y++) for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
      const cov = Math.max(0, Math.min(x + 1, bx) - Math.max(x, ax)) * Math.max(0, Math.min(y + 1, by) - Math.max(y, ay));
      const k = (y * W + x) * 4;
      for (let i = 0; i < 3; i++) out[k + i] = Math.round(out[k + i] * (1 - cov) + rgb[i] * cov);
    }
  }
}

function paintIcon(out, W, x0, y0, P) {
  const icon = iconPixels(P, { mask: 'round' });
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const j = (y * P + x) * 4, a = icon[j + 3] / 255, k = ((y0 + y) * W + x0 + x) * 4;
    for (let i = 0; i < 3; i++) out[k + i] = Math.round(out[k + i] * (1 - a) + icon[j + i] * a);
  }
}

// Lockup: icon and wordmark on black, one cap height of clear space between.
function lockup(W, H) {
  const out = Buffer.alloc(W * H * 4);
  for (let k = 3; k < out.length; k += 4) out[k] = 255;
  const P = Math.round(H * 0.72), cap = Math.round(P * 0.42);
  const total = P + cap + wordmarkWidth(cap);
  const x0 = Math.round((W - total) / 2), y0 = Math.round((H - P) / 2);
  paintIcon(out, W, x0, y0, P);
  paintWordmark(out, W, x0 + P + cap, Math.round((H - cap) / 2), cap, [255, 255, 255]);
  return out;
}

// Google Play's feature graphic: the forest bloom from the top, then the
// lockup. No tagline: there's no font renderer here, and Play lays its own
// text over the listing anyway.
function featureGraphic(W, H) {
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - W / 2) / W, (y + 0.5) / H * 0.9) / 0.95;
    const t = Math.min(1, d);
    let c = STOPS[STOPS.length - 1][1];
    for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { c = lerp(STOPS[i - 1][1], STOPS[i][1], (t - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])); break; }
    const k = (y * W + x) * 4;
    out[k] = Math.round(c[0]); out[k + 1] = Math.round(c[1]); out[k + 2] = Math.round(c[2]); out[k + 3] = 255;
  }
  const P = 220, cap = 92;
  const total = P + cap + wordmarkWidth(cap);
  const x0 = Math.round((W - total) / 2), y0 = Math.round((H - P) / 2);
  paintIcon(out, W, x0, y0, P);
  paintWordmark(out, W, x0 + P + cap, Math.round((H - cap) / 2), cap, [255, 255, 255]);
  return out;
}

await png(resolve(root, 'design/round3/store-lockup.png'), 1024, 300, lockup(1024, 300));
await png(resolve(root, 'design/round3/feature-graphic.png'), 1024, 500, featureGraphic(1024, 500));

/* ---------- Android launcher ---------- */

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(LAUNCHER)) {
  await square(`${RES}/mipmap-${density}/ic_launcher.png`, size, { mask: 'round' });
  await square(`${RES}/mipmap-${density}/ic_launcher_round.png`, size, { mask: 'circle' });
  // Adaptive layers are 108dp; the launcher shows the middle 72dp, so the
  // face is sized to that.
  const A = Math.round(size * 2.25);
  await square(`${RES}/mipmap-${density}/ic_launcher_foreground.png`, A, { bg: false, s: Math.max(1, Math.floor((A * 0.62) / 28)) });
  await square(`${RES}/mipmap-${density}/ic_launcher_background.png`, A, { face: false });
}

/* ---------- splash ---------- */

const SPLASH = {
  'drawable': [480, 320],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
};
for (const [dir, [w, h]] of Object.entries(SPLASH)) await png(`${RES}/${dir}/splash.png`, w, h, splashPixels(w, h));

/* ---------- notification icon ----------
   Android keeps only the alpha of a status bar icon, so it's a flat white
   12 x 12 pixel face (the design's mono face), as a vector so every density
   gets the same crisp pixels. */

const MONO = ['....HHHH....', '..HHHHHHHH..', '.HHHHHHHHHH.', '.HHHHHHHHHH.', '.HH.HHHH.HH.', '.HH.HHHH.HH.',
  '.HHHHHHHHHH.', '.HHHH..HHHH.', '..HHHHHHHH..', '...HHHHHH...', '............', '............'];
let d = '';
MONO.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') d += `M${x},${y + 1}h1v1h-1z`; }));
const vector = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/icons.mjs: the avatar's face, one colour, 12 x 12. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="12"
    android:viewportHeight="12">
    <path android:fillColor="#FFFFFFFF" android:pathData="${d}"/>
</vector>
`;
await writeFile(`${RES}/drawable/ic_stat_lastcall.xml`, vector);
console.log('android/app/src/main/res/drawable/ic_stat_lastcall.xml  vector');
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const old = `${RES}/drawable-${density}/ic_stat_lastcall.png`;
  if (existsSync(old)) await rm(old);
}

/* ---------- themed icon ----------
   Android 13 can tint launcher icons to the wallpaper; it uses this one-colour
   layer. The same 12 x 12 face, 4dp to a pixel, centred in the 108dp canvas. */

let m = '';
MONO.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') m += `M${30 + x * 4},${28 + y * 4}h4v4h-4z`; }));
await writeFile(`${RES}/drawable/ic_launcher_monochrome.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/icons.mjs: the themed-icon layer. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#FF000000" android:pathData="${m}"/>
</vector>
`);
console.log('android/app/src/main/res/drawable/ic_launcher_monochrome.xml  vector');
