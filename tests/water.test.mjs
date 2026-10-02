// When water is due: drinks since the last water, or on a walk, time since it. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSession, waterDue, addWater, addDrink, switchPart } from '../js/state.js';

const M = 60e3;
const prefs = { hydrationEvery: 5, walkWaterEvery: 30 };

test('on a walk, water is due 30 minutes after the walk starts', () => {
  const s = newSession(0, { mode: 'walk' });
  assert.equal(waterDue(s, prefs, 29 * M).due, false);
  const w = waterDue(s, prefs, 31 * M);
  assert.equal(w.due, true);
  assert.equal(w.kind, 'time');
  assert.equal(w.mins, 31);
  assert.equal(w.at, 30 * M);
});

test('on a walk, a water resets the clock', () => {
  const s = newSession(0, { mode: 'walk' });
  addWater(s, 25 * M);
  assert.equal(waterDue(s, prefs, 40 * M).due, false);
  assert.equal(waterDue(s, prefs, 56 * M).due, true);
});

test('switching to a walk starts its clock at the switch', () => {
  const s = newSession(0, { mode: 'night' });
  switchPart(s, { mode: 'walk', company: 'group' }, 120 * M);
  assert.equal(waterDue(s, prefs, 140 * M).due, false);
  assert.equal(waterDue(s, prefs, 151 * M).due, true);
});

test('walk reminders can be off, and drinks never count on a walk', () => {
  const s = newSession(0, { mode: 'walk' });
  for (let i = 0; i < 8; i++) addDrink(s, 'Pint', (i + 1) * M);
  assert.equal(waterDue(s, { ...prefs, walkWaterEvery: 0 }, 90 * M).due, false);
  assert.equal(waterDue(s, prefs, 10 * M).due, false);
});

test('other kinds of adventure still count drinks', () => {
  const s = newSession(0, { mode: 'night' });
  for (let i = 0; i < 5; i++) addDrink(s, 'Pint', (i + 1) * M);
  const w = waterDue(s, prefs, 3 * 3600e3);
  assert.deepEqual([w.due, w.kind, w.since], [true, 'drinks', 5]);
  assert.equal(waterDue(s, { ...prefs, hydrationEvery: 0 }, 3 * 3600e3).due, false);
});

test('a save from before walk reminders defaults to every 30 minutes', () => {
  const s = newSession(0, { mode: 'walk' });
  assert.equal(waterDue(s, { hydrationEvery: 5 }, 31 * M).due, true);
});
