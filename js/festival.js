// Festival reviews: several festival days brought together. The days stay as
// they are; a review is just a name and a list of their ids, drawn through
// S.mergeSessions so the recap tiles and the card work unchanged.

import { el, btn, tile, tiles, spacer, foot, head, sheet, toast, icon, shortDate, hm, km } from './ui.js';
import * as S from './state.js';
import { badgeChip } from './badges.js';

const festivalDays = (ctx) => ctx.state.sessions.filter((s) => s.endedAt && S.hasMode(s, 'festival'));

// One merged view per review and set of days, so the card screen sees the
// same object across renders and keeps its state.
const views = new Map();
function viewOf(f, days) {
  const key = `${f.id}:${days.map((d) => d.id).join(',')}`;
  if (!views.has(key)) views.set(key, { ...S.mergeSessions(days), festivalId: f.id });
  return views.get(key);
}

export const canMakeFestival = (ctx) => festivalDays(ctx).length >= 2;

/** Pick the days, name it, make it. */
export function festivalPickScreen(ctx) {
  const days = festivalDays(ctx);
  const chosen = new Set();
  const list = el('div', { class: 'stack', style: 'gap:6px' });
  const defaultName = () => {
    const first = days.filter((d) => chosen.has(d.id)).at(-1) || days.at(-1);
    return `Festival, ${shortDate(first.startedAt)}`;
  };
  let typed = '';
  const input = el('input', {
    type: 'text', placeholder: defaultName(), 'aria-label': 'Festival name', maxlength: 40, autocapitalize: 'words',
    oninput: (e) => { typed = e.target.value; },
  });
  const make = btn('Make festival', 'btn--pri', () => {
    ctx.makeFestival({ name: typed.trim() || defaultName(), sessionIds: [...chosen] });
  }, { lg: true, disabled: true });

  const paint = () => {
    list.replaceChildren(...days.map((d) => {
      const on = chosen.has(d.id);
      return el('button', {
        class: 'listrow press pickrow', type: 'button', 'aria-pressed': on ? 'true' : 'false',
        onclick: () => { if (on) chosen.delete(d.id); else chosen.add(d.id); paint(); },
      },
      el('span', { class: 'listrow__d' }, el('span', { class: 'pickrow__box' }, on ? icon('check', { size: 14 }) : null), shortDate(d.startedAt)),
      el('span', { class: 'listrow__m' },
        el('span', { text: `${(d.sets || []).length} set${(d.sets || []).length === 1 ? '' : 's'}` }),
        el('span', { text: hm(S.elapsedMs(d)) })));
    }));
    make.disabled = chosen.size < 2;
    input.placeholder = defaultName();
  };
  paint();

  return [
    head({ eyebrow: 'Festival', title: 'Make a festival', back: () => ctx.back() }),
    el('p', { class: 'body', style: 'margin:0', text: 'Pick the days that belong together. The days stay as they are.' }),
    list,
    el('label', { class: 'field' }, el('div', { class: 'field__k', text: 'Name' }), input),
    spacer(),
    foot(make),
  ];
}

/** The review: days, totals, every act seen, badges from those days, a card. */
export function festivalScreen(ctx, f) {
  if (!f) { ctx.go('history'); return []; }
  const days = f.sessionIds.map((id) => ctx.state.sessions.find((s) => s.id === id)).filter(Boolean);
  const back = () => ctx.back();
  if (!days.length) {
    return [
      head({ eyebrow: 'Festival', title: f.name, back }),
      el('p', { class: 'body', text: 'Every day in this festival has been deleted.' }),
      spacer(),
      foot(btn('Delete festival', 'btn--sec', () => confirmDeleteFestival(ctx, f))),
    ];
  }
  const merged = viewOf(f, days);
  const acts = S.festivalActs(days);
  const ids = new Set(days.map((d) => d.id));
  const earned = ctx.state.badges.filter((b) => ids.has(b.sessionId) || b.sessionId === f.id);
  const first = days.reduce((a, b) => (a.startedAt < b.startedAt ? a : b));
  const last = days.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));

  return [
    head({ eyebrow: `${shortDate(first.startedAt)} to ${shortDate(last.startedAt)}`, title: f.name, back }),
    tiles([
      tile('Days', days.length),
      tile('Acts', acts.length),
      merged.steps ? tile('Steps', merged.steps.toLocaleString()) : null,
      merged.trail.length > 1 ? tile('Distance', km(merged.distanceM), { unit: 'km' }) : null,
      tile('Sets', merged.sets.length),
    ].filter(Boolean).slice(0, 4)),
    acts.length ? el('div', { class: 'eb', text: 'Who you saw' }) : null,
    acts.length ? el('div', { class: 'chips' }, acts.map((a) => el('span', { class: 'chip chip--static', text: a }))) : null,
    earned.length ? el('div', { class: 'eb', text: 'Badges' }) : null,
    earned.length ? el('div', { class: 'badge-row' }, earned.map((b) => badgeChip(b.slug, { size: 56 }))) : null,
    el('div', { class: 'eb', text: 'Days' }),
    el('div', { class: 'stack', style: 'gap:6px' }, days.map((d) =>
      el('button', { class: 'listrow press', type: 'button', onclick: () => ctx.go('detail', d) },
        el('span', { class: 'listrow__d', text: shortDate(d.startedAt) }),
        el('span', { class: 'listrow__m' },
          el('span', { text: `${(d.sets || []).length} set${(d.sets || []).length === 1 ? '' : 's'}` }),
          el('span', { text: `${km(d.distanceM)} km` }))))),
    spacer(),
    foot(
      btn('Make a card', 'btn--pri', () => ctx.go('card', merged), { lg: true }),
      btn('Delete festival', 'btn--sec', () => confirmDeleteFestival(ctx, f)),
    ),
  ];
}

function confirmDeleteFestival(ctx, f) {
  sheet((close) => [
    el('h2', { class: 'title', text: 'Delete this festival?' }),
    el('p', { class: 'body', style: 'margin:0', text: 'Only the festival goes. Its days stay in your history.' }),
    foot(
      btn('Delete', 'btn--pri', () => { close(); ctx.deleteFestival(f.id); toast('Festival deleted.'); }),
      btn('Keep it', 'btn--sec', close),
    ),
  ]);
}
