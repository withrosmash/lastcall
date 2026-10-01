// The wardrobe's unlock table (approved by the owner, 2026-10-01). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, SUNGLASSES_BADGE, fxFrame } from '../js/items-data.js';
import * as Art from '../js/avatar-art.js';
import { BADGES } from '../js/badges-data.js';

const items = ITEMS.filter((i) => i.id);
const DRINKING = ['french-exit', 'one-and-done', 'mixologist', 'brand-loyal', 'balanced-books', 'metronome'];
const IN_ART = {
  hat: Art.HATS, costume: [...Art.COSTUMES, 'elvis'], held: Art.HELD_ITEMS,
  shoes: ['trainers'], extra: ['scarf', 'backpack'], effect: Art.EFFECTS,
};

test('every item exists in the art', () => {
  for (const it of items) assert.ok(IN_ART[it.slot]?.includes(it.id), `${it.slot} ${it.id}`);
});

test('every unlocking badge exists, and none is a drinking badge', () => {
  for (const it of [...items, { id: 'sun', badge: SUNGLASSES_BADGE }]) {
    if (!it.badge) continue;
    assert.ok(BADGES.some((b) => b.slug === it.badge), `${it.id}: ${it.badge}`);
    assert.ok(!DRINKING.includes(it.badge), `${it.id} unlocks from a drinking badge`);
  }
});

test('no badge unlocks two items', () => {
  const slugs = [...items.map((i) => i.badge).filter(Boolean), SUNGLASSES_BADGE];
  assert.equal(new Set(slugs).size, slugs.length);
});

test('the table is the owner’s', () => {
  const by = (id) => items.find((i) => i.id === id);
  assert.equal(by('sunhat').badge, 'ringleader');
  assert.equal(by('explorer').badge, 'explorer');
  assert.equal(by('aura').badge, 'early-riser');
  assert.equal(by('guitar').badge, 'discovery');
  assert.equal(by('confetti').badge, 'first-night');
  for (const free of ['beanie', 'hood', 'catears', 'mug', 'book', 'scarf', 'backpack', 'sparkles']) assert.equal(by(free).badge, null, free);
  assert.equal(items.filter((i) => i.badge).length, 14 + 28, 'today’s 14 earned items plus the 28 new ones');
});

test('effects move every three ticks, and hold still when calm or reduced', () => {
  assert.deepEqual([0, 2, 3, 5, 6, 11, 12].map((t) => fxFrame(t)), [0, 0, 1, 1, 2, 3, 0]);
  assert.equal(fxFrame(7, { calm: true }), 0);
  assert.equal(fxFrame(7, { reduced: true }), 0);
});
