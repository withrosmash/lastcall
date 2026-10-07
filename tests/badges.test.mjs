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

const walk = (start, logs = {}, company = 'group') => {
  const s = adv(start, [['walk', 0]], logs);
  s.parts[0].company = company;
  return s;
};

test('Early Riser: a walk started between 4am and 8am', () => {
  assert.ok(earned([walk('2026-09-26T06:30')]).has('early-riser'));
  assert.ok(!earned([walk('2026-09-26T02:00')]).has('early-riser'));
  assert.ok(!earned([walk('2026-09-26T08:00')]).has('early-riser'));
});

test('Trailblazer: 15 km walked in the walk part', () => {
  const t0 = at('2026-09-26T10:00');
  // 0.009 degrees of latitude is about 1 km; 16 steps is about 16 km.
  const trail = Array.from({ length: 17 }, (_, i) => ({ t: t0 + i * 600e3, lat: 51.5 + i * 0.009, lng: -0.1 }));
  assert.ok(earned([walk('2026-09-26T10:00', { trail })]).has('trailblazer'));
  const switched = adv('2026-09-26T10:00', [['walk', 0], ['night', 1]], { trail });
  assert.ok(!earned([switched]).has('trailblazer'));
});

test('Tea Break: coffee or tea on a walk', () => {
  const t0 = at('2026-09-26T10:00');
  assert.ok(earned([walk('2026-09-26T10:00', { drinks: [{ t: t0 + 60e3, kind: 'Tea' }] })]).has('tea-break'));
  assert.ok(earned([walk('2026-09-26T10:00', { drinks: [{ t: t0 + 60e3, kind: 'Flat white' }] })]).has('tea-break'));
  assert.ok(!earned([walk('2026-09-26T10:00', { drinks: [{ t: t0 + 60e3, kind: 'Pint' }] })]).has('tea-break'));
});

test('Head Space: a walk on your own', () => {
  assert.ok(earned([walk('2026-09-26T10:00', {}, 'solo')]).has('head-space'));
  assert.ok(!earned([walk('2026-09-26T10:00')]).has('head-space'));
  const soloNight = adv('2026-09-26T20:00', [['night', 0]]);
  soloNight.parts[0].company = 'solo';
  assert.ok(!earned([soloNight]).has('head-space'));
});

test('Weekly Walker: walks in four weeks running, across the new year', () => {
  const weeks = ['2025-12-29T10:00', '2026-01-06T10:00', '2026-01-12T10:00', '2026-01-20T10:00'];
  assert.ok(earned(weeks.map((d) => walk(d))).has('weekly-walker'));
  const gap = ['2025-12-29T10:00', '2026-01-06T10:00', '2026-01-19T10:00', '2026-01-26T10:00'];
  assert.ok(!earned(gap.map((d) => walk(d))).has('weekly-walker'));
});

test('Out and About: ten walks', () => {
  const days = Array.from({ length: 10 }, (_, i) => walk(`2026-09-${String(i + 1).padStart(2, '0')}T10:00`));
  assert.ok(earned(days).has('out-and-about'));
  assert.ok(!earned(days.slice(1)).has('out-and-about'));
});

test('the six Walk badges are in the list', () => {
  for (const slug of ['early-riser', 'trailblazer', 'tea-break', 'head-space', 'weekly-walker', 'out-and-about']) {
    assert.equal(BADGES.find((x) => x.slug === slug)?.cat, 'Walk', slug);
  }
});

test('Early Riser: a walk home after a night out does not count', () => {
  const home = adv('2026-09-26T21:00', [['night', 0], ['walk', 7.5]]);
  assert.ok(!earned([home]).has('early-riser'));
});

const fest = (start, sets = [], logs = {}) => {
  const s = adv(start, [['festival', 0]], logs);
  s.sets = sets.map(([name, iso, lat = null, lng = null]) => ({ t: at(iso), name, lat, lng }));
  return s;
};
const earnedF = (sessions, festivals) => new Set(evaluate({ sessions, prefs: { hydrationEvery: 5 }, festivals }).map((b) => b.slug));

test('Front Row: five sets in one festival day', () => {
  const five = ['A', 'B', 'C', 'D', 'E'].map((n, i) => [n, `2026-06-26T1${i}:00`]);
  assert.ok(earned([fest('2026-06-26T09:00', five)]).has('front-row'));
  assert.ok(!earned([fest('2026-06-26T09:00', five.slice(1))]).has('front-row'));
});

test('Headliner: a set after 10pm, midnight included', () => {
  assert.ok(earned([fest('2026-06-26T12:00', [['Late', '2026-06-27T00:30']])]).has('headliner'));
  assert.ok(earned([fest('2026-06-26T12:00', [['Top', '2026-06-26T22:15']])]).has('headliner'));
  assert.ok(!earned([fest('2026-06-26T12:00', [['Nine', '2026-06-26T21:00']])]).has('headliner'));
});

test('Stage Hopper: three spots at least 200m apart; sets without GPS never count', () => {
  // 0.002 degrees of latitude is about 222 m.
  const spread = [['A', '2026-06-26T13:00', 51.150, -2.58], ['B', '2026-06-26T14:00', 51.152, -2.58], ['C', '2026-06-26T15:00', 51.154, -2.58]];
  assert.ok(earned([fest('2026-06-26T12:00', spread)]).has('stage-hopper'));
  const close = [['A', '2026-06-26T13:00', 51.150, -2.58], ['B', '2026-06-26T14:00', 51.1505, -2.58], ['C', '2026-06-26T15:00', 51.154, -2.58]];
  assert.ok(!earned([fest('2026-06-26T12:00', close)]).has('stage-hopper'));
  const blind = [['A', '2026-06-26T13:00', 51.150, -2.58], ['B', '2026-06-26T14:00', 51.154, -2.58], ['C', '2026-06-26T15:00']];
  assert.ok(!earned([fest('2026-06-26T12:00', blind)]).has('stage-hopper'));
});

test('Hydration Station: five waters in a festival day', () => {
  const waters = [1, 2, 3, 4, 5].map((h) => ({ t: at(`2026-06-26T1${h}:00`) }));
  assert.ok(earned([fest('2026-06-26T10:00', [], { waters })]).has('hydration-station'));
  assert.ok(!earned([fest('2026-06-26T10:00', [], { waters: waters.slice(1) })]).has('hydration-station'));
});

test('Discovery and Full Weekend come from festival reviews', () => {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const d1 = fest('2026-06-26T12:00', names.slice(0, 5).map((n, i) => [n, `2026-06-26T1${i + 3}:00`]));
  const d2 = fest('2026-06-27T12:00', names.slice(5).map((n, i) => [n, `2026-06-27T1${i + 3}:00`]));
  const d3 = fest('2026-06-28T12:00', [['a', '2026-06-28T13:00']]);
  const review = (ids) => [{ id: 'fv1', name: 'Test', sessionIds: ids, createdAt: 0 }];
  assert.ok(earnedF([d1, d2], review([d1.id, d2.id])).has('discovery'));
  assert.ok(!earnedF([d1, d2], review([d1.id, d2.id])).has('full-weekend'));
  assert.ok(earnedF([d1, d2, d3], review([d1.id, d2.id, d3.id])).has('full-weekend'));
  assert.ok(!earnedF([d1, d2], []).has('discovery'));
  // A deleted day doesn't count towards a festival's size.
  assert.ok(!earnedF([d1, d2], review([d1.id, d2.id, 'gone'])).has('full-weekend'));
});

test('the six Festival badges are in the list', () => {
  for (const slug of ['front-row', 'headliner', 'stage-hopper', 'hydration-station', 'discovery', 'full-weekend']) {
    assert.equal(BADGES.find((x) => x.slug === slug)?.cat, 'Festival', slug);
  }
});

test('a festival review’s own badges link to the review', () => {
  const days = ['2026-06-26', '2026-06-27', '2026-06-28'].map((d) => fest(`${d}T12:00`));
  const out = evaluate({ sessions: days, prefs: { hydrationEvery: 5 }, festivals: [{ id: 'fv1', name: 'X', sessionIds: days.map((d) => d.id), createdAt: 0 }] });
  assert.equal(out.find((b) => b.slug === 'full-weekend')?.sessionId, 'fv1');
});

test('Day Into Night needs a real day out first, not a quick correction', () => {
  assert.ok(!earned([adv('2026-09-26T19:00', [['day', 0], ['night', 0.05]])]).has('day-into-night'));
  assert.ok(earned([adv('2026-09-26T12:00', [['day', 0], ['night', 1]])]).has('day-into-night'));
});

test('Weekly Walker counts the week the walk was in', () => {
  // Mondays 7, 21 and 28 Sept, plus a Sunday 13 Sept night out that becomes a
  // walk after midnight: that walk is in Monday 14's week, so four in a row.
  const walks = [adv('2026-09-07T10:00', [['walk', 0]]), adv('2026-09-13T22:00', [['night', 0], ['walk', 3]]),
    adv('2026-09-21T10:00', [['walk', 0]]), adv('2026-09-28T10:00', [['walk', 0]])];
  assert.ok(earned(walks).has('weekly-walker'));
});

test('a malformed festival entry never breaks badges', () => {
  const s = fest('2026-06-26T12:00');
  assert.doesNotThrow(() => evaluate({ sessions: [s], prefs: {}, festivals: [{}, null, { id: 'x', sessionIds: 'nope' }] }));
});

test('Explorer links to the adventure that found the third new place', () => {
  const t1 = at('2026-09-20T10:00'), t2 = at('2026-09-26T10:00');
  const first = adv('2026-09-20T10:00', [['day', 0]], { pins: [pin(t1 + H, 'Cafe A'), pin(t1 + 2 * H, 'Park B')] });
  const second = adv('2026-09-26T10:00', [['day', 0]], { pins: ['Cafe A', 'Museum C', 'Pier D', 'Market E'].map((n, i) => pin(t2 + (i + 1) * H, n)) });
  const t3 = at('2026-09-28T10:00');
  const third = adv('2026-09-28T10:00', [['day', 0]], { pins: ['Zoo F', 'Lido G', 'Fort H'].map((n, i) => pin(t3 + (i + 1) * H, n)) });
  const got = evaluate({ sessions: [third, second, first], prefs: { hydrationEvery: 5 } }).find((b) => b.slug === 'explorer');
  assert.equal(got?.sessionId, second.id);
});

test('Explorer ignores stops made in the night part of a day out', () => {
  const t0 = at('2026-09-26T10:00');
  const s = adv('2026-09-26T10:00', [['day', 0], ['night', 6]], {
    pins: [pin(t0 + H, 'Cafe A'), pin(t0 + 7 * H, 'Bar B'), pin(t0 + 7.5 * H, 'Bar C'), pin(t0 + 7.8 * H, 'Club D')],
  });
  assert.ok(!earned([s]).has('explorer'));
});

test('no badge is named a dare', () => {
  for (const b of BADGES) assert.ok(!/dare/i.test(b.name), b.name);
  assert.equal(BADGES.find((b) => b.slug === 'first-dare').name, 'First Challenge');
});
