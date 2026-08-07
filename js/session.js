import { el, btn, tile, tiles, glass, spacer, foot, head, navPair, sheet, toast, icon,
         hms, hm, longDuration, clockTime, shortDate, upperDate, km, words } from './ui.js';
import * as S from './state.js';
import { pickDrink, remember } from './drinks.js';
import { badgeChip, BADGES } from './badges.js';
import { checkIn } from './map.js';

/* ---------- 01 start ---------- */

export function startScreen(ctx) {
  const last = ctx.state.sessions.find((s) => s.endedAt);
  return [
    spacer(),
    el('div', { class: 'eb eb--mint-dim', text: 'Last Call' }),
    el('h1', { class: 'display', style: 'margin-top:10px' },
      'Track the night.', el('br'), 'Piece it together later.'),
    el('p', { class: 'body', style: 'max-width:300px;margin:12px 0 0',
      text: 'Steps, stops, drinks and water — kept on this phone, nowhere else.' }),
    el('div', { style: 'height:20px' }),
    last ? el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('detail', last) },
      el('span', { class: 'listrow__d', text: `Last night · ${shortDate(last.startedAt)}` }),
      el('span', { class: 'listrow__m' },
        el('b', { text: `${last.drinks.length} drink${last.drinks.length === 1 ? '' : 's'}` }),
        el('span', { text: hm(S.elapsedMs(last)) }),
      ),
    ) : null,
    foot(
      btn('Start night', 'btn--pri', () => ctx.beginNight(), { lg: true }),
      btn('History', 'btn--sec', () => ctx.go('history')),
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
      'Android opens its settings screen for this one — pick “Allow all the time”, then come back.'),
    el('p', { class: 'cap', style: 'color:var(--mint);margin:10px 0 0',
      text: 'Your location never leaves the phone.' }),
    spacer(),
    foot(
      btn('Open settings', 'btn--pri', () => ctx.grantThenStart(), { lg: true }),
      btn('Skip — track without the map', 'btn--sec', () => ctx.startNight({ skipLocation: true })),
    ),
  ];
}

/* ---------- 02 live session (06 renders inside it) ---------- */

export function liveScreen(ctx) {
  const s = ctx.state.active;
  if (!s) { ctx.go('start'); return []; }

  const clock = el('div', { class: 'timer', text: hms(S.elapsedMs(s)) });
  ctx.tick = () => { clock.textContent = hms(S.elapsedMs(s)); };

  const since = S.drinksSinceWater(s);
  const every = ctx.state.prefs.hydrationEvery;
  // every === 0 means reminders are off — without this guard the >= test is
  // always true and the banner would never leave the screen.
  const behind = every > 0 && since >= every && !ctx.nudgeDismissed;

  const gpsNote = ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported'
    ? 'Location is off, so there’s no map tonight. Drinks, water and time are all still being tracked.'
    : null;

  return [
    head({ eyebrow: 'On the night' }),
    clock,
    el('div', { class: 'cap', text: `Started ${clockTime(s.startedAt)}` }),

    tiles(
      tile('Drinks', s.drinks.length, { tone: 'drinks' }),
      tile('Water', s.waters.length),
      ctx.stepsAvailable
        ? tile('Steps', s.steps.toLocaleString())
        : tile('Stops', s.pins.length),
      tile('Distance', km(s.distanceM), { unit: 'km' }),
    ),

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
      el('div', { class: 'cap cap--up', text: 'Battery optimisation is on for Last Call, so your phone can put it to sleep mid-night.' }),
      btn('Fix it', 'btn--pink', () => ctx.fixBattery()),
    ) : null,

    gpsNote ? el('p', { class: 'cap cap--up', text: gpsNote }) : null,

    spacer(),

    foot(
      addDrinkButton(ctx),
      el('div', { class: 'btn-pair' },
        btn('Hydrate', 'btn--pink', () => ctx.logWater(), { iconName: 'droplet' }),
        btn('Food', 'btn--sec', () => ctx.logMeal()),
      ),
      el('div', { class: 'btn-pair btn-pair--3' },
        btn('Check in', 'btn--sec', () => checkIn(ctx, s), { iconName: 'map-pin' }),
        btn('Map', 'btn--sec', () => ctx.go('map')),
        btn('End', 'btn--sec', () => confirmEnd(ctx)),
      ),
    ),
  ];
}

// Tap opens the picker; holding for half a second logs your last drink
// straight away — round-buying mode, one thumb, no sheet.
function addDrinkButton(ctx) {
  const node = btn('Add drink', 'btn--pri', () => {
    if (node.dataset.held) { delete node.dataset.held; return; }
    pickDrink(ctx.state.prefs, (kind) => ctx.logDrink(kind));
  }, { iconName: 'plus', lg: true });

  let timer = null;
  node.addEventListener('pointerdown', () => {
    const last = ctx.state.prefs.recentDrinks[0];
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
    el('h2', { class: 'title', text: 'Call it a night?' }),
    el('p', { class: 'body', style: 'margin:0' },
      `You’ve been out ${longDuration(S.elapsedMs(s))}. This stops tracking and builds your recap. You can’t reopen a session once it’s closed.`),
    foot(
      btn('End night', 'btn--pri', () => { close(); ctx.endNight(); }),
      btn('Keep tracking', 'btn--sec', close),
    ),
  ]);
}

/* ---------- 08 recap ---------- */

export function recapScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  const sum = S.summarise(s);

  return [
    el('div', { class: 'eb', text: 'Last night' }),
    el('h1', { class: 'display', style: 'margin-top:7px', text: 'That was a night.' }),

    el('div', { style: 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap' },
      el('div', { class: 'timer timer--ended', text: hms(sum.ms) }),
      el('div', { class: 'cap', text: `${clockTime(s.startedAt)} — ${clockTime(s.endedAt)}` }),
    ),

    glass(routeSvg(s, 190)),

    tiles(
      tile('Drinks', sum.drinks, { tone: 'drinks' }),
      tile('Water', sum.waters),
      ctx.stepsAvailable ? tile('Steps', sum.steps.toLocaleString()) : tile('Distance', km(sum.distanceM), { unit: 'km' }),
      tile('Stops', sum.stops),
    ),

    gapNote(s),

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
    wrap.innerHTML = `${open}<text x="50" y="32" text-anchor="middle" fill="#4D4D4D" font-size="4.5" font-family="system-ui">No route recorded</text></svg>`;
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
    `<polyline points="${line}" fill="none" stroke="#7EE0C0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    stops.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.9" fill="#F06C9B"/>`).join('') +
    `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.2" fill="#fff"/>` +
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

export { remember, hm, upperDate };
