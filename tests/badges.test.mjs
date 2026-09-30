// Badge rules, run on plain session data. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../js/badge-checks.js';
import { BADGES } from '../js/badges-data.js';
import { newSession } from '../js/state.js';

const H = 3600e3;
const at = (iso) => new Date(iso).getTime();

// A finished adventure starting at `start`, with the given parts and logs.
function adv(start, parts, logs = {}) {
  const t0 = at(start);
  const s = newSession(t0);
  s.parts = parts.map(([mode, offsetH]) => ({ t: t0 + offsetH * H, mode, company: 'group' }));
  Object.assign(s, { drinks: [], waters: [], meals: [], pins: [], challenges: [], trail: [] }, logs);
  s.endedAt = t0 + 8 * H;
  return s;
}
const earned = (sessions) => new Set(evaluate({ sessions, prefs: { hydrationEvery: 5 } }).map((b) => b.slug));
const pin = (t, name) => ({ t, lat: 51.5, lng: -0.1, name });

test('Day Into Night: a day out that becomes a night out, not the reverse', () => {
  assert.ok(earned([adv('2026-09-26T12:00', [['day', 0], ['night', 6]])]).has('day-into-night'));
  assert.ok(!earned([adv('2026-09-26T12:00', [['night', 0], ['day', 6]])]).has('day-into-night'));
});

test('Tourist: six stops while on a day out', () => {
  const t0 = at('2026-09-26T10:00');
  const six = Array.from({ length: 6 }, (_, i) => pin(t0 + (i + 1) * 60e3, `Stop ${i}`));
  assert.ok(earned([adv('2026-09-26T10:00', [['day', 0]], { pins: six })]).has('tourist'));
  const fivePlusOne = [...six.slice(0, 5), pin(t0 + 7 * H, 'Late bar')];
  assert.ok(!earned([adv('2026-09-26T10:00', [['day', 0], ['night', 6]], { pins: fivePlusOne })]).has('tourist'));
});

test('Explorer: three places never pinned before', () => {
  const t0 = at('2026-09-26T10:00');
  const three = ['Museum', 'Market', 'Park'].map((n, i) => pin(t0 + (i + 1) * 60e3, n));
  assert.ok(earned([adv('2026-09-26T10:00', [['day', 0]], { pins: three })]).has('explorer'));
  const before = adv('2026-09-20T20:00', [['night', 0]], { pins: [pin(at('2026-09-20T21:00'), 'Museum'), pin(at('2026-09-20T22:00'), ' market ')] });
  assert.ok(!earned([before, adv('2026-09-26T10:00', [['day', 0]], { pins: three })]).has('explorer'));
});

test('Brunch Club: food between 6am and midday on a day out', () => {
  const meal = (iso, mode = 'day') => earned([adv('2026-09-26T05:00', [[mode, 0]], { meals: [{ t: at(iso) }] })]).has('brunch-club');
  assert.ok(meal('2026-09-26T06:00'));
  assert.ok(meal('2026-09-26T11:59'));
  assert.ok(!meal('2026-09-26T12:00'));
  assert.ok(!meal('2026-09-26T05:30'));
  assert.ok(!meal('2026-09-26T10:30', 'night'));
  const lateDay = adv('2026-09-26T20:00', [['day', 0]], { meals: [{ t: at('2026-09-27T00:30') }] });
  assert.ok(!earned([lateDay]).has('brunch-club'));
});

test('Caffeine Trail: three coffees on a day out', () => {
  const t0 = at('2026-09-26T09:00');
  const drink = (kind, i) => ({ t: t0 + i * H, kind });
  assert.ok(earned([adv('2026-09-26T09:00', [['day', 0]], { drinks: [0, 1, 2].map((i) => drink('Coffee', i)) })]).has('caffeine-trail'));
  assert.ok(!earned([adv('2026-09-26T09:00', [['day', 0]], { drinks: [drink('Coffee', 0), drink('Coffee', 1), drink('Tea', 2)] })]).has('caffeine-trail'));
  const typed = [drink('Flat white', 0), drink('oat latte', 1), drink('Espresso', 2)];
  assert.ok(earned([adv('2026-09-26T09:00', [['day', 0]], { drinks: typed })]).has('caffeine-trail'));
});

test('Sunday Best: a day out on a Sunday', () => {
  assert.ok(earned([adv('2026-09-27T11:00', [['day', 0]])]).has('sunday-best'));
  assert.ok(!earned([adv('2026-09-26T11:00', [['day', 0]])]).has('sunday-best'));
});

test('coffees on a day out never earn Night out badges; old nights still do', () => {
  const t0 = at('2026-09-26T19:00');
  const five = (kind) => [0, 1, 2, 3, 4].map((i) => ({ t: t0 + i * 600e3, kind }));
  assert.ok(!earned([adv('2026-09-26T19:00', [['day', 0]], { drinks: five('Coffee') })]).has('brand-loyal'));
  const old = adv('2026-09-26T19:00', [['night', 0]], { drinks: five('Pint') });
  delete old.parts;
  assert.ok(earned([old]).has('brand-loyal'));
});

test('the six Day out badges are in the list, and First Night is First Adventure', () => {
  for (const slug of ['day-into-night', 'tourist', 'explorer', 'brunch-club', 'caffeine-trail', 'sunday-best']) {
    const b = BADGES.find((x) => x.slug === slug);
    assert.ok(b, slug);
    assert.equal(b.cat, 'Day out', slug);
  }
  assert.equal(BADGES.find((b) => b.slug === 'first-night').name, 'First Adventure');
});
