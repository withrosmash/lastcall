// The small maps on the recap and History. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitFrame } from '../js/routemap.js';
import { toCard } from '../js/staticmap.js';

const box = (pts, w, h) => {
  const f = fitFrame(pts, w, h);
  return pts.map((p) => toCard(f, p.lat, p.lng));
};

test('the recap frame fits the trail inside the box', () => {
  const trail = Array.from({ length: 30 }, (_, i) => ({ lat: 51.5 + i * 0.001, lng: -0.1 + Math.sin(i) * 0.004 }));
  for (const [w, h] of [[360, 190], [400, 200], [320, 300]]) {
    for (const p of box(trail, w, h)) {
      assert.ok(p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h, `${w}x${h}: ${p.x},${p.y}`);
    }
  }
});

test('routes far apart all fit, for the History map', () => {
  const a = [{ lat: 51.5, lng: -0.1 }, { lat: 51.51, lng: -0.09 }];
  const b = [{ lat: 53.48, lng: -2.24 }, { lat: 53.49, lng: -2.23 }];
  for (const p of box([...a, ...b], 360, 200)) assert.ok(p.x >= 0 && p.x <= 360 && p.y >= 0 && p.y <= 200);
});

test('high-density screens fetch the next zoom down at half size, landing on the same spot', async () => {
  const { sharper } = await import('../js/routemap.js');
  const pts = [{ lat: 51.5, lng: -0.1 }, { lat: 51.52, lng: -0.08 }];
  const f = fitFrame(pts, 360, 200);
  const g = sharper(f);
  assert.equal(g.z, Math.min(16, f.z + 1));
  for (const p of pts) {
    const a = toCard(f, p.lat, p.lng), b = toCard(g, p.lat, p.lng);
    assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6);
  }
});

test('every map waiting on a tile hears when it lands', async () => {
  const made = [];
  globalThis.Image = class { constructor() { made.push(this); } set src(v) { this._src = v; } };
  const SM = await import('../js/staticmap.js');
  let a = 0, b = 0;
  SM.tile('https://example.test/t/1', () => a++);
  SM.tile('https://example.test/t/1', () => b++);
  made.at(-1).onload();
  assert.equal(a, 1);
  assert.equal(b, 1);
});

test('a history of 200,000 fixes still frames', () => {
  const pts = Array.from({ length: 200_000 }, (_, i) => ({ lat: 51.5 + (i % 1000) * 1e-5, lng: -0.1 + (i % 777) * 1e-5 }));
  assert.ok(Number.isFinite(fitFrame(pts, 360, 200).k));
});

test('the small maps credit OpenStreetMap contributors', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync(new URL('../js/routemap.js', import.meta.url), 'utf8'), /Map © Esri · OpenStreetMap contributors/);
});

test('the plugin’s requestPermissions is never called: it re-asks forever on a denial', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['geo.js', 'app.js', 'session.js']) {
    assert.doesNotMatch(readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8'), /BackgroundGeolocation\.requestPermissions|requestLocation\(/, f);
  }
});
