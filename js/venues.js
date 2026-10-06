// Nearby places for check-in, from Leit's own venue squares.
//
// A weekly job (scripts/venues/build.mjs) cuts OpenStreetMap's UK food and
// drink places into geohash squares that split while they hold more than 300,
// so central London is squares of about 100 m and a market town is one square
// of 25 km. The phone fetches only the squares its 150 m circle touches, so
// the server learns roughly which neighbourhood you're in, never where you
// are. Everything above the fetch layer is pure, and the build shares the
// tag list so the two can't disagree about what counts as a venue.

import { haversineM } from './state.js';

// Anywhere that serves food or drink. Shops that sell for taking away
// (coffee beans, loose tea, off-licences) are left out on purpose.
export const VENUE_TAGS = {
  amenity: ['pub', 'bar', 'cafe', 'restaurant', 'nightclub', 'fast_food', 'biergarten', 'casino',
    'food_court', 'ice_cream', 'social_club', 'events_venue', 'music_venue', 'hookah_lounge', 'karaoke_box'],
  shop: ['bakery', 'deli', 'pastry'],
  leisure: ['bowling_alley'],
  club: ['social'],
};

/** The kind recorded for a place, or null when it isn't a venue. */
export function kindOf(tags) {
  for (const [key, values] of Object.entries(VENUE_TAGS)) {
    const v = tags?.[key];
    if (v && values.includes(v)) return key === 'club' ? 'social_club' : v;
  }
  return null;
}

const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function geohash(lat, lng, precision) {
  const la = [-90, 90], lo = [-180, 180];
  let out = '', bits = 0, ch = 0, even = true;
  while (out.length < precision) {
    const r = even ? lo : la, v = even ? lng : lat;
    const mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = ch * 2 + 1; r[0] = mid; } else { ch *= 2; r[1] = mid; }
    even = !even;
    if (++bits === 5) { out += B32[ch]; bits = 0; ch = 0; }
  }
  return out;
}

/**
 * The squares a circle touches. Samples a 7 by 7 grid over its bounding box,
 * 50 m apart for a 150 m circle, which is finer than the smallest square
 * (precision 7 is about 75 m wide even in Shetland), so no square is skipped.
 */
export function squaresFor(keys, lat, lng, radiusM) {
  const dLat = radiusM / 110540;
  const dLng = radiusM / (111320 * Math.cos(lat * Math.PI / 180));
  const found = new Set();
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const h = geohash(lat + dLat * (i / 3 - 1), lng + dLng * (j / 3 - 1), 7);
      for (let p = 7; p >= 1; p--) {
        if (keys.has(h.slice(0, p))) { found.add(h.slice(0, p)); break; }
      }
    }
  }
  return [...found];
}

/** Records [name, lat, lng, kind] within radius, nearest first. */
export function nearbyFrom(venues, lat, lng, radiusM) {
  const out = [];
  for (const [name, vlat, vlng, kind] of venues) {
    const d = haversineM(lat, lng, vlat, vlng);
    if (d <= radiusM) out.push({ name, d, kind });
  }
  return out.sort((a, b) => a.d - b.d);
}

/** Lower case, accents stripped, trimmed: how names are compared. */
export function fold(str) {
  return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const UNNAMED = new Set(['unnamed stop', 'stop']);

/** Stops you've named before near here, nearest first, one per name. */
export function ownPlaces(sessions, active, lat, lng, radiusM) {
  const best = new Map();
  for (const s of [...(sessions || []), active].filter(Boolean)) {
    for (const p of s.pins || []) {
      if (p.lat == null || p.lng == null || !p.name || UNNAMED.has(fold(p.name))) continue;
      const d = haversineM(lat, lng, p.lat, p.lng);
      if (d > radiusM) continue;
      const k = fold(p.name);
      if (!best.has(k) || best.get(k).d > d) best.set(k, { name: p.name, d, own: true });
    }
  }
  return [...best.values()].sort((a, b) => a.d - b.d);
}

/** Own places first, then venues; a name that's in both shows once. */
export function mergeSuggestions(own, venues) {
  const seen = new Set();
  const out = [];
  for (const v of [...own, ...venues]) {
    const k = fold(v.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** The chips to show for what's been typed. Order is kept. */
export function filterByText(list, text, max = 6) {
  const q = fold(text || '');
  return (q ? list.filter((v) => fold(v.name).includes(q)) : list).slice(0, max);
}

/** The Overpass fallback's query: the same kinds, around one point. */
export function overpassQuery(lat, lng, radiusM) {
  const clauses = Object.entries(VENUE_TAGS)
    .map(([key, values]) => `nwr(around:${radiusM},${lat},${lng})["name"]["${key}"~"^(${values.join('|')})$"];`)
    .join('');
  return `[out:json][timeout:8];(${clauses});out center 60;`;
}
