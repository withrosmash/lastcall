import { el, btn, tile, tiles, glass, spacer, foot, head, toast, icon,
         hms, hm, clockTime, shortDate, upperDate, km } from './ui.js';
import * as S from './state.js';
import * as store from './storage.js';
import { routeSvg } from './session.js';

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

  const totalDrinks = done.reduce((n, s) => n + s.drinks.length, 0);
  const buckets = S.weekly(done);
  const peak = Math.max(...buckets, 1);

  return [
    head({ eyebrow: 'History', title: 'Eight weeks', back }),

    tiles(
      tile('Nights out', done.length),
      tile('Drinks', totalDrinks, { tone: 'drinks' }),
    ),

    glass(
      el('div', { class: 'bars', role: 'img', 'aria-label': `Drinks per week: ${buckets.join(', ')}` },
        buckets.map((n, i) => el('i', {
          class: i === buckets.length - 1 && n ? 'on' : '',
          style: `height:${Math.max(3, (n / peak) * 100)}%`,
        }))),
      el('div', { class: 'bars-x' }, buckets.map((_, i) => el('span', { text: String(i + 1) }))),
    ),

    el('div', { class: 'eb', text: 'Nights' }),
    el('div', { class: 'stack', style: 'gap:6px' },
      done.slice(0, 20).map((s) => {
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
    s.pins.length
      ? el('div', { class: 'tl' }, s.pins.map((p) =>
          el('div', { class: 'tl__i' },
            icon('map-pin', { size: 15 }),
            el('span', { class: 'tl__n', text: p.note ? `${p.name} — ${p.note}` : p.name }),
            el('span', { class: 'tl__t', text: clockTime(p.t) }),
          )))
      : el('p', { class: 'cap cap--up', text: 'No stops pinned on this one.' }),

    spacer(),
    foot(
      btn('Make a card', 'btn--pri', () => ctx.go('card', s), { lg: true }),
      btn('Delete night', 'btn--sec', () => confirmDelete(ctx, s)),
    ),
  ];
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
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  download(blob, `lastcall-${new Date().toISOString().slice(0, 10)}.json`);
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
