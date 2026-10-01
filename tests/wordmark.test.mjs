// The Leit wordmark, from Claude Design's delivery. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORDMARK, rects, wordmarkWidth, MIN_HEIGHT } from '../js/wordmark.js';

test('the paths are the delivered SVG, moved to the origin', () => {
  const svg = readFileSync(new URL('../design/round3/wordmark/leit-wordmark-mono-currentcolor.svg', import.meta.url), 'utf8');
  const delivered = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  const shift = (d) => d.replace(/([MHVL])([-\d.]+)(?:\s([-\d.]+))?/g, (_, c, a, b) => {
    if (c === 'H') return `H${+(+a - 3.75).toFixed(2)}`;
    if (c === 'V') return `V${+(+a - 4).toFixed(2)}`;
    return `${c}${+(+a - 3.75).toFixed(2)} ${+(+b - 4).toFixed(2)}`;
  });
  assert.deepEqual(WORDMARK.paths, delivered.map(shift));
  assert.equal(WORDMARK.w, 190.25);
  assert.equal(WORDMARK.h, 52);
});

test('rectangles fill the wordmark at any height', () => {
  const r = rects(52);
  assert.ok(r.length >= 4);
  const x1 = Math.max(...r.map((q) => q.x + q.w)), y1 = Math.max(...r.map((q) => q.y + q.h));
  assert.equal(Math.min(...r.map((q) => q.x)), 0);
  assert.equal(Math.min(...r.map((q) => q.y)), 0);
  assert.ok(Math.abs(x1 - 190.25) < 1e-9);
  assert.ok(Math.abs(y1 - 52) < 1e-9);
});

test('width follows height, and nothing goes below the minimum', () => {
  assert.ok(Math.abs(wordmarkWidth(30) - 109.76) < 0.01);
  assert.equal(MIN_HEIGHT, 8);
  assert.equal(wordmarkWidth(4), wordmarkWidth(8));
});

test('the halo uses the theme blur as is, in one fill', async () => {
  const { drawWordmark } = await import('../js/wordmark.js');
  globalThis.Path2D = class { constructor(d) { this.d = d; } };
  let fills = 0, blur = null;
  const g = { save() {}, restore() {}, translate() {}, scale() {}, fill() { fills++; blur = this.shadowBlur; } };
  drawWordmark(g, 0, 0, 30, { color: '#7EE0C0', shadow: { color: 'rgba(0,0,0,.5)', blur: 26 } });
  assert.equal(blur, 26);
  assert.equal(fills, 1);
});

test('the Play feature graphic is a 24-bit PNG with no alpha', () => {
  const buf = readFileSync(new URL('../design/round3/feature-graphic.png', import.meta.url));
  assert.equal(buf.readUInt32BE(16), 1024);
  assert.equal(buf.readUInt32BE(20), 500);
  assert.equal(buf[24], 8);
  assert.equal(buf[25], 2);
});

// The paths only use M, H, V, L and Z, so each subpath is a polygon.
function polygons(d) {
  const out = []; let cur = null, x = 0, y = 0;
  for (const [, c, a, b] of d.matchAll(/([MHVLZ])\s*([-\d.]+)?(?:[\s,]+([-\d.]+))?/g)) {
    if (c === 'M') { cur = []; out.push(cur); x = +a; y = +b; }
    else if (c === 'L') { x = +a; y = +b; }
    else if (c === 'H') x = +a;
    else if (c === 'V') y = +a;
    else continue;
    cur.push([x, y]);
  }
  return out;
}
const inside = (polys, px, py) => polys.reduce((hit, poly) => {
  let n = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) n++;
  }
  return hit !== (n % 2 === 1);
}, false);

test('every rectangle sits on the letters, not in the gaps between them', () => {
  const polys = WORDMARK.paths.map(polygons);
  for (const q of rects(52)) {
    const e = 0.05;
    const pts = [[q.x + e, q.y + e], [q.x + q.w - e, q.y + e], [q.x + e, q.y + q.h - e], [q.x + q.w - e, q.y + q.h - e], [q.x + q.w / 2, q.y + q.h / 2]];
    for (const [px, py] of pts) assert.ok(polys.some((p) => inside(p, px, py)), `(${px.toFixed(2)}, ${py.toFixed(2)}) is off the letters`);
  }
});

// Reads one of our own PNGs (scripts/icons.mjs writes every row with filter 0).
async function readPng(path) {
  const { inflateSync } = await import('node:zlib');
  const buf = readFileSync(new URL(path, import.meta.url));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), type = buf[25];
  const bpp = type === 6 ? 4 : 3;
  const idat = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o), tag = buf.toString('ascii', o + 4, o + 8);
    if (tag === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const px = (x, y) => { const o = y * (w * bpp + 1) + 1 + x * bpp; return [raw[o], raw[o + 1], raw[o + 2]]; };
  return { w, h, px };
}

test('the app icon is the white wordmark on forest', async () => {
  const { w, h, px } = await readPng('../design/round4/icon-1024.png');
  assert.equal(w, 1024);
  assert.equal(h, 1024);
  assert.deepEqual(px(0, 0), [0x21, 0x76, 0x4f]);
  const row = Math.round(h / 2) - 10;
  const white = [];
  for (let x = 0; x < w; x++) if (px(x, row).every((v) => v > 245)) white.push(x);
  assert.ok(white.length > 0, 'white ink across the middle');
  const span = (white.at(-1) - white[0] + 1) / w;
  assert.ok(span >= 0.5 && span <= 0.64, `wordmark spans ${span.toFixed(3)} of the icon`);
});
