// Badge evaluation and the badge grid. Every criterion is a pure function
// over stored data — no new tracking exists to serve a badge.

import { BADGES } from './badges-data.js';
import { el, btn, spacer, foot, head } from './ui.js';
import * as S from './state.js';

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
};

// Everything currently earnable, oldest qualifying night first so the badge
// links to the night that actually earned it.
export function evaluate({ sessions, prefs, flags = {} }) {
  const done = sessions.filter((s) => s.endedAt).sort((a, b) => a.startedAt - b.startedAt);
  const out = [];

  for (const [slug, check] of Object.entries(NIGHT_CHECKS)) {
    const hit = done.find((s) => check(s, prefs));
    if (hit) out.push({ slug, sessionId: hit.id });
  }
  for (const [slug, check] of Object.entries(AGGREGATE_CHECKS)) {
    if (check(done, prefs, flags)) out.push({ slug, sessionId: null });
  }
  return out;
}

/* ---------- UI ---------- */

export const badgeSrc = (slug) => `./icons/badges/badge-${slug}.svg`;

export function badgeChip(slug, { size = 64, earned = true } = {}) {
  const meta = BADGES.find((b) => b.slug === slug);
  return el('img', {
    src: badgeSrc(slug),
    alt: meta ? meta.name : slug,
    width: size, height: size,
    style: `width:${size}px;height:${size}px;border-radius:50%${earned ? '' : ';filter:grayscale(1) brightness(.55)'}`,
  });
}

export function badgesScreen(ctx) {
  const earned = new Map(ctx.state.badges.map((b) => [b.slug, b]));
  const cats = [...new Set(BADGES.map((b) => b.cat))];

  return [
    head({ eyebrow: 'Badges', title: `${earned.size} of ${BADGES.length}`, back: () => ctx.go('history') }),

    ...cats.flatMap((cat) => [
      el('div', { class: 'eb', style: 'margin-top:7px', text: cat }),
      el('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:9px' },
        BADGES.filter((b) => b.cat === cat).map((b) => {
          const got = earned.has(b.slug);
          const secret = b.hidden && !got;
          return el('div', { class: 'center', style: 'display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px 2px' },
            badgeChip(b.slug, { size: 64, earned: got }),
            el('div', { style: `font-size:12px;font-weight:700;letter-spacing:-.01em;color:${got ? 'var(--text)' : 'var(--muted)'}`, text: secret ? '???' : b.name }),
            el('div', { class: 'cap', style: 'font-size:10px;line-height:1.35', text: secret ? 'Keep going.' : b.criteria }),
          );
        })),
    ]),

    spacer(),
    foot(btn('Back', 'btn--sec btn--sm', () => ctx.go('history'))),
  ];
}

export { BADGES };
