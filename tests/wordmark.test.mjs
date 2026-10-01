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
