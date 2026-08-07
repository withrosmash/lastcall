import { el, btn, tile, tiles, glass, spacer, foot, head, toast, icon,
         hms, hm, clockTime, shortDate, upperDate, km } from './ui.js';
import * as S from './state.js';
import * as store from './storage.js';
import { routeSvg } from './session.js';
import { saveTextFile } from './keepalive.js';
import { BADGES } from './badges-data.js';

/* ---------- 11 history ---------- */

export function historyScreen(ctx) {
  const done = ctx.state.sessions.filter((s) => s.endedAt);
  const back = () => ctx.go(ctx.state.active ? 'live' : 'start');

  if (!done.length) {
    return [
      head({ eyebrow: 'History', title: 'Eight weeks', back }),
      spacer(),
      el('p', { class: 'body center', text: 'No nights yet. Your first one shows up here.' }),
      spacer(),
      foot(btn('Import history', 'btn--sec', () => importData(ctx))),
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
      tile('Nights out', shown.length),
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

    el('div', { class: 'eb', text: 'Nights' }),
    el('div', { class: 'stack', style: 'gap:6px' },
      shown.slice(0, 40).map((s) => {
        const sum = S.summarise(s);
        return el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('detail', s) },
          el('span', { class: 'listrow__d', text: shortDate(s.startedAt) }),
          el('span', { class: 'listrow__m' },
            el('b', { text: `${sum.drinks} drink${sum.drinks === 1 ? '' : 's'}` }),
            el('span', { text: hm(sum.ms) }),
            el('span', { text: `${km(sum.distanceM)} km` }),
          ),
        );
      })),

    spacer(),
    foot(
      btn('Export history', 'btn--sec', () => exportData(), { iconName: 'download' }),
      btn('Settings', 'btn--sec', () => ctx.go('settings')),
    ),
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
  { key: 'battery', name: 'Unrestricted battery', why: 'Stops Android putting the app to sleep mid-night.' },
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
        : 'All set. Nothing will stop a night recording.' }),
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

  const row = el('div', { class: 'chips' },
    THRESHOLDS.map((n) => choice(String(n), n)),
    choice('Never', 0),
  );

  return [
    head({ eyebrow: 'Settings', title: 'Reminders', back: () => ctx.go('history') }),

    el('div', { class: 'eb', text: 'Remind me to drink water after' }),
    row,
    el('p', { class: 'body', style: 'margin:0' },
      p.hydrationEvery
        ? `The nudge shows on the session screen once you’re ${p.hydrationEvery} drinks past your last water.`
        : 'No water reminders. Everything else is tracked the same.'),

    permissionRows(ctx),

    spacer(),
    foot(
      btn('Import history', 'btn--sec', () => importData(ctx)),
    ),
  ];
}

/* ---------- 12 night detail ---------- */

export function detailScreen(ctx, session) {
  const s = session;
  if (!s) { ctx.go('history'); return []; }
  const sum = S.summarise(s);

  return [
    head({ eyebrow: upperDate(s.startedAt), title: `${hm(sum.ms)} out`, back: () => ctx.go('history') }),

    glass(routeSvg(s, 176)),

    tiles(
      tile('Drinks', sum.drinks, { tone: 'drinks' }),
      tile('Distance', km(sum.distanceM), { unit: 'km' }),
    ),

    el('div', { class: 'eb', text: 'Timeline' }),
    (() => {
      const entries = [
        ...s.pins.map((p) => ({ t: p.t, pin: true, label: p.note ? `${p.name} — ${p.note}` : p.name })),
        ...(s.meals || []).map((m) => ({ t: m.t, pin: false, label: 'Food' })),
        ...s.waters.map((w) => ({ t: w.t, pin: false, label: 'Water' })),
      ].sort((a, b) => a.t - b.t);
      return entries.length
        ? el('div', { class: 'tl' }, entries.map((e) =>
            el('div', { class: 'tl__i' },
              e.pin ? icon('map-pin', { size: 15 }) : el('span', { style: 'width:15px' }),
              el('span', { class: 'tl__n', text: e.label }),
              el('span', { class: 'tl__t', text: clockTime(e.t) }),
            )))
        : el('p', { class: 'cap cap--up', text: 'No stops pinned on this one.' });
    })(),

    spacer(),
    foot(
      btn('Make a card', 'btn--pri', () => ctx.go('card', s), { lg: true }),
      s.trail.length > 1 ? btn('Export route (GPX)', 'btn--sec', () => exportGpx(s)) : null,
      btn('Delete night', 'btn--sec', () => confirmDelete(ctx, s)),
    ),
  ];
}

/* ---------- GPX ----------
   The night's route in the format every fitness app ingests. */

const escapeXml = (str) => String(str).replace(/[<>&'"]/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function toGpx(s) {
  const name = `Last Call — ${shortDate(s.startedAt)}`;
  const points = s.trail.map((p) =>
    `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('\n');
  const stops = s.pins.map((p) =>
    `<wpt lat="${p.lat}" lon="${p.lng}"><name>${escapeXml(p.name)}</name><time>${new Date(p.t).toISOString()}</time></wpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Last Call" xmlns="http://www.topografix.com/GPX/1/1">
${stops}
<trk><name>${escapeXml(name)}</name><trkseg>
${points}
</trkseg></trk>
</gpx>`;
}

async function exportGpx(s) {
  const name = `lastcall-${new Date(s.startedAt).toISOString().slice(0, 10)}.gpx`;
  await exportText(name, 'application/gpx+xml', toGpx(s), 'Route saved to Downloads › Last Call.');
}

function confirmDelete(ctx, s) {
  // Reuses the end-night sheet shape: flat statement, then the smallest reason.
  import('./ui.js').then(({ sheet }) => {
    sheet((close) => [
      el('h2', { class: 'title', text: 'Delete this night?' }),
      el('p', { class: 'body', style: 'margin:0', text: 'It goes for good. Export first if you want to keep it.' }),
      foot(
        btn('Delete', 'btn--pri', () => {
          ctx.state.sessions = ctx.state.sessions.filter((x) => x.id !== s.id);
          ctx.save();
          store.flush();
          close();
          ctx.go('history');
          toast('Night deleted.');
        }),
        btn('Keep it', 'btn--sec', close),
      ),
    ]);
  });
}

/* ---------- export / import ---------- */

function exportData() {
  const name = `lastcall-${new Date().toISOString().slice(0, 10)}.json`;
  exportText(name, 'application/json', store.exportJSON(), 'History saved to Downloads › Last Call.');
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
  const input = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) { input.remove(); return; }
    try {
      const next = store.importJSON(await file.text());
      if (!next) throw new Error('write failed');
      ctx.state = next;
      toast('Imported.');
      ctx.go('history');
    } catch {
      toast('That file didn’t read as Last Call data.');
    } finally {
      input.remove();
    }
  });
  document.body.append(input);
  input.click();
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { hms };
