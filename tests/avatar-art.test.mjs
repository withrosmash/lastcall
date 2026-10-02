// Style B art from Claude Design round 4, as a module. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/avatar-art.js';

test('the art imports in node and builds the default look', () => {
  const b = A.build({});
  assert.equal(A.W, 64);
  assert.equal(A.H, 80);
  assert.equal(b.layers.head.length, 64 * 80);
  assert.ok(A.compose(b).some(Boolean));
});

test('every catalogue list matches the hand-back', () => {
  assert.equal(A.HAIRS.length, 15);
  assert.equal(A.TOPS.length, 7);
  assert.deepEqual(A.GLASSES, ['none', 'round', 'square', 'browline', 'sun', 'aviator']);
  assert.equal(A.HATS.length, 13);
  assert.deepEqual(A.COSTUMES, ['duck', 'dino', 'panda', 'teddy', 'astronaut', 'wizard', 'superhero', 'pirate', 'chef', 'explorer']);
  assert.equal(A.EFFECTS.length, 9);
  assert.equal(A.EYES.length, 19);
  for (const id of ['mug', 'cup', 'pin', 'guitar', 'rod']) assert.ok(A.HELD_ITEMS.includes(id), id);
});

test('near-black colours lighten instead of darkening', () => {
  const base = [17, 17, 17];
  const shade = A.TONE.shade(base);
  assert.ok(shade[0] > base[0]);
});

test('the walker is 16 x 22 with four frames', () => {
  assert.equal(A.MW, 16);
  assert.equal(A.MH, 22);
  const frames = [0, 1, 2, 3].map((f) => A.mini({}, f));
  frames.forEach((f) => assert.equal(f.length, 16 * 22));
  assert.notDeepEqual(JSON.stringify(frames[0]), JSON.stringify(frames[1]));
});

test('a costume and an effect build without touching the page', () => {
  const b = A.build({ costume: 'wizard', effect: 'confetti', fxFrame: 2, held: 'guitar' });
  assert.ok(b.layers.hat && b.layers.fx);
});

test('trousers stop at a flat hem, with the top of the shoe showing (owner’s tweak, option A)', () => {
  const b = A.build({ top: 'hoodie' });
  const rowsOf = (layer, slot) => b.layers[layer].map((p, i) => (p && p.s === slot ? (i / A.W) | 0 : -1)).filter((y) => y >= 0);
  const hem = Math.max(...rowsOf('body', 'B'));
  const shoe = Math.max(...rowsOf('footL', 'F'));
  assert.ok(shoe - hem >= 3, `trousers end at row ${hem}, shoes at ${shoe}`);
  // Flat: the bottom row of each leg is as wide as the row above it.
  const width = (y) => b.layers.body.filter((p, i) => p && p.s === 'B' && ((i / A.W) | 0) === y).length;
  assert.equal(width(hem), width(hem - 1));
});
