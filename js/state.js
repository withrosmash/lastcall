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

// Eight buckets, newest last, each holding the drink total for that week.
export function weekly(sessions, weeks = 8, now = Date.now()) {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const start = now - weeks * WEEK;
  const buckets = new Array(weeks).fill(0);
  for (const s of sessions) {
    if (!s.endedAt || s.startedAt < start) continue;
    const i = Math.min(weeks - 1, Math.floor((s.startedAt - start) / WEEK));
    buckets[i] += s.drinks.length;
  }
  return buckets;
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
