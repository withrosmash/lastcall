// The Sprell wordmark, from Claude Design's round 5 delivery. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORDMARK, wordmarkWidth, MIN_HEIGHT } from '../js/wordmark.js';

const delivered = readFileSync(new URL('../design/round5/sprell-white.svg', import.meta.url), 'utf8')
  .replace(/<metadata>[\s\S]*?<\/metadata>/, '');

test('the path is the delivered outline, unchanged', () => {
  const paths = [...delivered.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(WORDMARK.paths, paths);
});

test('the box is the delivered viewBox', () => {
  const [x, y, w, h] = delivered.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  assert.deepEqual([WORDMARK.x, WORDMARK.y, WORDMARK.w, WORDMARK.h], [x, y, w, h]);
});

test('width follows height, and nothing goes below the minimum', () => {
  assert.ok(Math.abs(wordmarkWidth(101.5) - 311.63) < 1e-9);
  assert.equal(wordmarkWidth(1), wordmarkWidth(MIN_HEIGHT));
});

test('drawn on a canvas, the box starts at the given point', async () => {
  const { drawWordmark } = await import('../js/wordmark.js');
  globalThis.Path2D = class { constructor(d) { this.d = d; } };
  const ops = [];
  const g = {
    save() {}, restore() {}, fill() { ops.push(['fill']); },
    translate(x, y) { ops.push(['translate', x, y]); }, scale(a, b) { ops.push(['scale', a, b]); },
  };
  drawWordmark(g, 10, 20, 101.5, { color: '#fff' });
  assert.deepEqual(ops[0], ['translate', 10, 20]);
  assert.deepEqual(ops[1], ['scale', 1, 1]);
  assert.deepEqual(ops[2], ['translate', -WORDMARK.x, -WORDMARK.y]);
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

test('the Play feature graphic has no transparency', () => {
  // JPEG: Play wants the feature graphic opaque, and the delivered PNG has alpha.
  const buf = readFileSync(new URL('../design/round5/feature-graphic-1024x500.jpg', import.meta.url));
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
});
