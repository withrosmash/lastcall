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
