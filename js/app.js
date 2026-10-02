import * as store from './storage.js';
import * as S from './state.js';
import { mount, toast, buzz, dismissSheet, serviceNotice, applyTheme, el } from './ui.js';
import { startScreen, liveScreen, recapScreen, primingScreen, react, morningScreen, morningNight, onboardingScreen, needsOnboarding } from './session.js';
import { createAvatar, setAvatarCalm } from './avatar.js';
import { avatarLook } from './wardrobe.js';
import { avatarScreen } from './avatarscreen.js';
import { MODES, recentFor, rememberFor } from './modes.js';
import { bloomCss } from './glow.js';
import { countCard } from './stats.js';
import { t } from './words.js';
import { wordmarkSvg } from './wordmark.js';
import * as geo from './geo.js';
import { mapScreen, teardownMap } from './map.js';
import { historyScreen, detailScreen, settingsScreen, appearanceScreen, numbersScreen } from './history.js';
import { cardScreen, shareScreen } from './card.js';
import * as badges from './badges.js';
import { atlasScreen } from './map.js';
import { festivalPickScreen, festivalScreen } from './festival.js';
import { openChallenge } from './challenges.js';
import * as steps from './steps.js';
import * as notify from './notify.js';
import * as keepalive from './keepalive.js';

const ctx = {
  state: store.load(),
  screen: 'start',
  arg: null,
  stack: [],
  lastSession: null,
  geoStatus: 'idle',
  stepsAvailable: false,
  nudgeDismissed: false,
  // null on the web, where battery optimisation isn't a concept.
  batteryExempt: null,
  tick: null,
  // null until a native status read lands; the web build stays null.
  permissions: null,
  go, back, render, save, applyAccessibility, beginNight, startNight, grantThenStart, endNight, switchMode, logSet, makeFestival, deleteFestival, logDrink, logWater, logMeal, logChallenge, openChallenge, addPin,
  fixBattery, checkBattery, checkPermissions, fixPermission, openAppSettings: keepalive.openAppSettings,
  setTheme,
};

const SCREENS = {
  start: { build: startScreen, bloom: 'hero' },
  priming: { build: primingScreen, bloom: 'hero' },
  live: { build: liveScreen, bloom: 'hero', tracking: true, glow: (c) => c.state.active && S.currentPart(c.state.active).mode },
  map: { build: mapScreen, bloom: 'none', tracking: true },
  recap: { build: (c) => recapScreen(c, c.arg), bloom: 'foot', glow: (c) => { const s = c.arg || c.lastSession; return s && S.currentPart(s).mode; } },
  card: { build: (c) => cardScreen(c, c.arg), bloom: 'none' },
  share: { build: (c) => shareScreen(c, c.arg), bloom: 'none' },
  history: { build: historyScreen, bloom: 'hero' },
  detail: { build: (c) => detailScreen(c, c.arg), bloom: 'hero' },
  settings: { build: settingsScreen, bloom: 'hero' },
  badges: { build: badges.badgesScreen, bloom: 'hero' },
  atlas: { build: atlasScreen, bloom: 'none' },
  festivalPick: { build: festivalPickScreen, bloom: 'none' },
  festival: { build: (c) => festivalScreen(c, c.arg), bloom: 'hero', glow: () => 'festival' },
  avatar: { build: avatarScreen, bloom: 'hero' },
  appearance: { build: appearanceScreen, bloom: 'hero' },
  numbers: { build: numbersScreen, bloom: 'hero' },
  morning: { build: (c) => morningScreen(c, c.arg), bloom: 'hero' },
  onboarding: { build: onboardingScreen, bloom: 'hero' },
};

// Screens the hardware back button should leave rather than unwind into: a
// closed night is done, and returning to the live screen of a finished session
// would be a lie.
const STACK_ROOTS = new Set(['start', 'live', 'recap', 'morning', 'onboarding']);
// Every screen that owns a Leaflet instance, so leaving any of them tears it
// down — previously only 'map' did, and detail/atlas left theirs alive.
const MAP_SCREENS = new Set(['map', 'detail', 'atlas']);

function go(screen, arg = null, { replace = false } = {}) {
  if (MAP_SCREENS.has(ctx.screen)) teardownMap();
  dismissSheet();
  if (!replace && ctx.screen && ctx.screen !== screen) {
    if (STACK_ROOTS.has(screen)) ctx.stack.length = 0;
    else ctx.stack.push({ screen: ctx.screen, arg: ctx.arg });
  }
  ctx.screen = screen;
  ctx.arg = arg;
  render();
}

// Android's back button: close a sheet, else unwind one screen, else leave the
// app running in the background. Never kills the process — a night may be
// recording, and exitApp would take the foreground service with it.
function back() {
  if (document.querySelector('.sheet')) { dismissSheet(); return; }
  const prev = ctx.stack.pop();
  if (prev) {
    if (MAP_SCREENS.has(ctx.screen)) teardownMap();
    ctx.screen = prev.screen;
    ctx.arg = prev.arg;
    render();
    return;
  }
  keepalive.minimize();
}

let lastMounted = null;

function render() {
  ctx.tick = null;
  const def = SCREENS[ctx.screen] || SCREENS.start;
  const tracking = def.tracking && !!ctx.state.active;
  const fresh = ctx.screen !== lastMounted;
  lastMounted = ctx.screen;
  mount(def.build(ctx), {
    bloom: def.bloom,
    chrome: tracking ? serviceNotice() : null,
    focus: fresh,
  });
  applyGlow(def.glow?.(ctx));
}

// A mode's own glow on the screens that belong to an adventure; Night out and
// every other screen keep the brand glow from the tokens.
function applyGlow(mode) {
  const node = document.getElementById('bloom');
  const glow = mode && mode !== 'night' ? MODES[mode]?.glow : null;
  if (glow) document.documentElement.dataset.glow = mode;
  else delete document.documentElement.dataset.glow;
  if (!glow) {
    node.style.removeProperty('--bloom-hero');
    node.style.removeProperty('--bloom-foot');
    return;
  }
  const { hero, foot } = bloomCss(glow, ctx.state.prefs.theme === 'light' ? 'light' : 'dark');
  node.style.setProperty('--bloom-hero', hero);
  node.style.setProperty('--bloom-foot', foot);
}

function save() { store.save(ctx.state); }

/* ---------- session actions ---------- */

// Android makes background location a separate trip to system settings, so the
// priming screen runs first — otherwise people deny it and the app silently
// fails at its one job.
// The picker's choice rides through the location priming screen, which
// starts the adventure itself once permission is sorted.
function beginNight(choice = {}) {
  ctx.pendingStart = choice;
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
  const prefs = ctx.state.prefs;
  const { mode = prefs.lastMode || 'night', company = prefs.lastCompany || 'group' } = ctx.pendingStart || {};
  ctx.pendingStart = null;
  prefs.lastMode = mode;
  prefs.lastCompany = company;
  ctx.state.active = S.newSession(Date.now(), { mode, company });
  ctx.nudgeDismissed = false;
  ctx.walkNudged = false;
  save();
  planWater();
  keepalive.setSessionActive(true);
  go('live');
  react('start');
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

// Change of plan: same adventure, new mode or company from this moment.
function switchMode(choice) {
  const s = ctx.state.active;
  const was = s && S.currentPart(s);
  if (!s || !S.switchPart(s, choice)) return;
  save();
  planWater();
  render();
  react('checkin');
  keepalive.showQuickLog(quickLogLabel());
  // Say what actually changed: the mode, or only who's with you.
  toast(was.mode !== choice.mode ? `Now a ${MODES[choice.mode].label.toLowerCase()}.`
    : choice.company === 'solo' ? 'Now on your own.' : 'Now with friends.');
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
    festivals: ctx.state.festivals || [],
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
  countCard(ctx.state.flags);
  save();
  const fresh = syncBadges();
  if (fresh.length) {
    const meta = badges.BADGES.find((b) => b.slug === fresh[0].slug);
    if (meta) toast(`Badge earned: ${meta.name}.`);
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
    else S.addDrink(s, recentFor(ctx.state.prefs, S.partAt(s, t).mode)[0] || 'Drink', t);
  }
  // Shade taps carry their own timestamps and may interleave with in-app logs.
  s.drinks.sort((a, b) => a.t - b.t);
  s.waters.sort((a, b) => a.t - b.t);
  save();
  if (events.some((e) => e.type === 'water')) { ctx.nudgeDismissed = false; ctx.walkNudged = false; planWater(); }
  if (!silent) {
    render();
    react(events[events.length - 1].type === 'water' ? 'water' : 'drink');
    toast(`${events.length} logged from the notification.`);
  }
}

// The shade's drink button logs the latest drink for the mode you're in.
function quickLogLabel() {
  const s = ctx.state.active;
  return (s && recentFor(ctx.state.prefs, S.currentPart(s).mode)[0]) || 'Drink';
}

function logDrink(kind) {
  const s = ctx.state.active;
  if (!s) return;
  S.addDrink(s, kind);
  rememberFor(ctx.state.prefs, S.currentPart(s).mode, kind);
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

  const w = S.waterDue(s, ctx.state.prefs);
  react('drink');
  // Drinks only count towards water away from a walk; a walk's reminder is timed.
  if (w.due && w.kind === 'drinks') {
    notify.hydrationNudge(w.since);
    // Finishes the sip first, then turns to you with the cup.
    react('nudge', { queue: true });
  }
}

function logWater() {
  const s = ctx.state.active;
  if (!s) return;
  S.addWater(s);
  ctx.nudgeDismissed = false;
  save();
  render();
  ctx.walkNudged = false;
  planWater();
  buzz();
  react('water');
  toast('Water logged. Tap to undo.', 4000, () => {
    s.waters.pop();
    save();
    planWater();
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
  react('food');
  toast(`${MODES[S.currentPart(s).mode].labels?.food || 'Food'} logged. Tap to undo.`, 4000, () => {
    s.meals.pop();
    save();
    render();
    toast('Undone.');
  });
}

/* ---------- festival reviews ---------- */

function makeFestival({ name, sessionIds }) {
  // Days in date order, whatever order they were ticked in.
  const ordered = S.daysInOrder(sessionIds, ctx.state.sessions).map((s) => s.id);
  const f = { id: 'fv' + Date.now().toString(36), name, sessionIds: ordered, createdAt: Date.now() };
  ctx.state.festivals = [f, ...(ctx.state.festivals || [])];
  const fresh = syncBadges();
  save();
  go('festival', f, { replace: true });
  const meta = fresh.length && badges.BADGES.find((b) => b.slug === fresh[0].slug);
  toast(meta ? `Festival made. Badge earned: ${meta.name}.` : 'Festival made.');
}

function deleteFestival(id) {
  ctx.state.festivals = (ctx.state.festivals || []).filter((f) => f.id !== id);
  save();
  back();
}

function logSet(name) {
  const s = ctx.state.active;
  if (!s || !name.trim()) return;
  const fix = s.trail[s.trail.length - 1];
  S.addSet(s, { name, lat: fix?.lat ?? null, lng: fix?.lng ?? null });
  save();
  render();
  buzz();
  react('checkin');
  toast(`${name.trim()} logged. Tap to undo.`, 4000, () => {
    s.sets.pop();
    save();
    render();
    toast('Undone.');
  });
}

function logChallenge(challenge) {
  const s = ctx.state.active;
  if (!s) return;
  S.addChallenge(s, challenge);
  save();
  render();
  buzz();
  react('cheer');
  toast('Challenge done. Tap to undo.', 4000, () => {
    s.challenges.pop();
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
  react('checkin');
}

/* ---------- tracking ---------- */

async function startTracking() {
  await geo.start({
    onFix: (fix) => {
      const s = ctx.state.active;
      if (!s) return;
      if (S.addFix(s, fix)) {
        S.placePending(s, s.trail[s.trail.length - 1]);
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
  notify.init().then(() => planWater());
  keepalive.showQuickLog(quickLogLabel());
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

// A walk's water reminder is timed, so it's scheduled ahead: at the start,
// after each water, on a switch, and when its setting changes. Anywhere else
// the reminder follows drinks, so nothing waits on the clock.
function planWater() {
  const s = ctx.state.active;
  const w = s && S.waterDue(s, ctx.state.prefs);
  if (w?.kind === 'time' && w.at) { if (!w.due) notify.waterAt(w.at); }
  else notify.clearHydration();
}
ctx.planWater = planWater;

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

// Takes effect at once: the whole UI reads colour from tokens, and maps pick
// their tiles when they are next opened.
// Bigger text and Calmer avatar (Settings, Accessibility).
function applyAccessibility() {
  const p = ctx.state.prefs;
  setAvatarCalm(p.calmAvatar);
  keepalive.setTextScale(p.biggerText ? 1.15 : 1);
}

function setTheme(theme) {
  ctx.state.prefs.theme = theme === 'light' ? 'light' : 'dark';
  save();
  keepalive.setSystemBars(applyTheme(ctx.state.prefs.theme));
  render();
}

/* The splash hand-off. Android's splash can only show the default face,
   because it's read from a fixed file before any app code runs. So the app's
   first frame puts the user's own avatar in the same circle, waving, then
   fades into the app. Native only: the web preview has no system splash. */
function handoff() {
  if (!geo.isNative()) return;
  const av = createAvatar({ cell: 1.5, look: avatarLook(ctx), label: 'Your avatar' });
  av.play('hello');
  const node = el('div', { class: 'handoff', 'aria-hidden': 'true' },
    el('div', { class: 'handoff__disc' }, av.canvas),
    el('span', { class: 'handoff__mark' }, wordmarkSvg(18)));
  document.body.append(node);
  av.start();
  setTimeout(() => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 320);
  }, 1100);
}

function boot() {
  store.installFlushHooks();
  keepalive.setSystemBars(applyTheme(ctx.state.prefs.theme));
  applyAccessibility();
  handoff();

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
    toast(t('Your last {n} was left open, so it was closed for you.'));
  } else if (active) {
    keepalive.setSessionActive(true);
    go('live');
    startTracking();
    ensureBatteryExemption();
  } else {
    keepalive.setSessionActive(false);
    // A new install gets the walkthrough; the first open after a night,
    // before midday, is the morning after.
    const night = morningNight(ctx.state);
    if (needsOnboarding(ctx.state)) go('onboarding');
    else if (night) go('morning', night);
    else go('start');
  }

  setInterval(() => ctx.tick?.(), 1000);
  checkPermissions();
  keepalive.onBackButton(() => back());

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
