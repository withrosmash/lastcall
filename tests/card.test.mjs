// Share card sizes for the Style B avatar. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardAvatarScale, avatarCell } from '../js/card.js';

test('with no route the avatar fills the space at whole pixels, when there is room', () => {
  assert.equal(cardAvatarScale(1000), 9);
  assert.equal(cardAvatarScale(400), 4);
  assert.equal(cardAvatarScale(240), 3);
  assert.equal(cardAvatarScale(239), 0, 'too small: it stands beside the stats instead');
});

test('the photo card avatar is the same size as before, and stays whole-pixel', () => {
  assert.equal(avatarCell({ scale: 1 }), 5);
  assert.equal(avatarCell({}), 5);
  assert.equal(avatarCell({ scale: 3 }), 9);
  assert.equal(avatarCell({ scale: 0.2 }), 3);
});

test('the card’s date line is the date alone', async () => {
  const { placeLine } = await import('../js/card.js');
  const { newSession, switchPart } = await import('../js/state.js');
  const s = newSession(new Date('2026-10-02T10:00').getTime(), { mode: 'walk' });
  switchPart(s, { mode: 'festival', company: 'group' }, s.startedAt + 3600e3);
  const line = placeLine(s);
  assert.ok(!line.includes('·') && !/Walk|Festival/.test(line), line);
  assert.ok(line.includes('2'), line);
});

test('a walk’s card puts its pace next to the time out', async () => {
  const { timeCells } = await import('../js/card.js');
  const { newSession } = await import('../js/state.js');
  const walk = newSession(0, { mode: 'walk' });
  walk.trail = [{ t: 0, lat: 51.5, lng: -0.1 }, { t: 12 * 60e3, lat: 51.509, lng: -0.1 }];
  walk.endedAt = 12 * 60e3;
  const [time, pace] = timeCells(walk, 12 * 60e3);
  assert.deepEqual(time, ['Time out', '0h 12m']);
  assert.equal(pace[0], 'Pace per km');
  assert.match(pace[1], /^1[12]:\d\d$/, 'about 1 km in 12 minutes');
  const night = newSession(0, { mode: 'night' });
  night.endedAt = 3600e3;
  assert.deepEqual(timeCells(night, 3600e3), [['Time out', '1h 00m']]);
});

test('the route card map fades out level with the avatar’s head, on both sizes', async () => {
  const { routeMapBottom, AVATAR_CORNER_TOP } = await import('../js/card.js');
  for (const h of [1350, 1920]) {
    const top = AVATAR_CORNER_TOP(h), bottom = routeMapBottom(h);
    // The head is the top 46 art rows of the avatar, at 5 card pixels each.
    assert.ok(bottom > top && bottom < top + 46 * 5, `${h}: map ends at ${bottom}, avatar top ${top}`);
  }
});
