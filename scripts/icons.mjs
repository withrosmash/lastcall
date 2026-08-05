// Draws every icon the app needs from one vector definition, with a tiny
// self-contained PNG encoder. No ImageMagick, no rsvg, no npm image deps —
// none of which are installed, and all of which would be a build dependency
// for four small files.

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BG = [0x00, 0x00, 0x00];
const MINT = [0x7e, 0xe0, 0xc0];
const PINK = [0xf0, 0x6c, 0x9b];
const WHITE = [0xff, 0xff, 0xff];

// The route mark: a climbing polyline, mint start, pink finish.
const PTS = [[0.02, 0.90], [0.24, 0.55], [0.46, 0.66], [0.68, 0.24], [0.98, 0.36]];

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const L = vx * vx + vy * vy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L));
  return Math.hypot(ax + t * vx - px, ay + t * vy - py);
}

// Supersampled coverage render, then box-filtered down for clean edges.
function render(size, inset, { transparent = false, mono = null, ss = 4 } = {}) {
  const S = size * ss;
  const m = S * inset;
  const box = S - m * 2;
  const pts = PTS.map(([x, y]) => [m + x * box, m + y * box]);
  const stroke = (S * 0.085) / 2;
  const rStart = S * 0.062;
  const rEnd = S * 0.075;

  const acc = new Float64Array(size * size * 4);

  for (let sy = 0; sy < S; sy++) {
    for (let sx = 0; sx < S; sx++) {
      const px = sx + 0.5, py = sy + 0.5;
      let col = transparent ? null : BG;
      let alpha = transparent ? 0 : 255;

      for (let i = 0; i < pts.length - 1; i++) {
        if (segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= stroke) {
          col = mono || MINT; alpha = 255; break;
        }
      }
      if (Math.hypot(px - pts[0][0], py - pts[0][1]) <= rStart) { col = mono || MINT; alpha = 255; }
      if (Math.hypot(px - pts.at(-1)[0], py - pts.at(-1)[1]) <= rEnd) { col = mono || PINK; alpha = 255; }

      const idx = ((sy / ss) | 0) * size + ((sx / ss) | 0);
      acc[idx * 4] += col ? col[0] : 0;
      acc[idx * 4 + 1] += col ? col[1] : 0;
      acc[idx * 4 + 2] += col ? col[2] : 0;
      acc[idx * 4 + 3] += alpha;
    }
  }

  const n = ss * ss;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter type
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[p++] = Math.round(acc[i] / n);
      raw[p++] = Math.round(acc[i + 1] / n);
      raw[p++] = Math.round(acc[i + 2] / n);
      raw[p++] = Math.round(acc[i + 3] / n);
    }
  }
  return raw;
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
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

async function png(path, size, inset, opts) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const buf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size, inset, opts), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  console.log(`${path.replace(root + '/', '')}  ${size}x${size}  ${buf.length}b`);
}

/* ---- PWA / web ---- */
await png(resolve(root, 'icons/icon-192.png'), 192, 0.19);
await png(resolve(root, 'icons/icon-512.png'), 512, 0.19);
await png(resolve(root, 'icons/icon-512-maskable.png'), 512, 0.30); // 40% safe zone
await png(resolve(root, 'icons/apple-touch-icon.png'), 180, 0.19);

/* ---- Android launcher ---- */
const RES = resolve(root, 'android/app/src/main/res');
const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(LAUNCHER)) {
  await png(`${RES}/mipmap-${density}/ic_launcher.png`, size, 0.19);
  await png(`${RES}/mipmap-${density}/ic_launcher_round.png`, size, 0.19);
  // Adaptive foreground is cropped to a 66% safe zone, so it sits further in.
  await png(`${RES}/mipmap-${density}/ic_launcher_foreground.png`, Math.round(size * 2), 0.34, { transparent: true });
}

/* ---- Notification small icon ----
   Android silhouettes these: only the alpha channel survives, so it must be
   flat white on transparent or it renders as a grey blob. */
const STATUS = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [density, size] of Object.entries(STATUS)) {
  await png(`${RES}/drawable-${density}/ic_stat_lastcall.png`, size, 0.16, { transparent: true, mono: WHITE });
}
