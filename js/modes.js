// The kinds of adventure. Each mode is described once, here, and screens read
// from it rather than checking for a mode by name
// (docs/superpowers/specs/2026-09-30-m2-modes-design.md).
// Only pure imports, so node can test it. Glow colours were picked by the
// user from options shown live (2026-09-30).

import { NIGHT_GLOW } from './glow.js';

// Night out's list is the one the app has always had.
const NIGHT_DRINKS = ['Pint', 'Wine', 'Spirit + mixer', 'Shot', 'Cider', 'Cocktail', 'Low/no'];
const BUTTONS = ['drink', 'water', 'food', 'checkin', 'challenge', 'map'];

export const MODES = {
  night: { label: 'Night out', icon: 'moon', buttons: BUTTONS, drinks: NIGHT_DRINKS, drinkHint: 'Negroni', morning: true, headline: 'default', glow: NIGHT_GLOW },
  day: { label: 'Day out', icon: 'sun', buttons: BUTTONS, drinks: ['Coffee', 'Tea', 'Soft drink', 'Juice', 'Pint', 'Wine', 'Low/no'], drinkHint: 'Flat white', morning: false, headline: 'default',
    glow: { dark: [[236, 178, 64], [176, 120, 28], [124, 82, 18], [52, 34, 8]], light: [190, 120, 0] } }, // Sunlight gold
  // Steps and pace lead on a walk; the drink button tucks under More for the
  // pub at the end.
  walk: {
    label: 'Walk', icon: 'footprints', buttons: ['water', 'food', 'checkin', 'challenge', 'map', 'more'], labels: { food: 'Snack' },
    drinks: ['Coffee', 'Tea', 'Soft drink', 'Pint', 'Low/no'], drinkHint: 'Oat latte', morning: false, headline: 'walk',
    glow: { dark: [[72, 196, 196], [30, 132, 138], [18, 88, 94], [6, 36, 38]], light: [0, 120, 128] }, // Teal
  },
  // One adventure per festival day. Saw a set stands in for Check in; the
  // morning-after screen only follows a day that ran past midnight.
  festival: {
    label: 'Festival', icon: 'tent', buttons: ['drink', 'water', 'food', 'set', 'challenge', 'map'],
    drinks: ['Pint', 'Cider', 'Cocktail can', 'Spirit + mixer', 'Low/no'], drinkHint: 'Frozen margarita', morning: 'late', headline: 'festival',
    glow: { dark: [[168, 112, 240], [112, 62, 190], [74, 38, 126], [28, 14, 50]], light: [110, 50, 200] }, // Violet
  },
};

export const MODE_KEYS = Object.keys(MODES);

// A mode from a newer build (or a backup made by one) reads as Night out,
// rather than crashing a screen that expects to find it here.

export const COMPANY = { group: 'With friends', solo: 'On my own' };

// Badges that only count on the Night out part of an adventure (the spec's
// Night out set). Everything else counts in any mode.
export const NIGHT_BADGES = new Set(['french-exit', 'one-and-done', 'mixologist', 'brand-loyal', 'hydro-homie', 'balanced-books',
  'metronome', 'dry-run', 'good-habits', 'early-doors', 'sunrise-service', 'late-bite', 'ghost']);


const MAX_RECENT = 3;

// Night out keeps the original recentDrinks list, so nothing needs migrating.
export function recentFor(prefs, mode) {
  if (mode === 'night') return prefs.recentDrinks || [];
  return prefs.recentByMode?.[mode] || [];
}

export function rememberFor(prefs, mode, kind) {
  const next = [kind, ...recentFor(prefs, mode).filter((r) => r !== kind)].slice(0, MAX_RECENT);
  if (mode === 'night') prefs.recentDrinks = next;
  else prefs.recentByMode = { ...(prefs.recentByMode || {}), [mode]: next };
}

/** The picker's two rows: up to three recent drinks, then the rest of the list. */
export function recentAndRest(recent = [], presets = []) {
  const top = [];
  const seen = new Set();
  for (const r of recent) {
    if (top.length >= MAX_RECENT || seen.has(r)) continue;
    seen.add(r); top.push(r);
  }
  return { top, rest: presets.filter((p) => !seen.has(p)) };
}
