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

test('9:16 keeps its route frame whatever is stacked; 4:5 zooms out no further than four rows', async () => {
  const { routeFrameH, routeRegionH } = await import('../js/card.js');
  const top = 150, three = 1920 - 64 - 240 - 260; // 9:16, the top of three number rows
  const story = (stackTop, above) => routeFrameH(1920, { top, stackTop, above, title: true, route: true, bottom: 1920 - 64 - 240 });
  assert.equal(story(three, 0), story(three - 215, 215), 'badges don’t change the 9:16 frame');
  assert.equal(story(three, 0), story(three - 400, 400), 'nor do stop names');
  const feed = (stackTop, above) => routeFrameH(1350, { top, stackTop, above, title: true, route: true, bottom: 1350 - 64 - 240 });
  const fourRows = feed(1350 - 64 - 240 - 260 - 215, 215);
  assert.equal(feed(1350 - 64 - 240 - 260 - 215 - 180, 395), fourRows, 'five rows: no further out than four');
  assert.ok(feed(1350 - 64 - 240 - 130, 0) > fourRows, 'two rows: zooms in');
});

test('badges fill the rows they are given; past that the last spot counts the rest', async () => {
  const { badgeGrid } = await import('../js/card.js');
  assert.deepEqual(badgeGrid(9, 1), { shown: 3, more: 6, rows: 1 });
  assert.deepEqual(badgeGrid(4, 1), { shown: 4, more: 0, rows: 1 });
  assert.deepEqual(badgeGrid(9, 3), { shown: 9, more: 0, rows: 3 });
  assert.deepEqual(badgeGrid(17, 4), { shown: 15, more: 2, rows: 4 });
});

test('on a 4:5 route card the badges get the rows the others leave', async () => {
  const { badgeRowsFor } = await import('../js/card.js');
  assert.deepEqual([4, 3, 2, 1, 0].map((other) => badgeRowsFor(1350, other)), [1, 1, 2, 3, 4]);
  assert.equal(badgeRowsFor(1920, 3), 2, '9:16 keeps up to eight');
});

test('up to eight badges show in rows of four; past that the eighth spot counts the rest', async () => {
  const { badgeGrid } = await import('../js/card.js');
  assert.deepEqual(badgeGrid(3), { shown: 3, more: 0, rows: 1 });
  assert.deepEqual(badgeGrid(4), { shown: 4, more: 0, rows: 1 });
  assert.deepEqual(badgeGrid(5), { shown: 5, more: 0, rows: 2 });
  assert.deepEqual(badgeGrid(8), { shown: 8, more: 0, rows: 2 });
  assert.deepEqual(badgeGrid(9), { shown: 7, more: 2, rows: 2 });
  assert.deepEqual(badgeGrid(0), { shown: 0, more: 0, rows: 0 });
});

test('badge rows are only as tall as their own labels need', async () => {
  const { badgeRowsLayout } = await import('../js/card.js');
  const oneLine = 24, twoLines = 46;
  assert.deepEqual(badgeRowsLayout([oneLine], 120), { tops: [0], h: 120 + 12 + oneLine });
  const two = badgeRowsLayout([oneLine, twoLines], 120);
  assert.equal(two.tops[1], 120 + 12 + oneLine + 14, 'the second row starts just below the first row’s labels');
  assert.equal(two.h, two.tops[1] + 120 + 12 + twoLines);
  assert.ok(badgeRowsLayout([oneLine, oneLine, oneLine], 120).tops[2] < 2 * 190, 'tighter than the old fixed rows');
});

test('with no route the space keeps clear of everything stacked below it, for the big avatar', async () => {
  const { routeFrameH, routeRegionH } = await import('../js/card.js');
  for (const h of [1350, 1920]) {
    const args = { top: 150, stackTop: h === 1350 ? 287 : 719, above: 400, title: true, route: false, bottom: h - 64 - 240 };
    assert.equal(routeFrameH(h, args), routeRegionH(h, args), `${h}: no fixed frame without a route`);
  }
});

test('the four counts share one row on the photo card, under distance and steps', async () => {
  const { photoStack } = await import('../js/card.js');
  const p = photoStack(['distance', 'steps', 'stops', 'drinks', 'water', 'food', 'time', 'pace', 'date'], 1350);
  assert.ok(['drinks', 'water', 'food'].every((k) => p[k].y === p.stops.y), 'stops, drinks, water and food on one row');
  assert.ok(p.stops.x < p.drinks.x && p.drinks.x < p.water.x && p.water.x < p.food.x);
  // Spaced like the route card's counts, so the row stays clear of the avatar.
  assert.equal(p.drinks.x - p.stops.x, 150);
  assert.ok(p.food.x <= 64 + 3 * 150, `food at ${p.food.x}`);
  assert.equal(p.distance.y, p.steps.y);
  assert.ok(p.distance.y < p.stops.y, 'distance and steps on their own row above');
});

test('drinks, stops, water and food start switched off', async () => {
  const { OFF_BY_DEFAULT } = await import('../js/card.js');
  assert.deepEqual([...OFF_BY_DEFAULT].sort(), ['drinks', 'food', 'stops', 'water']);
});

test('the wordmark is bottom right on every card, clear of the avatar, level with the date', async () => {
  const { wordmarkSpot, AVATAR_CORNER_TOP, routeDateY } = await import('../js/card.js');
  const { WORDMARK } = await import('../js/wordmark.js');
  for (const h of [1350, 1920]) {
    const spot = wordmarkSpot(1080, h);
    assert.equal(spot.x, 1080 - 64);
    assert.equal(spot.align, 'right');
    const avatarFeet = AVATAR_CORNER_TOP(h) + 80 * 5;
    assert.ok(avatarFeet <= spot.y - 40, `avatar feet ${avatarFeet} clear of the wordmark at ${spot.y}`);
    const markBaseline = spot.y + (-WORDMARK.y / WORDMARK.h) * spot.height;
    const dateBaseline = routeDateY(h) + 0.77 * 30;
    assert.ok(Math.abs(markBaseline - dateBaseline) <= 3, `baselines ${markBaseline} and ${dateBaseline}`);
  }
});

test('route runs split where counting changes, sharing their joins', async () => {
  const { routeRuns } = await import('../js/card.js');
  const p = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));
  const runs = routeRuns(p, [false, false, true, true, false]);
  assert.deepEqual(runs.map((r) => r.counted), [true, false, true]);
  assert.deepEqual(runs.map((r) => r.pts.map((q) => q.x)), [[0, 1], [1, 2, 3], [3, 4]]);
});

test('with nothing left out the route is one counted run', async () => {
  const { routeRuns } = await import('../js/card.js');
  const p = [0, 1, 2].map((x) => ({ x, y: 0 }));
  assert.deepEqual(routeRuns(p, [false, false, false]).map((r) => [r.counted, r.pts.length]), [[true, 3]]);
  assert.deepEqual(routeRuns(p, undefined).map((r) => [r.counted, r.pts.length]), [[true, 3]]);
});
