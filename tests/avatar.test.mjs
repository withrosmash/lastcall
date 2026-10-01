// Mode touches on the avatar. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, normaliseLook } from '../js/avatar.js';

const at = (px, x, y) => px[y * 32 + x];
const look = (extra) => ({ ...normaliseLook(null), ...extra });

test('festival glitter shows around glasses', () => {
  for (const glasses of ['none', 'round', 'square', 'sun']) {
    const px = build(look({ glasses, touch: 'festival' }));
    const sparkles = [[8, 24], [23, 24]].filter(([x, y]) => at(px, x, y)?.c.join() === '255,255,255');
    assert.equal(sparkles.length, 2, glasses);
  }
});

test('no touch without look.touch, and none on wardrobe tiles', () => {
  const plain = build(look({}));
  const walk = build(look({ touch: 'walk' }));
  assert.ok(walk.some((p) => p?.part === 'touch'));
  assert.ok(!plain.some((p) => p?.part === 'touch'));
  assert.ok(!build(look({ touch: 'walk' }), {}, 'tee').some((p) => p?.part === 'touch'));
});

test('dressedFor adds the mode touch, except on a night out or when turned off', async () => {
  const { dressedFor } = await import('../js/wardrobe.js');
  const look = normaliseLook(null);
  const ctx = (prefs = {}) => ({ state: { prefs } });
  assert.equal(dressedFor(ctx(), look, 'walk').touch, 'walk');
  assert.equal(dressedFor(ctx(), look, 'festival').touch, 'festival');
  assert.equal(dressedFor(ctx(), look, 'night'), look);
  assert.equal(dressedFor(ctx(), look, undefined), look);
  assert.equal(dressedFor(ctx({ modeTouches: false }), look, 'day'), look);
});
