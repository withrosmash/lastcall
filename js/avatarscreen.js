// Customise the avatar. Quick-pick swatches for the usual colours, and three
// sliders (colour, strength, shade) that reach any colour at all — built from
// range inputs rather than <input type="color">, which Android's WebView
// doesn't reliably give a picker for.

import { el, btn, head, foot } from './ui.js';
import { createAvatar, PARTS, STYLES, toHsl, fromHsl, randomLook } from './avatar.js';
import { avatarLook } from './session.js';

export function avatarScreen(ctx) {
  const look = avatarLook(ctx);
  let part = PARTS[0].key;

  const av = createAvatar({ cell: 5, look });
  queueMicrotask(() => av.start());

  // Every change shows at once; the store debounces the actual write.
  const commit = () => {
    av.setLook(look);
    ctx.state.prefs.avatar = { ...look };
    ctx.save();
  };

  const chip = (label, on, onclick) =>
    el('button', { class: 'chip press', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick }, label);

  const styleChips = el('div', { class: 'chips' });
  const paintStyles = () => styleChips.replaceChildren(...STYLES.map((st) =>
    chip(st, look.style === st, () => { look.style = st; commit(); paintStyles(); })));

  const partChips = el('div', { class: 'chips' });
  const swatches = el('div', { class: 'swatches' });
  const slider = (min, max, label) => el('input', { type: 'range', class: 'hsl', min, max, step: 1, 'aria-label': label });
  const hue = slider(0, 359, 'Colour'), sat = slider(0, 100, 'Strength'), lit = slider(10, 92, 'Shade');

  function paintTracks() {
    const h = +hue.value, s = +sat.value, l = +lit.value;
    // The colour track always shows the full rainbow, even when the current
    // colour is grey, so it's obvious what dragging it will do.
    hue.style.setProperty('--track', `linear-gradient(to right,${[0, 60, 120, 180, 240, 300, 359].map((x) => `hsl(${x} 80% 55%)`).join(',')})`);
    sat.style.setProperty('--track', `linear-gradient(to right,hsl(${h} 0% ${l}%),hsl(${h} 100% ${l}%))`);
    lit.style.setProperty('--track', `linear-gradient(to right,hsl(${h} ${s}% 10%),hsl(${h} ${s}% 50%),hsl(${h} ${s}% 92%))`);
  }
  function markSwatch() {
    const cur = look[part].toLowerCase();
    for (const b of swatches.children) b.setAttribute('aria-pressed', b.dataset.c === cur ? 'true' : 'false');
  }
  function paintPart() {
    partChips.replaceChildren(...PARTS.map((p) => chip(p.label, p.key === part, () => { part = p.key; paintPart(); })));
    swatches.replaceChildren(...PARTS.find((p) => p.key === part).presets.map((c) =>
      el('button', {
        class: 'swatch press', type: 'button', 'aria-label': c, 'data-c': c.toLowerCase(),
        style: `--c:${c}`, onclick: () => { look[part] = c; commit(); paintPart(); },
      })));
    const [h, s, l] = toHsl(look[part]);
    hue.value = h; sat.value = s; lit.value = l;
    paintTracks();
    markSwatch();
  }
  const fromSliders = () => {
    look[part] = fromHsl(+hue.value, +sat.value, +lit.value);
    paintTracks();
    markSwatch();
    commit();
  };
  hue.addEventListener('input', () => {
    // Dragging the colour on a grey does nothing visible; give it some colour.
    if (+sat.value < 12) sat.value = 60;
    fromSliders();
  });
  sat.addEventListener('input', fromSliders);
  lit.addEventListener('input', fromSliders);

  paintStyles();
  paintPart();

  const labelled = (text, input) => el('label', { class: 'stack', style: 'gap:2px' },
    el('span', { class: 'eb', text }), input);

  return [
    head({ title: 'Your avatar', back: () => ctx.back() }),
    el('div', { class: 'avatar-stage' }, av.canvas),
    el('p', { class: 'cap', style: 'margin:0', text: 'Tap them to say hello. Any colour works — drag the sliders past the swatches.' }),
    el('div', { class: 'eb', text: 'Hair' }),
    styleChips,
    el('div', { class: 'eb', text: 'Colours' }),
    partChips,
    swatches,
    labelled('Colour', hue),
    labelled('Strength', sat),
    labelled('Shade', lit),
    foot(
      btn('Done', 'btn--pri', () => ctx.back(), { lg: true }),
      btn('Surprise me', 'btn--sec', () => {
        Object.assign(look, randomLook());
        commit();
        paintStyles();
        paintPart();
        av.play('cheer');
      }),
    ),
  ];
}
