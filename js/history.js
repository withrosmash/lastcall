import { el, btn, tile, spacer, sheet, toast, hhmm, clockTime, shortDate, longDate, km } from './ui.js';
import * as S from './state.js';
import * as store from './storage.js';
import { routeSvg } from './session.js';

/* ---------- 11 history ---------- */

export function historyScreen(ctx) {
  const done = ctx.state.sessions.filter((s) => s.endedAt);
  const st = S.stats(done);

  if (!done.length) {
    return [
      header(ctx, 'History', null),
      spacer(),
      el('div', { class: 'center' },
        el('div', { class: 'body', text: 'No nights yet. Your first one shows up here.' })),
      spacer(),
      btn('Back', 'btn--sec', () => ctx.go('start')),
    ];
  }

  const buckets = S.weekly(done);
  const peak = Math.max(...buckets, 1);

  return [
    header(ctx, 'History', `${st.nights} night${st.nights === 1 ? '' : 's'}`),

    el('div', { class: 'tiles tiles--3' },
      tile('Longest', hhmm(st.longestMs), { mod: 'tile__v--sm' }),
      tile('Avg', st.avgDrinks.toFixed(1), { mod: 'tile__v--sm tile__v--pink' }),
      tile('Water', st.ratio ? `1:${st.ratio.toFixed(1)}` : '—', { mod: 'tile__v--sm' }),
    ),

    el('div', { class: 'eb', text: 'Last eight weeks' }),
    el('div', { class: 'bars', role: 'img', 'aria-label': `Drinks per week: ${buckets.join(', ')}` },
      buckets.map((n, i) => el('i', {
        class: i === buckets.length - 1 && n ? 'on' : '',
        style: `height:${Math.max(2, (n / peak) * 100)}%`,
      })),
    ),

    el('div', { class: 'stack', style: 'gap:6px' },
      done.slice(0, 20).map((s) => {
        const sum = S.summarise(s);
        return el('button', { class: 'listrow', type: 'button', onclick: () => ctx.go('detail', s) },
          el('span', { class: 'listrow__d', text: shortDate(s.startedAt) }),
          el('span', { class: 'listrow__m', text: `${hhmm(sum.ms)} · ${sum.drinks}` }),
        );
      }),
    ),

    spacer(),
    btn('Export data', 'btn--ghost btn--sm', () => exportData(ctx)),
    btn('Back', 'btn--sec btn--sm', () => ctx.go(ctx.state.active ? 'live' : 'start')),
  ];
}

/* ---------- 12 night detail ---------- */

export function detailScreen(ctx, session) {
  const s = session;
  if (!s) { ctx.go('history'); return []; }
  const sum = S.summarise(s);

  return [
    el('div', { class: 'row' },
      el('div', { class: 'eb pink', text: longDate(s.startedAt) }),
      el('div', { class: 'eb', text: hhmm(sum.ms) }),
    ),

    el('div', { class: 'tile', style: 'padding:11px' }, routeSvg(s, 96)),

    el('div', { class: 'tiles tiles--3' },
      tile('Drinks', sum.drinks, { mod: 'tile__v--sm tile__v--pink' }),
      tile('Water', sum.waters, { mod: 'tile__v--sm' }),
      tile('Km', km(sum.distanceM), { mod: 'tile__v--sm' }),
    ),

    el('div', { class: 'eb', text: 'Timeline' }),
    el('div', { class: 'tl' }, timeline(s).map((e) =>
      el('div', { class: 'tl__i' },
        el('span', { class: 'tl__t', text: clockTime(e.t) }),
        el('span', { text: e.label }),
      ))),

    spacer(),
    btn('Make a card', 'btn--pri btn--sm', () => ctx.go('card', s)),
    btn('Back', 'btn--sec btn--sm', () => ctx.go('history')),
    btn('Delete night', 'btn--ghost btn--sm', () => confirmDelete(ctx, s)),
  ];
}

function timeline(s) {
  const out = [{ t: s.startedAt, label: 'Started the night' }];
  for (const p of s.pins) out.push({ t: p.t, label: p.name + (p.note ? ` — ${p.note}` : '') });
  for (const w of s.waters) out.push({ t: w.t, label: 'Water' });
  for (const d of s.drinks) out.push({ t: d.t, label: d.kind });
  if (s.endedAt) out.push({ t: s.endedAt, label: 'Called it' });
  return out.sort((a, b) => a.t - b.t);
}

function confirmDelete(ctx, s) {
  sheet((close) => [
    el('div', { class: 'title', text: 'Delete this night?' }),
    el('div', { class: 'body', text: 'It goes for good. Export first if you want to keep it.' }),
    btn('Delete', 'btn--pri', () => {
      ctx.state.sessions = ctx.state.sessions.filter((x) => x.id !== s.id);
      ctx.save();
      store.flush();
      close();
      ctx.go('history');
      toast('Night deleted.');
    }),
    btn('Keep it', 'btn--sec btn--sm', close),
  ]);
}

/* ---------- settings ---------- */

export function settingsScreen(ctx) {
  const p = ctx.state.prefs;

  const every = el('input', {
    type: 'number', min: '1', max: '12', value: String(p.hydrationEvery),
    inputmode: 'numeric', 'aria-label': 'Drinks before a water reminder',
    onchange: (e) => {
      const n = Math.min(12, Math.max(1, Number(e.target.value) || 4));
      p.hydrationEvery = n;
      e.target.value = String(n);
      ctx.save();
      toast('Saved.');
    },
  });

  return [
    header(ctx, 'Settings', null),

    el('label', { class: 'field' },
      el('div', { class: 'field__k', text: 'Remind me to drink water every' }),
      every,
    ),
    el('div', { class: 'cap', text: 'Drinks. The nudge shows on the session screen and as a notification.' }),

    spacer(),
    btn('Export data', 'btn--sec btn--sm', () => exportData(ctx)),
    btn('Import data', 'btn--ghost btn--sm', () => importData(ctx)),
    btn('Back', 'btn--sec btn--sm', () => ctx.go(ctx.state.active ? 'live' : 'start')),
  ];
}

function exportData(ctx) {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `lastcall-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Exported.');
}

function importData(ctx) {
  const input = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const next = store.importJSON(await file.text());
      if (!next) throw new Error('write failed');
      ctx.state = next;
      toast('Imported.');
      ctx.go('start');
    } catch {
      toast("That file didn't read as Last Call data.");
    } finally {
      input.remove();
    }
  });
  document.body.append(input);
  input.click();
}

function header(ctx, title, right) {
  return el('div', { class: 'row' },
    el('div', { class: 'eb mint', text: title }),
    right ? el('div', { class: 'eb', text: right }) : null,
  );
}
