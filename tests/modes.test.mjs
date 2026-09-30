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
  assert.deepEqual(MODE_KEYS, ['night', 'day']);
  for (const k of MODE_KEYS) {
    const m = MODES[k];
    assert.ok(m.label, k);
    assert.ok(m.buttons.length, k);
    assert.ok(m.drinks.includes('Low/no'), k);
    assert.equal(typeof m.morning, 'boolean', k);
  }
  assert.equal(MODES.night.label, 'Night out');
  assert.equal(MODES.day.label, 'Day out');
  assert.deepEqual(MODES.day.drinks, ['Coffee', 'Tea', 'Soft drink', 'Juice', 'Pint', 'Wine', 'Low/no']);
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
