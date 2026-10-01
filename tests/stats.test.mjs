// Tester numbers. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testerStats } from '../js/stats.js';
import { newSession } from '../js/state.js';

const H = 3600e3, D = 24 * H;
const at = (iso) => new Date(iso).getTime();
const NOW = at('2026-10-01T12:00');

function adv(start, parts = [['night', 0]], extra = {}) {
  const t0 = at(start);
  const s = newSession(t0);
  s.parts = parts.map(([mode, h, company = 'group']) => ({ t: t0 + h * H, mode, company }));
  s.endedAt = t0 + 4 * H;
  return Object.assign(s, extra);
}

test('a new install shows zeros', () => {
  const st = testerStats({ sessions: [], badges: [], flags: {}, festivals: [] }, NOW);
  assert.equal(st.adventures, 0);
  assert.equal(st.avgMs, 0);
  assert.equal(st.since, null);
  assert.equal(st.cards, 0);
});

test('counts adventures, the last 30 days and weeks out', () => {
  const sessions = [
    adv('2025-12-29T19:00'), adv('2026-01-02T19:00'), adv('2026-09-05T19:00'), adv('2026-09-20T19:00'), adv('2026-09-21T19:00'),
  ];
  const running = { ...newSession(NOW - H), endedAt: null };
  const st = testerStats({ sessions: [running, ...sessions], badges: [], flags: {}, festivals: [] }, NOW);
  assert.equal(st.adventures, 5);
  assert.equal(st.last30, 3);
  // 29 Dec and 2 Jan are the same Monday week; 20 Sept (Sun) and 21 Sept (Mon) are not.
  assert.equal(st.weeks, 4);
  assert.equal(st.avgMs, 4 * H);
  assert.equal(st.since, at('2025-12-29T19:00'));
});

test('modes count every mode an adventure used; old adventures are Night out', () => {
  const old = adv('2026-09-01T19:00'); delete old.parts;
  const switched = adv('2026-09-02T12:00', [['day', 0], ['night', 5]]);
  const walk = adv('2026-09-03T09:00', [['walk', 0, 'solo']]);
  const st = testerStats({ sessions: [old, switched, walk], badges: [{ slug: 'ten-k' }], flags: {}, festivals: [{ id: 'f' }] }, NOW);
  assert.deepEqual(st.byMode, { night: 2, day: 1, walk: 1, festival: 0 });
  assert.equal(st.switched, 1);
  assert.equal(st.solo, 1);
  assert.equal(st.badges, 1);
  assert.equal(st.festivals, 1);
});

test('challenges add up, and cards fall back to the old flag', () => {
  const s = adv('2026-09-02T19:00', undefined, { challenges: [{ id: 'a' }, { id: 'b' }] });
  assert.equal(testerStats({ sessions: [s], badges: [], flags: {}, festivals: [] }, NOW).challenges, 2);
  assert.equal(testerStats({ sessions: [], badges: [], flags: { cardExported: true }, festivals: [] }, NOW).cards, 1);
  assert.equal(testerStats({ sessions: [], badges: [], flags: { cardExported: true, cardsShared: 4 }, festivals: [] }, NOW).cards, 4);
});

test('counting a card: fresh, already-shared before counting, and ongoing', async () => {
  const { countCard } = await import('../js/stats.js');
  const fresh = countCard({}, 100);
  assert.equal(fresh.cardsShared, 1);
  assert.equal(fresh.cardsSince, undefined);
  const before = countCard({ cardExported: true }, 100);
  assert.equal(before.cardsShared, 2);
  assert.equal(before.cardsSince, 100);
  assert.equal(countCard({ cardExported: true, cardsShared: 3, cardsSince: 5 }, 100).cardsShared, 4);
});

test('the 30-day window includes exactly 30 days and no more', () => {
  const edge = { ...newSession(NOW - 30 * D), endedAt: NOW - 30 * D + H };
  const past = { ...newSession(NOW - 30 * D - 60e3), endedAt: NOW - 30 * D + H };
  assert.equal(testerStats({ sessions: [edge, past], badges: [], flags: {}, festivals: [] }, NOW).last30, 1);
});
