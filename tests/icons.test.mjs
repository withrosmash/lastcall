// The icon script's path filler, which draws the curved Sprell wordmark into
// every launcher, splash and web icon. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToPolygons, fillCoverage, svgPolygons } from '../scripts/raster.mjs';

const area = (poly) => Math.abs(poly.reduce((a, [x, y], i) => {
  const [nx, ny] = poly[(i + 1) % poly.length];
  return a + x * ny - nx * y;
}, 0)) / 2;

test('straight commands make one closed polygon', () => {
  const polys = pathToPolygons('M0 0H10V10H0Z');
  assert.equal(polys.length, 1);
  assert.deepEqual(polys[0], [[0, 0], [10, 0], [10, 10], [0, 10]]);
});

test('relative commands and packed minus signs parse', () => {
  const polys = pathToPolygons('m10 10l5-5h5v10l-10 0z');
  assert.deepEqual(polys[0], [[10, 10], [15, 5], [20, 5], [20, 15], [10, 15]]);
});

test('curves flatten close to the true shape', () => {
  // A circle of radius 10 from four cubic curves (k = 0.5523).
  const k = 5.523;
  const d = `M10 0C10 ${k} ${k} 10 0 10C${-k} 10 -10 ${k} -10 0C-10 ${-k} ${-k} -10 0 -10C${k} -10 10 ${-k} 10 0Z`;
  const a = area(pathToPolygons(d)[0]);
  assert.ok(Math.abs(a - Math.PI * 100) / (Math.PI * 100) < 0.01, `area ${a}`);
  const q = pathToPolygons('M0 0Q5 10 10 0Z')[0];
  assert.ok(q.length >= 9, 'quadratic split into segments');
});

test('coverage is full inside, empty outside, partial on edges', () => {
  const cov = fillCoverage(pathToPolygons('M2 2H8V8H2Z'), 10, [0, 0, 10]);
  assert.equal(cov[5 * 10 + 5], 1);
  assert.equal(cov[0], 0);
  assert.equal(cov[9 * 10 + 9], 0);
  const half = fillCoverage(pathToPolygons('M0 0H5.5V10H0Z'), 10, [0, 0, 10]);
  assert.ok(Math.abs(half[5 * 10 + 5] - 0.5) < 1e-6);
});

test('a hole stays empty (nonzero winding with a reversed inner ring)', () => {
  const cov = fillCoverage(pathToPolygons('M0 0H10V10H0Z M3 3V7H7V3Z'), 10, [0, 0, 10]);
  assert.equal(cov[5 * 10 + 5], 0);
  assert.equal(cov[1 * 10 + 1], 1);
});

test('the icon word stays inside the 66dp safe zone', () => {
  const svg = readFileSync(new URL('../design/round5/icon-word-foreground.svg', import.meta.url), 'utf8');
  const pts = svgPolygons(svg).flat();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  assert.ok(Math.min(...xs) >= 21 && Math.max(...xs) <= 87, `x ${Math.min(...xs)}..${Math.max(...xs)}`);
  assert.ok(Math.min(...ys) >= 21 && Math.max(...ys) <= 87, `y ${Math.min(...ys)}..${Math.max(...ys)}`);
});

test('the icon file’s transform is applied', () => {
  const polys = svgPolygons('<svg><path d="M0 0H10V10H0Z" transform="translate(5 6) scale(0.5)"/></svg>');
  assert.deepEqual(polys[0], [[5, 6], [10, 6], [10, 11], [5, 11]]);
});
