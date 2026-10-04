// Draws every icon and splash image the app ships, with a tiny
// self-contained PNG encoder. No ImageMagick, no rsvg, no npm image deps.
//
// The owner's choice (2026-10-01): the white Leit wordmark on forest green,
// darkened to #114530 on 2026-10-03. The wordmark is all right angles, so it
// fills as rectangles, supersampled at the edges. The status bar icon stays
// the avatar's mono face: a wordmark is unreadable at 24dp.
//
//   node scripts/icons.mjs    (rerun if the wordmark or the colour changes)

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rects as wordmarkRects, wordmarkWidth, WORDMARK } from '../js/wordmark.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RES = resolve(root, 'android/app/src/main/res');

/* ---------- colour ---------- */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const FOREST = hex('#114530');
const WHITE = [255, 255, 255];
const STOPS = [[0, hex('#35A26F')], [0.45, hex('#17553B')], [1, hex('#061710')]];

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

/** The wordmark's coverage over a W x H area, `width` px wide, centred. */
function markCoverage(W, H, width) {
  const cov = new Float32Array(W * H);
  const height = (width * WORDMARK.h) / WORDMARK.w;
  const x0 = (W - width) / 2, y0 = (H - height) / 2;
  for (const r of wordmarkRects(height)) {
    const ax = x0 + r.x, ay = y0 + r.y, bx = ax + r.w, by = ay + r.h;
    for (let y = Math.floor(ay); y < Math.ceil(by); y++) for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
      const c = Math.max(0, Math.min(x + 1, bx) - Math.max(x, ax)) * Math.max(0, Math.min(y + 1, by) - Math.max(y, ay));
      cov[y * W + x] = Math.min(1, cov[y * W + x] + c);
    }
  }
  return cov;
}

/**
 * One square icon: the wordmark `width` of the way across, white, on forest
 * (`bg`), clipped by `mask` (none, circle, round). Without bg it's the
 * adaptive foreground: white on transparent.
 */
function iconPixels(P, { bg = true, mark = true, mask = 'none', width = 0.48 } = {}) {
  const out = Buffer.alloc(P * P * 4);
  const cov = mark ? markCoverage(P, P, P * width) : new Float32Array(P * P);
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const k = (y * P + x) * 4, m = cov[y * P + x], clip = coverage(mask, P, x, y);
    const c = bg ? lerp(FOREST, WHITE, m) : WHITE;
    const a = bg ? clip : m * clip;
    out[k] = Math.round(c[0]); out[k + 1] = Math.round(c[1]); out[k + 2] = Math.round(c[2]);
    out[k + 3] = Math.round(255 * a);
  }
  return out;
}

// Splash: black ground, the icon as a disc in the middle.
function splashPixels(w, h) {
  const out = Buffer.alloc(w * h * 4);
  const P = Math.round(Math.min(w, h) / 2);
  const disc = iconPixels(P, { mask: 'circle', width: 0.44 });
  const x0 = Math.round((w - P) / 2), y0 = Math.round((h - P) / 2);
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

// `opaque` writes 24-bit RGB with no alpha, which Google Play asks for.
async function png(path, w, h, rgba, { opaque = false } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = opaque ? 2 : 6; // 8-bit RGB or RGBA
  const bpp = opaque ? 3 : 4;
  const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4, o = y * (w * bpp + 1) + 1 + x * bpp;
    raw[o] = rgba[k]; raw[o + 1] = rgba[k + 1]; raw[o + 2] = rgba[k + 2];
    if (!opaque) raw[o + 3] = rgba[k + 3];
  }
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
// Maskable icons can be cropped to a circle 80% across, so the wordmark sits further in.
await square(resolve(root, 'icons/icon-512-maskable.png'), 512, { width: 0.4 });
await square(resolve(root, 'icons/apple-touch-icon.png'), 180, {});
// For the Play listing.
await png(resolve(root, 'design/round4/icon-1024.png'), 1024, 1024, iconPixels(1024, {}), { opaque: true });

/* ---------- store images ----------
   With the wordmark as the icon, the lockup is the wordmark on its own. */

function paintMark(out, W, H, width) {
  const cov = markCoverage(W, H, width);
  for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(out[i * 4 + c] * (1 - cov[i]) + 255 * cov[i]);
}

// Lockup: the white wordmark on black.
function lockup(W, H) {
  const out = Buffer.alloc(W * H * 4);
  for (let k = 3; k < out.length; k += 4) out[k] = 255;
  paintMark(out, W, H, wordmarkWidth(H * 0.4));
  return out;
}

// Google Play's feature graphic: the forest bloom from the top, then the
// wordmark. No tagline: there's no font renderer here, and Play lays its own
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
  paintMark(out, W, H, wordmarkWidth(H * 0.28));
  return out;
}

await png(resolve(root, 'design/round3/store-lockup.png'), 1024, 300, lockup(1024, 300));
await png(resolve(root, 'design/round3/feature-graphic.png'), 1024, 500, featureGraphic(1024, 500), { opaque: true });

/* ---------- Android launcher ---------- */

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(LAUNCHER)) {
  await square(`${RES}/mipmap-${density}/ic_launcher.png`, size, { mask: 'round' });
  await square(`${RES}/mipmap-${density}/ic_launcher_round.png`, size, { mask: 'circle', width: 0.44 });
  // Adaptive layers are 108dp and launchers may crop to a 66dp circle, so
  // the wordmark is 44% of the layer, well inside that circle (owner, 2026-10-04).
  const A = Math.round(size * 2.25);
  await square(`${RES}/mipmap-${density}/ic_launcher_foreground.png`, A, { bg: false, width: 0.44 });
  await square(`${RES}/mipmap-${density}/ic_launcher_background.png`, A, { mark: false });
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
   layer: the wordmark, 44% across the 108dp canvas like the foreground. */

const mw = 108 * 0.44, mh = (mw * WORDMARK.h) / WORDMARK.w;
const f2 = (v) => +v.toFixed(2);
const m = wordmarkRects(mh).map((r) => `M${f2((108 - mw) / 2 + r.x)},${f2((108 - mh) / 2 + r.y)}h${f2(r.w)}v${f2(r.h)}h${f2(-r.w)}z`).join('');
await writeFile(`${RES}/drawable/ic_launcher_monochrome.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/icons.mjs: the themed-icon layer, the Leit wordmark. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#FF000000" android:pathData="${m}"/>
</vector>
`);
console.log('android/app/src/main/res/drawable/ic_launcher_monochrome.xml  vector');
