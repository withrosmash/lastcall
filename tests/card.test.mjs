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

test('the route card map fades out level with the avatar’s head, on both sizes', async () => {
  const { routeMapBottom, AVATAR_CORNER_TOP } = await import('../js/card.js');
  for (const h of [1350, 1920]) {
    const top = AVATAR_CORNER_TOP(h), bottom = routeMapBottom(h);
    // The head is the top 46 art rows of the avatar, at 5 card pixels each.
    assert.ok(bottom > top && bottom < top + 46 * 5, `${h}: map ends at ${bottom}, avatar top ${top}`);
  }
});

test('with the stops list on, the map stops above it, so stop names never sit on the map', async () => {
  const { routeMapEnd, routeMapBottom } = await import('../js/card.js');
  assert.equal(routeMapEnd(1350, null), routeMapBottom(1350));
  assert.equal(routeMapEnd(1350, 500), 500);
  assert.equal(routeMapEnd(1350, 1200), routeMapBottom(1350));
});

/* ---------- numbers as elements ---------- */

const keysOf = (rows) => rows.map((r) => r.map((c) => `${c.key}@${c.col}`).join(' '));

test('route card numbers stack from the bottom in their rows', async () => {
  const { numberRows } = await import('../js/card.js');
  const all = ['distance', 'steps', 'stops', 'drinks', 'water', 'food', 'time', 'pace'];
  assert.deepEqual(keysOf(numberRows(all)), ['distance@0 steps@2', 'stops@0 drinks@1 water@2 food@3', 'time@0 pace@2']);
  assert.deepEqual(keysOf(numberRows(['distance', 'steps', 'time', 'pace'])), ['distance@0 steps@2', 'time@0 pace@2'], 'the middle row closes up');
  assert.deepEqual(keysOf(numberRows(['stops', 'drinks', 'water'])), ['stops@0 drinks@1 water@2'], 'the counts become the bottom row');
  assert.deepEqual(keysOf(numberRows(['steps', 'pace'])), ['steps@0', 'pace@0'], 'each slides left');
  assert.deepEqual(numberRows([]), []);
});

test('photo card numbers stack up from the date, and switching one off closes the gap', async () => {
  const { photoStack } = await import('../js/card.js');
  const all = ['distance', 'steps', 'stops', 'drinks', 'water', 'food', 'time', 'pace', 'date'];
  const p = photoStack(all, 1350);
  assert.equal(p.date.y, 1350 - 64 - 90);
  assert.ok(p.time.y < p.date.y && p.pace.y === p.time.y && p.pace.x > p.time.x, 'time and pace side by side above the date');
  assert.ok(p.food.y < p.time.y && p.distance.y < p.food.y, 'counts above them, distance and steps on top');
  const noCounts = photoStack(['distance', 'steps', 'time', 'pace', 'date'], 1350);
  assert.equal(noCounts.time.y, p.time.y);
  assert.ok(noCounts.distance.y > p.distance.y, 'distance drops into the gap');
  const noDate = photoStack(['time', 'pace'], 1350);
  assert.ok(noDate.time.y > p.time.y, 'with no date the bottom row sits lower');
  assert.equal(photoStack(all, 1920).date.y, 1920 - 64 - 90, '9:16 builds from its own bottom');
});

test('only measured numbers are offered', async () => {
  const { offeredNumbers } = await import('../js/card.js');
  const { newSession, summarise } = await import('../js/state.js');
  const night = Object.assign(newSession(0, { mode: 'night' }), { endedAt: 3600e3 });
  assert.deepEqual(offeredNumbers(night, summarise(night)), ['stops', 'drinks', 'water', 'food', 'time']);
  const walk = Object.assign(newSession(0, { mode: 'walk' }), { endedAt: 12 * 60e3, steps: 900 });
  walk.trail = [{ t: 0, lat: 51.5, lng: -0.1 }, { t: 12 * 60e3, lat: 51.509, lng: -0.1 }];
  assert.deepEqual(offeredNumbers(walk, summarise(walk)), ['distance', 'steps', 'stops', 'drinks', 'water', 'food', 'time', 'pace']);
});

test('a resized number stays in the stack, and the stack makes room for it', async () => {
  const { photoStack } = await import('../js/card.js');
  const keys = ['drinks', 'water', 'time', 'pace', 'date'];
  const plain = photoStack(keys, 1350);
  const big = photoStack(keys, 1350, { time: 1.5, drinks: 1.4 });
  assert.ok(big.pace.x >= plain.pace.x + 200, 'pace moves right of the larger time');
  assert.equal(big.pace.y, big.time.y);
  assert.ok(big.time.y < plain.time.y, 'the taller row rises from the date');
  assert.ok(big.water.x > plain.water.x, 'water moves right of the larger drinks');
});

test('on 4:5 the route is framed above the avatar, whatever is switched off', async () => {
  const { routeRegionH, AVATAR_CORNER_TOP } = await import('../js/card.js');
  const top = 150;
  // A stack that has slid low (one row, no badges) still stops above the avatar.
  assert.ok(top + routeRegionH(1350, { top, stackTop: 1100, above: 0, title: true, route: true }) <= AVATAR_CORNER_TOP(1350) - 30);
  // With no route there's no line to clip, so the space can run on for a big avatar.
  assert.equal(routeRegionH(1350, { top, stackTop: 1100, above: 0, title: true, route: false }), 1100 - 30 - top);
  // 9:16 keeps the frame the owner signed off.
  assert.equal(routeRegionH(1920, { top, stackTop: 1400, above: 215, title: true, route: true }), 1920 - 790 - 215 - 60);
});

test('a festival day offers Acts seen, counting each act once', async () => {
  const { offeredNumbers, numberValue } = await import('../js/card.js');
  const { newSession, summarise, addSet } = await import('../js/state.js');
  const day = Object.assign(newSession(0, { mode: 'festival' }), { endedAt: 8 * 3600e3 });
  assert.ok(!offeredNumbers(day, summarise(day)).includes('acts'), 'no sets, no acts');
  addSet(day, { name: 'The Midnight Band' }, 1000);
  addSet(day, { name: 'the midnight band ' }, 2000);
  addSet(day, { name: 'Dawn Chorus' }, 3000);
  assert.ok(offeredNumbers(day, summarise(day)).includes('acts'));
  assert.equal(numberValue('acts', day, summarise(day)), '2');
});

test('a wide number always leaves a gap before the next one', async () => {
  const { rowXs } = await import('../js/card.js');
  assert.deepEqual(rowXs([200, 180], [0, 2]), [64, 364], 'room to spare: the column wins');
  assert.deepEqual(rowXs([300, 180], [0, 2]), [64, 412], '15.5 km pushes Steps along by the gap');
  assert.deepEqual(rowXs([90, 90, 90, 90], [0, 1, 2, 3]), [64, 214, 364, 514]);
});

test('the photo stack leaves a gap after a wide number too', async () => {
  const { photoStack } = await import('../js/card.js');
  const p = photoStack(['distance', 'steps', 'date'], 1350, {}, { distance: 260 });
  assert.ok(p.steps.x >= p.distance.x + 260 + 48);
});

test('every number is a photo-card piece that stacks and draws', async () => {
  const { NUMBERS, photoOrder, photoStacked } = await import('../js/card.js');
  for (const { key } of NUMBERS) {
    assert.ok(photoOrder().includes(key), `${key} draws on the photo card`);
    assert.ok(photoStacked().includes(key), `${key} stacks on the photo card`);
  }
});
