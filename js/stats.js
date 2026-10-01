// The numbers a tester screenshots and sends back: how often they went out,
// in which modes, and what they did with it. Read from the phone's own data;
// nothing is sent anywhere. No DOM, so node can test it.

import * as S from './state.js';
import { MODES, MODE_KEYS } from './modes.js';

const DAY = 24 * 3600e3;

export function testerStats({ sessions, badges = [], flags = {}, festivals = [] }, now = Date.now()) {
  const done = sessions.filter((s) => s.endedAt);
  const byMode = Object.fromEntries(MODE_KEYS.map((k) => [k, done.filter((s) => S.hasMode(s, k)).length]));
  const modesIn = (s) => new Set(S.partsOf(s).map((p) => p.mode)).size;
  return {
    adventures: done.length,
    last30: done.filter((s) => s.startedAt >= now - 30 * DAY).length,
    weeks: new Set(done.map((s) => S.weekStart(s.startedAt))).size,
    avgMs: done.length ? done.reduce((n, s) => n + S.elapsedMs(s), 0) / done.length : 0,
    since: done.length ? Math.min(...done.map((s) => s.startedAt)) : null,
    byMode,
    switched: done.filter((s) => modesIn(s) > 1).length,
    solo: done.filter((s) => S.partsOf(s).some((p) => p.company === 'solo')).length,
    challenges: done.reduce((n, s) => n + (s.challenges || []).length, 0),
    badges: badges.length,
    // Counting began in this build; earlier testers who saved a card show 1.
    cards: flags.cardsShared ?? (flags.cardExported ? 1 : 0),
    cardsSince: flags.cardsSince ?? null,
    festivals: festivals.length,
  };
}

/**
 * One more card saved or shared. Counting began in M4: a tester who had
 * already saved a card starts at one, and only they get a "counted from" date.
 */
export function countCard(flags, now = Date.now()) {
  if (flags.cardsShared == null) {
    flags.cardsShared = flags.cardExported ? 1 : 0;
    if (flags.cardExported) flags.cardsSince = now;
  }
  flags.cardsShared += 1;
  flags.cardExported = true;
  return flags;
}

/* ---------- which four tiles show ----------
   In the mode's order of interest, from what was actually measured: with
   location off there's no distance or pace, without a step counter no steps,
   so those never show as zeros. */

const firstFour = (list) => list.filter(Boolean).slice(0, 4);
const either = (a, b) => a || b || null;

/** Tiles for the live screen. `gps` and `steps` say what the phone can measure. */
export function liveTileKeys(s, { gps, steps }) {
  const st = steps ? 'steps' : null, dist = gps ? 'distance' : null;
  const head = MODES[S.currentPart(s).mode].headline;
  if (head === 'walk') return firstFour([st, dist, dist && 'pace', 'water', 'stops', 'food', 'challenges']);
  if (head === 'festival') return firstFour(['drinks', 'water', 'sets', either(st, dist), 'food', 'challenges']);
  return firstFour(['drinks', 'water', either(st, dist), st && dist ? dist : 'stops', 'food', 'challenges']);
}

/** Tiles for a finished adventure, from what it recorded. */
export function doneTileKeys(s) {
  const route = s.trail.length > 1;
  const st = s.steps ? 'steps' : null, dist = route ? 'distance' : null;
  if (S.onlyMode(s, 'walk')) return firstFour([st, dist, dist && 'pace', 'stops', 'water', 'food', 'challenges']);
  if (S.hasMode(s, 'festival')) return firstFour(['drinks', 'water', 'sets', either(st, dist), 'food', 'challenges']);
  return firstFour(['drinks', 'water', either(st, dist), 'stops', 'food', 'challenges']);
}

/** The pace tile's words: "Not yet" while walking, "Too short" on a finished walk. */
export function paceLabel(p, done = false) {
  if (p) return { value: p, unit: '/km' };
  return { value: done ? 'Too short' : 'Not yet', unit: null };
}
