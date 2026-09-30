// Badge rules. Every criterion is a pure function over stored data, so this
// file has no DOM and node can test it. badges.js draws the grid.

import * as S from './state.js';
import { NIGHT_BADGES } from './modes.js';

const H = 60 * 60 * 1000;

const kindCounts = (s) => {
  const m = new Map();
  for (const d of s.drinks) m.set(d.kind, (m.get(d.kind) || 0) + 1);
  return m;
};

// The longest run of drinks without a water — what the nudge fires on.
function maxRun(s) {
  const events = [
    ...s.drinks.map((d) => ({ t: d.t, drink: true })),
    ...s.waters.map((w) => ({ t: w.t, drink: false })),
  ].sort((a, b) => a.t - b.t);
  let run = 0, worst = 0;
  for (const e of events) {
    run = e.drink ? run + 1 : 0;
    worst = Math.max(worst, run);
  }
  return worst;
}

// Did the session span `hour` o'clock local time?
function crossesHour(s, hour) {
  const start = new Date(s.startedAt);
  const mark = new Date(s.startedAt);
  mark.setHours(hour, 0, 0, 0);
  if (mark <= start) mark.setDate(mark.getDate() + 1);
  return s.endedAt > mark.getTime();
}

const nudgeNeverFired = (s, prefs) => maxRun(s) < (prefs.hydrationEvery || 5);

/* Per-night checks return true for a qualifying session; aggregate checks read
   the whole list. `hidden` badges use the same machinery — they're only hidden
   in the UI until earned. */
const NIGHT_CHECKS = {
  'first-night': () => true,
  'on-the-board': (s) => s.pins.length >= 1,
  'cartographer': (s) => s.trail.length >= 2 && S.trailGaps(s).length === 0,
  'french-exit': (s) => S.elapsedMs(s) < 1.5 * H && s.drinks.length >= 3,
  'marathon': (s) => S.elapsedMs(s) > 8 * H,
  'one-and-done': (s) => s.drinks.length === 1,
  'mixologist': (s) => kindCounts(s).size >= 5,
  'brand-loyal': (s) => s.drinks.length >= 5 && kindCounts(s).size === 1,
  'pin-cushion': (s) => s.pins.length >= 5,
  'homing-pigeon': (s) => {
    if (s.trail.length < 2) return false;
    const a = s.trail[0], b = s.trail[s.trail.length - 1];
    return S.haversineM(a.lat, a.lng, b.lat, b.lng) <= 250;
  },
  'scenic-route': (s) => s.distanceM > 10_000,
  'early-doors': (s) => new Date(s.startedAt).getHours() < 17,
  'sunrise-service': (s) => crossesHour(s, 5),
  'ghost': (s) => s.drinks.length === 0 && s.waters.length === 0,
  'hydro-homie': (s) => s.drinks.length >= 3 && s.waters.length > s.drinks.length,
  'balanced-books': (s) => s.drinks.length >= 4 && s.waters.length >= s.drinks.length,
  'metronome': (s, prefs) => s.drinks.length >= 4 && nudgeNeverFired(s, prefs),
  'two-step': (s) => s.steps >= 5_000,
  'ten-k': (s) => s.steps >= 10_000,
  'dry-run': (s) => s.drinks.length === 0 && s.waters.length >= 3,
  'first-dare': (s) => (s.challenges || []).length >= 1,
  'game-on': (s) => (s.challenges || []).length >= 3,
  'no-notes': (s) => (s.challenges || []).length >= 5,
  'snack-break': (s) => (s.meals || []).length >= 3,
  'big-stomp': (s) => s.steps >= 20_000,
  // Food between midnight and 5am local time: the late-night chips.
  'late-bite': (s) => (s.meals || []).some((m) => new Date(m.t).getHours() < 5),
};

const AGGREGATE_CHECKS = {
  'cover-star': (_done, _prefs, flags) => !!flags.cardExported,
  'good-habits': (done, prefs) =>
    done.length >= 3 && done.slice(-3).every((s) => nudgeNeverFired(s, prefs)),
  'regular': (done) => {
    const nights = new Map();
    for (const s of done) {
      for (const name of new Set(s.pins.map((p) => p.name.trim().toLowerCase()))) {
        nights.set(name, (nights.get(name) || 0) + 1);
      }
    }
    return [...nights.values()].some((n) => n >= 3);
  },
  'month-in-books': (done) => {
    const months = new Map();
    for (const s of done) {
      const d = new Date(s.startedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.set(key, (months.get(key) || 0) + 1);
    }
    return [...months.values()].some((n) => n >= 4);
  },
  'fifty-stops': (done) => done.reduce((n, s) => n + s.pins.length, 0) >= 50,
  'century-club': (done) => done.reduce((n, s) => n + s.distanceM, 0) >= 100_000,
  'archivist': (done) => done.length >= 25,
  'ringleader': (done) => done.reduce((n, s) => n + (s.challenges || []).length, 0) >= 25,
  // All-time, not per adventure: 100 in one go would mean running the whole
  // challenge list twice over.
  'chaos-agent': (done) => done.reduce((n, s) => n + (s.challenges || []).length, 0) >= 100,
  'long-haul': (done) => done.reduce((n, s) => n + s.distanceM, 0) >= 50_000,
  'just-add-water': (done) => done.reduce((n, s) => n + s.waters.length, 0) >= 50,
  // Checked whenever a night ends, so it lands on the first night out after
  // the date comes round.
  'anniversary': (done) => done.length > 0 && Date.now() - done[0].startedAt >= 365 * 24 * 3600e3,
};

// Day out badges see only the Day out part of an adventure. Day Into Night
// looks at the whole adventure's parts; Explorer needs every earlier one.
const DAY_CHECKS = {
  'day-into-night': (s) => {
    const parts = S.partsOf(s);
    return parts.some((p, i) => p.mode === 'day' && parts.slice(i + 1).some((q) => q.mode === 'night'));
  },
  'tourist': (d) => d.pins.length >= 6,
  'brunch-club': (d) => d.meals.some((m) => { const h = new Date(m.t).getHours(); return h >= 6 && h < 12; }),
  'caffeine-trail': (d) => d.drinks.filter((x) => COFFEE.test(x.kind)).length >= 3,
  'sunday-best': (d) => new Date(d.startedAt).getDay() === 0,
};

// Picked from the list or typed in: anything that's plainly a coffee counts.
const COFFEE = /coffee|flat white|latte|cappuccino|americano|espresso|macchiato|mocha|cortado|piccolo/i;

const placeKey = (p) => (p.name || '').trim().toLowerCase();

// Three stops on a day out whose names were never pinned in any earlier
// adventure, whatever its mode. Oldest first, so it lands on the first one.
function explorer(done) {
  const seen = new Set();
  for (const s of done) {
    if (S.hasMode(s, 'day')) {
      const fresh = new Set(S.sliceTo(s, 'day').pins.map(placeKey).filter((k) => k && !seen.has(k)));
      if (fresh.size >= 3) return s;
    }
    for (const p of s.pins) seen.add(placeKey(p));
  }
  return null;
}

// Everything currently earnable, oldest qualifying night first so the badge
// links to the night that actually earned it.
export function evaluate({ sessions, prefs, flags = {} }) {
  const done = sessions.filter((s) => s.endedAt).sort((a, b) => a.startedAt - b.startedAt);
  const out = [];

  // Night out badges only see the Night out part of an adventure, so coffees
  // on a day out never count towards Mixologist.
  const nightDone = done.filter((s) => S.hasMode(s, 'night')).map((s) => S.sliceTo(s, 'night'));
  for (const [slug, check] of Object.entries(NIGHT_CHECKS)) {
    const pool = NIGHT_BADGES.has(slug) ? nightDone : done;
    const hit = pool.find((s) => check(s, prefs));
    if (hit) out.push({ slug, sessionId: hit.id });
  }
  for (const [slug, check] of Object.entries(AGGREGATE_CHECKS)) {
    if (check(NIGHT_BADGES.has(slug) ? nightDone : done, prefs, flags)) out.push({ slug, sessionId: null });
  }
  for (const [slug, check] of Object.entries(DAY_CHECKS)) {
    const hit = slug === 'day-into-night'
      ? done.find((s) => check(s))
      : done.find((s) => S.hasMode(s, 'day') && check(S.sliceTo(s, 'day')));
    if (hit) out.push({ slug, sessionId: hit.id });
  }
  const found = explorer(done);
  if (found) out.push({ slug: 'explorer', sessionId: found.id });
  return out;
}

