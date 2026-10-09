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

test('only measured numbers are offered', async () => {
  const { offeredNumbers } = await import('../js/card.js');
  const { newSession, summarise } = await import('../js/state.js');
  const night = Object.assign(newSession(0, { mode: 'night' }), { endedAt: 3600e3 });
  assert.deepEqual(offeredNumbers(night, summarise(night)), ['stops', 'drinks', 'water', 'food', 'time']);
  const walk = Object.assign(newSession(0, { mode: 'walk' }), { endedAt: 12 * 60e3, steps: 900 });
  walk.trail = [{ t: 0, lat: 51.5, lng: -0.1 }, { t: 12 * 60e3, lat: 51.509, lng: -0.1 }];
  assert.deepEqual(offeredNumbers(walk, summarise(walk)), ['distance', 'steps', 'stops', 'drinks', 'water', 'food', 'time', 'pace']);
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

test('hide start and end starts off, and the card trims only when it is on', async () => {
  const card = await import('../js/card.js');
  const S = await import('../js/state.js');
  const s = S.newSession(0, { mode: 'walk' });
  for (let i = 0; i <= 20; i++) S.addFix(s, { t: i * 40e3, lat: 51.5 + (i * 50) / 111195, lng: -0.1 });
  s.endedAt = 20 * 40e3;
  const ui = card.__initialStateForTest(s);
  assert.equal(ui.elements.trim.on, false);
  assert.equal(card.shownRoute(ui).trail.length, 21);
  ui.elements.trim.on = true;
  const shown = card.shownRoute(ui);
  assert.equal(shown.trail.length, 13);
  assert.equal(shown.excluded.length, 13);
});

test('hidden ends take the stops near them off the card', async () => {
  const card = await import('../js/card.js');
  const S = await import('../js/state.js');
  const s = S.newSession(0, { mode: 'walk' });
  for (let i = 0; i <= 20; i++) S.addFix(s, { t: i * 40e3, lat: 51.5 + (i * 50) / 111195, lng: -0.1 });
  s.pins = [{ t: 0, lat: 51.5, lng: -0.1, name: 'Home' }, { t: 400e3, lat: 51.5 + 500 / 111195, lng: -0.1, name: 'Pub' }];
  s.endedAt = 20 * 40e3;
  const ui = card.__initialStateForTest(s);
  ui.elements.trim.on = true;
  assert.deepEqual(card.shownRoute(ui).pins.map((p) => p.name), ['Pub']);
});

// A canvas stand-in: text is 0.55 of its font size per character wide, and
// every glyph drawn records the font it was drawn in.
function fakeG() {
  return {
    fonts: [], font: '', save() {}, restore() {}, fillText() { this.fonts.push(this.font); },
    measureText(ch) { return { width: Number(/(\d+)px/.exec(this.font)[1]) * 0.55 * ch.length }; },
  };
}

async function photoCard() {
  const card = await import('../js/card.js');
  const S = await import('../js/state.js');
  const s = S.newSession(0, { mode: 'walk' });
  for (let i = 0; i <= 20; i++) S.addFix(s, { t: i * 40e3, lat: 51.5 + (i * 50) / 111195, lng: -0.1 });
  s.steps = 1400;
  s.endedAt = 20 * 40e3;
  const ui = card.__initialStateForTest(s);
  ui.mode = 'photo';
  ui.title = 'Leaving do';
  card.__useStateForTest(ui);
  return { card, ui };
}

test('photo pieces start where the route card puts them, on both sizes', async () => {
  const { card, ui } = await photoCard();
  for (const h of [1350, 1920]) {
    const g = fakeG();
    const L = card.__routeLayoutForTest(g, 1080, h, { clock: true });
    card.__photoDefaultsForTest(g, 1080, h);
    const e = ui.elements;
    for (const key of Object.keys(L.numbers)) assert.deepEqual([e[key].x, e[key].y], [L.numbers[key].x, L.numbers[key].y], `${key} at ${h}`);
    assert.deepEqual([e.title.x, e.title.y], [L.title.x, L.title.y]);
    assert.deepEqual([e.date.x, e.date.y], [L.date.x, L.date.y]);
    assert.deepEqual([e.route.x, e.route.y, e.route.box.w, e.route.box.h], [L.region.x, L.region.y, L.region.w, L.region.h]);
    assert.deepEqual([e.avatar.x, e.avatar.y], [L.avatar.x, L.avatar.y]);
    assert.equal(card.avatarCell(e.avatar), L.avatar.cell);
  }
});

test('every photo value is the route card size', async () => {
  const { card } = await photoCard();
  for (const key of ['distance', 'steps', 'time', 'pace']) {
    const g = fakeG();
    card.__drawPieceForTest(key, g);
    assert.ok(g.fonts.some((f) => f.startsWith('700 76px')), `${key} value at 76px`);
    assert.ok(g.fonts.some((f) => f.startsWith('600 28px')), `${key} label at 28px`);
    assert.ok(!g.fonts.some((f) => /(96|52)px/.test(f)), `${key} not at the old sizes`);
  }
});

test('switching a number off closes the gap on the photo card too', async () => {
  const { card, ui } = await photoCard();
  const g = fakeG();
  card.__photoDefaultsForTest(g, 1080, 1350);
  const before = ui.elements.distance.y;
  ui.elements.time.on = false;
  ui.elements.pace.on = false;
  card.__photoDefaultsForTest(g, 1080, 1350);
  assert.ok(ui.elements.distance.y > before, 'distance drops into the empty row');
});

test('a moved piece stays put and Tidy brings it back', async () => {
  const { card, ui } = await photoCard();
  const g = fakeG();
  card.__photoDefaultsForTest(g, 1080, 1350);
  const home = { x: ui.elements.steps.x, y: ui.elements.steps.y };
  Object.assign(ui.elements.steps, { x: 500, y: 400, placed: true });
  card.__photoDefaultsForTest(g, 1080, 1350);
  assert.deepEqual([ui.elements.steps.x, ui.elements.steps.y], [500, 400]);
  card.tidyPhoto();
  card.__photoDefaultsForTest(g, 1080, 1350);
  assert.deepEqual([ui.elements.steps.x, ui.elements.steps.y], [home.x, home.y]);
});

test('the four counts share one row on the photo card, under distance and steps', async () => {
  const { card, ui } = await photoCard();
  for (const k of ['stops', 'drinks', 'water', 'food']) ui.elements[k].on = true;
  const g = fakeG();
  card.__photoDefaultsForTest(g, 1080, 1350);
  const e = ui.elements;
  assert.ok(['drinks', 'water', 'food'].every((k) => e[k].y === e.stops.y));
  assert.ok(e.stops.x < e.drinks.x && e.drinks.x < e.water.x && e.water.x < e.food.x);
  assert.equal(e.distance.y, e.steps.y);
  assert.ok(e.distance.y < e.stops.y);
});
