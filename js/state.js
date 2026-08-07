// Pure session model. No DOM, no storage — everything here is a plain
// transform so the same code can be reasoned about and tested in isolation.

export const TRAIL_MIN_M = 25;
export const TRAIL_MIN_MS = 60_000;
export const AUTO_END_MS = 14 * 60 * 60 * 1000;

export function newSession(now = Date.now()) {
  return {
    id: 's' + now.toString(36),
    startedAt: now,
    endedAt: null,
    drinks: [],
    waters: [],
    meals: [],
    pins: [],
    trail: [],
    steps: 0,
    distanceM: 0,
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

export function addPin(s, { lat, lng, name, note }, now = Date.now()) {
  s.pins.push({ t: now, lat, lng, name: name || 'Stop', note: note || '' });
  return s;
}

// Returns true when the fix was actually recorded. Points are throttled so a
// ten-hour night stays a few hundred entries rather than tens of thousands.
export function addFix(s, { lat, lng, t = Date.now() }) {
  const last = s.trail[s.trail.length - 1];
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
    ms: elapsedMs(s),
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
