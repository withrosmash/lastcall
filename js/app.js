import * as store from './storage.js';
import * as S from './state.js';
import { mount, toast, buzz, dismissSheet, serviceNotice } from './ui.js';
import { startScreen, liveScreen, recapScreen, primingScreen } from './session.js';
import { remember } from './drinks.js';
import * as geo from './geo.js';
import { mapScreen, teardownMap } from './map.js';
import { historyScreen, detailScreen, settingsScreen } from './history.js';
import { cardScreen, shareScreen } from './card.js';
import * as badges from './badges.js';
import { atlasScreen } from './map.js';
import * as steps from './steps.js';
import * as notify from './notify.js';
import * as keepalive from './keepalive.js';

const ctx = {
  state: store.load(),
  screen: 'start',
  arg: null,
  lastSession: null,
  geoStatus: 'idle',
  stepsAvailable: false,
  nudgeDismissed: false,
  // null on the web, where battery optimisation isn't a concept.
  batteryExempt: null,
  tick: null,
  // null until a native status read lands; the web build stays null.
  permissions: null,
  go, render, save, beginNight, startNight, grantThenStart, endNight, logDrink, logWater, logMeal, addPin,
  fixBattery, checkBattery, checkPermissions, fixPermission, openAppSettings: keepalive.openAppSettings,
};

const SCREENS = {
  start: { build: startScreen, bloom: 'hero' },
  priming: { build: primingScreen, bloom: 'hero' },
  live: { build: liveScreen, bloom: 'hero', tracking: true },
  map: { build: mapScreen, bloom: 'none', tracking: true },
  recap: { build: (c) => recapScreen(c, c.arg), bloom: 'foot' },
  card: { build: (c) => cardScreen(c, c.arg), bloom: 'none' },
  share: { build: (c) => shareScreen(c, c.arg), bloom: 'none' },
  history: { build: historyScreen, bloom: 'hero' },
  detail: { build: (c) => detailScreen(c, c.arg), bloom: 'hero' },
  settings: { build: settingsScreen, bloom: 'hero' },
  badges: { build: badges.badgesScreen, bloom: 'hero' },
  atlas: { build: atlasScreen, bloom: 'none' },
};

function go(screen, arg = null) {
  if (ctx.screen === 'map' && screen !== 'map') teardownMap();
  dismissSheet();
  ctx.screen = screen;
  ctx.arg = arg;
  render();
}

function render() {
  ctx.tick = null;
  const def = SCREENS[ctx.screen] || SCREENS.start;
  const tracking = def.tracking && !!ctx.state.active;
  mount(def.build(ctx), {
    bloom: def.bloom,
    chrome: tracking ? serviceNotice() : null,
  });
}

function save() { store.save(ctx.state); }

/* ---------- session actions ---------- */

// Android makes background location a separate trip to system settings, so the
// priming screen runs first — otherwise people deny it and the app silently
// fails at its one job.
function beginNight() {
  if (geo.isNative() && !ctx.state.prefs.locationPrimed) go('priming');
  else startNight();
}

async function grantThenStart() {
  ctx.state.prefs.locationPrimed = true;
  save();
  // Send them straight to the settings page Android insists on for "Allow all
  // the time", rather than leaving them to find it.
  await geo.openSettings();
  startNight();
}

async function startNight({ skipLocation = false } = {}) {
  if (skipLocation) { ctx.state.prefs.locationPrimed = true; save(); }
  ctx.state.active = S.newSession();
  ctx.nudgeDismissed = false;
  save();
  keepalive.setSessionActive(true);
  go('live');
  // Sequenced ahead of the location dialog: Android shows one permission
  // prompt at a time and none while backgrounded, so left to the sensor's own
  // lazy request this sat unanswered until the walk was over.
  await keepalive.requestActivityPermission();
  if (!skipLocation) startTracking();
  else startSteps();
  ensureBatteryExemption();
}

// Asked once, the first time a night starts. After that the live screen just
// checks the state, so a user who declined isn't nagged every night — but is
// warned while it still matters.
async function ensureBatteryExemption() {
  const exempt = await keepalive.isExempt();
  ctx.batteryExempt = exempt;
  if (exempt === false && !ctx.state.prefs.batteryAsked) {
    ctx.state.prefs.batteryAsked = true;
    save();
    ctx.batteryExempt = await keepalive.requestExempt();
  }
  if (ctx.screen === 'live') render();
}

async function checkBattery() {
  const before = ctx.batteryExempt;
  ctx.batteryExempt = await keepalive.isExempt();
  if (before !== ctx.batteryExempt && ctx.screen === 'live') render();
}

async function checkPermissions({ toastResult = false } = {}) {
  ctx.permissions = await keepalive.permissionStatus();
  if (ctx.screen === 'settings' || ctx.screen === 'start') render();
  if (toastResult && ctx.permissions) {
    const missing = Object.values(ctx.permissions).filter((v) => !v).length;
    toast(missing ? `${missing} still to grant.` : 'All permissions granted.');
  }
}

// Battery has its own system dialog; the rest live on the app's settings page,
// which is also where Android hides "Allow all the time".
async function fixPermission(key) {
  if (key === 'battery') await keepalive.requestExempt();
  else if (key === 'activity') await keepalive.requestActivityPermission();
  else await keepalive.openAppSettings();
  checkPermissions();
}

async function fixBattery() {
  const granted = await keepalive.requestExempt();
  if (granted === false) await keepalive.openAppSettings();
  ctx.batteryExempt = granted;
  render();
}

async function endNight() {
  const s = ctx.state.active;
  if (!s) return;
  // Taps made from the notification shade land before the night closes.
  await drainQuickLogs({ silent: true });
  S.endSession(s);
  ctx.state.sessions.unshift(s);
  ctx.state.active = null;
  ctx.lastSession = s;
  ctx.newBadges = syncBadges();
  save();
  store.flush();
  keepalive.setSessionActive(false);
  keepalive.hideQuickLog();
  stopTracking();
  go('recap', s);
}

/* ---------- badges ---------- */

function syncBadges() {
  const have = new Set(ctx.state.badges.map((b) => b.slug));
  const earnable = badges.evaluate({
    sessions: ctx.state.sessions,
    prefs: ctx.state.prefs,
    flags: ctx.state.flags,
  });
  const fresh = earnable.filter((e) => !have.has(e.slug));
  if (fresh.length) {
    ctx.state.badges.push(...fresh.map((e) => ({ slug: e.slug, earnedAt: Date.now(), sessionId: e.sessionId })));
    save();
  }
  return fresh;
}

// The card export badge can only be earned outside endNight.
window.addEventListener('lc:card-exported', () => {
  ctx.state.flags.cardExported = true;
  const fresh = syncBadges();
  if (fresh.length) {
    const meta = badges.BADGES.find((b) => b.slug === fresh[0].slug);
    if (meta) toast(`Badge earned — ${meta.name}.`);
  }
});

/* ---------- quick log drain ---------- */

async function drainQuickLogs({ silent = false } = {}) {
  const s = ctx.state.active;
  const events = await keepalive.drainQuickLogs();
  if (!s || !events.length) return;
  for (const e of events) {
    const t = Number(e.t) || Date.now();
    if (e.type === 'water') S.addWater(s, t);
    else S.addDrink(s, ctx.state.prefs.recentDrinks[0] || 'Drink', t);
  }
  // Shade taps carry their own timestamps and may interleave with in-app logs.
  s.drinks.sort((a, b) => a.t - b.t);
  s.waters.sort((a, b) => a.t - b.t);
  save();
  if (!silent) {
    render();
    toast(`${events.length} logged from the notification.`);
  }
}

function logDrink(kind) {
  const s = ctx.state.active;
  if (!s) return;
  S.addDrink(s, kind);
  ctx.state.prefs.recentDrinks = remember(ctx.state.prefs.recentDrinks, kind);
  ctx.nudgeDismissed = false;
  save();
  render();
  buzz();
  // Keep the shade button labelled with the latest drink of choice.
  keepalive.showQuickLog(kind);
  // Tap-to-undo instead of a confirm step: logging stays two-second fast, and
  // a 2am mistap costs one tap to take back.
  toast(`${kind} logged. Tap to undo.`, 4000, () => {
    s.drinks.pop();
    save();
    render();
    toast('Undone.');
  });

  const every = ctx.state.prefs.hydrationEvery;
  const since = S.drinksSinceWater(s);
  if (every > 0 && since >= every) notify.hydrationNudge(since);
}

function logWater() {
  const s = ctx.state.active;
  if (!s) return;
  S.addWater(s);
  ctx.nudgeDismissed = false;
  save();
  render();
  notify.clearHydration();
  buzz();
  toast('Water logged. Tap to undo.', 4000, () => {
    s.waters.pop();
    save();
    render();
    toast('Undone.');
  });
}

function logMeal() {
  const s = ctx.state.active;
  if (!s) return;
  S.addMeal(s);
  save();
  render();
  buzz();
  toast('Food logged. Tap to undo.', 4000, () => {
    s.meals.pop();
    save();
    render();
    toast('Undone.');
  });
}

function addPin(pin) {
  const s = ctx.state.active;
  if (!s) return;
  S.addPin(s, pin);
  save();
}

/* ---------- tracking ---------- */

async function startTracking() {
  await geo.start({
    onFix: (fix) => {
      const s = ctx.state.active;
      if (!s) return;
      if (S.addFix(s, fix)) {
        save();
        if (ctx.screen === 'live') render();
        window.dispatchEvent(new CustomEvent('lc:fix', { detail: fix }));
      }
    },
    onStatus: (status) => {
      if (status === ctx.geoStatus) return;
      ctx.geoStatus = status;
      if (ctx.screen === 'live' || ctx.screen === 'map') render();
    },
  });
  startSteps();
  notify.init();
  keepalive.showQuickLog(ctx.state.prefs.recentDrinks[0] || 'Drink');
  keepalive.onQuickLog(() => drainQuickLogs());
  drainQuickLogs();
  requestWakeLock();
}

let lastStepsPaint = 0;

async function startSteps() {
  // Deltas, not totals: a process restart mid-night can then only ever
  // undercount, never rewind the tile.
  ctx.stepsAvailable = await steps.start((delta) => {
    const s = ctx.state.active;
    if (!s) return;
    s.steps += delta;
    save();
    const now = Date.now();
    if (ctx.screen === 'live' && document.visibilityState === 'visible' && now - lastStepsPaint > 4000) {
      lastStepsPaint = now;
      render();
    }
  });
  if (ctx.stepsAvailable && ctx.screen === 'live') render();
}

function stopTracking() {
  geo.stop();
  steps.stop();
  notify.clearHydration();
  ctx.geoStatus = 'idle';
  releaseWakeLock();
}

/* ---------- wake lock ----------
   On the web build this is the only thing keeping a session alive, since a
   locked browser stops delivering positions. On Android it is a courtesy —
   the foreground service does the real work. */

let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* denied or low battery */ }
}

function releaseWakeLock() {
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx.state.active) {
    requestWakeLock();
    render();
    // Coming back from the battery settings screen is the usual reason we're
    // visible again, so re-read the state rather than trusting the old answer.
    checkBattery();
    checkPermissions();
    drainQuickLogs();
  }
});

/* ---------- boot ---------- */

function boot() {
  store.installFlushHooks();

  const active = ctx.state.active;
  if (active && S.isStale(active)) {
    // Phone died, app was killed, night forgotten. Close it at the last known
    // activity rather than counting the hours since as time spent out.
    S.endSession(active, S.lastActivity(active));
    ctx.state.sessions.unshift(active);
    ctx.state.active = null;
    ctx.lastSession = active;
    save();
    store.flush();
    go('recap', active);
    toast('That session was left open, so it was closed for you.');
  } else if (active) {
    keepalive.setSessionActive(true);
    go('live');
    startTracking();
    ensureBatteryExemption();
  } else {
    keepalive.setSessionActive(false);
    go('start');
  }

  setInterval(() => ctx.tick?.(), 1000);
  checkPermissions();

  // Skipped on localhost: stale-while-revalidate would serve the previous
  // build on every edit, which looks like a code bug rather than a cache hit.
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocal) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

boot();
