// What a route counts: gaps, transport on a walk, and the distance and pace
// that follow from them. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/state.js';

const M = 60e3;
const DEG = 111195; // metres per degree of latitude

// Walks north from the trail's last fix: n fixes, stepM metres and stepS seconds apart.
function go(s, n, stepM, stepS) {
  const last = s.trail.at(-1) || { t: s.startedAt, lat: 51.5, lng: -0.1 };
  if (!s.trail.length) S.addFix(s, last);
  for (let i = 1; i <= n; i++) S.addFix(s, { t: last.t + i * stepS * 1000, lat: last.lat + (i * stepM) / DEG, lng: last.lng });
}
const jump = (s, metres, ms) => {
  const last = s.trail.at(-1);
  S.addFix(s, { t: last.t + ms, lat: last.lat + metres / DEG, lng: last.lng });
};
const walk1k = (s) => go(s, 36, 27.78, 20); // 5 km/h
const train5k = (s) => go(s, 15, 333.3, 20); // 60 km/h

test('a long stay indoors is not a gap', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s);
  jump(s, 40, 180 * M);
  walk1k(s);
  assert.deepEqual(S.trailGaps(s), []);
});

test('a jump far away is a gap', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s);
  jump(s, 3000, 30 * M);
  walk1k(s);
  assert.equal(S.trailGaps(s).length, 1);
});

test('a walk at 5 km/h has no rides', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s);
  assert.ok(S.rideSegments(s.trail).every((r) => !r));
});

test('a train at 60 km/h is a ride', () => {
  const s = S.newSession(0, { mode: 'walk' });
  train5k(s);
  assert.ok(S.rideSegments(s.trail).slice(1).every(Boolean));
});

test('one GPS jump is not a ride', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s);
  const last = s.trail.at(-1);
  S.addFix(s, { t: last.t + 20e3, lat: last.lat + 27.78 / DEG, lng: last.lng + 80 / (DEG * Math.cos(51.5 * Math.PI / 180)) });
  S.addFix(s, { t: last.t + 40e3, lat: last.lat + 55.56 / DEG, lng: last.lng });
  walk1k(s);
  assert.ok(S.rideSegments(s.trail).every((r) => !r));
});

test('walk distance leaves the train out', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s); train5k(s); walk1k(s);
  s.endedAt = s.trail.at(-1).t;
  assert.ok(s.distanceM > 6900);
  assert.ok(Math.abs(S.countedDistance(s) - 2000) < 120, `counted ${S.countedDistance(s)}`);
  assert.equal(S.summarise(s).distanceM, S.countedDistance(s));
  assert.equal(S.summarise(s).rawDistanceM, s.distanceM);
});

test('a jump across a gap does not count on a walk', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s); jump(s, 3000, 30 * M); walk1k(s);
  s.endedAt = s.trail.at(-1).t;
  assert.ok(Math.abs(S.countedDistance(s) - 2000) < 120);
});

test('a night out counts the train', () => {
  const s = S.newSession(0, { mode: 'night' });
  walk1k(s); train5k(s); walk1k(s);
  s.endedAt = s.trail.at(-1).t;
  assert.equal(S.countedDistance(s), s.distanceM);
  assert.ok(S.excludedSegments(s).every((x) => !x));
});

test('mixed: only the walk span is trimmed', () => {
  const s = S.newSession(0, { mode: 'night' });
  walk1k(s); train5k(s);
  s.parts.push({ t: s.trail.at(-1).t + 1, mode: 'walk', company: 'group' });
  walk1k(s); train5k(s); walk1k(s);
  s.endedAt = s.trail.at(-1).t;
  const counted = S.countedDistance(s);
  assert.ok(Math.abs(counted - (s.distanceM - 5000)) < 150, `counted ${counted} of ${s.distanceM}`);
});

test('walk pace leaves out train time', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s); train5k(s); walk1k(s);
  s.endedAt = s.trail.at(-1).t;
  assert.match(S.walkPace(s, s.endedAt), /^1[12]:\d\d$/);
});

test('a walk with no transport keeps its distance and pace exactly', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s); walk1k(s);
  s.endedAt = s.trail.at(-1).t;
  assert.equal(S.countedDistance(s), s.distanceM);
  assert.equal(S.walkPace(s, s.endedAt), S.pace(s.endedAt - s.startedAt, s.distanceM));
});

test('the counted distance follows a growing trail', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s);
  const before = S.countedDistance(s);
  walk1k(s);
  assert.ok(S.countedDistance(s) > before + 900);
});

test('trimEnds drops 200 m at each end', () => {
  const s = S.newSession(0, { mode: 'walk' });
  go(s, 20, 50, 40); // 1 km, 21 fixes
  const kept = S.trimEnds(s.trail);
  const d = (a, b) => S.haversineM(a.lat, a.lng, b.lat, b.lng);
  assert.ok(Math.abs(d(s.trail[0], kept[0]) - 200) < 1);
  assert.ok(Math.abs(d(s.trail.at(-1), kept.at(-1)) - 200) < 1);
  assert.equal(kept.length, 13);
});

test('a short route trims to nothing', () => {
  const s = S.newSession(0, { mode: 'walk' });
  go(s, 6, 50, 40); // 300 m
  assert.deepEqual(S.trimEnds(s.trail), []);
});

test('a route that starts and ends at home still loses both ends', () => {
  const s = S.newSession(0, { mode: 'walk' });
  go(s, 20, 50, 40);
  go(s, 20, -50, 40);
  const kept = S.trimEnds(s.trail);
  const home = s.trail[0];
  assert.ok(kept.length > 2);
  assert.ok(kept.every((p) => S.haversineM(home.lat, home.lng, p.lat, p.lng) >= 199));
});

test('the History map shows only routes from the chosen period', () => {
  const now = Date.UTC(2026, 9, 9);
  const at = (daysAgo, withRoute) => {
    const s = S.newSession(now - daysAgo * 86400e3);
    if (withRoute) { S.addFix(s, { t: s.startedAt, lat: 51.5, lng: -0.1 }); S.addFix(s, { t: s.startedAt + 120e3, lat: 51.51, lng: -0.1 }); }
    s.endedAt = s.startedAt + 3600e3;
    return s;
  };
  const recent = at(10, true), noRoute = at(12, false), old = at(200, true), open = S.newSession(now);
  const all = [recent, noRoute, old, open];
  assert.deepEqual(S.routesInRange(all, '8w', now), [recent]);
  assert.deepEqual(S.routesInRange(all, 'all', now), [recent, old]);
});

test('walk pace after a gap at the pub still reads the walk home', () => {
  const s = S.newSession(0, { mode: 'night' });
  walk1k(s);
  const leave = s.trail.at(-1).t + 120 * M;
  s.parts.push({ t: leave, mode: 'walk', company: 'group' });
  jump(s, 300, 120 * M + 30e3);
  go(s, 75, 27.78, 20); // 25 minutes at 5 km/h
  s.endedAt = s.trail.at(-1).t;
  assert.match(S.walkPace(s, s.endedAt) || 'null', /^1[1-3]:\d\d$/);
});

test('walk distance for a badge leaves the train out', () => {
  const s = S.newSession(0, { mode: 'walk' });
  walk1k(s); walk1k(s); walk1k(s);
  go(s, 60, 333.3, 20); // 20 km of train
  s.endedAt = s.trail.at(-1).t;
  assert.ok(S.trailDistance(s.trail) > 15_000);
  assert.ok(S.walkDistance(s) < 4_000, `walk ${S.walkDistance(s)}`);
});

test('all the time is optional: it never counts as missing', () => {
  const all = { fineLocation: true, backgroundLocation: false, activity: true, notifications: true, battery: true };
  assert.deepEqual(S.missingPermissions(all), []);
  assert.deepEqual(S.missingPermissions({ ...all, activity: false }), ['activity']);
});
