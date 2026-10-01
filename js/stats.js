// The numbers a tester screenshots and sends back: how often they went out,
// in which modes, and what they did with it. Read from the phone's own data;
// nothing is sent anywhere. No DOM, so node can test it.

import * as S from './state.js';
import { MODE_KEYS } from './modes.js';

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
