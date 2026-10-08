import { el, btn, tile, tiles, glass, spacer, foot, head, toast, icon, switchRow, sheet,
         hms, hm, clockTime, shortDate, km } from './ui.js';
import * as S from './state.js';
import * as store from './storage.js';
import { routeSvg } from './session.js';
import { nightMap } from './map.js';
import { avatarLook } from './wardrobe.js';
import { saveTextFile } from './keepalive.js';
import { BADGES } from './badges-data.js';
import { t } from './words.js';
import { canMakeFestival } from './festival.js';
import { testerStats } from './stats.js';
import { clearVenueCache } from './venues.js';
import { MODES, MODE_KEYS } from './modes.js';

/* ---------- 11 history ---------- */

const PAGE = 40;

export function historyScreen(ctx) {
  const done = ctx.state.sessions.filter((s) => s.endedAt);
  const back = () => ctx.go(ctx.state.active ? 'live' : 'start');

  if (!done.length) {
    return [
      head({ eyebrow: 'History', title: 'Eight weeks', back }),
      spacer(),
      el('p', { class: 'body center', text: t('No {ns} yet. Your first one shows up here.') }),
      spacer(),
      foot(
        el('div', { class: 'btn-pair' },
          btn('Badges', 'btn--sec', () => ctx.go('badges')),
          btn('Settings', 'btn--sec', () => ctx.go('settings'))),
        btn('Import history', 'btn--sec', () => importData(ctx)),
      ),
    ];
  }

  const range = ctx.state.prefs.historyRange || '8w';
  const shown = done.filter((s) => S.inRange(s, done, range));
  const totalDrinks = shown.reduce((n, s) => n + s.drinks.length, 0);
  const buckets = S.chartBuckets(done, range);
  const peak = Math.max(...buckets.map((b) => b.value), 1);
  const rangeLabel = S.RANGES.find((r) => r.key === range)?.label || '8 weeks';

  return [
    head({ eyebrow: 'History', title: rangeLabel, back }),

    el('div', { class: 'chips' }, S.RANGES.map((r) =>
      el('button', {
        class: 'chip press', type: 'button',
        'aria-pressed': r.key === range ? 'true' : 'false',
        onclick: () => { ctx.state.prefs.historyRange = r.key; ctx.save(); ctx.render(); },
      }, r.label))),

    tiles(
      tile(t('{Ns}'), shown.length),
      tile('Drinks', totalDrinks, { tone: 'drinks' }),
    ),

    glass(
      el('div', { class: 'bars', role: 'img', 'aria-label': `Drinks per period: ${buckets.map((b) => b.value).join(', ')}` },
        buckets.map((b, i) => el('i', {
          class: i === buckets.length - 1 && b.value ? 'on' : '',
          style: `height:${Math.max(3, (b.value / peak) * 100)}%`,
        }))),
      el('div', { class: 'bars-x' }, buckets.map((b) => el('span', { text: b.label }))),
    ),

    el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('badges') },
      el('span', { class: 'listrow__d', text: 'Badges' }),
      el('span', { class: 'listrow__m' }, el('span', { text: `${ctx.state.badges.length} of ${BADGES.length}` })),
    ),
    done.some((s) => s.trail.length > 1)
      ? el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('atlas') },
          el('span', { class: 'listrow__d', text: 'Everywhere you’ve been' }),
          el('span', { class: 'listrow__m' }, el('span', { text: `${km(done.reduce((n, s) => n + s.distanceM, 0))} km` })),
        )
      : null,

    ...festivalRows(ctx),

    el('h2', { class: 'eb', style: 'margin:0', text: t('{Ns}') }),
    el('div', { class: 'stack', style: 'gap:6px' },
      shown.slice(0, ctx.historyLimit || PAGE).map((s) => {
        const sum = S.summarise(s);
        return el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('detail', s) },
          el('span', { class: 'listrow__d', text: `${shortDate(s.startedAt)} · ${S.modeLine(s)}` }),
          el('span', { class: 'listrow__m' },
            el('b', { text: `${sum.drinks} drink${sum.drinks === 1 ? '' : 's'}` }),
            el('span', { text: hm(sum.ms) }),
            el('span', { text: `${km(sum.distanceM)} km` }),
          ),
        );
      })),
    // Every adventure stays reachable, 40 at a time (kept for this visit).
    shown.length > (ctx.historyLimit || PAGE)
      ? btn(`Show more (${shown.length - (ctx.historyLimit || PAGE)} more)`, 'btn--sec', () => {
        ctx.historyLimit = (ctx.historyLimit || PAGE) + PAGE;
        ctx.render();
      })
      : null,

    spacer(),
    foot(
      btn('Export history', 'btn--sec', () => exportData(), { iconName: 'download' }),
      btn('Settings', 'btn--sec', () => ctx.go('settings')),
    ),
  ];
}

const dayCount = (n) => `${n} day${n === 1 ? '' : 's'}`;

// Festival reviews, newest first, and the way to make one once there are two
// festival days to bring together.
function festivalRows(ctx) {
  const reviews = ctx.state.festivals || [];
  if (!reviews.length && !canMakeFestival(ctx)) return [];
  return [
    el('h2', { class: 'eb', style: 'margin:0', text: 'Festivals' }),
    el('div', { class: 'stack', style: 'gap:6px' },
      reviews.map((f) => el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('festival', f) },
        el('span', { class: 'listrow__d', text: f.name }),
        el('span', { class: 'listrow__m' }, el('span', { text: dayCount(f.sessionIds.filter((id) => ctx.state.sessions.some((s) => s.id === id)).length) })))),
      canMakeFestival(ctx)
        ? el('button', { class: 'listrow press', type: 'button', onclick: () => { ctx.festivalPick = null; ctx.go('festivalPick'); } },
          el('span', { class: 'listrow__d', text: 'Make a festival' }),
          el('span', { class: 'listrow__m' }, icon('plus', { size: 14 })))
        : null),
  ];
}

/* ---------- your numbers ----------
   One screen a tester can screenshot and send back. Everything here is read
   from the phone's own data; nothing is sent anywhere. */

export function numbersScreen(ctx) {
  const st = testerStats(ctx.state);
  const row = (label, value) => el('div', { class: 'listrow' },
    el('span', { class: 'listrow__d', text: label }),
    el('span', { class: 'num', style: 'font:700 15px/1 var(--font-sans);color:var(--text)', text: String(value) }));
  const since = st.since ? `Counting from your first ${t('{n}')}, ${shortDate(st.since)}.` : null;
  const cardsSince = st.cardsSince && (!st.since || st.cardsSince > st.since)
    ? `Cards counted from ${shortDate(st.cardsSince)}.` : null;

  return [
    head({ eyebrow: 'Settings', title: 'Your numbers', back: () => ctx.back() }),
    el('p', { class: 'body', style: 'margin:0', text: 'Testing Sprell? Screenshot this and send it over. These numbers stay on your phone until you send them.' }),
    tiles(
      tile(t('{Ns}'), st.adventures),
      tile('Last 30 days', st.last30),
      tile('Weeks out', st.weeks),
      tile('Average', hm(st.avgMs)),
    ),
    el('div', { class: 'stack', style: 'gap:6px' },
      ...MODE_KEYS.map((k) => row(MODES[k].label, st.byMode[k])),
      row('Switched mode', st.switched),
      row('On your own', st.solo)),
    tiles(
      tile('Challenges', st.challenges),
      tile('Badges', `${st.badges} of ${BADGES.length}`),
      tile('Cards', st.cards),
      tile('Festivals made', st.festivals),
    ),
    since || cardsSince ? el('p', { class: 'cap', style: 'margin:0', text: [since, cardsSince].filter(Boolean).join(' ') }) : null,
    spacer(),
  ];
}

/* ---------- settings ---------- */

const THRESHOLDS = [3, 4, 5, 6, 8];

// Each row names what breaks when it's missing — a checklist is only useful if
// it says why the item matters.
const PERMISSIONS = [
  { key: 'fineLocation', name: 'Location', why: 'Without it there is no map and no route on your card.' },
  { key: 'backgroundLocation', name: 'Location all the time', why: 'Lets the route keep drawing with the phone in your pocket.' },
  { key: 'activity', name: 'Physical activity', why: 'The step count comes from the phone’s own step sensor.' },
  { key: 'notifications', name: 'Notifications', why: 'Carries the tracking notice, quick log and water nudge.' },
  { key: 'battery', name: 'Unrestricted battery', why: 'Stops Android putting the app to sleep while you’re out.' },
];

export function permissionRows(ctx) {
  const status = ctx.permissions;
  if (!status) return null;
  const missing = PERMISSIONS.filter((p) => !status[p.key]);

  return el('div', { class: 'stack', style: 'gap:7px' },
    el('div', { class: 'eb', text: 'Permissions' }),
    el('p', { class: 'cap cap--up', style: 'margin:0',
      text: missing.length
        ? `${missing.length} of ${PERMISSIONS.length} still needed. Tracking works best with all of them.`
        : t('All set. Your {ns} can record with the screen off.') }),
    ...PERMISSIONS.map((p) => {
      const ok = status[p.key];
      return el('div', { class: 'tile', style: 'display:flex;gap:10px;align-items:flex-start' },
        el('span', { style: `color:${ok ? 'var(--mint)' : 'var(--amber)'};font-weight:700;font-size:13px;line-height:1.5`, text: ok ? '✓' : '!' }),
        el('div', { style: 'flex:1;min-width:0' },
          el('div', { style: 'font-size:13px;font-weight:600', text: p.name }),
          el('div', { class: 'cap', style: 'line-height:1.4', text: p.why }),
        ),
        ok ? null : el('button', {
          class: 'chip press', type: 'button', style: 'min-height:36px;padding:0 12px;font-size:11px',
          onclick: () => ctx.fixPermission(p.key),
        }, 'Fix'),
      );
    }),
    el('div', { class: 'btn-pair' },
      btn('Re-check', 'btn--sec btn--sm', () => ctx.checkPermissions({ toastResult: true })),
      btn('App settings', 'btn--sec btn--sm', () => ctx.openAppSettings()),
    ),
  );
}

export function settingsScreen(ctx) {
  const p = ctx.state.prefs;

  // Chips rather than a number field: this gets used one-handed, and Chip
  // already carries the system's selected state. Re-render the whole screen on
  // change so the explanatory line below tracks the choice.
  const pick = (n) => { p.hydrationEvery = n; ctx.save(); ctx.render(); };
  const choice = (label, n) => el('button', {
    class: 'chip press', type: 'button',
    'aria-pressed': p.hydrationEvery === n ? 'true' : 'false',
    onclick: () => pick(n),
  }, label);

  const walkChoice = (label, n) => el('button', {
    class: 'chip press', type: 'button',
    'aria-pressed': (p.walkWaterEvery ?? 30) === n ? 'true' : 'false',
    onclick: () => { p.walkWaterEvery = n; ctx.walkNudged = false; ctx.nudgeDismissed = false; ctx.save(); ctx.planWater?.(); ctx.render(); },
  }, label);

  const row = el('div', { class: 'chips' },
    THRESHOLDS.map((n) => choice(String(n), n)),
    choice('Never', 0),
  );

  return [
    head({ title: 'Settings', back: () => ctx.back() }),

    el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('appearance') },
      el('span', { class: 'listrow__d', text: 'Appearance' }),
      el('span', { class: 'listrow__m' }, el('span', { text: p.theme === 'light' ? 'Light' : 'Dark' }))),
    el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('numbers') },
      el('span', { class: 'listrow__d', text: 'Your numbers' }),
      el('span', { class: 'listrow__m' }, el('span', { text: 'For testers' }))),

    el('h2', { class: 'eb', style: 'margin:0', text: 'Remind me to drink water after' }),
    row,
    el('p', { class: 'body', style: 'margin:0' },
      p.hydrationEvery
        ? `You’ll get a nudge once you’re ${p.hydrationEvery} drinks past your last water.`
        : 'No water reminders. Everything else is tracked the same.'),

    el('h2', { class: 'eb', style: 'margin:0', text: 'On a walk, remind me after' }),
    el('div', { class: 'chips' },
      [20, 30, 45, 60].map((n) => walkChoice(`${n} min`, n)),
      walkChoice('Never', 0),
    ),
    el('p', { class: 'body', style: 'margin:0' },
      (p.walkWaterEvery ?? 30)
        ? `On a walk the reminder goes by time: a nudge ${p.walkWaterEvery ?? 30} minutes after your last water.`
        : 'No water reminders on a walk.'),

    el('h2', { class: 'eb', style: 'margin:0', text: 'Accessibility' }),
    switchRow({
      label: 'Show my avatar',
      hint: 'On the start, live and recap screens, and on new cards. Badges still unlock its items.',
      on: p.showAvatar !== false,
      onChange: (on) => { p.showAvatar = on; ctx.save(); ctx.render(); },
    }),
    switchRow({
      label: 'Bigger text',
      hint: 'Makes the text larger, on top of your phone’s own text size.',
      on: p.biggerText,
      onChange: (on) => { p.biggerText = on; ctx.save(); ctx.applyAccessibility(); },
    }),
    switchRow({
      label: 'Calmer avatar',
      hint: 'Stays put between reactions, and reacts when you log something.',
      on: p.calmAvatar,
      onChange: (on) => { p.calmAvatar = on; ctx.save(); ctx.applyAccessibility(); },
    }),

    permissionRows(ctx),

    spacer(),
    foot(
      btn('Import history', 'btn--sec', () => importData(ctx)),
    ),
  ];
}

/* ---------- appearance ---------- */

// Two tiles with a miniature of each theme. Choosing one switches at once.
// No "match phone": this is mostly used in dark rooms, and a phone that turns
// light at sunrise would flip the app mid-morning-after.
const THEMES = [
  { k: 'dark', label: 'Dark', bg: '#000000', ink: '#FFFFFF', tile: '#141414' },
  { k: 'light', label: 'Light', bg: '#EEF2F8', ink: '#0B1526', tile: '#FFFFFF' },
];

export function appearanceScreen(ctx) {
  const current = ctx.state.prefs.theme === 'light' ? 'light' : 'dark';
  const mini = (t) => el('div', { class: 'mini', style: `background:${t.bg}` },
    el('i', { class: 'mini__title', style: `background:${t.ink}` }),
    el('i', { class: 'mini__tile', style: `left:8px;background:${t.tile}` }),
    el('i', { class: 'mini__tile', style: `right:8px;background:${t.tile}` }),
    el('i', { class: 'mini__btn' }));

  return [
    head({ eyebrow: 'Settings', title: 'Appearance', back: () => ctx.back() }),
    el('div', { class: 'theme-pick' }, THEMES.map((t) =>
      el('button', {
        class: 'theme-tile press', type: 'button', 'aria-pressed': t.k === current ? 'true' : 'false',
        onclick: () => { if (t.k !== current) ctx.setTheme(t.k); },
      }, mini(t), el('span', { class: 'theme-tile__name', text: t.label })))),
    el('p', { class: 'body', style: 'margin:0', text: current === 'light'
      ? 'Easier to read in daylight. Dark saves battery on most phones and is kinder to your eyes in a dark room.'
      : 'The default. Saves battery on most phones and is kinder to your eyes in a dark room.' }),
    spacer(),
  ];
}

/* ---------- 12 night detail ---------- */

export function detailScreen(ctx, session) {
  const s = session;
  if (!s) { ctx.go('history'); return []; }
  const sum = S.summarise(s);

  return [
    head({ eyebrow: `${shortDate(s.startedAt)} · ${S.modeLine(s)}`, title: `${hm(sum.ms)} out`, back: () => ctx.back() }),

    ...rewind(ctx, s),

    detailTiles(s, sum),

    el('div', { class: 'eb', text: 'Timeline' }),
    (() => {
      const entries = [
        ...s.pins.map((p) => ({ t: p.t, pin: true, label: p.note ? `${p.name} · ${p.note}` : p.name })),
        ...(s.meals || []).map((m) => ({ t: m.t, pin: false, label: MODES[S.partAt(s, m.t).mode]?.labels?.food || 'Food' })),
        ...(s.sets || []).map((x) => ({ t: x.t, pin: false, set: true, label: `Set: ${x.name}` })),
        ...(s.challenges || []).map((c) => ({ t: c.t, pin: false, label: `Challenge: ${c.text}` })),
        ...s.waters.map((w) => ({ t: w.t, pin: false, label: 'Water' })),
      ].sort((a, b) => a.t - b.t);
      return entries.length
        ? el('div', { class: 'tl' }, entries.map((e) =>
            el('div', { class: 'tl__i' },
              e.pin ? icon('map-pin', { size: 15 }) : e.set ? el('span', { style: 'display:inline-flex;color:var(--amber)' }, icon('music', { size: 15 })) : el('span', { style: 'width:15px' }),
              el('span', { class: 'tl__n', text: e.label }),
              el('span', { class: 'tl__t', text: clockTime(e.t) }),
            )))
        : el('p', { class: 'cap cap--up', text: 'No stops pinned on this one.' });
    })(),

    spacer(),
    foot(
      btn('Make a card', 'btn--pri', () => ctx.go('card', s), { lg: true }),
      s.trail.length > 1 ? btn('Export route (GPX)', 'btn--sec', () => exportGpx(s)) : null,
      btn(t('Delete {n}'), 'btn--sec', () => confirmDelete(ctx, s)),
    ),
  ];
}

// Two tiles that suit the adventure: a walk leads with distance and pace, a
// festival with sets, everything else with drinks. Nothing unmeasured shows.
function detailTiles(s, sum) {
  const route = s.trail.length > 1;
  const dist = route ? tile('Distance', km(sum.distanceM), { unit: 'km' }) : null;
  const pace = route ? S.walkPace(s) : null;
  const list = S.onlyMode(s, 'walk')
    ? [dist, pace ? tile('Pace', pace, { unit: '/km' }) : null, sum.steps ? tile('Steps', sum.steps.toLocaleString()) : null, tile('Stops', sum.stops)]
    : S.hasMode(s, 'festival')
      ? [tile('Sets', (s.sets || []).length), dist, tile('Drinks', sum.drinks, { tone: 'drinks' })]
      : [tile('Drinks', sum.drinks, { tone: 'drinks' }), dist, tile('Stops', sum.stops)];
  return tiles(list.filter(Boolean).slice(0, 2));
}

/* ---------- rewind ----------
   A slider from the start of the night to the end. Drag it and the map shows
   where you were at that moment, what you'd drunk by then, and the last place
   you'd checked in — the thing that actually jogs a memory the next morning. */

function rewind(ctx, s) {
  const start = s.startedAt;
  const end = s.endedAt || Date.now();
  const span = Math.max(1, end - start);
  const hasRoute = s.trail.length > 1;

  const host = el('div', { id: 'map', role: 'application', 'aria-label': 'Your route' });
  const ctl = hasRoute ? nightMap(host, s, avatarLook(ctx)) : { setTime: () => {}, stand: () => {} };

  const clock = el('div', { class: 'num', style: 'font:var(--type-stat);letter-spacing:var(--tr-stat)' });
  const where = el('div', { class: 'rewind__place' });

  // Within 2.5% of the night either side of a check-in, you were there.
  const show = (t, walking = false) => {
    const near = s.pins.find((p) => Math.abs(p.t - t) / span <= 0.025);
    clock.textContent = clockTime(t);
    where.textContent = near ? near.name : 'Between stops';
    slider?.setAttribute('aria-valuetext', `${clockTime(t)}, ${near ? `at ${near.name}` : 'between stops'}`);
    where.classList.toggle('is-stop', !!near);
    ctl.setTime(t, { walking });
  };

  const slider = el('input', {
    type: 'range', min: '0', max: '1000', value: '1000', step: '1',
    class: 'rewind', 'aria-label': t('Time through the {n}'),
    oninput: (e) => {
      e.target.style.setProperty('--fill', `${Number(e.target.value) / 10}%`);
      show(start + (span * Number(e.target.value)) / 1000, true);
    },
    onchange: () => ctl.stand(),
  });
  const ticks = s.pins.map((p) => el('span', {
    class: 'rewind__tick',
    style: `left:calc(12px + (100% - 24px) * ${Math.min(1, Math.max(0, (p.t - start) / span)).toFixed(4)})`,
  }));
  queueMicrotask(() => show(end));

  return [
    hasRoute
      ? el('div', { class: 'map-wrap', style: 'flex:0 0 240px;min-height:240px' }, host)
      : el('div', { class: 'glass', style: 'text-align:center' },
          el('p', { class: 'cap cap--up', style: 'margin:0', text: t('No route was recorded on this {n}.') })),
    el('div', { class: 'stack', style: 'gap:4px' },
      el('div', { class: 'row', style: 'align-items:baseline' }, clock, where),
      el('div', { class: 'rewind__wrap' }, slider, ...ticks),
      el('div', { class: 'row cap', style: 'justify-content:space-between' },
        el('span', { text: clockTime(start) }),
        el('span', { text: clockTime(end) }),
      ),
    ),
  ];
}

/* ---------- GPX ----------
   The night's route in the format every fitness app ingests. */

const escapeXml = (str) => String(str).replace(/[<>&'"]/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

// Children in the order GPX 1.1 requires (time, name, type), or strict
// importers reject the file.
export function toGpx(s) {
  const name = `Sprell, ${shortDate(s.startedAt)}`;
  const points = s.trail.map((p) =>
    `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('\n');
  const sets = (s.sets || []).filter((x) => x.lat != null).map((x) =>
    `<wpt lat="${x.lat}" lon="${x.lng}"><time>${new Date(x.t).toISOString()}</time><name>${escapeXml(x.name)}</name><type>set</type></wpt>`).join('\n');
  const stops = s.pins.filter((p) => p.lat != null).map((p) =>
    `<wpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time><name>${escapeXml(p.name)}</name></wpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sprell" xmlns="http://www.topografix.com/GPX/1/1">
${stops}
${sets}
<trk><name>${escapeXml(name)}</name><trkseg>
${points}
</trkseg></trk>
</gpx>`;
}

async function exportGpx(s) {
  const name = `sprell-${new Date(s.startedAt).toISOString().slice(0, 10)}.gpx`;
  await exportText(name, 'application/gpx+xml', toGpx(s), 'Route saved to Downloads › Sprell.');
}

function confirmDelete(ctx, s) {
  // Reuses the end-night sheet shape: flat statement, then the smallest reason.
  import('./ui.js').then(({ sheet }) => {
    sheet((close) => [
      el('h2', { class: 'title', text: t('Delete this {n}?') }),
      el('p', { class: 'body', style: 'margin:0', text: 'It goes for good. Export first if you want to keep it.' }),
      foot(
        btn('Delete', 'btn--pri', () => {
          ctx.state.sessions = ctx.state.sessions.filter((x) => x.id !== s.id);
          ctx.save();
          store.flush();
          // The venue squares on the phone mark roughly where you checked in.
          clearVenueCache();
          close();
          // Back, not forward: the screen before was the list (or wherever the
          // adventure was opened from), and nothing should lead back to it.
          if (ctx.stack.length) ctx.back();
          else ctx.go('history', null, { replace: true });
          toast(t('{N} deleted.'));
        }),
        btn('Keep it', 'btn--sec', close),
      ),
    ]);
  });
}

/* ---------- export / import ---------- */

export function exportData() {
  const name = `sprell-${new Date().toISOString().slice(0, 10)}.json`;
  exportText(name, 'application/json', store.exportJSON(), 'History saved to Downloads › Sprell.');
}

// Native writes through MediaStore — the WebView silently drops <a download>
// clicks, which is how "Export" used to export to nowhere on the phone.
async function exportText(name, mime, text, nativeMsg) {
  try {
    if (await saveTextFile(name, mime, text)) { toast(nativeMsg); return; }
  } catch {
    toast('Saving failed. Check storage and try again.');
    return;
  }
  download(new Blob([text], { type: mime }), name);
  toast('Exported.');
}

function importData(ctx) {
  // Import replaces everything, so it never runs over a live adventure and
  // always says what it's about to replace. The old history can be put back.
  if (ctx.state.active) { toast(t('End your {n} before importing.')); return; }
  const input = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    let text;
    try { text = await file.text(); } catch { toast('That file couldn’t be read.'); return; }
    const checked = store.checkImport(text);
    if (!checked.ok) { toast('That file isn’t a Sprell export.'); return; }
    const mine = ctx.state.sessions.length;
    sheet((close) => [
      el('h2', { class: 'title', text: 'Replace your history?' }),
      el('p', { class: 'body', style: 'margin:0', text: `This replaces your ${countOf(mine)} with the ${countOf(checked.count)} in the file. You can undo it straight after.` }),
      foot(
        btn('Replace', 'btn--pri', () => {
          close();
          const next = store.importJSON(text);
          if (!next) { toast('There isn’t room on this phone to import that file.'); return; }
          ctx.state = next;
          clearVenueCache();
          ctx.go('history', null, { replace: true });
          toast('Imported. Tap to undo.', 0, () => {
            const back = store.undoImport();
            if (!back) { toast('Couldn’t undo the import.'); return; }
            ctx.state = back;
            ctx.go('history', null, { replace: true });
            toast('Your history is back.');
          });
          // The undo lasts as long as its toast; then the backup copy goes.
          setTimeout(() => store.dropImportBackup(), 7000);
        }),
        btn('Keep mine', 'btn--sec', close),
      ),
    ]);
  });
  document.body.append(input);
  input.click();
}

const countOf = (n) => (n === 1 ? t('1 {n}') : t(`${n} {ns}`));

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { hms };
