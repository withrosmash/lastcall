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
