import { el, btn, sheet, foot } from './ui.js';

export const PRESETS = ['Pint', 'Wine', 'Spirit + mixer', 'Shot', 'Cider', 'Cocktail', 'Low/no'];
const MAX_RECENT = 3;

export function recentAndRest(recent = []) {
  const top = [];
  const seen = new Set();
  for (const r of recent) {
    if (top.length >= MAX_RECENT || seen.has(r)) continue;
    seen.add(r); top.push(r);
  }
  return { top, rest: PRESETS.filter((p) => !seen.has(p)) };
}

export function remember(recent, kind) {
  return [kind, ...recent.filter((r) => r !== kind)].slice(0, MAX_RECENT);
}

/* ---------- 03 pick your poison ---------- */

export function pickDrink(prefs, onPick) {
  let selected = null;
  let custom = '';

  sheet((close) => {
    const confirm = btn('Add drink', 'btn--pri', () => {
      const kind = (custom.trim() || selected || '').trim();
      if (!kind) return;
      close();
      onPick(kind);
    });
    confirm.disabled = true;
    const sync = () => { confirm.disabled = !(custom.trim() || selected); };

    const all = [];
    const chip = (kind) => {
      const node = el('button', {
        class: 'chip press', type: 'button', 'aria-pressed': 'false',
        onclick: () => {
          const wasOn = selected === kind;
          selected = wasOn ? null : kind;
          all.forEach((c) => c.setAttribute('aria-pressed', 'false'));
          if (!wasOn) node.setAttribute('aria-pressed', 'true');
          sync();
        },
      }, kind);
      all.push(node);
      return node;
    };

    const { top, rest } = recentAndRest(prefs.recentDrinks);

    const input = el('input', {
      type: 'text', placeholder: 'Negroni', 'aria-label': 'Something else',
      autocapitalize: 'words', enterkeyhint: 'done',
      // Typing a custom value overrides any chip selection.
      oninput: (e) => { custom = e.target.value; sync(); },
      onkeydown: (e) => { if (e.key === 'Enter' && !confirm.disabled) confirm.click(); },
    });

    return [
      el('h2', { class: 'title', text: 'What are you having?' }),
      top.length ? el('div', { class: 'eb', text: 'Recent' }) : null,
      top.length ? el('div', { class: 'chips' }, top.map(chip)) : null,
      el('div', { class: 'eb', text: top.length ? 'All' : 'Pick one' }),
      el('div', { class: 'chips' }, rest.map(chip)),
      el('label', { class: 'field' },
        el('div', { class: 'field__k', text: 'Something else' }),
        input,
      ),
      foot(confirm),
    ];
  });
}
