// Pure session model. No DOM, no storage — everything here is a plain
// transform so the same code can be reasoned about and tested in isolation.

import { MODES, COMPANY } from './modes.js';

export const TRAIL_MIN_M = 25;
export const TRAIL_MIN_MS = 60_000;
export const AUTO_END_MS = 14 * 60 * 60 * 1000;

export function newSession(now = Date.now(), { mode = 'night', company = 'group' } = {}) {
  return {
    id: 's' + now.toString(36),
    startedAt: now,
    endedAt: null,
    parts: [{ t: now, mode, company }],
    drinks: [],
    waters: [],
    meals: [],
    challenges: [],
    pins: [],
    trail: [],
    steps: 0,
    distanceM: 0,
    place: null,
  };
}

/* ---------- modes ----------
   An adventure is a run of parts, one per switch of mode or company. Sessions
   from before modes have no parts and read as one Night out with friends. */

export function partsOf(s) {
  if (!s.parts?.length) return [{ t: s.startedAt, mode: 'night', company: 'group' }];
  // Read-only: a mode or company this build doesn't know reads as Night out
  // with friends, and the stored value is left alone.
  if (s.parts.every((p) => MODES[p.mode] && COMPANY[p.company])) return s.parts;
  return s.parts.map((p) => ({ ...p, mode: MODES[p.mode] ? p.mode : 'night', company: COMPANY[p.company] ? p.company : 'group' }));
}

export function partAt(s, t) {
  const parts = partsOf(s);
  let found = parts[0];
  for (const p of parts) if (p.t <= t) found = p;
  return found;
}

export const currentPart = (s) => partsOf(s).at(-1);

/** Appends a part when the mode or company changes. Returns whether it did. */
export function switchPart(s, { mode, company }, now = Date.now()) {
  const cur = currentPart(s);
  if (cur.mode === mode && cur.company === company) return false;
  s.parts = [...partsOf(s), { t: now, mode, company }];
  return true;
}

/** "Night out", or "Day out, then Night out" for a switched adventure. */
export function modeLine(s) {
  const seq = [];
  for (const p of partsOf(s)) if (seq.at(-1) !== p.mode) seq.push(p.mode);
  return seq.map((m) => MODES[m]?.label || m).join(', then ');
}

export function hasMorning(s) {
  const rule = MODES[currentPart(s).mode]?.morning;
  if (rule !== 'late') return !!rule;
  // Only a day that ran past midnight gets a morning after.
  if (!s.endedAt) return false;
  return new Date(s.endedAt).toDateString() !== new Date(s.startedAt).toDateString();
}

/** Minutes per kilometre as "m:ss", or null until there's 200 m to go on. */
export function pace(ms, m) {
  if (!(m >= 200) || !(ms > 0)) return null;
  const secPerKm = Math.round(ms / 1000 / (m / 1000));
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')}`;
}

/** Metres along a trail. A slice of an adventure has no distanceM of its own. */
export function trailDistance(trail = []) {
  let d = 0;
  for (let i = 1; i < trail.length; i++) d += haversineM(trail[i - 1].lat, trail[i - 1].lng, trail[i].lat, trail[i].lng);
  return d;
}

/** The time spans spent in one mode, as [start, end] pairs; an open one ends now. */
export function modeSpans(s, mode, now = Date.now()) {
  const parts = partsOf(s);
  const spans = [];
  parts.forEach((p, i) => {
    if (p.mode !== mode) return;
    const end = i + 1 < parts.length ? parts[i + 1].t : (s.endedAt ?? now);
    if (spans.length && spans.at(-1)[1] === p.t) spans.at(-1)[1] = end;
    else spans.push([p.t, end]);
  });
  return spans;
}

/** Pace over the walk part only, so a night out with a walk home reads true. */
export function walkPace(s, now = Date.now()) {
  const ms = modeSpans(s, 'walk', now).reduce((n, [a, b]) => n + (b - a), 0);
  return pace(ms, trailDistance(sliceTo(s, 'walk').trail));
}

export const onlyMode = (s, mode) => partsOf(s).every((p) => p.mode === mode);

/** Monday of the week as local midnight: weeks count by date, so a run across New Year works. */
export function weekStart(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export const hasMode = (s, mode) => partsOf(s).some((p) => p.mode === mode);

/** The session as seen from one mode: only what was logged while in it. */
export function sliceTo(s, mode) {
  const parts = partsOf(s);
  const spans = [];
  parts.forEach((p, i) => {
    if (p.mode !== mode) return;
    const end = i + 1 < parts.length ? parts[i + 1].t : Infinity;
    const last = spans.at(-1);
    if (last && last[1] === p.t) last[1] = end; // company-only switch
    else spans.push([p.t, end]);
  });
  const inside = (t) => spans.some(([a, b]) => t >= a && t < b);
  const keep = (list) => (list || []).filter((e) => inside(e.t));
  if (!spans.length) return { ...s, drinks: [], waters: [], meals: [], challenges: [], pins: [], trail: [], sets: [] };
  const lastEnd = spans.at(-1)[1];
  return {
    ...s,
    startedAt: spans[0][0],
    endedAt: lastEnd === Infinity ? s.endedAt : lastEnd,
    drinks: keep(s.drinks), waters: keep(s.waters), meals: keep(s.meals),
    challenges: keep(s.challenges), pins: keep(s.pins), trail: keep(s.trail), sets: keep(s.sets),
  };
}

/* ---------- festival ---------- */

/** Saw a set: the act, when, and where you were standing if the GPS knew. */
export function addSet(s, { name, lat = null, lng = null }, now = Date.now()) {
  (s.sets = s.sets || []).push({ t: now, name: name.trim(), lat, lng });
  return s;
}

const actKey = (name) => name.trim().toLowerCase();

/** Every act seen across these adventures, once each, first spelling kept. */
export function festivalActs(sessions) {
  const seen = new Map();
  for (const x of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const set of x.sets || []) if (!seen.has(actKey(set.name))) seen.set(actKey(set.name), set.name);
  }
  return [...seen.values()];
}

/**
 * A festival review as one read-only adventure, so the recap tiles and the
 * card can draw it. Nothing here is saved; the days stay as they are.
 */
export function mergeSessions(sessions) {
  const days = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const all = (k) => days.flatMap((d) => d[k] || []).sort((a, b) => a.t - b.t);
  return {
    id: 'f' + days.map((d) => d.id).join('-'),
    sessionIds: days.map((d) => d.id),
    startedAt: days[0].startedAt,
    endedAt: Math.max(...days.map((d) => d.endedAt || d.startedAt)),
    // Time out is the days added up, not the nights in between.
    activeMs: days.reduce((n, d) => n + elapsedMs(d), 0),
    parts: [{ t: days[0].startedAt, mode: 'festival', company: 'group' }],
    drinks: all('drinks'), waters: all('waters'), meals: all('meals'), challenges: all('challenges'),
    pins: all('pins'), trail: all('trail'), sets: all('sets'),
    steps: days.reduce((n, d) => n + (d.steps || 0), 0),
    distanceM: days.reduce((n, d) => n + (d.distanceM || 0), 0),
    place: null,
  };
}

export function addDrink(s, kind, now = Date.now()) {
  s.drinks.push({ t: now, kind: kind || 'Drink' });
  return s;
}

export function addWater(s, now = Date.now()) {
  s.waters.push({ t: now });
  return s;
}

// Guarded init: sessions recorded before food logging existed lack the array.
export function addMeal(s, now = Date.now()) {
  (s.meals = s.meals || []).push({ t: now });
  return s;
}

export function addChallenge(s, challenge, now = Date.now()) {
  (s.challenges = s.challenges || []).push({ id: challenge.id, text: challenge.text, t: now });
  return s;
}

export function addPin(s, { lat, lng, name, note, pending = false }, now = Date.now()) {
  s.pins.push({ t: now, lat, lng, name: name || 'Stop', note: note || '', ...(pending ? { pending: true } : {}) });
  return s;
}

/**
 * A stop named while the GPS was still finding you takes the first position
 * that arrives. One named with location off stays off the map, as promised.
 */
export function placePending(s, fix) {
  for (const p of s.pins) {
    if (p.pending && p.lat == null && fix && p.t <= fix.t) { p.lat = fix.lat; p.lng = fix.lng; delete p.pending; }
  }
  return s;
}

// Returns true when the fix was actually recorded. Points are throttled so a
// ten-hour night stays a few hundred entries rather than tens of thousands.
export function addFix(s, { lat, lng, t = Date.now() }) {
  const last = s.trail[s.trail.length - 1];
  // Fixes carry the phone's own timestamps now; never let one run backwards,
  // since everything that reads the trail assumes it's in time order.
  if (last && t < last.t) t = last.t;
  if (last) {
    const d = haversineM(last.lat, last.lng, lat, lng);
    if (d < TRAIL_MIN_M && t - last.t < TRAIL_MIN_MS) return false;
    s.distanceM += d;
  }
  s.trail.push({ t, lat, lng });
  return true;
}

export function endSession(s, now = Date.now()) {
  s.endedAt = now;
  return s;
}

/* ---------- derived ---------- */

export function elapsedMs(s, now = Date.now()) {
  if (!s) return 0;
  return (s.endedAt ?? now) - s.startedAt;
}

export function drinksSinceWater(s) {
  if (!s) return 0;
  const lastWater = s.waters.length ? s.waters[s.waters.length - 1].t : s.startedAt;
  return s.drinks.filter((d) => d.t > lastWater).length;
}

export function drinkOfChoice(s) {
  if (!s || !s.drinks.length) return null;
  const counts = new Map();
  for (const d of s.drinks) counts.set(d.kind, (counts.get(d.kind) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function isStale(s, now = Date.now()) {
  return !!s && !s.endedAt && now - lastActivity(s) > AUTO_END_MS;
}

export function lastActivity(s) {
  const times = [s.startedAt];
  if (s.drinks.length) times.push(s.drinks[s.drinks.length - 1].t);
  if (s.waters.length) times.push(s.waters[s.waters.length - 1].t);
  if (s.trail.length) times.push(s.trail[s.trail.length - 1].t);
  if (s.pins.length) times.push(s.pins[s.pins.length - 1].t);
  return Math.max(...times);
}

// Stretches where no fix arrived for far longer than the throttle allows —
// the phone was killed, denied, or asleep. Reported rather than smoothed over:
// a straight line drawn across a missing hour is a lie.
export const GAP_MS = 12 * 60 * 1000;

export function trailGaps(s, threshold = GAP_MS) {
  const gaps = [];
  for (let i = 1; i < s.trail.length; i++) {
    const ms = s.trail[i].t - s.trail[i - 1].t;
    if (ms > threshold) gaps.push({ from: s.trail[i - 1].t, to: s.trail[i].t, ms });
  }
  return gaps;
}

export function missingMs(s) {
  return trailGaps(s).reduce((n, g) => n + g.ms, 0);
}

export function summarise(s) {
  return {
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    ms: s.activeMs ?? elapsedMs(s),
    drinks: s.drinks.length,
    waters: s.waters.length,
    stops: s.pins.length,
    distanceM: s.distanceM,
    steps: s.steps,
    kind: drinkOfChoice(s),
  };
}

export function stats(sessions) {
  const done = sessions.filter((s) => s.endedAt);
  if (!done.length) return null;
  const longest = Math.max(...done.map((s) => elapsedMs(s)));
  const totalDrinks = done.reduce((n, s) => n + s.drinks.length, 0);
  const totalWaters = done.reduce((n, s) => n + s.waters.length, 0);
  return {
    nights: done.length,
    longestMs: longest,
    avgDrinks: totalDrinks / done.length,
    ratio: totalWaters ? totalDrinks / totalWaters : null,
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const RANGES = [
  { key: '8w', label: '8 weeks' },
  { key: '6m', label: '6 months' },
  { key: '1y', label: 'Year' },
  { key: 'all', label: 'All time' },
];

// Oldest night in the set, or now when there are none.
function earliest(sessions, now) {
  const done = sessions.filter((s) => s.endedAt);
  return done.length ? Math.min(...done.map((s) => s.startedAt)) : now;
}

export function rangeStart(sessions, range, now = Date.now()) {
  if (range === '8w') return now - 8 * WEEK_MS;
  if (range === '6m') return new Date(now).setMonth(new Date(now).getMonth() - 6);
  if (range === '1y') return new Date(now).setFullYear(new Date(now).getFullYear() - 1);
  return earliest(sessions, now);
}

export function inRange(s, sessions, range, now = Date.now()) {
  return !!s.endedAt && s.startedAt >= rangeStart(sessions, range, now);
}

// Buckets for the chart, newest last: weekly for the short range, monthly for
// the longer ones. Returns [{ label, value }] so the axis labels itself.
export function chartBuckets(sessions, range = '8w', now = Date.now()) {
  const done = sessions.filter((s) => s.endedAt);

  if (range === '8w') {
    const start = now - 8 * WEEK_MS;
    const out = Array.from({ length: 8 }, (_, i) => ({ label: String(i + 1), value: 0 }));
    for (const s of done) {
      if (s.startedAt < start) continue;
      const i = Math.min(7, Math.floor((s.startedAt - start) / WEEK_MS));
      out[i].value += s.drinks.length;
    }
    return out;
  }

  const start = rangeStart(sessions, range, now);
  const startDate = new Date(start);
  const months = Math.max(1,
    (new Date(now).getFullYear() - startDate.getFullYear()) * 12
    + (new Date(now).getMonth() - startDate.getMonth()) + 1);

  // Beyond two years monthly bars stop being readable, so switch to years.
  if (months > 24) {
    const y0 = startDate.getFullYear();
    const years = new Date(now).getFullYear() - y0 + 1;
    const out = Array.from({ length: years }, (_, i) => ({ label: String((y0 + i) % 100).padStart(2, '0'), value: 0 }));
    for (const s of done) {
      const i = new Date(s.startedAt).getFullYear() - y0;
      if (i >= 0 && i < years) out[i].value += s.drinks.length;
    }
    return out;
  }

  const M = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const out = Array.from({ length: months }, (_, i) => {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    return { label: M[d.getMonth()], value: 0 };
  });
  for (const s of done) {
    const d = new Date(s.startedAt);
    const i = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
    if (i >= 0 && i < months) out[i].value += s.drinks.length;
  }
  return out;
}

/* ---------- geo maths ---------- */

export function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
