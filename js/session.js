import { el, btn, tile, spacer, sheet, toast, hhmm, longDuration, clockTime, shortDate, longDate, km, words } from './ui.js';
import * as S from './state.js';
import { pickDrink, remember } from './drinks.js';

/* ---------- 01 start ---------- */

export function startScreen(ctx) {
  const hasHistory = ctx.state.sessions.some((s) => s.endedAt);
  return [
    spacer(),
    el('div', { class: 'center' },
      el('div', { class: 'wordmark' }, 'LAST', el('br'), el('span', {}, 'CALL')),
      el('div', { class: 'cap', style: 'margin-top:10px;line-height:1.6' },
        'Track the night.', el('br'), 'Piece it together later.'),
    ),
    spacer(),
    btn('Start night', 'btn--pri', () => ctx.startNight()),
    hasHistory ? btn('History', 'btn--sec', () => ctx.go('history')) : null,
    btn('Settings', 'btn--ghost btn--sm', () => ctx.go('settings')),
  ];
}

/* ---------- 02 live session ---------- */

export function liveScreen(ctx) {
  const s = ctx.state.active;
  if (!s) { ctx.go('start'); return []; }

  const clock = el('div', { class: 'timer', text: hhmm(S.elapsedMs(s)) });
  ctx.tick = () => { clock.textContent = hhmm(S.elapsedMs(s)); };

  const since = S.drinksSinceWater(s);
  const behind = since >= ctx.state.prefs.hydrationEvery;

  const gpsNote = ctx.geoStatus === 'denied'
    ? 'Location is off, so there is no map tonight. Everything else is still tracked.'
    : ctx.geoStatus === 'waiting' && !s.trail.length
      ? 'Waiting for GPS. Everything else still works.'
      : null;

  return [
    el('div', { class: 'row' },
      el('div', { class: 'eb mint', text: 'On the night' }),
      el('div', { class: 'eb', text: shortDate(s.startedAt) }),
    ),
    clock,
    el('div', { class: 'cap', text: `Started ${clockTime(s.startedAt)}` }),

    el('div', { class: 'tiles' },
      tile('Drinks', s.drinks.length, { mod: 'tile__v--pink' }),
      tile('Water', s.waters.length),
    ),
    el('div', { class: 'tiles' },
      ctx.stepsAvailable ? tile('Steps', s.steps.toLocaleString(), { mod: 'tile__v--sm' }) : tile('Stops', s.pins.length, { mod: 'tile__v--sm' }),
      tile('Distance', km(s.distanceM), { unit: 'km', mod: 'tile__v--sm' }),
    ),

    behind ? el('div', { class: 'warn' },
      el('div', { class: 'eb amber', text: 'Hydration' }),
      el('div', { class: 'title', text: `${cap(words(since))} drinks since your last water.` }),
      btn('Log water', 'btn--pri btn--sm', () => ctx.logWater()),
    ) : null,

    gpsNote ? el('div', { class: 'cap', text: gpsNote }) : null,

    spacer(),

    btn('Add drink', 'btn--pri', () => {
      pickDrink(ctx.state.prefs, (kind) => ctx.logDrink(kind));
    }),
    btn('Hydrate', 'btn--pink', () => ctx.logWater()),
    el('div', { class: 'btn-pair' },
      btn('Map', 'btn--sec btn--sm', () => ctx.go('map')),
      btn('End', 'btn--sec btn--sm', () => confirmEnd(ctx)),
    ),
  ];
}

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/* ---------- 07 end confirm ---------- */

export function confirmEnd(ctx) {
  const s = ctx.state.active;
  if (!s) return;
  sheet((close) => [
    el('div', { class: 'title', style: 'font-size:21px', text: 'Call it a night?' }),
    el('div', { class: 'body' },
      `You've been out ${longDuration(S.elapsedMs(s))}. This stops tracking and builds your recap. You can't reopen a session once it's closed.`),
    btn('End and see recap', 'btn--pri', () => { close(); ctx.endNight(); }),
    btn('Keep going', 'btn--sec btn--sm', close),
  ]);
}

/* ---------- 08 recap ---------- */

export function recapScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  const sum = S.summarise(s);

  return [
    el('div', { class: 'eb pink', text: longDate(s.startedAt) }),
    el('div', { class: 'title', style: 'font-size:23px;letter-spacing:-.03em', text: 'That was a night.' }),

    el('div', { class: 'tile', style: 'padding:12px' }, routeSvg(s, 108)),

    el('div', { class: 'tiles' },
      tile('Duration', hhmm(sum.ms), { mod: 'tile__v--sm' }),
      tile('Drinks', sum.drinks, { mod: 'tile__v--sm tile__v--pink' }),
    ),
    el('div', { class: 'tiles' },
      tile('Stops', sum.stops, { mod: 'tile__v--sm' }),
      tile('Distance', km(sum.distanceM), { unit: 'km', mod: 'tile__v--sm' }),
    ),
    sum.kind ? el('div', { class: 'cap', text: `Mostly ${sum.kind.toLowerCase()}.` }) : null,

    spacer(),
    btn('Make a card', 'btn--pri', () => ctx.go('card', s)),
    btn('Just save it', 'btn--sec btn--sm', () => { toast('Saved to history.'); ctx.go('start'); }),
  ];
}

/* Route drawn as an SVG polyline rather than a map screenshot — same reason the
   share card is canvas-drawn: cross-origin tiles would taint any export. */
export function routeSvg(s, height = 108) {
  const pts = s.trail;
  const svg = el('svg', {
    viewBox: '0 0 100 50', style: `width:100%;height:${height}px;display:block`,
    'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet',
  });
  if (pts.length < 2) {
    svg.innerHTML = '<text x="50" y="27" text-anchor="middle" fill="#4D4D4D" font-size="5" font-family="system-ui">No route recorded</text>';
    return svg;
  }
  const fitted = fitPoints(pts, 100, 50, 8);
  const d = fitted.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = fitted[0];
  const last = fitted[fitted.length - 1];
  svg.innerHTML =
    `<polyline points="${d}" fill="none" stroke="#7EE0C0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${first.x.toFixed(1)}" cy="${first.y.toFixed(1)}" r="3" fill="#7EE0C0"/>` +
    `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3" fill="#F06C9B"/>`;
  return svg;
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

export { remember };
