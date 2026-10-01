// Festival mode: sets, the late morning-after rule, and festival reviews.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES, MODE_KEYS } from '../js/modes.js';
import { newSession, addSet, sliceTo, hasMorning, mergeSessions, festivalActs, switchPart } from '../js/state.js';
import { migrate } from '../js/storage.js';

const at = (iso) => new Date(iso).getTime();

test('Festival is the fourth mode', () => {
  assert.equal(MODE_KEYS.at(-1), 'festival');
  const f = MODES.festival;
  assert.equal(f.label, 'Festival');
  assert.deepEqual(f.drinks, ['Pint', 'Cider', 'Cocktail can', 'Spirit + mixer', 'Low/no']);
  assert.ok(f.buttons.includes('set') && !f.buttons.includes('checkin'));
});

test('a set keeps its name, time and place, or no place without GPS', () => {
  const s = newSession(0, { mode: 'festival' });
  addSet(s, { name: '  Big Act ', lat: 51.1, lng: -2.5 }, 10);
  addSet(s, { name: 'Small Act' }, 20);
  assert.deepEqual(s.sets[0], { t: 10, name: 'Big Act', lat: 51.1, lng: -2.5 });
  assert.deepEqual(s.sets[1], { t: 20, name: 'Small Act', lat: null, lng: null });
});

test('sliceTo keeps the sets', () => {
  const s = newSession(0, { mode: 'festival' });
  addSet(s, { name: 'A' }, 10);
  switchPart(s, { mode: 'night', company: 'group' }, 100);
  addSet(s, { name: 'B' }, 150);
  s.endedAt = 200;
  assert.deepEqual(sliceTo(s, 'festival').sets.map((x) => x.name), ['A']);
});

test('the morning-after screen follows a festival day only past midnight', () => {
  const day = (end) => ({ ...newSession(at('2026-06-26T12:00'), { mode: 'festival' }), endedAt: at(end) });
  assert.equal(hasMorning(day('2026-06-26T23:30')), false);
  assert.equal(hasMorning(day('2026-06-27T01:00')), true);
});

test('mergeSessions makes one read-only view of several days', () => {
  const d1 = { ...newSession(at('2026-06-26T12:00'), { mode: 'festival' }), endedAt: at('2026-06-26T23:00'), distanceM: 4000, steps: 9000 };
  const d2 = { ...newSession(at('2026-06-27T12:00'), { mode: 'festival' }), endedAt: at('2026-06-28T01:00'), distanceM: 6000, steps: 11000 };
  d1.trail = [{ t: at('2026-06-26T13:00'), lat: 51.1, lng: -2.5 }];
  d2.trail = [{ t: at('2026-06-27T13:00'), lat: 51.2, lng: -2.5 }];
  addSet(d2, { name: 'Late Act' }, at('2026-06-27T22:00'));
  addSet(d1, { name: 'Early Act' }, at('2026-06-26T15:00'));
  const m = mergeSessions([d2, d1]);
  assert.equal(m.startedAt, d1.startedAt);
  assert.equal(m.endedAt, d2.endedAt);
  assert.equal(m.distanceM, 10000);
  assert.equal(m.steps, 20000);
  assert.deepEqual(m.sets.map((x) => x.name), ['Early Act', 'Late Act']);
  assert.equal(m.trail.length, 2);
  assert.deepEqual(m.sessionIds, [d1.id, d2.id]);
  assert.equal(m.parts[0].mode, 'festival');
  assert.ok(m.id.startsWith('f'));
});

test('festivalActs lists each act once, keeping the first spelling', () => {
  const a = newSession(0, { mode: 'festival' });
  addSet(a, { name: 'The Band' }, 1);
  addSet(a, { name: 'the band ' }, 2);
  addSet(a, { name: 'Solo Artist' }, 3);
  assert.deepEqual(festivalActs([a]), ['The Band', 'Solo Artist']);
});

test('old data without festival reviews still loads', () => {
  const out = migrate({ v: 1, sessions: [], prefs: {}, badges: [], flags: {} });
  assert.deepEqual(out.festivals, []);
});

test('a festival’s time out adds up the days, not the nights between', async () => {
  const { summarise } = await import('../js/state.js');
  const H = 3600e3;
  const d1 = { ...newSession(at('2026-06-26T12:00'), { mode: 'festival' }), endedAt: at('2026-06-26T12:00') + 10 * H };
  const d2 = { ...newSession(at('2026-06-27T12:00'), { mode: 'festival' }), endedAt: at('2026-06-27T12:00') + 11 * H };
  assert.equal(summarise(mergeSessions([d1, d2])).ms, 21 * H);
});

test('a festival day that starts after midnight still gets a morning after', () => {
  const late = { ...newSession(at('2026-06-27T00:30'), { mode: 'festival' }), endedAt: at('2026-06-27T03:00') };
  assert.equal(hasMorning(late), true);
  const day = { ...newSession(at('2026-06-27T12:00'), { mode: 'festival' }), endedAt: at('2026-06-27T20:00') };
  assert.equal(hasMorning(day), false);
});

test('a festival lists its days in date order, even one saved in tap order', async () => {
  const { daysInOrder } = await import('../js/state.js');
  const sat = newSession(at('2026-07-04T12:00')), sun = newSession(at('2026-07-05T12:00')), fri = newSession(at('2026-07-03T12:00'));
  const sessions = [sat, fri, sun];
  assert.deepEqual(daysInOrder([sun.id, 'gone', fri.id, sat.id], sessions).map((s) => s.id), [fri.id, sat.id, sun.id]);
});

test('the default festival name uses the earliest day, whatever order they were picked', async () => {
  const { defaultFestivalName } = await import('../js/festival.js');
  const { shortDate } = await import('../js/ui.js');
  const sat = newSession(at('2026-07-04T12:00')), fri = newSession(at('2026-07-03T12:00'));
  assert.equal(defaultFestivalName([sat, fri]), `Festival, ${shortDate(fri.startedAt)}`);
});
