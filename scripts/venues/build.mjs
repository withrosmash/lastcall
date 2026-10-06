// Builds Leit's venue squares from OpenStreetMap.
//
//   node scripts/venues/build.mjs <in.geojsonseq> <outDir> [--source=<ISO date>]
//
// The input is what `osmium export -f geojsonseq` writes for the places
// `osmium tags-filter` kept (see .github/workflows/venues.yml). The output is
// static files for GitHub Pages:
//   v1/index.json      { v, built, source, count, squares: [keys], cover: [4-char prefixes] }
//   v1/sq/<key>.json   [[name, lat, lng, kind], ...]
//   LICENSE.md         ODbL attribution
// A square is a geohash prefix of 4 to 7 characters that splits into its 32
// children while it holds more than 300 places, so busy streets get small
// squares and the countryside big ones, and every file stays small.

import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kindOf, geohash, fold } from '../../js/venues.js';
import { haversineM } from '../../js/state.js';

const round5 = (n) => Math.round(n * 1e5) / 1e5;

function boxCentre(coords) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    } else c.forEach(walk);
  };
  walk(coords);
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

/** One GeoJSON feature as [name, lat, lng, kind], or null if it isn't a venue. */
export function venueFromFeature(feature) {
  const tags = feature?.properties || {};
  const name = typeof tags.name === 'string' ? tags.name.trim() : '';
  const kind = kindOf(tags);
  const coords = feature?.geometry?.coordinates;
  if (!name || !kind || !coords) return null;
  const [lat, lng] = boxCentre(coords);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [name, round5(lat), round5(lng), kind];
}

/** The same name within 50 m is one place: a pub is often mapped twice. */
export function dedupe(venues) {
  const kept = [];
  const near = new Map(); // folded name + ~110 m cell -> kept records
  const cell = (lat, lng) => `${Math.floor(lat * 1000)}:${Math.floor(lng * 1000)}`;
  for (const v of venues) {
    const name = fold(v[0]);
    const ci = Math.floor(v[1] * 1000), cj = Math.floor(v[2] * 1000);
    let dup = false;
    for (let a = ci - 1; a <= ci + 1 && !dup; a++) {
      for (let b = cj - 1; b <= cj + 1 && !dup; b++) {
        for (const k of near.get(`${name}|${a}:${b}`) || []) {
          if (haversineM(v[1], v[2], k[1], k[2]) <= 50) { dup = true; break; }
        }
      }
    }
    if (dup) continue;
    kept.push(v);
    const key = `${name}|${cell(v[1], v[2])}`;
    if (!near.has(key)) near.set(key, []);
    near.get(key).push(v);
  }
  return kept;
}

/** Adaptive squares: split while a square holds more than `cap`. */
export function splitSquares(venues, { cap = 300, min = 4, max = 7 } = {}) {
  const out = new Map();
  const hashed = venues.map((v) => [geohash(v[1], v[2], max), v]);
  const split = (key, items) => {
    if (items.length <= cap || key.length >= max) { out.set(key, items.map(([, v]) => v)); return; }
    const kids = new Map();
    for (const it of items) {
      const k = it[0].slice(0, key.length + 1);
      if (!kids.has(k)) kids.set(k, []);
      kids.get(k).push(it);
    }
    for (const [k, list] of kids) split(k, list);
  };
  const top = new Map();
  for (const it of hashed) {
    const k = it[0].slice(0, min);
    if (!top.has(k)) top.set(k, []);
    top.get(k).push(it);
  }
  for (const [k, list] of top) split(k, list);
  return out;
}

const LICENSE = `# Leit venue squares

Places from OpenStreetMap. © OpenStreetMap contributors.

This data is made available under the Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/

It is a derived database built weekly from the Geofabrik extract of
OpenStreetMap. The source is https://www.openstreetmap.org/copyright.
`;

export async function main(argv) {
  const [input, outDir] = argv.filter((a) => !a.startsWith('--'));
  const source = argv.find((a) => a.startsWith('--source='))?.slice(9) || null;
  if (!input || !outDir) throw new Error('usage: build.mjs <in.geojsonseq> <outDir> [--source=<date>]');

  const venues = [];
  let lines = 0;
  const rl = createInterface({ input: createReadStream(input, 'utf8'), crlfDelay: Infinity });
  for await (const raw of rl) {
    const line = raw.replace(/^\x1e/, '').trim();
    if (!line) continue;
    lines++;
    const v = venueFromFeature(JSON.parse(line));
    if (v) venues.push(v);
  }
  const unique = dedupe(venues);
  const squares = splitSquares(unique);

  await rm(join(outDir, 'v1'), { recursive: true, force: true });
  await mkdir(join(outDir, 'v1', 'sq'), { recursive: true });
  let bytes = 0, largest = ['', 0];
  for (const [key, list] of squares) {
    const body = JSON.stringify(list);
    const size = Buffer.byteLength(body);
    bytes += size;
    if (size > largest[1]) largest = [key, size];
    await writeFile(join(outDir, 'v1', 'sq', `${key}.json`), body);
  }
  const keys = [...squares.keys()].sort();
  // The areas the build covers, so the app can tell an empty park (no
  // square, nothing nearby) from abroad (ask Overpass).
  const cover = [...new Set(keys.map((k) => k.slice(0, 4)))];
  const index = { v: 1, built: new Date().toISOString(), source, count: unique.length, squares: keys, cover };
  await writeFile(join(outDir, 'v1', 'index.json'), JSON.stringify(index));
  await writeFile(join(outDir, 'LICENSE.md'), LICENSE);

  console.log(`features read: ${lines}`);
  console.log(`places: ${venues.length}, after duplicates: ${unique.length}`);
  console.log(`squares: ${keys.length}, total ${(bytes / 1e6).toFixed(2)} MB, largest ${largest[0]} ${(largest[1] / 1e3).toFixed(1)} KB`);
  console.log(`index: ${(Buffer.byteLength(JSON.stringify(index)) / 1e3).toFixed(1)} KB`);
  return index;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
}
