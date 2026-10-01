import { el, btn, tile, tiles, glass, spacer, foot, head, navPair, sheet, toast, icon, iconBtn,
         hms, hm, longDuration, clockTime, shortDate, upperDate, km, words, currentTheme } from './ui.js';
import * as S from './state.js';
import { pickDrink } from './drinks.js';
import { MODES, MODE_KEYS, recentFor } from './modes.js';
import { modePicker, modeChip, HINT } from './modepick.js';
import { bloomCss } from './glow.js';
import { wordmarkSvg } from './wordmark.js';
import { badgeChip, BADGES } from './badges.js';
import { checkIn } from './map.js';
import * as geo from './geo.js';
import { requestActivityPermission } from './keepalive.js';
import * as notify from './notify.js';
import { createAvatar } from './avatar.js';
import { liveTileKeys, doneTileKeys, paceLabel } from './stats.js';
import { avatarLook, openUnlocks, itemsForBadges, dressedFor } from './wardrobe.js';
import { t, phrase } from './words.js';

/* ---------- avatar ---------- */

export { avatarLook };

// The live screen rebuilds on every tap, so its avatar is one canvas carried
// across renders. A fresh one each time would cut every reaction off mid-way.
let liveAv = null;
function liveAvatar(ctx) {
  const look = ctx.state.active ? dressedFor(ctx, avatarLook(ctx), S.currentPart(ctx.state.active).mode) : avatarLook(ctx);
  if (!liveAv) liveAv = createAvatar({ cell: 3, look });
  liveAv.setLook(look);
  // After mount: the loop stops itself while the canvas is off the page.
  queueMicrotask(() => liveAv.start());
  return liveAv;
}

/** Plays a reaction on the live avatar, if it has been shown. */
export function react(name, opts) { liveAv?.play(name, opts); }

// How the night is going decides how the avatar idles between reactions. It
// livens up with water, food, stops and challenges — never with drinks.
function moodFor(s, prefs, now = Date.now()) {
  const every = prefs.hydrationEvery;
  if (every > 0 && S.drinksSinceWater(s) >= every) return 'Thirsty';
  const h = new Date(now).getHours();
  if ((h >= 1 && h < 6) || now - s.startedAt > 5 * 3600e3) return 'Sleepy';
  const recent = (list) => (list || []).filter((e) => now - e.t < 20 * 60e3).length;
  if (recent(s.waters) + recent(s.meals) + recent(s.pins) + recent(s.challenges) >= 3) return 'Buzzing';
  return 'Fresh';
}

/* ---------- 01 start ---------- */

export function startScreen(ctx) {
  const last = ctx.state.sessions.find((s) => s.endedAt);
  const av = createAvatar({ cell: 4, look: avatarLook(ctx), onTap: () => ctx.go('avatar'), label: 'Your avatar. Tap to customise.' });
  queueMicrotask(() => av.start());
  return [
    el('div', { class: 'topbar' }, iconBtn('settings', 'Settings', () => ctx.go('settings'))),
    spacer(),
    el('div', { class: 'avatar-home' },
      av.canvas,
      el('button', { class: 'chip press', type: 'button', onclick: () => ctx.go('avatar') }, 'Customise')),
    el('div', { class: 'eb eb--mint-dim brandmark' }, wordmarkSvg(15)),
    el('h1', { class: 'display', style: 'margin-top:10px' },
      t('Track the {n}.'), el('br'), 'Piece it together later.'),
    el('p', { class: 'body', style: 'max-width:300px;margin:12px 0 0',
      text: 'Steps, stops, drinks and water, saved on this phone.' }),
    el('div', { style: 'height:20px' }),
    // Caught before a night rather than discovered after one went unrecorded.
    ctx.permissions && Object.values(ctx.permissions).some((v) => !v)
      ? el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('settings') },
          el('span', { class: 'listrow__d', style: 'color:var(--amber)', text: 'Setup needs attention' }),
          el('span', { class: 'listrow__m' },
            el('span', { text: `${Object.values(ctx.permissions).filter((v) => !v).length} to grant` })),
        )
      : null,
    last ? el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('detail', last) },
      el('span', { class: 'listrow__d', text: `${t('Last {n}')} · ${shortDate(last.startedAt)}` }),
      el('span', { class: 'listrow__m' },
        el('b', { text: `${last.drinks.length} drink${last.drinks.length === 1 ? '' : 's'}` }),
        el('span', { text: hm(S.elapsedMs(last)) }),
      ),
    ) : null,
    foot(
      btn(t('Start {n}'), 'btn--pri', () => modePicker(ctx), { lg: true }),
      btn('History', 'btn--sec', () => ctx.go('history')),
    ),
  ];
}

/* ---------- first launch ----------
   Five steps, one idea each (design/round2/designs/Extras, 8c, plus the
   four kinds of adventure from M6). The avatar
   introduces itself and stays at the top, reacting to each step. Each
   permission step says why it's needed and what still works without it.
   Only for a genuinely new install: anyone with a night recorded skips it. */

const ONBOARD = [
  {
    brand: true, title: 'This is you, roughly.',
    body: 'It lives on this phone and keeps you company on your {ns}. You can change how it looks whenever you like.',
    note: 'No account needed. What you record is saved on this phone.',
    primary: 'Hello', secondary: 'Change the look first', face: null,
  },
  {
    // A preview only: tapping a kind dresses the avatar for it and saves nothing.
    eyebrow: 'Four kinds', title: 'Four kinds of {n}', modes: true,
    body: 'Choose one when you start. Each has its own colour, buttons and challenges, and you can switch partway if plans change.',
    note: 'Tap one to see what your avatar wears for it.',
    primary: 'Next', secondary: null, face: null,
  },
  {
    eyebrow: 'Location', title: 'Your phone will be in your pocket',
    body: 'Your phone will ask about location. Choose the option that allows it all the time, so the map keeps drawing with the screen off.',
    note: 'Your route is saved on this phone. Without location there’s no map, but drinks, water and time still work.',
    primary: 'Allow location', secondary: 'Skip, track without the map', face: { eyes: 'up', mouth: 'ooh' },
    // The settings route rather than the plugin's own prompt: "Allow all the
    // time" lives there on Android, and it's the path proven in the field.
    ask: async (ctx) => { ctx.state.prefs.locationPrimed = true; ctx.save(); await geo.openSettings(); },
  },
  {
    eyebrow: 'Steps', title: 'Counting steps',
    body: 'Your phone will ask about physical activity. That’s the step counter, which gives each {n} its step count.',
    note: 'Without it, there are no steps. Everything else still works.',
    primary: 'Allow steps', secondary: 'Skip steps', face: { eyes: 'wide', mouth: 'small' },
    ask: () => requestActivityPermission(),
  },
  {
    eyebrow: 'Notifications', title: 'One quiet notification',
    body: 'While {a} is running, a notification stays on your lock screen. It keeps tracking going, and you can log a drink or water from it without opening the app.',
    note: 'The only other one is the water reminder, which you can turn off.',
    primary: 'Allow and start', secondary: 'Not now', face: { eyes: 'content', mouth: 'smile', blush: 2 },
    ask: () => notify.init(),
  },
];

export const needsOnboarding = (state) => !state.flags?.onboarded && !state.sessions.length && !state.active;

export function onboardingScreen(ctx) {
  const i = Math.min(ctx.onboardStep || 0, ONBOARD.length - 1);
  const step = ONBOARD[i];
  const av = createAvatar({ cell: 4, look: avatarLook(ctx), label: 'Your avatar' });
  if (step.face) av.setFace(step.face);
  else av.play('hello');
  queueMicrotask(() => av.start());

  const to = (n) => { ctx.onboardStep = n; ctx.render(); };
  const finish = () => {
    ctx.state.flags.onboarded = true;
    ctx.save();
    ctx.onboardStep = 0;
    ctx.go('start', null, { replace: true });
  };
  const next = () => (i === ONBOARD.length - 1 ? finish() : to(i + 1));
  const allow = async () => {
    try { await step.ask?.(ctx); } catch { /* the step still moves on */ }
    next();
  };

  return [
    el('div', { class: 'onboard__top' },
      el('div', { class: 'onboard__dots', 'aria-label': `Step ${i + 1} of ${ONBOARD.length}` },
        ONBOARD.map((_, k) => el('span', { class: k <= i ? 'on' : '' }))),
      i > 0 ? el('button', { class: 'back press', type: 'button', onclick: () => to(i - 1) },
        icon('chevron-left', { size: 15 }), el('span', { text: 'Back' })) : null),
    el('div', { class: 'onboard__stage' }, av.canvas),
    step.brand
      ? el('div', { class: 'eb eb--mint-dim brandmark' }, wordmarkSvg(15))
      : el('div', { class: 'eb eb--mint-dim', text: step.eyebrow }),
    el('h1', { class: 'display', style: 'margin-top:10px', text: t(step.title) }),
    el('p', { class: 'body', style: 'margin:12px 0 0', text: t(step.body) }),
    step.modes ? modeRow(ctx, av) : null,
    el('p', { class: 'cap', style: 'margin:10px 0 0;color:var(--mint-dim)', text: step.note }),
    foot(
      btn(step.primary, 'btn--pri', allow, { lg: true }),
      step.secondary ? btn(step.secondary, 'btn--sec', () => (i === 0 ? ctx.go('avatar') : next())) : null,
    ),
  ];
}

// The four kinds in their glows. Tapping one dresses the avatar for it, the
// way it will look on that kind of adventure.
function modeRow(ctx, av) {
  const look = avatarLook(ctx);
  const row = el('div', { class: 'mode-row', role: 'group', 'aria-label': t('Kinds of {n}') });
  const show = (k) => {
    row.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === k ? 'true' : 'false'));
    av.setLook(dressedFor(ctx, look, k));
    av.play('checkin');
  };
  row.append(...MODE_KEYS.map((k) => el('button', {
    class: 'mode-tile mode-tile--mini press', type: 'button', 'data-mode': k, 'aria-pressed': 'false',
    'aria-label': `${MODES[k].label}. ${HINT[k]}`,
    style: `background:${bloomCss(MODES[k].glow, currentTheme()).hero},var(--surface)`,
    onclick: () => show(k),
  }, icon(MODES[k].icon, { size: 20 }), el('span', { class: 'mode-tile__name', text: MODES[k].label }))));
  return row;
}

/* ---------- the morning after ----------
   The first time the app opens after a night, until midday, it opens here
   instead of the start screen: the avatar in pyjamas with a mug, and the
   night in one line. Any button marks it seen. */

export function morningNight(state, now = Date.now()) {
  if (state.active) return null;
  const last = state.sessions.find((x) => x.endedAt);
  if (!last || state.flags?.morningSeen === last.id || !S.hasMorning(last)) return null;
  if (now - last.endedAt > 16 * 3600e3 || new Date(now).getHours() >= 12) return null;
  return last;
}

export function morningScreen(ctx, night) {
  const s = night || morningNight(ctx.state);
  if (!s) { ctx.go('start', null, { replace: true }); return []; }
  const sum = S.summarise(s);
  const seen = () => { ctx.state.flags.morningSeen = s.id; ctx.save(); };

  const base = avatarLook(ctx);
  const look = {
    ...base, top: 'pyjamas', messy: true, held: 'mug', hat: 'nightcap', costume: null,
    glasses: base.glasses === 'sun' ? 'none' : base.glasses,
    colors: { ...base.colors, top: '#3D6FB0' },
  };
  const av = createAvatar({ cell: 4, look, label: 'Your avatar, the morning after', onTap: () => av.play('morningwave') });
  av.setMood('Morning');
  queueMicrotask(() => av.start());

  const place = s.pins.length ? s.pins[s.pins.length - 1].name : null;
  return [
    el('div', { class: 'eb', text: place ? `${shortDate(s.startedAt)} · ${place}` : shortDate(s.startedAt) }),
    el('h1', { class: 'display', style: 'margin-top:4px', text: 'Morning.' }),
    el('div', { class: 'morning__stage' }, av.canvas),
    el('p', { class: 'body', style: 'margin:0',
      text: `You were out ${longDuration(sum.ms)} and home by ${clockTime(s.endedAt)}.` }),
    doneTiles(s),
    spacer(),
    foot(
      btn('Make a card', 'btn--pri', () => { seen(); ctx.go('card', s); }, { lg: true }),
      navPair([
        [t('See the {n}'), () => { seen(); ctx.go('detail', s); }],
        ['Not now', () => { seen(); ctx.go('start'); }],
      ]),
    ),
  ];
}

/* ---------- 13 permission priming ---------- */

export function primingScreen(ctx) {
  return [
    spacer(),
    icon('map-pin', { size: 26, color: 'var(--mint)' }),
    el('h1', { class: 'display', style: 'margin-top:14px' },
      'Your phone will be in your pocket'),
    el('p', { class: 'body', style: 'margin:12px 0 0' },
      'Android opens its settings screen for this one. Pick “Allow all the time”, then come back.'),
    el('p', { class: 'cap', style: 'color:var(--mint);margin:10px 0 0',
      text: 'Your route is saved on this phone.' }),
    spacer(),
    foot(
      btn('Open settings', 'btn--pri', () => ctx.grantThenStart(), { lg: true }),
      btn('Skip, track without the map', 'btn--sec', () => ctx.startNight({ skipLocation: true })),
    ),
  ];
}

/* ---------- 02 live session (06 renders inside it) ---------- */

export function liveScreen(ctx) {
  const s = ctx.state.active;
  if (!s) { ctx.go('start'); return []; }

  // role=timer is quiet to screen readers until asked, unlike the old live region.
  const clock = el('div', { class: 'timer', role: 'timer', text: hms(S.elapsedMs(s)) });
  const av = liveAvatar(ctx);
  av.setMood(moodFor(s, ctx.state.prefs));
  ctx.tick = () => {
    clock.textContent = hms(S.elapsedMs(s));
    // Pace changes with the clock even when no new position arrives. The whole
    // tile is swapped, so "Not yet" turning into a pace gains its /km.
    const paceOld = document.querySelector('[data-pace]');
    if (paceOld) { const fresh = paceTile(S.walkPace(s)); if (fresh.textContent !== paceOld.textContent) paceOld.replaceWith(fresh); }
    // Moods drift with the clock too: sleepy after 1am, busy spells fade.
    av.setMood(moodFor(s, ctx.state.prefs));
  };

  const since = S.drinksSinceWater(s);
  const every = ctx.state.prefs.hydrationEvery;
  // every === 0 means reminders are off — without this guard the >= test is
  // always true and the banner would never leave the screen.
  const behind = every > 0 && since >= every && !ctx.nudgeDismissed;

  const gpsNote = ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported'
    ? t('Location is off, so there’s no map for this {n}.') + ' Drinks, water and time are all still being tracked.'
    : null;

  return [
    head({ eyebrow: t('On the {n}'), actions: [
      iconBtn('award', 'Badges', () => ctx.go('badges')),
      iconBtn('settings', 'Settings', () => ctx.go('settings')),
    ] }),
    modeChip(ctx),
    el('div', { class: 'live-top' },
      el('div', {}, clock, el('div', { class: 'cap', text: `Started ${clockTime(s.startedAt)}` })),
      av.canvas),

    liveTiles(ctx, s),

    behind ? el('div', { class: 'warn' },
      el('div', { class: 'warn__h', text: `${words(since)} drinks since your last water.` }),
      el('div', { class: 'cap cap--up', text: 'Takes ten seconds. Tomorrow says thanks.' }),
      el('div', { class: 'btn-pair' },
        btn('Hydrate', 'btn--pink', () => ctx.logWater(), { iconName: 'droplet' }),
        btn('Later', 'btn--sec', () => { ctx.nudgeDismissed = true; ctx.render(); }),
      ),
    ) : null,

    // Same warning shape as hydration, because the consequence is comparable:
    // Samsung will stop the service and the rest of the night goes unrecorded.
    ctx.batteryExempt === false ? el('div', { class: 'warn' },
      el('div', { class: 'warn__h', text: 'Android may stop tracking.' }),
      el('div', { class: 'cap cap--up', text: 'Battery optimisation is on for Leit, so your phone can put it to sleep while you’re out.' }),
      btn('Fix it', 'btn--pink', () => ctx.fixBattery()),
    ) : null,

    gpsNote ? el('p', { class: 'cap cap--up', text: gpsNote }) : null,

    spacer(),

    foot(...liveButtons(ctx, s)),
  ];
}

// The mode decides which buttons show; the layout stays the same. Drink gets
// the full-width slot when the mode has it, the rest pair up, and End always
// takes the last half: it is the one irreversible action here and gets
// tapped at 2am, so it never sits in a three-up row.
function liveButtons(ctx, s) {
  const mode = S.currentPart(s).mode;
  const label = (k, fallback) => MODES[mode].labels?.[k] || fallback;
  const make = {
    water: () => btn('Hydrate', 'btn--pink', () => ctx.logWater(), { iconName: 'droplet' }),
    food: () => btn(label('food', 'Food'), 'btn--sec', () => ctx.logMeal()),
    more: () => btn('More', 'btn--sec', () => moreSheet(ctx)),
    set: () => btn('Saw a set', 'btn--sec', () => setSheet(ctx), { iconName: 'music' }),
    checkin: () => btn('Check in', 'btn--sec', () => checkIn(ctx, s), { iconName: 'map-pin' }),
    challenge: () => btn('Challenge', 'btn--sec', () => ctx.openChallenge(ctx, s)),
    map: () => btn('Map', 'btn--sec', () => ctx.go('map')),
  };
  const keys = MODES[mode].buttons;
  // The mode's first button leads full width: Add drink on a night out,
  // Hydrate on a walk.
  const [lead, ...others] = keys.filter((k) => k === 'drink' || make[k]);
  const top = lead === 'drink' ? addDrinkButton(ctx) : make[lead]();
  if (lead !== 'drink') top.classList.add('btn--lg');
  const rest = [...others.map((k) => make[k]()), btn(t('End {n}'), 'btn--sec', () => confirmEnd(ctx))];
  const rows = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(el('div', { class: 'btn-pair' }, rest.slice(i, i + 2)));
  return [top, ...rows];
}

/* ---------- stat tiles ----------
   Which four show is decided in stats.js (liveTileKeys, doneTileKeys); this
   turns the keys into tiles. */

function liveTiles(ctx, s) {
  const gps = !(ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported');
  const make = {
    steps: () => tile('Steps', s.steps.toLocaleString()),
    distance: () => tile('Distance', km(s.distanceM), { unit: 'km' }),
    pace: () => paceTile(S.walkPace(s)),
    water: () => waterTile(ctx, s),
    drinks: () => tile('Drinks', s.drinks.length, { tone: 'drinks' }),
    stops: () => tile('Stops', s.pins.length),
    sets: () => tile('Sets', (s.sets || []).length),
    food: () => tile(MODES[S.currentPart(s).mode].labels?.food || 'Food', (s.meals || []).length),
    challenges: () => tile('Challenges', (s.challenges || []).length),
  };
  return tiles(liveTileKeys(s, { gps, steps: ctx.stepsAvailable }).map((k) => make[k]()));
}

function doneTiles(s) {
  const sum = S.summarise(s);
  const make = {
    steps: () => tile('Steps', sum.steps.toLocaleString()),
    distance: () => tile('Distance', km(sum.distanceM), { unit: 'km' }),
    pace: () => paceTile(S.walkPace(s), true),
    water: () => tile('Water', sum.waters),
    drinks: () => tile('Drinks', sum.drinks, { tone: 'drinks' }),
    stops: () => tile('Stops', sum.stops),
    sets: () => tile('Sets', (s.sets || []).length),
    food: () => tile(S.onlyMode(s, 'walk') ? MODES.walk.labels.food : 'Food', (s.meals || []).length),
    challenges: () => tile('Challenges', (s.challenges || []).length),
  };
  return tiles(doneTileKeys(s).map((k) => make[k]()));
}

// Pace over the walk so far, stops included: it's how long the walk is
// taking, not a running split. Only the walk part counts.
function paceTile(p, done = false) {
  const { value, unit } = paceLabel(p, done);
  const node = unit ? tile('Pace', value, { unit }) : tile('Pace', value);
  node.dataset.pace = '';
  return node;
}

// Saw a set: type the act, or tap one already logged at this festival (any
// festival day in the last five, so day two can pick up day one's names).
function setSheet(ctx) {
  const s = ctx.state.active;
  const since = Date.now() - 5 * 24 * 3600e3;
  const recent = [s, ...ctx.state.sessions.filter((x) => x.startedAt >= since && S.hasMode(x, 'festival'))];
  const acts = S.festivalActs(recent).slice(-12).reverse();
  let name = '';
  sheet((close) => {
    const go = btn('Log set', 'btn--pri', () => { close(); ctx.logSet(name); }, { lg: true, disabled: true, iconName: 'music' });
    const input = el('input', {
      type: 'text', placeholder: 'Act name', 'aria-label': 'Act name', maxlength: 60, autocapitalize: 'words', enterkeyhint: 'done',
      oninput: (e) => { name = e.target.value; go.disabled = !name.trim(); },
      onkeydown: (e) => { if (e.key === 'Enter' && !go.disabled) go.click(); },
    });
    return [
      el('h2', { class: 'title', style: 'margin:0', text: 'Who are you watching?' }),
      acts.length ? el('div', { class: 'chips' }, acts.map((a) =>
        el('button', { class: 'chip press', type: 'button', onclick: () => { close(); ctx.logSet(a); } }, a))) : null,
      el('label', { class: 'field' }, el('div', { class: 'field__k', text: acts.length ? 'Someone else' : 'Act' }), input),
      foot(go),
    ];
  });
}

// Modes that keep the drink button out of the way put it here.
function moreSheet(ctx) {
  sheet((close) => [
    el('h2', { class: 'title', style: 'margin:0', text: 'More' }),
    foot(
      btn('Add drink', 'btn--pri', () => { close(); pickDrink(ctx.state.prefs, liveMode(ctx), (kind) => ctx.logDrink(kind)); }, { iconName: 'plus', lg: true }),
      btn('Keep going', 'btn--sec', close),
    ),
  ]);
}

// The water tile doubles as the way into its reminder setting: it's where you
// look when the nudge fires, so it's where the control belongs. The caption
// says the current setting so the tile advertises that it does something.
function waterTile(ctx, s) {
  const every = ctx.state.prefs.hydrationEvery;
  return el('button', {
    class: 'tile press', type: 'button', style: 'text-align:left;width:100%',
    'aria-label': `Water, ${s.waters.length}. Reminder settings`,
    onclick: () => hydrationSheet(ctx),
  },
    el('div', { class: 'tile__k', text: 'Water' }),
    el('div', { class: 'tile__v', text: String(s.waters.length) }),
    el('div', { class: 'cap', style: 'margin-top:2px',
      text: every ? `Remind every ${every} ›` : 'Reminders off ›' }),
  );
}

const THRESHOLDS = [3, 4, 5, 6, 8];

function hydrationSheet(ctx) {
  const p = ctx.state.prefs;
  sheet((close) => {
    const row = el('div', { class: 'chips' });
    const note = el('p', { class: 'body', style: 'margin:0' });
    const paint = () => {
      row.replaceChildren(
        ...[...THRESHOLDS.map((n) => [String(n), n]), ['Never', 0]].map(([label, n]) =>
          el('button', {
            class: 'chip press', type: 'button',
            'aria-pressed': p.hydrationEvery === n ? 'true' : 'false',
            onclick: () => {
              p.hydrationEvery = n;
              ctx.nudgeDismissed = false;
              ctx.save();
              paint();
            },
          }, label)),
      );
      note.textContent = p.hydrationEvery
        ? `You’ll get a nudge once you’re ${p.hydrationEvery} drinks past your last water.`
        : t('No water reminders this {n}.') + ' Everything else is tracked the same.';
    };
    paint();
    return [
      el('h2', { class: 'title', text: 'Water reminders' }),
      el('div', { class: 'eb', text: 'Remind me after' }),
      row,
      note,
      foot(btn('Done', 'btn--pri', () => { close(); ctx.render(); })),
    ];
  }, { onClose: () => ctx.render() });
}

const liveMode = (ctx) => (ctx.state.active ? S.currentPart(ctx.state.active).mode : 'night');

// Tap opens the picker; holding for half a second logs your last drink
// straight away — round-buying mode, one thumb, no sheet.
function addDrinkButton(ctx) {
  const node = btn('Add drink', 'btn--pri', () => {
    if (node.dataset.held) { delete node.dataset.held; return; }
    pickDrink(ctx.state.prefs, liveMode(ctx), (kind) => ctx.logDrink(kind));
  }, { iconName: 'plus', lg: true });

  let timer = null;
  node.addEventListener('pointerdown', () => {
    const last = recentFor(ctx.state.prefs, liveMode(ctx))[0];
    if (!last) return;
    timer = setTimeout(() => {
      node.dataset.held = '1';
      ctx.logDrink(last);
    }, 550);
  });
  for (const evt of ['pointerup', 'pointerleave', 'pointercancel']) {
    node.addEventListener(evt, () => clearTimeout(timer));
  }
  return node;
}

/* ---------- 07 end night ---------- */

export function confirmEnd(ctx) {
  const s = ctx.state.active;
  if (!s) return;
  sheet((close) => [
    el('h2', { class: 'title', text: phrase('endTitle') }),
    el('p', { class: 'body', style: 'margin:0' },
      `You’ve been out ${longDuration(S.elapsedMs(s))}. This stops tracking and builds your recap. Once it’s ended, it can’t be reopened.`),
    foot(
      btn(t('End {n}'), 'btn--pri', () => { close(); ctx.endNight(); }),
      btn('Keep tracking', 'btn--sec', close),
    ),
  ]);
}

/* ---------- 08 recap ---------- */

export function recapScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  const sum = S.summarise(s);

  // Yawns and dozes off. Badges that come with an item open the unlock sheet
  // instead of a celebration here; other new badges still get one. Once per
  // night: the recap re-renders when you come back and shouldn't replay.
  const av = createAvatar({ cell: 3, look: dressedFor(ctx, avatarLook(ctx), S.currentPart(s).mode) });
  av.setMood('Sleepy');
  if (ctx.recapPlayed !== s.id) {
    ctx.recapPlayed = s.id;
    const slugs = (ctx.newBadges || []).map((b) => b.slug);
    const unlocking = itemsForBadges(slugs).length > 0;
    if (slugs.length && !unlocking) { av.play('badge'); av.play('end', { queue: true }); }
    else av.play('end');
    if (unlocking) {
      // A beat after the recap lands, so the night's numbers register first.
      setTimeout(() => {
        if (ctx.screen === 'recap') openUnlocks(ctx, slugs, { onClose: () => av.setLook(dressedFor(ctx, avatarLook(ctx), S.currentPart(s).mode)) });
      }, 900);
    }
  }
  queueMicrotask(() => av.start());

  return [
    el('div', { class: 'eb', text: S.modeLine(s) }),
    el('h1', { class: 'display', style: 'margin-top:7px', text: phrase('recapTitle') }),

    el('div', { class: 'live-top' },
      el('div', { style: 'display:flex;align-items:baseline;gap:4px 10px;flex-wrap:wrap' },
        el('div', { class: 'timer timer--ended', text: hms(sum.ms) }),
        el('div', { class: 'cap', text: `${clockTime(s.startedAt)} to ${clockTime(s.endedAt)}` }),
      ),
      av.canvas),

    glass(routeSvg(s, 190)),

    // Walk tiles only for a walk from start to finish; a night out with a
    // walk home keeps its drinks.
    doneTiles(s),

    gapNote(s),

    (s.challenges || []).length
      ? el('p', { class: 'cap cap--up', style: 'margin:0',
          text: `${s.challenges.length} challenge${s.challenges.length === 1 ? '' : 's'} completed.` })
      : null,

    newBadgesRow(ctx),

    spacer(),
    foot(
      btn('Make a card', 'btn--pri', () => ctx.go('card', s), { lg: true }),
      btn('Just save it', 'btn--sec', () => { toast('Saved to history.'); ctx.go('start'); }),
    ),
  ];
}

// Say it plainly when the route has holes in it. The map draws a straight line
// across a gap, which would otherwise read as a walk that never happened.
// Badges earned by the night that just closed, shown once, right here.
function newBadgesRow(ctx) {
  const fresh = ctx.newBadges || [];
  if (!fresh.length) return null;
  return el('div', { class: 'stack', style: 'gap:7px' },
    el('div', { class: 'eb eb--mint', text: fresh.length === 1 ? 'New badge' : 'New badges' }),
    el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' },
      fresh.map((f) => {
        const meta = BADGES.find((b) => b.slug === f.slug);
        return el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:4px;width:72px' },
          badgeChip(f.slug, { size: 56 }),
          el('div', { class: 'cap', style: 'text-align:center;line-height:1.25', text: meta?.name || f.slug }),
        );
      })),
  );
}

function gapNote(s) {
  const gaps = S.trailGaps(s);
  if (!gaps.length) return null;
  const total = Math.round(S.missingMs(s) / 60000);
  return el('p', { class: 'cap cap--up', style: 'margin:0',
    text: gaps.length === 1
      ? `Tracking dropped for ${total} minutes, so part of the route is missing.`
      : `Tracking dropped ${gaps.length} times, ${total} minutes in total, so parts of the route are missing.` });
}

/* ---------- route ----------
   An SVG polyline rather than a map screenshot: cross-origin tiles would taint
   any canvas export, and the share card has to be exportable. */

export function routeSvg(s, height = 190) {
  const pts = s.trail;
  // Built as markup on a plain div: document.createElement('svg') produces an
  // HTML unknown element, not an SVG one, so it parses but never paints.
  // innerHTML on an HTML parent puts <svg> into the right namespace.
  const wrap = el('div', { style: `height:${height}px`, 'aria-hidden': 'true' });
  const open = `<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block">`;

  if (pts.length < 2) {
    wrap.innerHTML = `${open}<text x="50" y="32" text-anchor="middle" style="fill:var(--faint)" font-size="4.5" font-family="system-ui">No route recorded</text></svg>`;
    return wrap;
  }

  const fitted = fitPoints(pts, 100, 60, 9);
  const line = fitted.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Stops land on whichever recorded fix they were closest to in time.
  const stops = s.pins.map((pin) => {
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i].t - pin.t) < Math.abs(pts[best].t - pin.t)) best = i;
    }
    return fitted[best];
  });
  const last = fitted[fitted.length - 1];

  wrap.innerHTML = open +
    `<polyline points="${line}" fill="none" style="stroke:var(--mint)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    stops.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.9" style="fill:var(--pink)"/>`).join('') +
    `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.2" style="fill:var(--text)"/>` +
    `</svg>`;
  return wrap;
}

// Project lat/lng into a box, preserving aspect so the route isn't stretched.
export function fitPoints(pts, w, h, pad = 8) {
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  // Longitude degrees shrink with latitude; correct so shapes stay true.
  const midLat = (minLat + maxLat) / 2;
  const xScale = Math.cos((midLat * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * xScale, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const boxW = w - pad * 2, boxH = h - pad * 2;
  const k = Math.min(boxW / spanX, boxH / spanY);
  const offX = pad + (boxW - spanX * k) / 2;
  const offY = pad + (boxH - spanY * k) / 2;
  return pts.map((p) => ({
    x: offX + (p.lng - minLng) * xScale * k,
    y: offY + (maxLat - p.lat) * k,
  }));
}

export { hm, upperDate };
