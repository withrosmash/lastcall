import * as store from './storage.js';
import * as S from './state.js';
import { mount, toast, dismissSheet } from './ui.js';
import { startScreen, liveScreen, recapScreen } from './session.js';
import { remember } from './drinks.js';
import * as geo from './geo.js';
import { mapScreen, teardownMap } from './map.js';
import { historyScreen, detailScreen, settingsScreen } from './history.js';
import { cardScreen } from './card.js';
import * as steps from './steps.js';

const ctx = {
  state: store.load(),
  screen: 'start',
  arg: null,
  lastSession: null,
  geoStatus: 'idle',
  stepsAvailable: false,
  tick: null,
  go, save, startNight, endNight, logDrink, logWater, addPin,
};

const SCREENS = {
  start: startScreen,
  live: liveScreen,
  map: mapScreen,
  recap: (c) => recapScreen(c, c.arg),
  card: (c) => cardScreen(c, c.arg),
  history: historyScreen,
  detail: (c) => detailScreen(c, c.arg),
  settings: settingsScreen,
};

const FLUSH_SCREENS = new Set(['map']);

function go(screen, arg = null) {
  if (ctx.screen === 'map' && screen !== 'map') teardownMap();
  dismissSheet();
  ctx.screen = screen;
  ctx.arg = arg;
  render();
}

function render() {
  ctx.tick = null;
  const build = SCREENS[ctx.screen] || startScreen;
  mount(build(ctx), { flush: FLUSH_SCREENS.has(ctx.screen) });
}

function save() {
  store.save(ctx.state);
}

/* ---------- session actions ---------- */

function startNight() {
  ctx.state.active = S.newSession();
  save();
  go('live');
  startTracking();
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
  save();
  render();
  toast(`${kind} logged.`);
}

function logWater() {
  const s = ctx.state.active;
  if (!s) return;
  S.addWater(s);
  save();
  render();
  toast('Water logged. Good.');
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

  ctx.stepsAvailable = await steps.start((count) => {
    const s = ctx.state.active;
    if (!s) return;
    s.steps = count;
    save();
  });
  if (ctx.stepsAvailable && ctx.screen === 'live') render();

  requestWakeLock();
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
  if (document.visibilityState === 'visible') {
    if (ctx.state.active) { requestWakeLock(); render(); }
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
