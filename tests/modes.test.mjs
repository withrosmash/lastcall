// Modes, adventure parts and per-mode drinks. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES, MODE_KEYS, COMPANY, recentFor, rememberFor } from '../js/modes.js';
import { newSession, partsOf, partAt, currentPart, switchPart, modeLine, hasMorning } from '../js/state.js';

const withParts = (parts, startedAt = 0) => ({ ...newSession(startedAt), parts });

test('a new session starts with one part', () => {
  assert.deepEqual(newSession(1000, { mode: 'day', company: 'solo' }).parts, [{ t: 1000, mode: 'day', company: 'solo' }]);
  assert.equal(newSession(1000).parts[0].mode, 'night');
  assert.equal(newSession(1000).parts[0].company, 'group');
});

test('partsOf falls back to night/group for old sessions', () => {
  const old = { startedAt: 5, drinks: [] };
  assert.deepEqual(partsOf(old), [{ t: 5, mode: 'night', company: 'group' }]);
});

test('partAt finds the part a moment belongs to', () => {
  const s = withParts([{ t: 0, mode: 'day', company: 'group' }, { t: 100, mode: 'night', company: 'group' }]);
  assert.equal(partAt(s, 50).mode, 'day');
  assert.equal(partAt(s, 100).mode, 'night');
  assert.equal(partAt(s, -1).mode, 'day');
});

test('switching to the same mode and company does nothing', () => {
  const s = newSession(0, { mode: 'day' });
  assert.equal(switchPart(s, { mode: 'day', company: 'group' }, 10), false);
  assert.equal(s.parts.length, 1);
  assert.equal(switchPart(s, { mode: 'night', company: 'group' }, 20), true);
  assert.equal(s.parts.length, 2);
  assert.equal(currentPart(s).mode, 'night');
});

test('switching an old session creates its parts first', () => {
  const old = { startedAt: 5, drinks: [] };
  assert.equal(switchPart(old, { mode: 'day', company: 'group' }, 50), true);
  assert.deepEqual(old.parts, [{ t: 5, mode: 'night', company: 'group' }, { t: 50, mode: 'day', company: 'group' }]);
});

test('modeLine lists modes in order, keeping repeats', () => {
  assert.equal(modeLine(newSession(0)), 'Night out');
  assert.equal(modeLine(withParts([{ t: 0, mode: 'day', company: 'group' }, { t: 1, mode: 'night', company: 'group' }])), 'Day out, then Night out');
  assert.equal(modeLine(withParts([
    { t: 0, mode: 'day', company: 'group' }, { t: 1, mode: 'night', company: 'group' }, { t: 2, mode: 'day', company: 'group' },
  ])), 'Day out, then Night out, then Day out');
  assert.equal(modeLine(withParts([{ t: 0, mode: 'day', company: 'group' }, { t: 1, mode: 'day', company: 'solo' }])), 'Day out');
});

test('the morning-after screen follows the last part', () => {
  assert.equal(hasMorning(newSession(0)), true);
  assert.equal(hasMorning(newSession(0, { mode: 'day' })), false);
  assert.equal(hasMorning(withParts([{ t: 0, mode: 'day', company: 'group' }, { t: 1, mode: 'night', company: 'group' }])), true);
  assert.equal(hasMorning({ startedAt: 0 }), true);
});

test('recent drinks are kept per mode', () => {
  const prefs = { recentDrinks: ['Pint'] };
  assert.deepEqual(recentFor(prefs, 'night'), ['Pint']);
  assert.deepEqual(recentFor(prefs, 'day'), []);
  rememberFor(prefs, 'day', 'Coffee');
  assert.equal(recentFor(prefs, 'day')[0], 'Coffee');
  assert.deepEqual(prefs.recentDrinks, ['Pint']);
  for (const k of ['Tea', 'Juice', 'Coffee', 'Wine']) rememberFor(prefs, 'day', k);
  assert.deepEqual(recentFor(prefs, 'day'), ['Wine', 'Coffee', 'Juice']);
  rememberFor(prefs, 'night', 'Cider');
  assert.deepEqual(prefs.recentDrinks, ['Cider', 'Pint']);
});

test('every mode is fully described', () => {
  assert.deepEqual(MODE_KEYS, ['night', 'day', 'walk', 'festival']);
  for (const k of MODE_KEYS) {
    const m = MODES[k];
    assert.ok(m.label, k);
    assert.ok(m.buttons.length, k);
    assert.ok(m.drinks.includes('Low/no'), k);
    assert.ok(typeof m.morning === 'boolean' || m.morning === 'late', k);
    assert.ok(['default', 'walk', 'festival'].includes(m.headline), k);
  }
  assert.equal(MODES.night.label, 'Night out');
  assert.equal(MODES.day.label, 'Day out');
  assert.deepEqual(MODES.day.drinks, ['Coffee', 'Tea', 'Soft drink', 'Juice', 'Pint', 'Wine', 'Low/no']);
  assert.deepEqual(MODES.walk.drinks, ['Coffee', 'Tea', 'Soft drink', 'Pint', 'Low/no']);
  assert.equal(MODES.walk.label, 'Walk');
  assert.ok(MODES.walk.buttons.includes('more') && !MODES.walk.buttons.includes('drink'));
  assert.equal(MODES.walk.morning, false);
  assert.deepEqual(COMPANY, { group: 'With friends', solo: 'On my own' });
});

test('the drink picker splits recents from the rest of the mode list', async () => {
  const { recentAndRest } = await import('../js/modes.js');
  const { top, rest } = recentAndRest(['Pint'], MODES.day.drinks);
  assert.deepEqual(top, ['Pint']);
  assert.ok(!rest.includes('Pint'));
  assert.ok(rest.includes('Coffee'));
  assert.deepEqual(recentAndRest(['Pint', 'Pint', 'Tea', 'Juice', 'Wine'], MODES.day.drinks).top, ['Pint', 'Tea', 'Juice']);
});

test('sliceTo keeps only what happened in one mode', async () => {
  const { sliceTo, hasMode } = await import('../js/state.js');
  const s = withParts([{ t: 0, mode: 'day', company: 'group' }, { t: 100, mode: 'night', company: 'group' }]);
  s.endedAt = 300;
  s.drinks = [{ t: 10, kind: 'Coffee' }, { t: 150, kind: 'Pint' }, { t: 250, kind: 'Pint' }];
  s.waters = [{ t: 50 }, { t: 200 }];
  s.meals = [{ t: 20 }];
  const night = sliceTo(s, 'night');
  assert.deepEqual(night.drinks.map((d) => d.kind), ['Pint', 'Pint']);
  assert.equal(night.waters.length, 1);
  assert.equal(night.meals.length, 0);
  assert.equal(night.startedAt, 100);
  assert.equal(night.endedAt, 300);
  const day = sliceTo(s, 'day');
  assert.deepEqual(day.drinks.map((d) => d.kind), ['Coffee']);
  assert.equal(day.startedAt, 0);
  assert.equal(day.endedAt, 100);
  assert.equal(hasMode(s, 'night'), true);
  assert.equal(hasMode(withParts([{ t: 0, mode: 'day', company: 'group' }]), 'night'), false);
});

test('sliceTo leaves an old session whole', async () => {
  const { sliceTo, hasMode } = await import('../js/state.js');
  const old = { startedAt: 5, endedAt: 50, drinks: [{ t: 6, kind: 'Pint' }], waters: [], meals: [], pins: [], challenges: [], trail: [] };
  assert.equal(hasMode(old, 'night'), true);
  const n = sliceTo(old, 'night');
  assert.equal(n.drinks.length, 1);
  assert.equal(n.startedAt, 5);
  assert.equal(n.endedAt, 50);
});

test('the Night out badge set is the agreed thirteen', async () => {
  const { NIGHT_BADGES } = await import('../js/modes.js');
  assert.deepEqual([...NIGHT_BADGES].sort(), ['balanced-books', 'brand-loyal', 'dry-run', 'early-doors', 'french-exit', 'ghost',
    'good-habits', 'hydro-homie', 'late-bite', 'metronome', 'mixologist', 'one-and-done', 'sunrise-service']);
});

test('pace reads minutes per kilometre, and waits for 200 m', async () => {
  const { pace } = await import('../js/state.js');
  assert.equal(pace(30 * 60e3, 2500), '12:00');
  assert.equal(pace(25 * 60e3 + 30e3, 2000), '12:45');
  assert.equal(pace(1000, 150), null);
  assert.equal(pace(0, 0), null);
});

test('trailDistance sums the trail', async () => {
  const { trailDistance } = await import('../js/state.js');
  // 0.009 degrees of latitude is about 1 km.
  const d = trailDistance([{ lat: 51.5, lng: -0.1, t: 0 }, { lat: 51.509, lng: -0.1, t: 1 }]);
  assert.ok(Math.abs(d - 1000) < 10, String(d));
  assert.equal(trailDistance([]), 0);
});

test('walk pace counts only the walk part', async () => {
  const { walkPace, onlyMode } = await import('../js/state.js');
  const t0 = 0, min = 60e3;
  // An hour out, then a 30-minute walk covering 2.5 km.
  const s = withParts([{ t: t0, mode: 'night', company: 'group' }, { t: t0 + 60 * min, mode: 'walk', company: 'group' }]);
  s.endedAt = t0 + 90 * min;
  s.trail = Array.from({ length: 6 }, (_, i) => ({ t: t0 + 60 * min + i * 6 * min, lat: 51.5 + i * 0.0044966, lng: -0.1 }));
  assert.equal(walkPace(s), '12:00');
  assert.equal(onlyMode(s, 'walk'), false);
  assert.equal(onlyMode(withParts([{ t: 0, mode: 'walk', company: 'solo' }]), 'walk'), true);
});

test('a mode or company this build does not know reads as Night out with friends', async () => {
  const s = withParts([{ t: 0, mode: 'moon-base', company: 'crowd' }, { t: 5, mode: 'day', company: 'solo' }]);
  assert.deepEqual(partsOf(s).map((p) => `${p.mode}/${p.company}`), ['night/group', 'day/solo']);
  assert.equal(modeLine(withParts([{ t: 0, mode: 'moon-base', company: 'group' }])), 'Night out');
  assert.equal(s.parts[0].mode, 'moon-base');
});

test('a stop saved without a position gets the next fix', async () => {
  const { addPin, addFix, placePending } = await import('../js/state.js');
  const s = newSession(0);
  addPin(s, { lat: null, lng: null, name: 'The Crown', pending: true }, 100);
  assert.equal(s.pins[0].lat, null);
  addFix(s, { lat: 51.5, lng: -0.12, t: 200 });
  placePending(s, s.trail.at(-1));
  assert.deepEqual([s.pins[0].lat, s.pins[0].lng], [51.5, -0.12]);
  addPin(s, { lat: 51.6, lng: -0.1, name: 'Placed' }, 300);
  placePending(s, { lat: 1, lng: 1, t: 400 });
  assert.equal(s.pins[1].lat, 51.6);
});

test('a stop saved with location off stays off the map', async () => {
  const { addPin, placePending } = await import('../js/state.js');
  const s = newSession(0);
  addPin(s, { lat: null, lng: null, name: 'Offline' }, 100);
  placePending(s, { lat: 1, lng: 1, t: 200 });
  assert.equal(s.pins[0].lat, null);
});

test('pace waits two minutes before it shows', async () => {
  const { pace } = await import('../js/state.js');
  assert.equal(pace(60e3, 400), null);
  assert.equal(pace(5 * 60e3, 400), '12:30');
});

test('the recap only dozes off late at night or after a long adventure', async () => {
  const { dozesOff, newSession } = await import('../js/state.js');
  const at = (iso) => new Date(iso).getTime();
  const ended = (start, end) => Object.assign(newSession(at(start)), { endedAt: at(end) });
  assert.equal(dozesOff(ended('2026-10-02T22:00', '2026-10-03T02:00')), true, 'home at 2am');
  assert.equal(dozesOff(ended('2026-10-02T14:00', '2026-10-02T15:00')), false, 'an afternoon walk');
  assert.equal(dozesOff(ended('2026-10-02T10:00', '2026-10-02T16:30')), true, 'six and a half hours out');
  assert.equal(dozesOff(ended('2026-10-02T19:00', '2026-10-02T23:30')), false, 'home before 1am');
});
