const KEY = 'sprell_v1';
// Before the rename the app saved under this key. Read once if there's
// nothing under the new one, so the web preview keeps its history.
const OLD_KEY = 'lastcall_v1'; // allowed-old-name
const SCHEMA = 1;

const EMPTY = { v: SCHEMA, active: null, sessions: [], prefs: defaultPrefs(), badges: [], flags: {}, festivals: [] };

export function defaultPrefs() {
  // Threshold of 5 is the design system's value, not a guess.
  return {
    hydrationEvery: 5, walkWaterEvery: 30, batterySaver: false, units: 'km',
    recentDrinks: [], locationPrimed: false, historyRange: '1m',
    theme: 'dark',
    lastMode: 'night', lastCompany: 'group', recentByMode: {}, modeTouches: true, biggerText: false, calmAvatar: false, showAvatar: true,
  };
}

let cache = null;

export function load() {
  if (cache) return cache;
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw == null) {
      raw = localStorage.getItem(OLD_KEY);
      // Copy it across straight away, so everything that only knows the new
      // key (an import's backup and undo, the next save) sees it.
      if (raw != null) localStorage.setItem(KEY, raw);
    }
  } catch { /* private mode, or no room for the copy: raw is still read */ }
  if (!raw) { cache = structuredClone(EMPTY); return cache; }
  try {
    const parsed = JSON.parse(raw);
    cache = migrate(parsed);
  } catch {
    cache = structuredClone(EMPTY);
  }
  return cache;
}

export function migrate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return structuredClone(EMPTY);
  // Only one schema version so far. Future versions step up from here.
  // Every adventure is checked on the way in, so a damaged file or an export
  // from an older build can never leave the app unable to open.
  const seen = new Set();
  const sessions = (Array.isArray(data.sessions) ? data.sessions : [])
    .map(normaliseSession)
    .filter((x) => x && !seen.has(x.id) && seen.add(x.id))
    .sort((a, b) => b.startedAt - a.startedAt);
  const prefs = isPlain(data.prefs) ? { ...data.prefs } : {};
  if (isPlain(prefs.avatar) && isPlain(prefs.avatar.colors)) {
    prefs.avatar = { ...prefs.avatar, colors: Object.fromEntries(Object.entries(prefs.avatar.colors).filter(([, c]) => HEX.test(c))) };
  }
  return {
    v: SCHEMA,
    active: normaliseSession(data.active),
    sessions,
    prefs: { ...defaultPrefs(), ...prefs },
    badges: Array.isArray(data.badges) ? data.badges.filter((b) => b && typeof b.slug === 'string') : [],
    flags: isPlain(data.flags) ? data.flags : {},
    festivals: Array.isArray(data.festivals) ? data.festivals.filter((f) => f && f.id && Array.isArray(f.sessionIds)) : [],
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
const LISTS = ['drinks', 'waters', 'meals', 'challenges', 'pins', 'trail', 'sets', 'parts'];
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const placeOk = (e) => (e.lat === null && e.lng === null) || (finite(e.lat) && finite(e.lng));

/** One adventure made safe to read, or null if it isn't one. */
export function normaliseSession(x) {
  if (!isPlain(x) || typeof x.id !== 'string' || !finite(x.startedAt)) return null;
  const s = { ...x };
  for (const k of LISTS) s[k] = (Array.isArray(x[k]) ? x[k] : []).filter((e) => isPlain(e) && finite(e.t));
  s.trail = s.trail.filter((e) => finite(e.lat) && finite(e.lng));
  s.pins = s.pins.filter((e) => placeOk(e) || (e.lat == null && e.lng == null));
  s.sets = s.sets.filter((e) => e.lat == null || placeOk(e));
  s.endedAt = finite(x.endedAt) ? x.endedAt : null;
  s.steps = finite(x.steps) ? x.steps : 0;
  s.distanceM = finite(x.distanceM) ? x.distanceM : 0;
  return s;
}

let writeTimer = null;
let lastError = null;

export function save(state, { touch = true } = {}) {
  cache = state;
  // Fixes and step updates save too, so this is the last moment the app knew
  // the adventure was still going (see lastActivity). Saves that only bring in
  // what happened while the app was closed pass touch: false.
  if (touch && state?.active) state.active.touchedAt = Date.now();
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
    // Never delete an adventure to make room. Report it once per failure run
    // so the app can ask for an export; the data stays in memory meanwhile.
    if (!lastError) errorHandler?.(err);
    lastError = err;
    return false;
  }
}

let errorHandler = null;
/** Called when a save fails (storage full or blocked). */
export function onStorageError(fn) { errorHandler = fn; }

export function storageError() { return lastError; }

// The last 20 errors, kept on the phone for diagnosing a tester's report (and
// later the crash feed of the monitoring dashboard). Never sent anywhere.
const ERRORS_KEY = 'sprell_errors';
export function logError(err, screen = '') {
  try {
    const log = JSON.parse(localStorage.getItem(ERRORS_KEY) || '[]');
    log.push({
      t: Date.now(), screen,
      msg: String(err?.message ?? err).slice(0, 300),
      stack: String(err?.stack || '').slice(0, 500),
    });
    localStorage.setItem(ERRORS_KEY, JSON.stringify(log.slice(-20)));
  } catch { /* logging must never throw */ }
}

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

/** Reads a file meant for import without changing anything. */
export function checkImport(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'not-json' }; }
  if (!isPlain(parsed) || !Array.isArray(parsed.sessions)) return { ok: false, reason: 'not-sprell' };
  const data = migrate(parsed);
  return { ok: true, data, count: data.sessions.length };
}

// Import replaces everything, so the history it replaces is kept under its
// own key until the next import and can be put back.
const BACKUP_KEY = KEY + '_backup';

export function importJSON(text) {
  const checked = checkImport(text);
  if (!checked.ok) return null;
  try {
    const current = localStorage.getItem(KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
  } catch { /* no room for a backup: the import still asks first */ }
  const previous = cache;
  cache = checked.data;
  if (flush()) return cache;
  // Not saved: keep working on (and exporting) your own history.
  cache = previous;
  dropImportBackup();
  return null;
}

/** The backup is only for the undo straight after an import. */
export function dropImportBackup() {
  try { localStorage.removeItem(BACKUP_KEY); } catch { /* nothing to drop */ }
}

/** Puts back the history the last import replaced. */
export function undoImport() {
  let raw = null;
  try { raw = localStorage.getItem(BACKUP_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    localStorage.setItem(KEY, raw);
    cache = migrate(JSON.parse(raw));
    dropImportBackup();
    return cache;
  } catch { return null; }
}

export function wipe() {
  cache = structuredClone(EMPTY);
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return cache;
}
