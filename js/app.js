import * as store from './storage.js';
import * as S from './state.js';
import { mount, toast, dismissSheet, serviceNotice } from './ui.js';
import { startScreen, liveScreen, recapScreen, primingScreen } from './session.js';
import { remember } from './drinks.js';
import * as geo from './geo.js';
import { mapScreen, teardownMap } from './map.js';
import { historyScreen, detailScreen, settingsScreen } from './history.js';
import { cardScreen, shareScreen } from './card.js';
import * as steps from './steps.js';

const ctx = {
  state: store.load(),
  screen: 'start',
  arg: null,
  lastSession: null,
  geoStatus: 'idle',
  stepsAvailable: false,
  nudgeDismissed: false,
  tick: null,
  go, render, save, beginNight, startNight, grantThenStart, endNight, logDrink, logWater, addPin,
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

function grantThenStart() {
  ctx.state.prefs.locationPrimed = true;
  save();
  startNight();
}

function startNight({ skipLocation = false } = {}) {
  if (skipLocation) { ctx.state.prefs.locationPrimed = true; save(); }
  ctx.state.active = S.newSession();
  ctx.nudgeDismissed = false;
  save();
  go('live');
  if (!skipLocation) startTracking();
  else startSteps();
}

function endNight() {
  const s = ctx.state.active;
  if (!s) return;
  S.endSession(s);
  ctx.state.sessions.unshift(s);
  ctx.state.active = null;
  ctx.lastSession = s;
  save();
  store.flush();
  stopTracking();
  go('recap', s);
}

function logDrink(kind) {
  const s = ctx.state.active;
  if (!s) return;
  S.addDrink(s, kind);
  ctx.state.prefs.recentDrinks = remember(ctx.state.prefs.recentDrinks, kind);
  ctx.nudgeDismissed = false;
  save();
  render();
  toast(`${kind} logged.`);
}

function logWater() {
  const s = ctx.state.active;
  if (!s) return;
  S.addWater(s);
  ctx.nudgeDismissed = false;
  save();
  render();
  toast('Water logged.');
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
  requestWakeLock();
}

async function startSteps() {
  ctx.stepsAvailable = await steps.start((count) => {
    const s = ctx.state.active;
    if (!s) return;
    s.steps = count;
    save();
  });
  if (ctx.stepsAvailable && ctx.screen === 'live') render();
}

function stopTracking() {
  geo.stop();
  steps.stop();
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
    go('live');
    startTracking();
  } else {
    go('start');
  }

  setInterval(() => ctx.tick?.(), 1000);

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
