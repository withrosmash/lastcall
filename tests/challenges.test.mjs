// Challenges fit the mode and company you're in. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, poolFor } from '../js/challenges-data.js';

const ALL = ['night', 'day', 'walk', 'festival'];
const ids = (list) => list.map((c) => c.id);

test('50 challenges, each tagged', () => {
  assert.equal(CHALLENGES.length, 50);
  assert.equal(new Set(ids(CHALLENGES)).size, 50);
  for (const c of CHALLENGES) {
    assert.ok(c.modes.length && c.modes.every((m) => ALL.includes(m)), c.id);
    assert.equal(typeof c.group, 'boolean', c.id);
    assert.ok(!/\bdares?\b|—|–/i.test(c.text), c.id);
  }
});

test('a day out on your own still has plenty to do', () => {
  const pool = poolFor(CHALLENGES, { mode: 'day', company: 'solo' }, new Set());
  assert.ok(pool.length >= 10, `only ${pool.length}`);
  assert.ok(pool.every((c) => !c.group));
});

test('a night out with friends keeps the venue challenges', () => {
  const pool = ids(poolFor(CHALLENGES, { mode: 'night', company: 'group' }, new Set()));
  assert.ok(pool.includes('plan-heist'));
  assert.ok(!pool.includes('five-birds'));
});

test('a walk on your own has no seat swaps', () => {
  const pool = ids(poolFor(CHALLENGES, { mode: 'walk', company: 'solo' }, new Set()));
  assert.ok(!pool.includes('seat-swap'));
  assert.ok(pool.includes('five-hellos'));
});

test('once every fitting challenge is done, the pool starts again', () => {
  const part = { mode: 'day', company: 'solo' };
  const fits = poolFor(CHALLENGES, part, new Set());
  assert.deepEqual(ids(poolFor(CHALLENGES, part, new Set(ids(fits)))), ids(fits));
  const done = new Set(ids(fits).slice(1));
  assert.deepEqual(ids(poolFor(CHALLENGES, part, done)), [fits[0].id]);
});

test('a mode with nothing tagged falls back to everything', () => {
  assert.equal(poolFor(CHALLENGES, { mode: 'moon-base', company: 'group' }, new Set()).length, 50);
});

test('Another never shows the same challenge twice in a row', async () => {
  const { pickFrom } = await import('../js/challenges-data.js');
  const pool = poolFor(CHALLENGES, { mode: 'night', company: 'solo' }, new Set());
  for (const c of pool) {
    for (let i = 0; i < 50; i++) assert.notEqual(pickFrom(pool, c.id).id, c.id);
  }
  const one = pool.slice(0, 1);
  assert.equal(pickFrom(one, one[0].id).id, one[0].id);
});

test('a night out on your own has at least ten', () => {
  const pool = poolFor(CHALLENGES, { mode: 'night', company: 'solo' }, new Set());
  assert.ok(pool.length >= 10, `only ${pool.length}`);
});
