// Draws every icon and splash image the app ships, with a tiny
// self-contained PNG encoder. No ImageMagick, no rsvg, no npm image deps.
//
// The owner's choice (2026-10-08): the full white "sprell" wordmark on forest
// green #114530, drawn from Claude Design's round 5 icon files
// (design/round5/icon-word-*.svg) so every size matches the delivery. The
// status bar icon is their "s" mark: a word is unreadable at 24dp.
//
//   node scripts/icons.mjs    (rerun if the icon files or the colour change)

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgPolygons, pathToPolygons, fillCoverage } from './raster.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RES = resolve(root, 'android/app/src/main/res');
const ROUND5 = resolve(root, 'design/round5');

/* ---------- colour and shapes ---------- */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const FOREST = hex('#114530');
const WHITE = [255, 255, 255];

const wordSvg = await readFile(`${ROUND5}/icon-word-foreground.svg`, 'utf8');
const WORD = svgPolygons(wordSvg);
// Icons are drawn on the adaptive icon's 108dp canvas. A flat icon shows the
// visible 72dp middle; the adaptive foreground and maskable icon use all 108.
const VISIBLE = [18, 18, 72];
const WHOLE = [0, 0, 108];

// Coverage of a clip mask at a pixel, 4 x 4 supersampled so curved edges are smooth.
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
 * One square icon: the white word on forest (`bg`), clipped by `mask` (none,
 * circle, round), showing the `box` of the 108dp canvas. Without bg it's the
 * adaptive foreground: white on transparent.
 */
function iconPixels(P, { bg = true, mark = true, mask = 'none', box = VISIBLE } = {}) {
  const out = Buffer.alloc(P * P * 4);
  const cov = mark ? fillCoverage(WORD, P, box) : new Float32Array(P * P);
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
  const disc = iconPixels(P, { mask: 'circle' });
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
// Maskable icons can be cropped to a circle 80% across, so the word sits further in.
await square(resolve(root, 'icons/icon-512-maskable.png'), 512, { box: WHOLE });
await square(resolve(root, 'icons/apple-touch-icon.png'), 180, {});
// For the Play listing (the feature graphic is design/round5/feature-graphic-1024x500.jpg).
await png(`${ROUND5}/play-icon-512.png`, 512, 512, iconPixels(512, {}), { opaque: true });

/* ---------- Android launcher ---------- */

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(LAUNCHER)) {
  await square(`${RES}/mipmap-${density}/ic_launcher.png`, size, { mask: 'round' });
  await square(`${RES}/mipmap-${density}/ic_launcher_round.png`, size, { mask: 'circle' });
  // Adaptive layers are 108dp; the word sits where Claude Design placed it,
  // inside the 66dp circle any launcher may crop to.
  const A = Math.round(size * 2.25);
  await square(`${RES}/mipmap-${density}/ic_launcher_foreground.png`, A, { bg: false, box: WHOLE });
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

/* ---------- vectors ----------
   The status bar and themed icons are vectors of the delivered paths, placed
   with the same translate and scale the SVG files use. */

function pathTag(svg) {
  const tag = svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, '').match(/<path\b[^>]*>/)[0];
  const t = tag.match(/transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*scale\(([-\d.]+)\)"/);
  return { d: tag.match(/ d="([^"]+)"/)[1], tx: +t[1], ty: +t[2], s: +t[3] };
}
const f2 = (v) => +v.toFixed(2);

// Status bar: Android keeps only the alpha, so it's the white "s" mark,
// cropped to the letter with 15% space round it.
const mark = pathTag(await readFile(`${ROUND5}/icon-mark-monochrome.svg`, 'utf8'));
const markPts = pathToPolygons(mark.d).flat().map(([x, y]) => [mark.tx + x * mark.s, mark.ty + y * mark.s]);
const mx0 = Math.min(...markPts.map((p) => p[0])), mx1 = Math.max(...markPts.map((p) => p[0]));
const my0 = Math.min(...markPts.map((p) => p[1])), my1 = Math.max(...markPts.map((p) => p[1]));
const side = Math.max(mx1 - mx0, my1 - my0) * 1.3;
const ox = (mx0 + mx1) / 2 - side / 2, oy = (my0 + my1) / 2 - side / 2;
await writeFile(`${RES}/drawable/ic_stat_sprell.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/icons.mjs: the Sprell "s" mark, one colour. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="${f2(side)}"
    android:viewportHeight="${f2(side)}">
    <group android:translateX="${f2(mark.tx - ox)}" android:translateY="${f2(mark.ty - oy)}" android:scaleX="${mark.s}" android:scaleY="${mark.s}">
        <path android:fillColor="#FFFFFFFF" android:pathData="${mark.d}"/>
    </group>
</vector>
`);
console.log('android/app/src/main/res/drawable/ic_stat_sprell.xml  vector');

// Themed icon: Android 13 can tint launcher icons to the wallpaper using this
// one-colour layer, the word placed exactly like the foreground.
const mono = pathTag(await readFile(`${ROUND5}/icon-word-monochrome.svg`, 'utf8'));
await writeFile(`${RES}/drawable/ic_launcher_monochrome.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/icons.mjs: the themed-icon layer, the Sprell wordmark. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group android:translateX="${mono.tx}" android:translateY="${mono.ty}" android:scaleX="${mono.s}" android:scaleY="${mono.s}">
        <path android:fillColor="#FF000000" android:pathData="${mono.d}"/>
    </group>
</vector>
`);
console.log('android/app/src/main/res/drawable/ic_launcher_monochrome.xml  vector');
