// Choosing the kind of adventure: at the start, and partway through when
// plans change. Both sheets share one chooser so they can't drift apart.

import { el, btn, sheet, icon } from './ui.js';
import { t } from './words.js';
import { MODES, MODE_KEYS, COMPANY } from './modes.js';
import * as S from './state.js';

// One line each, so the tiles say what a mode is for rather than just naming it.
const HINT = {
  night: 'Bars, clubs, the last train home.',
  day: 'Cafés, markets, somewhere new.',
  walk: 'Parks, paths, the long way round.',
  festival: 'Stages, fields, one more act.',
};

/** Mode tiles plus the company chips. Calls onChange({ mode, company }) on every tap. */
function chooser(initial, onChange) {
  const pick = { ...initial };
  const tiles = el('div', { class: 'mode-pick', role: 'group', 'aria-label': 'Kind of adventure' });
  const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Who’s with you' });

  const paint = () => {
    tiles.replaceChildren(...MODE_KEYS.map((k) => el('button', {
      class: 'mode-tile press', type: 'button', 'aria-pressed': pick.mode === k ? 'true' : 'false',
      // Night out starts with friends; going solo on a night out is a choice
      // you make, not one carried over from last time's day out.
      onclick: () => { pick.mode = k; if (k === 'night') pick.company = 'group'; paint(); onChange({ ...pick }); },
    },
    icon(MODES[k].icon, { size: 22 }),
    el('span', { class: 'mode-tile__name', text: MODES[k].label }),
    el('span', { class: 'mode-tile__hint', text: HINT[k] || '' }))));
    chips.replaceChildren(...Object.entries(COMPANY).map(([k, label]) => el('button', {
      class: 'chip press', type: 'button', 'aria-pressed': pick.company === k ? 'true' : 'false',
      onclick: () => { pick.company = k; paint(); onChange({ ...pick }); },
    }, label)));
  };
  paint();
  return [tiles, el('div', { class: 'eb', text: 'Who’s with you?' }), chips];
}

const startLabel = (mode) => `Start ${MODES[mode].label.toLowerCase()}`;

/** Start adventure: pick a mode and company, remembered from last time. */
export function modePicker(ctx) {
  const prefs = ctx.state.prefs;
  const mode = MODES[prefs.lastMode] ? prefs.lastMode : 'night';
  const company = mode !== 'night' && COMPANY[prefs.lastCompany] ? prefs.lastCompany : 'group';
  let pick = { mode, company };
  sheet((close) => {
    const go = btn(startLabel(pick.mode), 'btn--pri', () => { close(); ctx.beginNight(pick); }, { lg: true });
    return [
      el('h2', { class: 'title', style: 'margin:0', text: t('What kind of {n}?') }),
      ...chooser(pick, (next) => { pick = next; go.querySelector('span').textContent = startLabel(pick.mode); }),
      go,
    ];
  });
}

/** Change of plan: the same adventure carries on in another mode or company. */
export function switchSheet(ctx) {
  const s = ctx.state.active;
  if (!s) return;
  const cur = S.currentPart(s);
  let pick = { mode: cur.mode, company: cur.company };
  sheet((close) => {
    const go = btn('Switch', 'btn--pri', () => { close(); ctx.switchMode(pick); }, { lg: true, disabled: true });
    return [
      el('h2', { class: 'title', style: 'margin:0', text: 'Change of plan?' }),
      el('p', { class: 'body', style: 'margin:0', text: t('It stays one {n}. Drinks and challenges change from now.') }),
      ...chooser(pick, (next) => { pick = next; go.disabled = pick.mode === cur.mode && pick.company === cur.company; }),
      el('div', { class: 'foot' }, go, btn('Keep going', 'btn--sec', close)),
    ];
  });
}

/** The live screen's way in: says the current mode and company, opens the switch sheet. */
export function modeChip(ctx) {
  const cur = S.currentPart(ctx.state.active);
  return el('button', { class: 'chip press mode-chip', type: 'button', onclick: () => switchSheet(ctx),
    'aria-label': `${MODES[cur.mode].label}, ${COMPANY[cur.company].toLowerCase()}. Change of plan?` },
  icon(MODES[cur.mode].icon, { size: 14 }),
  el('span', { text: `${MODES[cur.mode].label} · ${COMPANY[cur.company]}` }),
  icon('chevron-down', { size: 14 }));
}
