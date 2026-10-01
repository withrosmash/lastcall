// Customise, as designed in round 2 (design/round2/designs/Customise Screen):
// a live preview you can tap for another face, and five tabs (Hair, Glasses,
// Top, Items, Colours). Every change saves as you make it, so backing out never
// loses anything; Undo changes puts back the look you had when you opened it.
//
// Colours use range inputs rather than <input type="color">, which Android's
// WebView doesn't reliably give a picker for.

import { el, btn, sheet, icon, currentTheme, switchRow } from './ui.js';
import {
  createAvatar, drawStill, HAIRS, GLASSES, TOPS, ITEMS, SLOTS, SWATCHES, CROP,
  SUNGLASSES_BADGE, toHsl, fromHsl, shuffleLook,
} from './avatar.js';
import { avatarLook, saveLook, isUnlocked, requirement, badgeName, progress } from './wardrobe.js';

// Tap the preview to cycle these.
const FACES = [
  { n: 'Resting', eyes: 'open', mouth: 'smile' },
  { n: 'Happy', eyes: 'happy', mouth: 'cat', blush: 2 },
  { n: 'Hearts', eyes: 'heart', mouth: 'open', blush: 2 },
  { n: 'Stars', eyes: 'star', mouth: 'wide' },
  { n: 'Wink', eyes: 'wink', mouth: 'smile' },
  { n: 'Surprised', eyes: 'wide', mouth: 'ooh' },
  { n: 'Puppy', eyes: 'puppy', mouth: 'small' },
  { n: 'Content', eyes: 'content', mouth: 'smile', blush: 2 },
];
// What a screen reader says for a colour: "dark brown", not "#3B2416".
function colourName(hex) {
  const [h, s, l] = toHsl(hex);
  if (s < 12) return l < 12 ? 'black' : l < 35 ? 'dark grey' : l < 70 ? 'grey' : l < 92 ? 'light grey' : 'white';
  if (h >= 15 && h < 45 && l < 45) return l < 25 ? 'dark brown' : 'brown';
  if (h >= 15 && h < 45 && s < 65 && l > 65) return 'peach';
  const hue = h < 15 || h >= 340 ? 'red' : h < 45 ? 'orange' : h < 65 ? 'yellow' : h < 160 ? 'green'
    : h < 195 ? 'teal' : h < 250 ? 'blue' : h < 290 ? 'purple' : 'pink';
  return l < 30 ? `dark ${hue}` : l > 75 ? `light ${hue}` : hue;
}

const TABS = [['hair', 'Hair'], ['glasses', 'Glasses'], ['top', 'Top'], ['items', 'Items'], ['colours', 'Colours']];

export function avatarScreen(ctx) {
  const original = avatarLook(ctx);
  let draft = structuredClone(original);
  let tab = 'hair', slot = 'hair', face = 0;
  const light = currentTheme() === 'light';
  const SIL = light ? '#C3CCD9' : '#3A3A3A';
  const SIL_SHEET = light ? '#AEB9C8' : '#4D4D4D';

  const av = createAvatar({ cell: 4, look: draft, onTap: () => nextFace(), label: 'Your avatar. Tap for another face.' });
  queueMicrotask(() => av.start());
  const caption = el('span', { class: 'cap', style: 'text-align:center' });
  const nextFace = () => {
    face = (face + 1) % FACES.length;
    const f = FACES[face];
    av.setFace(face === 0 ? null : f);
    caption.textContent = `${f.n} · tap for another face`;
  };
  caption.textContent = `${FACES[0].n} · tap for another face`;

  // Undo is only worth offering once something has changed.
  const undoBtn = btn('Undo changes', 'btn--sec', () => {
    draft = structuredClone(original);
    commit();
    paintPanel();
  });
  const commit = () => {
    saveLook(ctx, draft);
    av.setLook(draft);
    undoBtn.disabled = JSON.stringify(draft) === JSON.stringify(original);
  };
  undoBtn.disabled = true;
  const changed = () => { commit(); paintPanel(); };

  const tabRow = el('div', { class: 'chips chips--scroll' });
  const panel = el('div', { class: 'wardrobe' });
  const paintTabs = () => tabRow.replaceChildren(...TABS.map(([k, label]) =>
    el('button', { class: 'chip press', type: 'button', 'aria-pressed': tab === k ? 'true' : 'false',
      onclick: () => { tab = k; paintTabs(); paintPanel(); } }, label)));

  // A neutral face on every tile, so only the thing being chosen differs.
  const base = () => ({ ...draft, costume: null });
  const tileCanvas = (look, opts) => drawStill(document.createElement('canvas'), look, opts);
  const tile = ({ name, canvas, selected, locked, sub, onclick }) =>
    el('button', { class: 'wtile press', type: 'button', 'aria-pressed': selected ? 'true' : 'false', onclick },
      el('div', { class: 'wtile__art' }, canvas),
      el('span', { class: `wtile__name${locked ? ' is-locked' : ''}`, text: name }),
      sub ? el('span', { class: 'wtile__sub' }, locked ? icon('lock', { size: 11 }) : null, el('span', { text: sub })) : null);

  function lockedSheet(item) {
    const worn = { ...base(), glasses: item.slot === 'glasses' ? item.id : 'none', hat: item.slot === 'hat' ? item.id : null,
      held: item.slot === 'held' ? item.id : null, costume: item.slot === 'costume' ? item.id : null,
      shoes: item.slot === 'shoes' ? item.id : 'plain' };
    const line = progress(ctx, item.badge);
    sheet((close) => [
      el('h2', { class: 'title', style: 'margin:0', text: item.name }),
      el('div', { class: 'lock-row' },
        el('div', { class: 'lock-art' }, tileCanvas(worn, { fit: [88, 88], only: item.id, silhouette: SIL_SHEET })),
        el('div', { class: 'stack', style: 'gap:6px;min-width:0' },
          el('div', { class: 'eb', text: badgeName(item.badge) }),
          el('p', { class: 'body', style: 'margin:0;color:var(--text)', text: requirement(item.badge) }),
          line ? el('p', { class: 'body', style: 'margin:0', text: line }) : null)),
      btn('Close', 'btn--sec', close),
    ]);
  }

  function paintPanel() {
    if (tab === 'colours') { paintColours(); return; }
    let tiles = [];
    if (tab === 'hair') {
      tiles = HAIRS.map(([k, name]) => tile({
        name, selected: draft.hair === k,
        canvas: tileCanvas({ ...base(), hair: k, hat: null, glasses: 'none' }, { scale: 2, crop: CROP.head }),
        onclick: () => { draft = { ...draft, hair: k, costume: null }; changed(); },
      }));
    }
    if (tab === 'glasses') {
      tiles = GLASSES.map(([k, name]) => {
        const item = k === 'sun' ? { id: 'sun', slot: 'glasses', name, badge: SUNGLASSES_BADGE } : null;
        const locked = !!item && !isUnlocked(ctx, item);
        const look = { ...base(), glasses: k, hat: null };
        return tile({
          name, selected: draft.glasses === k, locked, sub: item ? badgeName(item.badge) : null,
          canvas: tileCanvas(look, locked ? { scale: 2, crop: CROP.head, only: 'sun', silhouette: SIL } : { scale: 2, crop: CROP.head }),
          onclick: () => { if (locked) { lockedSheet(item); return; } draft = { ...draft, glasses: k, costume: null }; changed(); },
        });
      });
    }
    if (tab === 'top') {
      tiles = TOPS.map(([k, name]) => tile({
        name, selected: draft.top === k,
        canvas: tileCanvas({ ...base(), top: k, held: null }, { scale: 3, crop: CROP.body }),
        onclick: () => { draft = { ...draft, top: k, costume: null }; changed(); },
      }));
    }
    if (tab === 'items') {
      tiles = ITEMS.map((it) => {
        if (it.group) return el('span', { class: 'wardrobe__group', text: it.group });
        const locked = !isUnlocked(ctx, it);
        const on = it.slot === 'shoes' ? draft.shoes === it.id : draft[it.slot] === it.id;
        const worn = { ...base(), hat: it.slot === 'hat' ? it.id : null, held: it.slot === 'held' ? it.id : null,
          costume: it.slot === 'costume' ? it.id : null, shoes: it.slot === 'shoes' ? it.id : 'plain', glasses: 'none' };
        const onHead = it.slot === 'hat' || it.slot === 'costume';
        const opts = onHead ? { scale: 2, crop: CROP.head } : { fit: [72, 56] };
        return tile({
          name: it.name, selected: on, locked, sub: it.badge ? badgeName(it.badge) : null,
          canvas: tileCanvas(worn, locked ? { ...opts, only: it.id, silhouette: SIL } : onHead ? opts : { ...opts, only: it.id }),
          onclick: () => {
            if (locked) { lockedSheet(it); return; }
            if (it.slot === 'shoes') draft = { ...draft, shoes: on ? 'plain' : it.id };
            else draft = { ...draft, [it.slot]: on ? null : it.id };
            changed();
          },
        });
      });
    }
    panel.replaceChildren(el('div', { class: 'wardrobe__grid' }, tiles));
  }

  function paintColours() {
    const cur = draft.colors[slot];
    const pool = SWATCHES[slot] || SWATCHES.cloth;
    const [h, s, l] = toHsl(cur);
    const setColour = (hex) => { draft = { ...draft, colors: { ...draft.colors, [slot]: hex } }; changed(); };

    const slider = (label, min, max, value, unit, track, onInput) => {
      const input = el('input', { type: 'range', class: 'wslider', min, max, step: 1, value, 'aria-label': label });
      input.style.setProperty('--track', track);
      input.style.setProperty('--thumb', cur);
      const out = el('span', { class: 'num', text: `${value}${unit}` });
      // Only the preview updates while dragging; the panel repaints on release,
      // so the slider under your thumb isn't rebuilt mid-drag.
      input.addEventListener('input', () => {
        out.textContent = `${input.value}${unit}`;
        input.setAttribute('aria-valuetext', `${input.value}${unit}, ${colourName(draft.colors[slot])}`);
        draft = { ...draft, colors: { ...draft.colors, [slot]: onInput(+input.value) } };
        commit();
      });
      input.addEventListener('change', () => paintColours());
      return el('label', { class: 'wslider__row' },
        el('span', { class: 'wslider__label' }, el('span', { text: label }), out), input);
    };
    const hueStops = [0, 60, 120, 180, 240, 300, 359].map((x) => fromHsl(x, Math.max(s, 40), 50)).join(',');

    panel.replaceChildren(el('div', { class: 'stack', style: 'gap:14px' },
      el('div', { class: 'chips chips--scroll' }, SLOTS.map(([k, label]) =>
        el('button', { class: 'chip press', type: 'button', 'aria-pressed': slot === k ? 'true' : 'false',
          onclick: () => { slot = k; paintColours(); } },
        el('span', { class: 'dot', style: `background:${draft.colors[k]}` }), label))),
      el('div', { class: 'wswatches' }, pool.map((c) =>
        el('button', { class: 'wswatch press', type: 'button', 'aria-label': colourName(c),
          'aria-pressed': c.toUpperCase() === cur.toUpperCase() ? 'true' : 'false', onclick: () => setColour(c) },
        el('span', { style: `background:${c}` })))),
      el('div', { class: 'stack', style: 'gap:4px' },
        slider('Colour', 0, 359, h, '°', `linear-gradient(90deg,${hueStops})`, (v) => fromHsl(v, Math.max(s, 12), l)),
        slider('Strength', 0, 100, s, '%', `linear-gradient(90deg,${fromHsl(h, 0, l)},${fromHsl(h, 100, l)})`, (v) => fromHsl(h, v, l)),
        slider('Shade', 8, 92, Math.min(92, Math.max(8, l)), '%', `linear-gradient(90deg,${fromHsl(h, s, 8)},${fromHsl(h, s, 50)},${fromHsl(h, s, 92)})`, (v) => fromHsl(h, s, v)))));
  }

  paintTabs();
  paintPanel();

  // One switch for the small extras each kind of adventure adds.
  const touches = switchRow({
    label: 'Dress for the mode',
    hint: 'A camera on a day out, a backpack on a walk, glitter at a festival.',
    on: ctx.state.prefs.modeTouches !== false,
    onChange: (on) => { ctx.state.prefs.modeTouches = on; ctx.save(); },
  });

  return [
    el('h1', { class: 'eb', style: 'margin:0', text: 'Customise' }),
    el('div', { class: 'wpreview' }, av.canvas, caption),
    tabRow,
    panel,
    touches,
    el('div', { class: 'foot' },
      btn('Done', 'btn--pri', () => ctx.back(), { lg: true }),
      el('div', { class: 'btn-pair' },
        btn('Shuffle', 'btn--sec', () => { draft = shuffleLook(draft); changed(); }),
        undoBtn)),
  ];
}
