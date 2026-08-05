import { el, btn, sheet } from './ui.js';

export const PRESETS = ['Beer', 'Wine', 'Whiskey', 'Seltzer', 'Shot', 'Cocktail'];
const MAX_RECENT = 4;

// Recents first, then presets that aren't already shown, capped at six so the
// grid stays three rows and reachable one-handed.
export function options(recent = []) {
  const seen = new Set();
  const out = [];
  for (const r of recent) {
    if (out.length >= MAX_RECENT || seen.has(r)) continue;
    seen.add(r); out.push(r);
  }
  for (const p of PRESETS) {
    if (out.length >= 6 || seen.has(p)) continue;
    seen.add(p); out.push(p);
  }
  return out;
}

export function remember(recent, kind) {
  return [kind, ...recent.filter((r) => r !== kind)].slice(0, MAX_RECENT);
}

export function pickDrink(prefs, onPick) {
  let selected = null;
  let custom = '';

  sheet((close) => {
    const confirm = btn('Log it', 'btn--pri', () => {
      const kind = (custom.trim() || selected || '').trim();
      if (!kind) return;
      close();
      onPick(kind);
    });
    confirm.disabled = true;

    const sync = () => { confirm.disabled = !(custom.trim() || selected); };

    const grid = el('div', { class: 'chips' },
      options(prefs.recentDrinks).map((kind) =>
        el('button', {
          class: 'chip', type: 'button', 'aria-pressed': 'false',
          onclick: (e) => {
            const on = selected === kind;
            selected = on ? null : kind;
            grid.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
            e.currentTarget.setAttribute('aria-pressed', on ? 'false' : 'true');
            sync();
          },
        }, kind),
      ),
    );

    const input = el('input', {
      type: 'text', placeholder: 'Something else', 'aria-label': 'Custom drink',
      autocapitalize: 'words', enterkeyhint: 'done',
      oninput: (e) => { custom = e.target.value; sync(); },
      onkeydown: (e) => { if (e.key === 'Enter' && !confirm.disabled) confirm.click(); },
    });

    return [
      el('div', { class: 'title', text: 'What are you having?' }),
      prefs.recentDrinks.length ? el('div', { class: 'eb', text: 'Recent' }) : null,
      grid,
      el('label', { class: 'field' },
        el('div', { class: 'field__k', text: 'Or type it' }),
        input,
      ),
      confirm,
    ];
  });
}
