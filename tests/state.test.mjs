// Auto-close, reopening, notification taps and stop positions. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/state.js';

const H = 3600e3, M = 60e3;

test('lastActivity counts sets, meals, challenges and mode switches', () => {
  const s = S.newSession(0, { mode: 'festival' });
  s.sets = [{ t: 5 * H, name: 'Act' }];
  s.meals = [{ t: 6 * H, kind: 'Food' }];
  assert.equal(S.lastActivity(s), 6 * H);
  s.challenges = [{ t: 7 * H, text: 'x' }];
  assert.equal(S.lastActivity(s), 7 * H);
  s.parts.push({ t: 8 * H, mode: 'night', company: 'group' });
  assert.equal(S.lastActivity(s), 8 * H);
});

test('lastActivity counts the last time the app saved the adventure', () => {
  const s = S.newSession(0);
  s.touchedAt = 9 * H;
  assert.equal(S.lastActivity(s), 9 * H);
});

test('a festival day with location off is not closed at its start', () => {
  const s = S.newSession(0, { mode: 'festival' });
  s.sets = [{ t: 5 * H, name: 'Act' }];
  assert.equal(S.isStale(s, 15 * H), false);
  assert.equal(S.isStale(s, 20 * H), true);
});

test('notification taps only count inside the adventure', () => {
  const s = S.newSession(10 * H);
  const events = [{ type: 'drink', t: 9 * H }, { type: 'drink', t: 11 * H }, { type: 'water', t: 12 * H }];
  assert.deepEqual(S.eventsFor(s, events).map((e) => e.t), [11 * H, 12 * H]);
  s.endedAt = 11.5 * H;
  assert.deepEqual(S.eventsFor(s, events).map((e) => e.t), [11 * H]);
});

test('an auto-closed adventure can be carried on', () => {
  const s = S.newSession(0);
  s.endedAt = 2 * H; s.autoClosed = true;
  const state = { active: null, sessions: [s] };
  assert.equal(S.reopen(state, s), true);
  assert.equal(state.active, s);
  assert.equal(state.sessions.length, 0);
  assert.equal(s.endedAt, null);
  assert.equal(s.autoClosed, undefined);
});

test('carrying on is refused while another adventure is live', () => {
  const s = S.newSession(0); s.endedAt = 2 * H; s.autoClosed = true;
  const state = { active: S.newSession(3 * H), sessions: [s] };
  assert.equal(S.reopen(state, s), false);
  assert.equal(state.sessions.length, 1);
});

test('only an auto-closed adventure can be carried on', () => {
  const s = S.newSession(0); s.endedAt = 2 * H;
  assert.equal(S.reopen({ active: null, sessions: [s] }, s), false);
});

test('stored positions are rounded to about a metre', () => {
  const s = S.newSession(0);
  S.addFix(s, { lat: 51.512345678, lng: -0.131487654, t: 1000 });
  assert.equal(s.trail[0].lat, 51.51235);
  assert.equal(s.trail[0].lng, -0.13149);
});
