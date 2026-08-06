const KEY = 'lastcall_v1';
const SCHEMA = 1;

const EMPTY = { v: SCHEMA, active: null, sessions: [], prefs: defaultPrefs(), badges: [], flags: {} };

export function defaultPrefs() {
  // Threshold of 5 is the design system's value, not a guess.
  return { hydrationEvery: 5, batterySaver: false, units: 'km', recentDrinks: [], locationPrimed: false };
}

let cache = null;

export function load() {
  if (cache) return cache;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (!raw) { cache = structuredClone(EMPTY); return cache; }
  try {
    const parsed = JSON.parse(raw);
    cache = migrate(parsed);
  } catch {
    cache = structuredClone(EMPTY);
  }
  return cache;
}

function migrate(data) {
  if (!data || typeof data !== 'object') return structuredClone(EMPTY);
  // Only one schema version so far. Future versions step up from here.
  const out = {
    v: SCHEMA,
    active: data.active ?? null,
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    prefs: { ...defaultPrefs(), ...(data.prefs || {}) },
    badges: Array.isArray(data.badges) ? data.badges : [],
    flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
  };
  return out;
}

let writeTimer = null;
let lastError = null;

export function save(state) {
  cache = state;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 220);
}

export function flush() {
  clearTimeout(writeTimer);
  if (!cache) return true;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
    lastError = null;
    return true;
  } catch (err) {
    lastError = err;
    // Quota exceeded: shed the oldest finished nights and retry once.
    if (cache.sessions.length > 1) {
      cache.sessions = cache.sessions.slice(0, Math.max(1, cache.sessions.length - 3));
      try { localStorage.setItem(KEY, JSON.stringify(cache)); lastError = null; return true; } catch { /* fall through */ }
    }
    return false;
  }
}

export function storageError() { return lastError; }

// Persist immediately when the app is backgrounded or closed — a debounced
// write would otherwise be lost when Android freezes the WebView.
export function installFlushHooks() {
  const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  cache = migrate(parsed);
  return flush() ? cache : null;
}

export function wipe() {
  cache = structuredClone(EMPTY);
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return cache;
}
