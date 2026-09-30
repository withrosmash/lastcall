// Mode glows. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bloomCss, cardBloom, NIGHT_GLOW } from '../js/glow.js';
import { MODES, MODE_KEYS } from '../js/modes.js';

const norm = (s) => s.replace(/\s/g, '').replace(/(^|[^0-9])\.(\d)/g, '$10.$2').replace(/(\d\.\d)0\b/g, '$1');
const token = (file, name) => readFileSync(new URL(`../css/tokens/${file}`, import.meta.url), 'utf8').match(new RegExp(`--${name}:(.*?);`))[1];

test('Night out keeps today’s glow exactly', () => {
  assert.equal(norm(bloomCss(NIGHT_GLOW, 'dark').hero), norm(token('colors-round2.css', 'bloom-hero')));
  assert.equal(norm(bloomCss(NIGHT_GLOW, 'dark').foot), norm(token('colors-round2.css', 'bloom-foot')));
  assert.equal(norm(bloomCss(NIGHT_GLOW, 'light').hero), norm(token('colors-light.css', 'bloom-hero')));
  assert.equal(norm(bloomCss(NIGHT_GLOW, 'light').foot), norm(token('colors-light.css', 'bloom-foot')));
});

test('every mode has a glow, and light mode uses its light colour', () => {
  for (const k of MODE_KEYS) {
    const g = MODES[k].glow;
    assert.equal(g.dark.length, 4, k);
    assert.equal(g.light.length, 3, k);
    assert.ok(bloomCss(g, 'light').hero.includes(`rgba(${g.light.join(',')}`), k);
    assert.ok(!bloomCss(g, 'light').hero.includes(`rgba(${g.dark[1].join(',')}`), k);
  }
  assert.deepEqual(MODES.day.glow.light, [190, 120, 0]);
  assert.deepEqual(MODES.walk.glow.light, [0, 120, 128]);
  assert.deepEqual(MODES.festival.glow.light, [110, 50, 200]);
});

test('the card glow has three stops', () => {
  assert.equal(cardBloom(MODES.walk.glow, 'dark').length, 3);
  assert.deepEqual(cardBloom(NIGHT_GLOW, 'dark'), ['rgba(33,118,79,0.42)', 'rgba(10,36,25,0.22)', 'rgba(0,0,0,0)']);
  assert.deepEqual(cardBloom(NIGHT_GLOW, 'light'), ['rgba(0,71,171,0.26)', 'rgba(0,71,171,0.1)', 'rgba(0,71,171,0)']);
});
