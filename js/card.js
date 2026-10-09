import { el, btn, foot, head, spacer, toast, icon, hms, hm, km, buzz, sheet } from './ui.js';
import * as S from './state.js';
import { fitPoints } from './session.js';
import { saveImage } from './keepalive.js';
import { badgeSrc, BADGES } from './badges.js';
import * as SM from './staticmap.js';
import { paintAvatar, W as AW, H as AH } from './avatar.js';
import { avatarLook, dressedFor } from './wardrobe.js';
import { MODES } from './modes.js';
import { NIGHT_GLOW, cardBloom, photoBloom } from './glow.js';
import { drawWordmark } from './wordmark.js';

const RATIOS = { feed: [1080, 1350], story: [1080, 1920] };
const PAD = 64;
const C = {
  bg: '#000', text: '#fff', mint: '#7EE0C0', pink: '#F06C9B',
  faint: '#4D4D4D', muted: '#8A8A8A',
};
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/* Text themes. The labels were the casualty on a bright, busy photo — values
   are large and bold enough to survive, a 20px tracked label is not. Each
   theme lifts the label colour and, where needed, puts a halo behind every
   glyph so the type carries its own contrast onto any background. */
const THEMES = [
  {
    key: 'light',
    label: 'Light',
    ink: '#fff',
    labelInk: '#CFD6D3',
    muted: '#B4BDB9',
    shadow: null,
  },
  {
    key: 'halo',
    label: 'Halo',
    ink: '#fff',
    labelInk: '#EAEFEC',
    muted: '#DDE3E0',
    // A soft dark glow, not a hard drop shadow — reads as depth, not emboss.
    shadow: { color: 'rgba(0,0,0,.85)', blur: 26 },
  },
  {
    key: 'dark',
    label: 'Dark',
    ink: '#0B0F0D',
    labelInk: '#2B3330',
    muted: '#3C4642',
    // No glow: a white halo round dark type read as a smudge, not contrast.
    // Dark is for pale photos, where the ink carries itself.
    shadow: null,
  },
];

let ui = null;

/* ---------- 09 card builder ----------
   Round 2 (design/round2/designs/Share and Route): Route or Your photo, 4:5 or
   9:16, an optional title, the avatar with a choice of face, and Save for
   video. Route cards take a Dark or Light card theme; photo cards keep the
   Light / Halo / Dark text themes. Badges and Stops stay as elements. */

const TITLE_MAX = 24;
const FACES = [['normal', 'Normal'], ['happy', 'Happy'], ['wink', 'Wink'], ['hearts', 'Hearts'], ['stars', 'Stars'], ['sleepy', 'Sleepy'], ['none', 'None']];
const FACE_STATE = {
  normal: { eyes: 'open', mouth: 'smile' },
  happy: { eyes: 'happy', mouth: 'cat', blush: 2 },
  wink: { eyes: 'wink', mouth: 'smile' },
  hearts: { eyes: 'heart', mouth: 'open', blush: 2 },
  stars: { eyes: 'star', mouth: 'wide' },
  sleepy: { eyes: 'content', mouth: 'smile', blush: 2 },
};

export function cardScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  if (!ui || ui.session !== s) ui = makeState(s, ctx.state.badges, ctx.state.prefs);
  ui.look = dressedFor(ctx, avatarLook(ctx), S.currentPart(ui.session).mode);

  const canvas = el('canvas', { id: 'card-canvas' });
  bindCanvas(canvas);

  const layouts = el('div', { class: 'chips chips--scroll' });
  const cardLabel = el('div', { class: 'eb', text: 'Card' });
  const cardThemes = el('div', { class: 'chips' });
  const textLabel = el('div', { class: 'eb', text: 'Text' });
  const textThemes = el('div', { class: 'chips' });
  const toggles = el('div', { class: 'chips' });
  const faces = el('div', { class: 'chips chips--scroll' });
  const hint = el('p', { class: 'cap', style: 'margin:0',
    text: 'Drag to move. Pinch, or pull the corner dot, to resize.' });

  const count = el('span', { class: 'cap num', style: 'align-self:flex-end' });
  const titleInput = el('input', { type: 'text', maxlength: String(TITLE_MAX), placeholder: 'Leaving do', 'aria-label': 'Title' });
  titleInput.value = ui.title;
  const setCount = () => { count.textContent = `${ui.title.length}/${TITLE_MAX}`; };
  titleInput.addEventListener('input', () => {
    ui.title = titleInput.value.slice(0, TITLE_MAX);
    setCount();
    draw();
  });
  setCount();

  ui.refreshChrome = () => {
    const route = ui.mode === 'preset';
    layouts.replaceChildren(
      tab('Route', () => setMode('preset'), route),
      // A photo already picked switches back without reopening the picker;
      // tapping again while active re-picks.
      tab('Your photo', () => {
        if (ui.photo && ui.mode !== 'photo') setMode('photo');
        else pickPhoto();
      }, !route),
      el('span', { class: 'chips__rule' }),
      tab('4:5', () => { setRatio('feed'); ui.refreshChrome(); }, ui.ratio === 'feed'),
      tab('9:16', () => { setRatio('story'); ui.refreshChrome(); }, ui.ratio === 'story'),
    );
    cardThemes.replaceChildren(...[['dark', 'Dark'], ['light', 'Light']].map(([k, label]) =>
      tab(label, () => { ui.cardTheme = k; ui.refreshChrome(); draw(); }, ui.cardTheme === k)));
    textThemes.replaceChildren(...THEMES.map((t) =>
      tab(t.label, () => { ui.theme = t.key; ui.refreshChrome(); draw(); }, ui.theme === t.key)));
    toggles.replaceChildren(...elementToggles());
    faces.replaceChildren(...FACES.map(([k, label]) =>
      tab(label, () => { ui.face = k; if (ui.selected === 'avatar' && k === 'none') ui.selected = null; ui.refreshChrome(); draw(); }, ui.face === k)));
    for (const n of [cardLabel, cardThemes]) n.classList.toggle('hidden', !route);
    for (const n of [textLabel, textThemes, hint]) n.classList.toggle('hidden', route);
  };
  ui.refreshChrome();
  draw();

  return [
    head({ title: 'Your card', back: () => ctx.back() }),
    layouts,
    el('div', { class: 'canvas-wrap' }, canvas),
    hint,
    el('div', { class: 'stack', style: 'gap:4px' },
      el('label', { class: 'field' }, el('span', { class: 'field__k', text: 'Title' }), titleInput),
      count),
    cardLabel,
    cardThemes,
    textLabel,
    textThemes,
    el('div', { class: 'eb', text: 'On the card' }),
    toggles,
    el('div', { class: 'eb', text: 'Avatar' }),
    faces,
    spacer(),
    foot(
      btn('Next', 'btn--pri', () => ctx.go('share', s), { lg: true }),
      btn('Save for video', 'btn--sec', () => videoSheet(), { iconName: 'download' }),
    ),
  ];
}

/* ---------- 10 share ---------- */

export function shareScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  if (!ui || ui.session !== s) ui = makeState(s, ctx.state.badges, ctx.state.prefs);
  ui.look = dressedFor(ctx, avatarLook(ctx), S.currentPart(ui.session).mode);

  const canvas = el('canvas', { id: 'card-canvas' });
  bindCanvas(canvas);

  draw();

  return [
    head({ title: 'Share', back: () => ctx.back() }),
    el('div', { class: 'canvas-wrap' }, canvas),
    spacer(),
    foot(
      btn('Share', 'btn--pri', () => shareCard(), { iconName: 'share-2', lg: true }),
      // Half width beside Home, so the short label: the toast says where it went.
      el('div', { class: 'btn-pair' },
        btn('Save', 'btn--sec', () => saveCard(), { iconName: 'download' }),
        btn('Home', 'btn--sec', () => ctx.go('start'))),
    ),
  ];
}

const tab = (label, onclick, on) =>
  el('button', { class: 'chip press', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick }, label);

/* ---------- state ---------- */

// The toggles under "On the card". Title shows when there is one; the avatar
// has its own row of faces, with None to leave it off.
// Each number has its own toggle, between Route and Date (see NUMBERS).
const TYPES = [
  { key: 'map', label: 'Map', presetOnly: true },
  { key: 'route', label: 'Route' },
  { key: 'trim', label: 'Hide start and end', needsTrim: true },
  { key: 'numbers' },
  { key: 'date', label: 'Date' },
  { key: 'places', label: 'Stop names' },
  { key: 'badges', label: 'Badges' },
];
// Photo cards draw in this order, so later ones sit on top and win a tap.
// Both lists come from NUMBERS, so a new number can't be left off the card.
export const photoOrder = () => ['route', 'avatar', 'title', ...NUMBER_KEYS, 'date', 'places', 'badges'];

function makeState(s, allBadges = [], prefs = {}) {
  // Badges the night itself earned, art preloaded for the canvas. The SVGs are
  // same-origin, so drawing them never taints the export.
  const sessionBadges = allBadges
    .filter((b) => [...(s.sessionIds || [s.id]), s.festivalId].includes(b.sessionId))
    .map((b) => BADGES.find((m) => m.slug === b.slug))
    .filter(Boolean);
  // A badge whose art is missing drops out of the card rather than exporting
  // a labelled gap.
  const badgeImgs = [];
  for (const meta of sessionBadges) {
    // Both art sets load up front: the light route card uses the light discs.
    const entry = { meta, img: new Image(), imgLight: new Image() };
    entry.imgLight.onload = () => draw();
    entry.imgLight.src = badgeSrc(meta.slug, 'light');
    entry.img.onload = () => draw();
    entry.img.onerror = () => {
      const i = badgeImgs.indexOf(entry);
      if (i >= 0) badgeImgs.splice(i, 1);
      if (!badgeImgs.length && ui) ui.elements.badges.on = false;
      ui?.refreshChrome?.();
      draw();
    };
    entry.img.src = badgeSrc(meta.slug, 'dark');
    badgeImgs.push(entry);
  }

  const sum = S.summarise(s);
  return {
    session: s,
    sum,
    // Transport on a walk: drawn faint on the route card, mint elsewhere.
    excluded: S.excludedSegments(s, s.endedAt ?? Date.now()),
    offered: offeredNumbers(s, sum),
    badgeImgs,
    mode: 'preset',
    ratio: 'feed',
    theme: 'halo',
    cardTheme: 'dark',
    title: '',
    // With the avatar switched off in Settings, cards start without it.
    face: prefs.showAvatar === false ? 'none' : 'normal',
    look: null,
    photo: null,
    selected: null,
    drag: null,
    // Photo-card positions. The route card lays itself out.
    elements: {
      map: { on: s.trail.length > 1 },
      // Leaves the first and last 200 m off the card. Off until asked for
      // (owner, 2026-10-09); the recap and History always show it all.
      trim: { on: false },
      // Every photo piece starts where the route card has it (photoDefaults)
      // until it's moved or resized, which sets `placed` and leaves it there.
      route: { on: s.trail.length > 1, x: PAD, y: 150, scale: 1, placed: false },
      title: { on: true, x: PAD, y: PAD + 6, scale: 1, placed: false },
      avatar: { on: true, x: 1080 - PAD - 290, y: AVATAR_CORNER_TOP(1350), scale: 1, placed: false },
      ...Object.fromEntries(NUMBERS.map((n) => [n.key, { on: !OFF_BY_DEFAULT.includes(n.key), x: PAD, y: 0, scale: 1, placed: false }])),
      date: { on: true, x: PAD, y: routeDateY(1350), scale: 1, placed: false },
      places: { on: false, x: PAD, y: 200, scale: 1, placed: false },
      badges: { on: badgeImgs.length > 0, x: PAD, y: 180, scale: 1, placed: false },
    },
    bounds: new Map(),
  };
}

const SCALE_MIN = 0.5;
const SCALE_MAX = 2.5;
// Non-finite guards the divide-by-tiny-baseline case; NaN would otherwise
// slip through Math.min/max and stick to the element permanently.
const clampScale = (n) => (Number.isFinite(n) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, n)) : 1);
// The avatar is pixel art, so it only ever grows in whole pixels: 6x to 18x,
// with scale 1 meaning 10x.
// The photo card's avatar: 5 card pixels per avatar pixel at scale 1 (as wide
// as the round 2 avatar at 10), always whole pixels, 3 to 9.
export const avatarCell = (e) => Math.min(9, Math.max(3, Math.round(5 * (e.scale || 1))));
const snapScale = (key, node) => { if (key === 'avatar') node.scale = avatarCell(node) / 5; };

/** Top of the avatar standing beside the stats on the route card (scale 5). */
export const AVATAR_CORNER_TOP = (h) => h - PAD - 490;

// The counts start off: a card shares only what the person adds (owner,
// 2026-10-08), and the drinks count in particular stays private by default.
export const OFF_BY_DEFAULT = ['stops', 'drinks', 'water', 'food'];

// The wordmark sits bottom right on every card, the same size and place.
export const wordmarkSpot = (w, h) => ({ x: w - PAD, y: h - PAD - 37, height: 40, align: 'right' });

// The route card's date line sits on the wordmark's baseline, bottom left.
export const routeDateY = (h) => h - PAD - 29;
/** Where the route card's map has faded out: level with that avatar's head. */
export const routeMapBottom = (h) => AVATAR_CORNER_TOP(h) + 140;

/**
 * How tall the route card's route frame is. On 4:5 it runs down to the badges
 * and numbers but never behind the avatar beside them; with no route the space
 * is the big avatar's. 9:16 keeps the frame the owner signed off.
 */
export function routeRegionH(h, { top, stackTop, above, title, route }) {
  if (h >= 1500) return h - 790 - above - (title ? 60 : 0);
  const bottom = route ? Math.min(stackTop, AVATAR_CORNER_TOP(h)) : stackTop;
  return bottom - 30 - top;
}

/**
 * The route frame the owner chose (2026-10-05): 9:16 keeps the frame it has
 * with three rows of numbers, whatever is stacked above them; 4:5 zooms out no
 * further than it does with four rows (badges on three rows of numbers), and
 * zooms in when there are fewer. `bottom` is the bottom number row's top.
 */
export function routeFrameH(h, { top, stackTop, above, title, route, bottom }) {
  // With no route the space is the big avatar's, which must stay clear of
  // the stack, so it keeps following it.
  if (!route) return routeRegionH(h, { top, stackTop, above, title, route });
  const threeRows = bottom - 2 * 130;
  if (h >= 1500) return routeRegionH(h, { top, stackTop: threeRows, above: 0, title, route });
  return routeRegionH(h, { top, stackTop: Math.max(stackTop, threeRows - 215), above, title, route });
}

/**
 * Badges on a card, four to a row, in at most `maxRows` rows. When there are
 * more than fit, the last spot shows how many more there are instead.
 */
export function badgeGrid(n, maxRows = 2) {
  const room = maxRows * 4;
  const shown = n > room ? room - 1 : n;
  return { shown, more: n - shown, rows: Math.ceil((shown + (n > shown ? 1 : 0)) / 4) };
}

/**
 * How many badge rows a route card allows (owner, 2026-10-05). On 4:5 the
 * badges get the rows the others leave: three rows of numbers and stop names
 * leave one, two leave two, one leaves three, none leaves four. 9:16 and the
 * photo card allow two.
 */
export const badgeRowsFor = (h, otherRows) => (h >= 1500 ? 2 : Math.min(4, Math.max(1, 4 - otherRows)));
// Disc and label sizes. With more than one row the discs shrink a little
// (labels keep their width, so they stay on one line) and rows close up.
const BADGE_STYLES = { full: { size: 120, gap: 34, label: 20 }, compact: { size: 104, gap: 50, label: 20 } };

/** Badge rows stacked tight: each as tall as its disc and its own labels need. */
export function badgeRowsLayout(labelHs, size) {
  const tops = [];
  let y = 0;
  labelHs.forEach((lh) => { tops.push(y); y += size + 12 + lh + 14; });
  return { tops, h: tops.length ? tops.at(-1) + size + 12 + labelHs.at(-1) : 0 };
}

/** Where every badge goes, measured, for a stack of at most `maxRows` rows. */
function badgesLayout(g, maxRows) {
  const items = ui.badgeImgs;
  const { shown, more, rows } = badgeGrid(items.length, maxRows);
  const st = rows > 1 ? BADGE_STYLES.compact : BADGE_STYLES.full;
  const cellW = st.size + st.gap;
  const labelHs = Array.from({ length: rows }, (_, r) => Math.max(0, ...items.slice(0, shown).slice(r * 4, r * 4 + 4)
    .map(({ meta }) => labelFit(g, meta.name, cellW - 10, { size: st.label, spacing: 0 }).h)));
  return { shown, more, rows, st, cellW, ...badgeRowsLayout(labelHs, st.size) };
}

/** With no route, the avatar's scale in the map's space, or 0 when there isn't room for it. */
export function cardAvatarScale(regionH) {
  return regionH >= AH * 3 ? Math.min(9, Math.max(3, Math.floor((regionH * 0.9) / AH))) : 0;
}

function elementToggles() {
  // Badges and stop names only exist when the adventure has some; numbers
  // only when it measured them.
  const types = TYPES.flatMap((t) => (t.key === 'numbers'
    ? NUMBERS.filter((n) => ui.offered.includes(n.key)) : [t])).filter((t) =>
    (t.key !== 'badges' || ui.badgeImgs.length)
    && (t.key !== 'places' || ui.session.pins.length)
    && (!t.presetOnly || ui.mode === 'preset')
    && (!['map', 'route'].includes(t.key) || ui.session.trail.length > 1)
    && (!t.needsTrim || S.trimEnds(ui.session.trail).length > 1));
  const chips = types.map((t) =>
    el('button', {
      class: 'chip press', type: 'button',
      'aria-pressed': ui.elements[t.key].on ? 'true' : 'false',
      onclick: () => {
        ui.elements[t.key].on = !ui.elements[t.key].on;
        if (!ui.elements[t.key].on && ui.selected === t.key) ui.selected = null;
        ui.refreshChrome();
        draw();
      },
    }, t.label));
  // On a photo, Tidy puts moved numbers back into the stack.
  if (ui.mode === 'photo' && photoOrder().some((k) => ui.elements[k].placed || (ui.elements[k].scale || 1) !== 1)) {
    chips.push(el('button', {
      class: 'chip press', type: 'button',
      onclick: () => {
        tidyPhoto();
        ui.refreshChrome();
        draw();
      },
    }, 'Tidy'));
  }
  return chips;
}

function setMode(mode) { ui.mode = mode; ui.selected = null; ui.refreshChrome?.(); draw(); }

function setRatio(ratio) {
  if (ui.ratio === ratio) return;
  const [, oldH] = RATIOS[ui.ratio];
  ui.ratio = ratio;
  const [, newH] = RATIOS[ratio];
  // Keep elements the same distance from whichever edge they were nearest.
  for (const e of Object.values(ui.elements)) {
    if (e.y != null && e.y > oldH / 2) e.y += newH - oldH;
  }
  sizeCanvas();
  clampAll();
  draw();
}

function sizeCanvas() {
  const [w, h] = RATIOS[ui.ratio];
  ui.canvas.width = w;
  ui.canvas.height = h;
  ui.canvas.style.aspectRatio = `${w} / ${h}`;
}

// Keeps a grabbable piece of every element on the card (160 px across, 80
// down) but lets big ones hang off any edge. The old fixed limits held the left
// edge at 0 whatever the size, so a scaled-up element that overflowed the right
// could never be pulled back into view.
function clampAll() {
  const [w, h] = RATIOS[ui.ratio];
  for (const [key, e] of Object.entries(ui.elements)) {
    if (e.x == null) continue;
    const b = ui.bounds.get(key);
    const bw = b ? b.w : 140, bh = b ? b.h : 60;
    const keepX = Math.min(bw, 160), keepY = Math.min(bh, 80);
    e.x = Math.min(Math.max(e.x, keepX - bw), w - keepX);
    e.y = Math.min(Math.max(e.y, keepY - bh), h - keepY);
  }
}

function bindCanvas(canvas) {
  ui.canvas = canvas;
  ui.g = canvas.getContext('2d');
  sizeCanvas();
  attachDrag(canvas);
}

/* ---------- photo ---------- */

function pickPhoto() {
  const input = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); ui.photo = img; setMode('photo'); };
    img.onerror = () => { URL.revokeObjectURL(url); toast('That image didn’t open.'); };
    img.src = url;
  });
  document.body.append(input);
  input.click();
}

/* ---------- drag ---------- */

function attachDrag(canvas) {
  const toCard = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Every active pointer, so a second finger upgrades a drag into a pinch.
  const pointers = new Map();

  canvas.addEventListener('pointerdown', (e) => {
    if (ui.mode !== 'photo') return;
    // A hidden pane reports a zero-size rect; the division would poison every
    // coordinate with NaN.
    if (!canvas.getBoundingClientRect().width) return;
    const p = toCard(e);
    pointers.set(e.pointerId, p);
    // Android occasionally drops a pointerup; without this, one dropped event
    // leaves a ghost finger that breaks gestures for the rest of the session.
    if (pointers.size > 2) {
      pointers.clear();
      pointers.set(e.pointerId, p);
      ui.pinch = null;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not captured */ }

    // Second finger on a selected element: switch from dragging to pinching.
    if (pointers.size === 2 && ui.selected) {
      const [a, b] = [...pointers.values()];
      ui.drag = null;
      const bb = ui.bounds.get(ui.selected);
      ui.pinch = {
        key: ui.selected, baseDist: Math.max(dist(a, b), 1), baseScale: ui.elements[ui.selected].scale || 1,
        // Pinching grows the element around its middle, not its top-left corner.
        cx: bb ? bb.x + bb.w / 2 : null, cy: bb ? bb.y + bb.h / 2 : null,
        bw: bb?.w, bh: bb?.h,
      };
      return;
    }

    // The corner grip resizes; generous slop because thumbs at 2am.
    if (ui.selected && ui.bounds.has(ui.selected)) {
      const grip = handleCentre(ui.bounds.get(ui.selected));
      if (dist(p, grip) < 95) {
        const el2 = ui.elements[ui.selected];
        const b = ui.bounds.get(ui.selected);
        ui.resize = {
          key: ui.selected,
          baseScale: el2.scale || 1,
          baseDist: Math.max(dist(p, { x: b.x, y: b.y }), 1),
        };
        return;
      }
    }

    const hit = hitTest(p);
    ui.selected = hit;
    if (hit) {
      const b = ui.bounds.get(hit);
      ui.drag = { key: hit, dx: p.x - b.x, dy: p.y - b.y };
    }
    draw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = toCard(e);
    pointers.set(e.pointerId, p);
    e.preventDefault();

    if (ui.pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const pn = ui.pinch, node = ui.elements[pn.key];
      node.scale = clampScale(pn.baseScale * (dist(a, b) / pn.baseDist));
      snapScale(pn.key, node);
      // A resized piece keeps its spot rather than following the layout.
      node.placed = true;
      if (pn.cx != null) {
        const k = node.scale / pn.baseScale;
        node.x = pn.cx - (pn.bw * k) / 2;
        node.y = pn.cy - (pn.bh * k) / 2;
      }
      clampAll();
      draw();
      return;
    }

    if (ui.resize) {
      const el2 = ui.elements[ui.resize.key];
      const b = ui.bounds.get(ui.resize.key);
      el2.scale = clampScale(ui.resize.baseScale * (dist(p, { x: b.x, y: b.y }) / ui.resize.baseDist));
      snapScale(ui.resize.key, el2);
      el2.placed = true;
      draw();
      return;
    }

    if (ui.drag) {
      const node = ui.elements[ui.drag.key];
      // A real move takes a piece out of the stack; a wobble while tapping doesn't.
      if (!node.placed) {
        const b0 = ui.bounds.get(ui.drag.key);
        if (b0 && Math.hypot(p.x - ui.drag.dx - b0.x, p.y - ui.drag.dy - b0.y) < 14) return;
        node.placed = true;
        ui.refreshChrome?.();
      }
      const snapped = snap(ui.drag.key, p.x - ui.drag.dx, p.y - ui.drag.dy);
      node.x = snapped.x;
      node.y = snapped.y;
      // A tick you can feel the moment an edge locks, so alignment doesn't
      // depend on watching a hairline under your thumb.
      const sig = snapped.guides.map((g) => g.axis + Math.round(g.at)).join();
      if (sig && sig !== ui.guideSig) buzz(8);
      ui.guideSig = sig;
      ui.guides = snapped.guides;
      clampAll();
      draw();
    }
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    // A resize or pinch can bring up Tidy, so the controls catch up when it ends.
    if ((ui.resize || ui.pinch) && pointers.size < 2) ui.refreshChrome?.();
    if (pointers.size < 2) ui.pinch = null;
    if (!pointers.size) {
      ui.drag = null;
      ui.resize = null;
      if (ui.guides?.length) { ui.guides = []; ui.guideSig = ''; draw(); }
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

/* Snapping. The dragged element's left edge, centre and right edge are tested
   against the card margins, the card's centre line, and every other element's
   edges and centre — and the same vertically. Within reach, it jumps into line
   and a guide shows what it locked to. Edges only meet their own kind — left
   to left, centre to centre, right to right. Matching every edge against every
   other edge left almost no free space on a busy card, so big elements jumped
   between snap points instead of going where they were put. */
const SNAP = 24;

function snap(key, x, y) {
  const [w, h] = RATIOS[ui.ratio];
  const b = ui.bounds.get(key);
  if (!b) return { x, y, guides: [] };

  const xs = [[PAD], [w / 2], [w - PAD]];
  const ys = [[PAD], [h / 2], [h - PAD]];
  for (const [k, o] of ui.bounds) {
    if (k === key) continue;
    xs[0].push(o.x); xs[1].push(o.x + o.w / 2); xs[2].push(o.x + o.w);
    ys[0].push(o.y); ys[1].push(o.y + o.h / 2); ys[2].push(o.y + o.h);
  }

  // edges[i] (start, middle, end of the dragged element) only tests lines[i].
  const nearest = (edges, lines) => {
    let hit = null;
    edges.forEach((edge, i) => {
      for (const line of lines[i]) {
        const d = line - edge;
        if (Math.abs(d) <= SNAP && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, line };
      }
    });
    return hit;
  };

  const hx = nearest([x, x + b.w / 2, x + b.w], xs);
  const hy = nearest([y, y + b.h / 2, y + b.h], ys);
  const guides = [];
  if (hx) { x += hx.d; guides.push({ axis: 'x', at: hx.line }); }
  if (hy) { y += hy.d; guides.push({ axis: 'y', at: hy.line }); }
  return { x, y, guides };
}

// Topmost first, so the element drawn last wins an overlap.
function hitTest(p) {
  for (const k of [...ui.bounds.keys()].reverse()) {
    const b = ui.bounds.get(k);
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return k;
  }
  return null;
}

/* ---------- text ----------
   Manual letter-spacing: ctx.letterSpacing isn't universal, and the labels
   depend on +0.18em tracking to read as labels at all. */

const ROUTE_THEMES = {
  dark: {
    bg: '#000000', rgb: '0,0,0', text: '#FFFFFF', label: '#A3A3A3', date: '#8A8A8A', pink: '#F06C9B',
    mark: '#7EE0C0', route: '#7EE0C0', under: 'rgba(0,0,0,.55)', underW: 10, ring: '#000000',
    faint: 'rgba(255,255,255,.3)', underFaint: 'rgba(0,0,0,.55)',
    credit: 'rgba(255,255,255,.45)',
  },
  light: {
    bg: '#EEF2F8', rgb: '238,242,248', text: '#0B1526', label: '#626E81', date: '#4A576B', pink: '#C92F68',
    mark: '#0B6E55', route: '#7EE0C0', under: '#0B6E55', underW: 7, ring: '#FFFFFF',
    faint: 'rgba(11,21,38,.26)', underFaint: 'rgba(255,255,255,.75)',
    credit: 'rgba(11,21,38,.45)',
  },
};
const routeTheme = () => ROUTE_THEMES[ui.cardTheme] || ROUTE_THEMES.dark;
const theme = () => {
  if (ui.mode === 'preset') {
    const T = routeTheme();
    return { ink: T.text, labelInk: T.label, muted: T.date, shadow: null };
  }
  return THEMES.find((t) => t.key === ui.theme) || THEMES[0];
};

function drawText(g, str, x, y, { size = 40, weight = 700, color, spacing = 0, align = 'left' } = {}) {
  const th = theme();
  g.save();
  g.font = `${weight} ${size}px ${SANS}`;
  g.fillStyle = color || th.ink;
  g.textBaseline = 'top';
  // The halo has to be painted per glyph, not per string, or the shadow of one
  // letter lands over the next.
  if (th.shadow) {
    g.shadowColor = th.shadow.color;
    g.shadowBlur = th.shadow.blur;
  }
  const chars = [...str];
  const width = measure(g, chars, spacing);
  let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  for (const ch of chars) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + spacing;
  }
  g.restore();
  return width;
}

function textWidth(g, str, { size = 16, weight = 600, spacing = 0 } = {}) {
  g.font = `${weight} ${size}px ${SANS}`;
  return measure(g, [...str], spacing);
}

// A badge label has to stay inside its own cell — at full size "HOMING PIGEON"
// ran straight into the next badge. Try one line, then the most balanced
// two-line split, then shrink as a last resort. Returns the height used.
// How a label fits its cell: one line, the most balanced two-line split, or
// shrunk as a last resort. Measures only; drawLabelFit draws the result.
function labelFit(g, text, maxW, base = {}) {
  const opts = { size: 16, weight: 600, color: labelInk(), spacing: 2, align: 'center', ...base };
  if (textWidth(g, text, opts) <= maxW) return { opts, lines: [text], h: opts.size + 4 };
  const words = text.split(' ');
  if (words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const w = Math.max(textWidth(g, a, opts), textWidth(g, b, opts));
      if (!best || w < best.w) best = { a, b, w };
    }
    if (best && best.w <= maxW) return { opts, lines: [best.a, best.b], h: (opts.size + 3) * 2 };
  }
  let size = opts.size;
  while (size > 10 && textWidth(g, text, { ...opts, size }) > maxW) size -= 1;
  return { opts: { ...opts, size }, lines: [text], h: size + 4 };
}

function drawLabelFit(g, text, cx, y, maxW, base = {}) {
  const fit = labelFit(g, text, maxW, base);
  fit.lines.forEach((line, i) => drawText(g, line, cx, y + i * (fit.opts.size + 3), fit.opts));
  return fit.h;
}

function measure(g, chars, spacing) {
  let w = 0;
  for (const ch of chars) w += g.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

const abbrev = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// Faint reads fine on the black preset card but disappears over a photograph,
// so labels step up whenever there's an image behind them — and the chosen
// text theme decides how far.
// Video exports get the same step-up: they'll sit over footage, not black.
const overImage = () => ui.mode === 'preset' || (ui.photo && ui.mode === 'photo');
const labelInk = () => (overImage() ? theme().labelInk : C.faint);
const mutedInk = () => (overImage() ? theme().muted : C.muted);

// Date only. The place was the first stop's name, which on most nights is
// either "Unnamed stop" or a venue that says nothing about the night, and the
// kinds of adventure ran long once modes could change partway.
export function placeLine(s) {
  return new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' });
}

/* ---------- the numbers ----------
   Every number is its own element, switched on and off by itself. Groups set
   where they stack: A (distance, steps) on top, B (the counts) in the middle,
   C (time out, pace) at the bottom, nearest the date. */

export const NUMBERS = [
  { key: 'distance', label: 'Distance', group: 'A' },
  { key: 'steps', label: 'Steps', group: 'A' },
  { key: 'stops', label: 'Stops', group: 'B' },
  { key: 'drinks', label: 'Drinks', group: 'B' },
  { key: 'water', label: 'Water', group: 'B' },
  { key: 'food', label: 'Food', group: 'B' },
  { key: 'acts', label: 'Acts seen', group: 'B' },
  { key: 'time', label: 'Time out', group: 'C' },
  { key: 'pace', label: 'Pace per km', group: 'C' },
];
const NUMBER_KEYS = NUMBERS.map((n) => n.key);
const walkPaceOf = (s) => (S.onlyMode(s, 'walk') && s.trail.length > 1 ? S.walkPace(s, s.endedAt ?? Date.now()) : null);

/** The numbers this adventure measured, in stacking order: nothing it couldn't measure is offered. */
export function offeredNumbers(s, sum) {
  const measured = {
    distance: s.trail.length > 1, steps: sum.steps > 0, pace: !!walkPaceOf(s), acts: (s.sets || []).length > 0,
  };
  return NUMBER_KEYS.filter((k) => measured[k] ?? true);
}

/** A number's value as the cards show it. The photo card's time keeps its seconds. */
export function numberValue(key, s, sum, { clock = false } = {}) {
  switch (key) {
    case 'distance': return `${km(sum.distanceM)} km`;
    case 'steps': return abbrev(sum.steps);
    case 'stops': return String(sum.stops);
    case 'drinks': return String(sum.drinks);
    case 'water': return String(sum.waters);
    case 'food': return String((s.meals || []).length);
    case 'time': return clock ? hms(sum.ms) : hm(sum.ms);
    case 'pace': return walkPaceOf(s) || '';
    case 'acts': return String(S.festivalActs([s]).length);
    default: return '';
  }
}

/** A row's x positions: each on its column, or further right to keep a 48px gap after the one before. */
export function rowXs(widths, cols, { left = PAD, unit = 150, gap = 48 } = {}) {
  const xs = [];
  cols.forEach((col, i) => {
    xs.push(i ? Math.max(left + col * unit, xs[i - 1] + widths[i - 1] + gap) : left + col * unit);
  });
  return xs;
}

/**
 * The route card's rows, top to bottom, as { key, col } with col in quarter
 * widths. Distance, steps, time out and pace take half a row; the counts take
 * a quarter. A switched-off number leaves no gap: its row closes up, and an
 * empty row disappears so everything above it moves down.
 */
export function numberRows(keys) {
  const rows = [];
  const pack = (group, span) => {
    const list = NUMBERS.filter((n) => n.group === group && keys.includes(n.key)).map((n) => n.key);
    const per = 4 / span;
    for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per).map((key, j) => ({ key, col: j * span })));
  };
  pack('A', 2);
  pack('B', 1);
  pack('C', 2);
  return rows;
}

/* ---------- draw ----------
   `only` draws a single layer on a clear ground, for Save for video; `target`
   draws onto another canvas at the card's size. */

function draw({ forExport = false, only = null, target = null } = {}) {
  if (!ui?.g && !target) return;
  const g = target || ui.g;
  const live = !target;
  const [w, h] = RATIOS[ui.ratio];
  const want = (id) => !only || only === id;
  if (live) ui.bounds.clear();
  g.clearRect(0, 0, w, h);

  if (ui.mode === 'preset') { drawRouteCard(g, w, h, want); return; }

  if (!only) {
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    if (ui.photo) {
      drawCover(g, ui.photo, w, h);
      // A 34% wash so white type holds over any picture.
      g.fillStyle = 'rgba(0,0,0,.34)';
      g.fillRect(0, 0, w, h);
    } else {
      drawBloom(g, w, h);
    }
  }
  drawFree(g, w, h, forExport || !!only || !live, want, live);
  // The wordmark is the one fixed element on a photo card: mint, bottom right.
  if (want('wordmark')) {
    const spot = wordmarkSpot(w, h);
    drawWordmark(g, spot.x, spot.y, spot.height, { color: C.mint, align: spot.align, shadow: theme().shadow });
  }
}

// The card glows in the colour of the mode the adventure ended in.
const modeGlow = () => MODES[S.currentPart(ui.session).mode]?.glow || NIGHT_GLOW;

function drawBloom(g, w, h) {
  const grad = g.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 1.15);
  const [a, b, c] = photoBloom(modeGlow());
  grad.addColorStop(0, a);
  grad.addColorStop(0.42, b);
  grad.addColorStop(0.78, c);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

function drawCover(g, img, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

let redrawQueued = false;
function queueDraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => { redrawQueued = false; draw(); });
}

/* ---------- the route card ----------
   The map fills the top and fades into the ground behind the numbers; the
   route lies on the real streets; stats sit in rows at the foot with the
   avatar standing to their right. Badges and stops, when on, stack above the
   stats and the map gives up the room. */

// The numbers' type on both cards (owner, 2026-10-09: one size for every value).
const NUM_LABEL = { size: 28, weight: 600 };
const NUM_VALUE = { size: 76, weight: 700, spacing: -2 };

/**
 * Where everything sits on the route card, which is also where the photo
 * card's pieces start. The numbers stack up from the bottom: the bottom row
 * sits just above the date (lower without it) and each row above is 130
 * higher. Badges and stop names sit on top of the numbers, so everything
 * moves down together. `clock` measures time out as the photo card writes it.
 */
function routeLayout(g, w, h, { clock = false } = {}) {
  const on = ui.elements;
  const M = PAD;
  const title = ui.title.trim();
  const rows = numberRows(ui.offered.filter((k) => on[k].on));
  const bottom = on.date.on ? h - M - 190 : h - M - 140;
  const rowY = (i) => bottom - (rows.length - 1 - i) * 130;
  const numbersTop = rows.length ? rowY(0) : bottom + 130;

  const placesOn = on.places.on && ui.session.pins.length;
  const badgeRows = badgeRowsFor(h, rows.length + (placesOn ? 1 : 0));
  const stack = [];
  if (placesOn) stack.push({ id: 'places', h: 36 + Math.min(ui.session.pins.length, 5) * 44 + 30 });
  // The badges' own height plus the same clear space below them as before.
  if (on.badges.on && ui.badgeImgs.length) stack.push({ id: 'badges', h: badgesLayout(g, badgeRows).h + 57 });
  const above = stack.reduce((n, b) => n + b.h, 0);
  const stackTop = numbersTop - above;
  let y = stackTop;
  for (const b of stack) { b.y = y; y += b.h; }

  // The route is framed in the space above the badges and stats. On 4:5 that
  // space runs down to the badges, so the route sits larger; 9:16 keeps its frame.
  const regionY = title ? 150 : 90;
  const regionH = routeFrameH(h, { top: regionY, stackTop, above, title, route: ui.session.trail.length > 1, bottom });
  const region = { x: M, y: regionY, w: w - M * 2, h: regionH };

  // Measured, so a long value (15.5 km) never runs into the next number.
  const numbers = {};
  rows.forEach((row, i) => {
    const widths = row.map(({ key }) => Math.max(
      textWidth(g, NUMBERS.find((n) => n.key === key).label, NUM_LABEL),
      textWidth(g, numberValue(key, ui.session, ui.sum, { clock }), NUM_VALUE)));
    const xs = rowXs(widths, row.map((c) => c.col), { left: M });
    row.forEach(({ key }, j) => { numbers[key] = { x: xs[j], y: rowY(i) }; });
  });

  // With no route the avatar takes the map's place, big, so the card has no
  // empty half, when there's room for it at a readable size; otherwise it
  // stands beside the stats.
  const big = ui.session.trail.length < 2 ? cardAvatarScale(region.h) : 0;
  const avatar = big
    ? { x: Math.round(w / 2 - (AW * big) / 2), y: Math.round(region.y + (region.h - AH * big) / 2), cell: big }
    : { x: w - M - 290, y: AVATAR_CORNER_TOP(h), cell: 5 };

  return {
    title: { x: M, y: M + 6 }, region, stack, badgeRows, numbers,
    date: { x: M, y: routeDateY(h) }, avatar,
    // The map runs down behind the badges, stop names and numbers and fades
    // out level with the avatar's head.
    mapH: routeMapBottom(h),
  };
}

function drawRouteCard(g, w, h, want) {
  const T = routeTheme();
  const on = ui.elements;
  const title = ui.title.trim();
  const L = routeLayout(g, w, h);
  const { region, mapH } = L;
  const shown = shownRoute(ui);
  const trail = shown.trail;
  let frame = on.map.on && trail.length > 1 && !ui.mapBlocked && region.h >= 120 ? SM.frame(trail, region) : null;

  if (want('map')) {
    g.fillStyle = T.bg;
    g.fillRect(0, 0, w, h);
    if (frame && !drawRouteMap(g, w, frame, mapH, T)) frame = null;
    const bloom = g.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.9);
    cardBloom(modeGlow(), ui.cardTheme === 'light' ? 'light' : 'dark').forEach((c, i) => bloom.addColorStop(i / 2, c));
    g.fillStyle = bloom;
    g.fillRect(0, 0, w, h);
  } else if (frame && SM.status(SM.tilesFor(frame, w, mapH, ui.cardTheme === 'light')) === 'failed') {
    frame = null;
  }

  if (want('title') && title) drawText(g, title, L.title.x, L.title.y, { size: 64, weight: 700, color: T.text, spacing: -1 });
  if (want('route') && on.route.on && trail.length > 1) {
    if (frame) strokeRoute(g, trail.map((p) => SM.toCard(frame, p.lat, p.lng)), shown.pins.map((p) => SM.toCard(frame, p.lat, p.lng)), T, 11, shown.excluded);
    else outlineRoute(g, region, T, shown.excluded);
  }

  for (const b of L.stack) if (want(b.id)) DRAW[b.id](g, PAD, b.y, w, { maxRows: L.badgeRows });

  // Each number is its own layer for Save for video, and only measured ones
  // are ever offered, so nothing reads as a zero it didn't count.
  for (const [key, at] of Object.entries(L.numbers)) {
    if (!want(key)) continue;
    drawText(g, NUMBERS.find((n) => n.key === key).label, at.x, at.y, { ...NUM_LABEL, color: T.label });
    drawText(g, numberValue(key, ui.session, ui.sum), at.x, at.y + 36, { ...NUM_VALUE, color: T.text });
  }
  // The date bottom left, on the same baseline as the wordmark bottom right.
  if (want('date') && on.date.on) drawText(g, placeLine(ui.session), L.date.x, L.date.y, { size: 30, weight: 400, color: T.date });
  if (want('wordmark')) {
    const spot = wordmarkSpot(w, h);
    drawWordmark(g, spot.x, spot.y, spot.height, { color: T.mark, align: spot.align });
  }
  if (want('avatar') && ui.face !== 'none' && ui.look) paintAvatar(g, ui.look, L.avatar.x, L.avatar.y, L.avatar.cell, FACE_STATE[ui.face]);
}

/* Map tiles for the top of the card, fading into the ground. Returns false
   when every tile failed (offline), so the plain outline stands in. */
function drawRouteMap(g, w, f, mapH, T) {
  const list = SM.tilesFor(f, w, mapH, ui.cardTheme === 'light');
  g.save();
  g.beginPath();
  g.rect(0, 0, w, mapH);
  g.clip();
  let drawn = 0;
  for (const t of list) {
    const img = SM.tile(t.url, queueDraw);
    if (!img) continue;
    // A pixel of overlap hides the hairline seams fractional positions leave.
    g.drawImage(img, Math.floor(t.dx), Math.floor(t.dy), Math.ceil(t.size) + 1, Math.ceil(t.size) + 1);
    drawn++;
  }
  // Type over a map sits on a gradient, never a capsule (design system rule).
  const foot = g.createLinearGradient(0, mapH - 360, 0, mapH);
  foot.addColorStop(0, `rgba(${T.rgb},0)`);
  foot.addColorStop(1, `rgba(${T.rgb},1)`);
  g.fillStyle = foot;
  g.fillRect(0, mapH - 360, w, 360);
  const head = g.createLinearGradient(0, 0, 0, 220);
  head.addColorStop(0, `rgba(${T.rgb},.72)`);
  head.addColorStop(1, `rgba(${T.rgb},0)`);
  g.fillStyle = head;
  g.fillRect(0, 0, w, 220);
  g.restore();
  if (!drawn) return SM.status(list) !== 'failed';
  // The tiles' terms require a credit on anything that shows them.
  g.save();
  g.font = `400 17px ${SANS}`;
  g.textAlign = 'right';
  g.textBaseline = 'top';
  g.fillStyle = T.credit;
  g.fillText('Map © Esri · OpenStreetMap contributors', w - 28, 24);
  g.restore();
  return true;
}

/**
 * What the card draws of the route: the whole trail, or with hide start and
 * end on, the trail less its ends, the left-out flags cut to match, and no
 * stop within 200 m of either real end.
 */
export function shownRoute(state) {
  const s = state.session;
  const pins = s.pins.filter((p) => p.lat != null);
  if (!state.elements.trim?.on) return { trail: s.trail, excluded: state.excluded, pins };
  const trail = S.trimEnds(s.trail);
  if (!trail.length) return { trail, excluded: [], pins: [] };
  const at = s.trail.indexOf(trail[0]);
  const excluded = (state.excluded || []).slice(at, at + trail.length);
  excluded[0] = false;
  const ends = [s.trail[0], s.trail.at(-1)];
  return {
    trail, excluded,
    pins: pins.filter((p) => ends.every((e) => S.haversineM(e.lat, e.lng, p.lat, p.lng) >= S.TRIM_M)),
  };
}

/**
 * The route as runs of counted and left-out stretches. `excluded[i]` is for the
 * segment from point i-1 to point i; neighbouring runs share their join.
 */
export function routeRuns(pts, excluded) {
  const runs = [];
  for (let i = 1; i < pts.length; i++) {
    const counted = !excluded?.[i];
    const last = runs.at(-1);
    if (last && last.counted === counted) last.pts.push(pts[i]);
    else runs.push({ counted, pts: [pts[i - 1], pts[i]] });
  }
  return runs;
}

const pathOf = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };

// Mint on an under-stroke (dark on black, deep teal on the light card), pink
// stops with a ring. On a walk with transport left out, the whole line goes
// down faint first and only the counted stretches are mint (owner, 2026-10-09).
function strokeRoute(g, pts, stops, T, lw = 11, excluded = null) {
  if (pts.length < 2) return;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const runs = excluded?.some(Boolean) ? routeRuns(pts, excluded) : [{ counted: true, pts }];
  if (runs.some((r) => !r.counted)) {
    pathOf(g, pts);
    g.strokeStyle = T.underFaint || T.under;
    g.lineWidth = lw + T.underW;
    g.stroke();
    g.strokeStyle = T.faint;
    g.lineWidth = lw;
    g.stroke();
  }
  for (const run of runs.filter((r) => r.counted)) {
    pathOf(g, run.pts);
    g.strokeStyle = T.under;
    g.lineWidth = lw + T.underW;
    g.stroke();
    g.strokeStyle = T.route;
    g.lineWidth = lw;
    g.stroke();
  }
  for (const p of stops) {
    g.beginPath();
    g.arc(p.x, p.y, lw * 1.6, 0, Math.PI * 2);
    g.fillStyle = T.pink;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = T.ring;
    g.stroke();
  }
  g.restore();
}

// No map (off, offline or a very short night): the route's shape alone.
function outlineRoute(g, region, T, excluded = null) {
  const shown = shownRoute(ui);
  const pts = shown.trail;
  if (pts.length < 2 || region.w < 40 || region.h < 40) return;
  const fitted = fitPoints(pts, region.w, region.h, 20).map((p) => ({ x: p.x + region.x, y: p.y + region.y }));
  const stops = shown.pins.map((pin) => {
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - pin.t) < Math.abs(pts[best].t - pin.t)) best = i;
    return fitted[best];
  });
  strokeRoute(g, fitted, stops, T, 11, excluded);
}

/* ---------- the photo card ---------- */

/**
 * Every photo piece that hasn't been moved or resized sits where the route
 * card has it (owner, 2026-10-09), so switching over keeps the layout and
 * switching a number off closes its gap. Moved pieces stay where they were put.
 */
function photoDefaults(g, w, h) {
  const L = routeLayout(g, w, h, { clock: true });
  const spot = {
    title: L.title, date: L.date, ...L.numbers,
    route: { x: L.region.x, y: L.region.y, box: { w: L.region.w, h: L.region.h } },
    avatar: { x: L.avatar.x, y: L.avatar.y, scale: L.avatar.cell / 5 },
  };
  for (const b of L.stack) spot[b.id] = { x: PAD, y: b.y, maxRows: L.badgeRows };
  for (const key of photoOrder()) {
    const e = ui.elements[key];
    if (e && !e.placed && spot[key]) Object.assign(e, spot[key]);
  }
}

/** Tidy: every photo piece back to where the route card has it. */
export function tidyPhoto() {
  for (const k of photoOrder()) if (ui.elements[k]) Object.assign(ui.elements[k], { placed: false, scale: 1 });
}

function drawFree(g, w, h, forExport, want, live) {
  const setBounds = (key, b) => { if (live) ui.bounds.set(key, b); };
  photoDefaults(g, w, h);
  for (const key of photoOrder()) {
    const e = ui.elements[key];
    if (!e?.on || !want(key)) continue;
    if (NUMBER_KEYS.includes(key) && !ui.offered.includes(key)) continue;
    if (key === 'title' && !ui.title.trim()) continue;
    if (key === 'avatar') {
      if (ui.face === 'none' || !ui.look) continue;
      const cellSize = avatarCell(e);
      paintAvatar(g, ui.look, e.x, e.y, cellSize, FACE_STATE[ui.face]);
      setBounds(key, { x: e.x, y: e.y, w: AW * cellSize, h: AH * cellSize });
      continue;
    }
    const scale = e.scale || 1;
    // Elements draw themselves at the origin under a transform, so every DRAW
    // routine scales for free and the stored bounds stay in card coordinates.
    g.save();
    g.translate(e.x, e.y);
    g.scale(scale, scale);
    const box = DRAW[key](g, 0, 0, w, { maxRows: e.maxRows || 2 });
    g.restore();
    setBounds(key, { x: e.x, y: e.y, w: box.w * scale, h: box.h * scale });
  }
  if (!forExport && ui.guides?.length) {
    g.save();
    g.strokeStyle = 'rgba(126,224,192,.75)';
    g.lineWidth = 2;
    g.setLineDash([10, 8]);
    for (const gd of ui.guides) {
      g.beginPath();
      if (gd.axis === 'x') { g.moveTo(gd.at, 0); g.lineTo(gd.at, h); }
      else { g.moveTo(0, gd.at); g.lineTo(w, gd.at); }
      g.stroke();
    }
    g.restore();
  }

  if (!forExport && ui.selected && ui.bounds.has(ui.selected)) {
    const b = ui.bounds.get(ui.selected);
    g.save();
    g.strokeStyle = C.mint;
    g.lineWidth = 3;
    g.setLineDash([14, 10]);
    g.strokeRect(b.x - 16, b.y - 16, b.w + 32, b.h + 32);
    // The resize grip: a filled dot on the corner. Never in the export.
    g.setLineDash([]);
    g.fillStyle = C.mint;
    g.beginPath();
    g.arc(b.x + b.w + 16, b.y + b.h + 16, 34, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

const handleCentre = (b) => ({ x: b.x + b.w + 16, y: b.y + b.h + 16 });

// One labelled figure, the same size as on the route card. Labels are
// sentence case.
function numberStat(key) {
  const n = NUMBERS.find((m) => m.key === key);
  return (g, x, y) => {
    const lw = drawText(g, n.label, x, y, { ...NUM_LABEL, color: labelInk() });
    const vw = drawText(g, numberValue(key, ui.session, ui.sum, { clock: true }), x, y + 36, NUM_VALUE);
    return { w: Math.max(lw, vw, 90), h: 118 };
  };
}

const DRAW = {
  route(g, x, y, w) {
    // The route card's frame, until it's resized.
    const box = ui.elements.route.box;
    const rw = box ? box.w : Math.min(w - x - PAD, 620);
    const rh = box ? box.h : 420;
    outlineRoute(g, { x, y, w: rw, h: rh }, { ...ROUTE_THEMES.dark, under: 'rgba(0,0,0,.35)', underW: 6 });
    return { w: rw, h: rh };
  },
  title(g, x, y) {
    const w = drawText(g, ui.title.trim(), x, y, { size: 64, weight: 700, spacing: -1 });
    return { w, h: 76 };
  },
  ...Object.fromEntries(NUMBERS.map((n) => [n.key, numberStat(n.key)])),
  date(g, x, y) {
    const w = drawText(g, placeLine(ui.session), x, y, { size: 30, weight: 400, color: mutedInk() });
    return { w, h: 36 };
  },
  badges(g, x, y, w, { maxRows = 2 } = {}) {
    const items = ui.badgeImgs;
    if (!items.length) return { w: 0, h: 0 };
    const { shown, more, st, cellW, tops, h } = badgesLayout(g, maxRows);
    const size = st.size;
    const light = ui.mode === 'preset' && ui.cardTheme === 'light';
    const at = (k) => ({ cx: x + (k % 4) * cellW, cy: y + tops[Math.floor(k / 4)] });
    items.slice(0, shown).forEach(({ meta, img: dark, imgLight }, k) => {
      const { cx, cy } = at(k);
      const img = light && imgLight.complete && imgLight.naturalWidth ? imgLight : dark;
      if (img.complete && img.naturalWidth) g.drawImage(img, cx, cy, size, size);
      drawLabelFit(g, meta.name, cx + size / 2, cy + size + 12, cellW - 10, { size: st.label, spacing: 0 });
    });
    if (more) {
      // The last spot: a plain disc with how many more were earned.
      const { cx, cy } = at(shown);
      g.save();
      g.beginPath();
      g.arc(cx + size / 2, cy + size / 2, size / 2 - 2, 0, Math.PI * 2);
      g.lineWidth = 3;
      g.strokeStyle = labelInk();
      g.globalAlpha = 0.6;
      g.stroke();
      g.restore();
      drawText(g, `+${more}`, cx + size / 2, cy + size / 2 - size * 0.18, { size: Math.round(size / 3), weight: 700, align: 'center' });
    }
    const cols = Math.min(4, shown + (more ? 1 : 0));
    return { w: cellW * cols - st.gap, h };
  },

  places(g, x, y) {
    const names = ui.session.pins.map((p) => p.name).slice(0, 5);
    if (!names.length) {
      const w = drawText(g, 'No stops pinned', x, y, { size: 26, weight: 600, color: labelInk() });
      return { w, h: 30 };
    }
    drawText(g, 'Stops', x, y, { size: 26, weight: 600, color: labelInk() });
    let widest = 0;
    names.forEach((n, i) => {
      widest = Math.max(widest, drawText(g, n, x, y + 38 + i * 44, { size: 34, weight: 700, spacing: -0.5 }));
    });
    return { w: Math.max(widest, 220), h: 38 + names.length * 44 };
  },
};

/* ---------- export ---------- */

function render() {
  return renderOnce().catch((err) => {
    if (ui.mapBlocked) throw err;
    ui.mapBlocked = true;
    return renderOnce();
  });
}

function renderOnce() {
  draw({ forExport: true });
  return new Promise((resolve, reject) => {
    ui.canvas.toBlob((blob) => {
      draw();
      blob ? resolve(blob) : reject(new Error('toBlob returned null'));
    }, 'image/png');
  });
}

const filename = () =>
  `sprell-${new Date(ui.session.startedAt).toISOString().slice(0, 10)}.png`;

async function shareCard() {
  let blob;
  try { blob = await render(); } catch { toast('The card didn’t render.'); return; }
  const file = new File([blob], filename(), { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      window.dispatchEvent(new Event('lc:card-exported'));
      return;
    } catch (err) { if (err?.name === 'AbortError') return; }
  }
  download(blob);
  window.dispatchEvent(new Event('lc:card-exported'));
  toast('Sharing isn’t available here, so it downloaded instead.');
}

async function saveCard() {
  let blob;
  try { blob = await render(); } catch { toast('The card didn’t render.'); return; }

  // On Android, write into the gallery via MediaStore — an <a download> click
  // does nothing inside the WebView, which is how "Save" saved to nowhere.
  try {
    const base64 = await blobToBase64(blob);
    if (await saveImage(base64, filename())) {
      window.dispatchEvent(new Event('lc:card-exported'));
      toast('Saved to your gallery, in Pictures › Sprell.');
      return;
    }
  } catch {
    toast('Saving to the gallery failed. Try Share instead.');
    return;
  }

  download(blob);
  window.dispatchEvent(new Event('lc:card-exported'));
  toast('Saved.');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function download(blob, name = filename()) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Save for video ----------
   One see-through PNG per layer, ready to lay over a video in any editor. Full
   frame keeps every image at the card's size so the layers line up when
   stacked; Cropped trims each to its element for placing by hand. The map
   tiles are fetched with CORS, so even the map layer exports cleanly. */

const LAYER_LABEL = {
  map: 'Map', route: 'Route', title: 'Title', date: 'Date', places: 'Stop names',
  badges: 'Badges', avatar: 'Avatar', wordmark: 'Wordmark',
  ...Object.fromEntries(NUMBERS.map((n) => [n.key, n.label])),
};

function layerIds() {
  const on = ui.elements;
  const hasTitle = !!ui.title.trim();
  const hasAvatar = ui.face !== 'none';
  if (ui.mode === 'preset') {
    return ['map', 'route', 'title', 'badges', 'places', ...NUMBER_KEYS, 'date', 'avatar', 'wordmark'].filter((id) => {
      if (id === 'title') return hasTitle;
      if (id === 'avatar') return hasAvatar;
      if (id === 'badges') return on.badges.on && ui.badgeImgs.length;
      if (id === 'places') return on.places.on && ui.session.pins.length;
      if (NUMBER_KEYS.includes(id)) return on[id].on && ui.offered.includes(id);
      if (id === 'route') return on.route.on && ui.session.trail.length > 1;
      if (id === 'wordmark') return true;
      if (id === 'map') return true;
      return on[id]?.on;
    });
  }
  return [...photoOrder().filter((id) => {
    if (id === 'title') return hasTitle && on.title.on;
    if (id === 'avatar') return hasAvatar && on.avatar.on;
    if (id === 'route') return on.route.on && ui.session.trail.length > 1;
    if (id === 'places') return on.places.on && ui.session.pins.length;
    if (NUMBER_KEYS.includes(id)) return on[id].on && ui.offered.includes(id);
    return on[id]?.on;
  }), 'wordmark'];
}

const canvasBlob = (c) => new Promise((resolve, reject) =>
  c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png'));

// Trims transparent edges. Anything that can't be read back is left whole.
function cropCanvas(c) {
  try {
    const { width: w, height: h } = c;
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return c;
    const pad = 12;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, -x0, -y0);
    return out;
  } catch { return c; }
}

async function layerBlob(id, full) {
  const [w, h] = RATIOS[ui.ratio];
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw({ only: id, target: c.getContext('2d'), forExport: true });
  return canvasBlob(full ? c : cropCanvas(c));
}

async function buildLayers(ids, full) {
  const base = filename().replace(/\.png$/, '');
  const files = [];
  for (const id of ids) files.push([`${base}-${id}.png`, await layerBlob(id, full)]);
  return files;
}

function videoSheet() {
  const ids = layerIds();
  const picked = new Set(ids);
  let full = true;
  const [, h] = RATIOS[ui.ratio];
  sheet((close) => {
    const chips = el('div', { class: 'chips' });
    const sizes = el('div', { class: 'chips' });
    const note = el('span', { class: 'cap' });
    const go = btn('Save images', 'btn--pri', async () => {
      close();
      await saveLayers([...picked].filter((id) => ids.includes(id)), full);
    }, { lg: true });
    const paint = () => {
      chips.replaceChildren(...ids.map((id) => tab(LAYER_LABEL[id], () => {
        if (picked.has(id)) picked.delete(id); else picked.add(id);
        paint();
      }, picked.has(id))));
      sizes.replaceChildren(
        tab('Full frame', () => { full = true; paint(); }, full),
        tab('Cropped', () => { full = false; paint(); }, !full));
      note.textContent = full
        ? `Every image is 1080 × ${h}, so the layers line up when stacked.`
        : 'Each image is trimmed to the element, for placing by hand.';
      go.disabled = !picked.size;
    };
    paint();
    return [
      el('h2', { class: 'title', style: 'margin:0', text: 'Save for video' }),
      el('p', { class: 'body', style: 'margin:0', text: 'Each element saves as its own see-through PNG, ready to lay over a video in any editor.' }),
      el('div', { class: 'eb', text: 'Elements' }), chips,
      el('div', { class: 'eb', text: 'Size' }), sizes, note,
      go,
      btn('Close', 'btn--sec', close),
    ];
  });
}

async function saveLayers(ids, full) {
  let files;
  try { files = await buildLayers(ids, full); } catch {
    toast('The video images didn’t render.');
    return;
  }
  try {
    let native = true;
    for (const [name, blob] of files) {
      if (!native || !(await saveImage(await blobToBase64(blob), name))) { native = false; download(blob, name); }
    }
    window.dispatchEvent(new Event('lc:card-exported'));
    toast(native
      ? `Saved ${files.length} see-through image${files.length === 1 ? '' : 's'} to Pictures › Sprell.`
      : `Downloaded ${files.length} see-through images.`, 4000);
  } catch {
    toast('Saving to the gallery failed partway. Try again.');
  }
}

// Exposed so verification can prove toBlob works — the exact thing that fails
// if a card is composited from a live map instead of drawn — and can read the
// element geometry the pointer gestures mutate.
export function __renderForTest() { return render(); }
export function __stateForTest() { return ui; }
export const __initialStateForTest = (s) => makeState(s);
export function __useStateForTest(state) { ui = state; }
export const __routeLayoutForTest = (g, w, h, opts) => routeLayout(g, w, h, opts);
export const __photoDefaultsForTest = (g, w, h) => photoDefaults(g, w, h);
export const __drawPieceForTest = (key, g) => DRAW[key](g, 0, 0, 1080);
export function __layersForTest(full = true) { return buildLayers(layerIds(), full); }
export { icon, km };
