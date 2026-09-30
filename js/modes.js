// The kinds of adventure. Each mode is described once, here, and screens read
// from it rather than checking for a mode by name. Walk and Festival join in
// later steps (docs/superpowers/specs/2026-09-30-m2-modes-design.md).
// No imports, so node can test it.

// Night out's list is the one the app has always had.
const NIGHT_DRINKS = ['Pint', 'Wine', 'Spirit + mixer', 'Shot', 'Cider', 'Cocktail', 'Low/no'];
const BUTTONS = ['drink', 'water', 'food', 'checkin', 'challenge', 'map'];

export const MODES = {
  night: { label: 'Night out', icon: 'moon', buttons: BUTTONS, drinks: NIGHT_DRINKS, drinkHint: 'Negroni', morning: true },
  day: { label: 'Day out', icon: 'sun', buttons: BUTTONS, drinks: ['Coffee', 'Tea', 'Soft drink', 'Juice', 'Pint', 'Wine', 'Low/no'], drinkHint: 'Flat white', morning: false },
};

export const MODE_KEYS = Object.keys(MODES);

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
