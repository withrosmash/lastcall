import { el, btn, foot, head, spacer, toast, icon, hms, hm, km, buzz, sheet } from './ui.js';
import * as S from './state.js';
import { fitPoints } from './session.js';
import { saveImage } from './keepalive.js';
import { badgeSrc, BADGES } from './badges.js';
import * as SM from './staticmap.js';
import { paintAvatar } from './avatar.js';
import { avatarLook } from './wardrobe.js';

const RATIOS = { feed: [1080, 1350], story: [1080, 1920] };
const PAD = 64;
const C = {
  bg: '#000', text: '#fff', mint: '#7EE0C0', pink: '#F06C9B',
  faint: '#4D4D4D', muted: '#8A8A8A', forest: '33,118,79',
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
  if (!ui || ui.session !== s) ui = makeState(s, ctx.state.badges);
  ui.look = avatarLook(ctx);

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
  if (!ui || ui.session !== s) ui = makeState(s, ctx.state.badges);
  ui.look = avatarLook(ctx);

  const canvas = el('canvas', { id: 'card-canvas' });
  bindCanvas(canvas);

  draw();

  return [
    head({ title: 'Share', back: () => ctx.back() }),
    el('div', { class: 'canvas-wrap' }, canvas),
    spacer(),
    foot(
      btn('Share', 'btn--pri', () => shareCard(), { iconName: 'share-2', lg: true }),
      btn('Save to photos', 'btn--sec', () => saveCard(), { iconName: 'download' }),
    ),
  ];
}

const tab = (label, onclick, on) =>
  el('button', { class: 'chip press', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick }, label);

/* ---------- state ---------- */

// The toggles under "On the card". Title shows when there is one; the avatar
// has its own row of faces, with None to leave it off.
const TYPES = [
  { key: 'map', label: 'Map', presetOnly: true },
  { key: 'route', label: 'Route' },
  { key: 'stats', label: 'Stats' },
  { key: 'time', label: 'Time out' },
  { key: 'date', label: 'Date' },
  { key: 'stops', label: 'Stops' },
  { key: 'water', label: 'Water' },
  { key: 'food', label: 'Food' },
  { key: 'badges', label: 'Badges' },
];
// Photo cards draw in this order, so later ones sit on top and win a tap.
const DRAW_ORDER = ['route', 'avatar', 'title', 'time', 'stats', 'water', 'food', 'date', 'stops', 'badges'];

function makeState(s, allBadges = []) {
  // Badges the night itself earned, art preloaded for the canvas. The SVGs are
  // same-origin, so drawing them never taints the export.
  const sessionBadges = allBadges
    .filter((b) => b.sessionId === s.id)
    .map((b) => BADGES.find((m) => m.slug === b.slug))
    .filter(Boolean)
    .slice(0, 4);
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

  return {
    session: s,
    sum: S.summarise(s),
    badgeImgs,
    mode: 'preset',
    ratio: 'feed',
    theme: 'halo',
    cardTheme: 'dark',
    title: '',
    face: 'normal',
    look: null,
    photo: null,
    selected: null,
    drag: null,
    // Photo-card positions. The route card lays itself out.
    elements: {
      map: { on: s.trail.length > 1 },
      route: { on: true, x: PAD, y: 300, scale: 1 },
      title: { on: true, x: PAD, y: PAD + 20, scale: 1 },
      avatar: { on: true, x: 1080 - PAD - 300, y: 1350 - PAD - 520, scale: 1 },
      time: { on: true, x: PAD, y: 1350 - PAD - 300, scale: 1 },
      stats: { on: true, x: PAD, y: 1350 - PAD - 190, scale: 1 },
      date: { on: true, x: PAD, y: 1350 - PAD - 90, scale: 1 },
      stops: { on: false, x: PAD, y: 200, scale: 1 },
      water: { on: false, x: PAD, y: 1350 - PAD - 420, scale: 1 },
      food: { on: false, x: PAD + 260, y: 1350 - PAD - 420, scale: 1 },
      badges: { on: badgeImgs.length > 0, x: PAD, y: 180, scale: 1 },
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
const avatarCell = (e) => Math.min(18, Math.max(6, Math.round(10 * (e.scale || 1))));
const snapScale = (key, node) => { if (key === 'avatar') node.scale = avatarCell(node) / 10; };

function elementToggles() {
  // The badges toggle only exists when the night actually earned some.
  return TYPES.filter((t) =>
    (t.key !== 'badges' || ui.badgeImgs.length)
    && (!t.presetOnly || ui.mode === 'preset')
    && (t.key !== 'map' || ui.session.trail.length > 1)).map((t) =>
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
      draw();
      return;
    }

    if (ui.drag) {
      const node = ui.elements[ui.drag.key];
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
    credit: 'rgba(255,255,255,.45)', bloom: ['rgba(33,118,79,.42)', 'rgba(10,36,25,.22)', 'rgba(0,0,0,0)'],
  },
  light: {
    bg: '#EEF2F8', rgb: '238,242,248', text: '#0B1526', label: '#626E81', date: '#4A576B', pink: '#C92F68',
    mark: '#0B6E55', route: '#7EE0C0', under: '#0B6E55', underW: 7, ring: '#FFFFFF',
    credit: 'rgba(11,21,38,.45)', bloom: ['rgba(0,71,171,.26)', 'rgba(0,71,171,.10)', 'rgba(0,71,171,0)'],
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
function drawLabelFit(g, text, cx, y, maxW, base = {}) {
  const opts = { size: 16, weight: 600, color: labelInk(), spacing: 2, align: 'center', ...base };

  if (textWidth(g, text, opts) <= maxW) {
    drawText(g, text, cx, y, opts);
    return opts.size + 4;
  }

  const words = text.split(' ');
  if (words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const w = Math.max(textWidth(g, a, opts), textWidth(g, b, opts));
      if (!best || w < best.w) best = { a, b, w };
    }
    if (best && best.w <= maxW) {
      drawText(g, best.a, cx, y, opts);
      drawText(g, best.b, cx, y + opts.size + 3, opts);
      return (opts.size + 3) * 2;
    }
  }

  let size = opts.size;
  while (size > 10 && textWidth(g, text, { ...opts, size }) > maxW) size -= 1;
  drawText(g, text, cx, y, { ...opts, size });
  return size + 4;
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
// either "Unnamed stop" or a venue that says nothing about the night.
function placeLine(s) {
  const date = new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' });
  return `${date} · ${S.modeLine(s)}`;
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
  if (want('wordmark')) drawText(g, 'Leit', w - PAD, h - PAD - 40, { size: 40, weight: 700, color: C.mint, align: 'right' });
}

function drawBloom(g, w, h) {
  const grad = g.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 1.15);
  grad.addColorStop(0, `rgba(${C.forest},.55)`);
  grad.addColorStop(0.42, 'rgba(10,36,25,.35)');
  grad.addColorStop(0.78, 'rgba(0,0,0,0)');
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

function drawRouteCard(g, w, h, want) {
  const T = routeTheme();
  const on = ui.elements;
  const M = PAD;
  const title = ui.title.trim();
  const rowTop = (r) => h - M - 500 + r * 130;

  const stack = [];
  if (on.stops.on && ui.session.pins.length) stack.push({ id: 'stops', h: 36 + Math.min(ui.session.pins.length, 5) * 44 + 30 });
  if (on.badges.on && ui.badgeImgs.length) stack.push({ id: 'badges', h: 215 });
  const above = stack.reduce((n, b) => n + b.h, 0);
  const mapH = h - 520 - above;
  const region = { x: M, y: title ? 150 : 90, w: w - M * 2, h: h - 790 - above - (title ? 60 : 0) };
  const trail = ui.session.trail;
  let frame = on.map.on && trail.length > 1 && !ui.mapBlocked && region.h >= 120 ? SM.frame(trail, region) : null;

  if (want('map')) {
    g.fillStyle = T.bg;
    g.fillRect(0, 0, w, h);
    if (frame && !drawRouteMap(g, w, frame, mapH, T)) frame = null;
    const bloom = g.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.9);
    T.bloom.forEach((c, i) => bloom.addColorStop(i / 2, c));
    g.fillStyle = bloom;
    g.fillRect(0, 0, w, h);
  } else if (frame && SM.status(SM.tilesFor(frame, w, mapH, ui.cardTheme === 'light')) === 'failed') {
    frame = null;
  }

  if (want('title') && title) drawText(g, title, M, M + 6, { size: 64, weight: 700, color: T.text, spacing: -1 });
  if (want('route') && on.route.on) {
    if (frame) strokeRoute(g, trail.map((p) => SM.toCard(frame, p.lat, p.lng)), ui.session.pins.map((p) => SM.toCard(frame, p.lat, p.lng)), T);
    else outlineRoute(g, region, T);
  }

  let y = rowTop(0) - above;
  for (const b of stack) {
    if (want(b.id)) DRAW[b.id](g, M, y, w);
    y += b.h;
  }

  const cell = (x, r, label, value, pink) => {
    drawText(g, label, x, rowTop(r), { size: 28, weight: 600, color: T.label });
    drawText(g, value, x, rowTop(r) + 36, { size: 76, weight: 700, color: pink ? T.pink : T.text, spacing: -2 });
  };
  if (want('stats') && on.stats.on) {
    const top = [['Distance', `${km(ui.sum.distanceM)} km`]];
    if (ui.sum.steps) top.push(['Steps', abbrev(ui.sum.steps)]);
    top.forEach(([l, v], i) => cell(M + i * 300, 0, l, v));
    const second = [['Stops', String(ui.sum.stops)], ['Drinks', String(ui.sum.drinks), true]];
    if (on.water.on) second.push(['Water', String(ui.sum.waters)]);
    if (on.food.on) second.push(['Food', String((ui.session.meals || []).length)]);
    second.forEach(([l, v, pink], i) => cell(M + i * 150, 1, l, v, pink));
  }
  if (want('time') && on.time.on) cell(M, 2, 'Time out', hm(ui.sum.ms));
  if (want('date') && on.date.on) drawText(g, placeLine(ui.session), M, h - M - 64, { size: 30, weight: 400, color: T.date });
  if (want('wordmark')) drawText(g, 'Leit', M, h - M - 22, { size: 40, weight: 700, color: T.mark });
  if (want('avatar') && ui.face !== 'none' && ui.look) paintAvatar(g, ui.look, w - M - 290, h - M - 470, 10, FACE_STATE[ui.face]);
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

// Mint on an under-stroke (dark on black, deep teal on the light card), pink
// stops with a ring.
function strokeRoute(g, pts, stops, T, lw = 11) {
  if (pts.length < 2) return;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.strokeStyle = T.under;
  g.lineWidth = lw + T.underW;
  g.stroke();
  g.strokeStyle = T.route;
  g.lineWidth = lw;
  g.stroke();
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
function outlineRoute(g, region, T) {
  const pts = ui.session.trail;
  if (pts.length < 2 || region.w < 40 || region.h < 40) return;
  const fitted = fitPoints(pts, region.w, region.h, 20).map((p) => ({ x: p.x + region.x, y: p.y + region.y }));
  const stops = ui.session.pins.map((pin) => {
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - pin.t) < Math.abs(pts[best].t - pin.t)) best = i;
    return fitted[best];
  });
  strokeRoute(g, fitted, stops, T);
}

/* ---------- the photo card ---------- */

function drawFree(g, w, h, forExport, want, live) {
  const setBounds = (key, b) => { if (live) ui.bounds.set(key, b); };
  for (const key of DRAW_ORDER) {
    const e = ui.elements[key];
    if (!e?.on || !want(key)) continue;
    if (key === 'title' && !ui.title.trim()) continue;
    if (key === 'avatar') {
      if (ui.face === 'none' || !ui.look) continue;
      const cellSize = avatarCell(e);
      paintAvatar(g, ui.look, e.x, e.y, cellSize, FACE_STATE[ui.face]);
      setBounds(key, { x: e.x, y: e.y, w: 32 * cellSize, h: 43 * cellSize });
      continue;
    }
    const scale = e.scale || 1;
    // Elements draw themselves at the origin under a transform, so every DRAW
    // routine scales for free and the stored bounds stay in card coordinates.
    g.save();
    g.translate(e.x, e.y);
    g.scale(scale, scale);
    const box = DRAW[key](g, 0, 0, w);
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

function drawTime(g, x, y) {
  const w = drawText(g, hms(ui.sum.ms), x, y, { size: 96, weight: 700, spacing: -4 });
  return { w, h: 100 };
}

// One labelled figure: the shape water and food share. Labels are sentence
// case now, like the rest of the app.
function bigStat(g, x, y, label, value) {
  drawText(g, label, x, y, { size: 26, weight: 600, color: labelInk() });
  const w = drawText(g, value, x, y + 34, { size: 52, weight: 700, spacing: -2 });
  return { w: Math.max(w, 90), h: 96 };
}

function drawStats(g, x, y) {
  const cells = [
    ['Drinks', String(ui.sum.drinks), C.pink],
    ['Stops', String(ui.sum.stops), null],
    ['Steps', abbrev(ui.sum.steps), null],
    ['Km', km(ui.sum.distanceM), null],
  ];
  let cx = x;
  for (const [k, v, color] of cells) {
    drawText(g, k, cx, y, { size: 26, weight: 600, color: labelInk() });
    drawText(g, v, cx, y + 34, { size: 52, weight: 700, color, spacing: -2 });
    cx += 190;
  }
  return { w: 190 * cells.length - 60, h: 96 };
}

const DRAW = {
  route(g, x, y, w) {
    const rw = Math.min(w - x - PAD, 620);
    const rh = 420;
    outlineRoute(g, { x, y, w: rw, h: rh }, { ...ROUTE_THEMES.dark, under: 'rgba(0,0,0,.35)', underW: 6 });
    return { w: rw, h: rh };
  },
  title(g, x, y) {
    const w = drawText(g, ui.title.trim(), x, y, { size: 72, weight: 700, spacing: -1 });
    return { w, h: 84 };
  },
  time: drawTime,
  stats: drawStats,
  date(g, x, y) {
    const w = drawText(g, placeLine(ui.session), x, y, { size: 28, weight: 400, color: mutedInk() });
    return { w, h: 34 };
  },
  badges(g, x, y) {
    const items = ui.badgeImgs;
    if (!items.length) return { w: 0, h: 0 };
    const size = 120, gap = 34, cellW = size + gap;
    let labelH = 0;
    const light = ui.mode === 'preset' && ui.cardTheme === 'light';
    items.forEach(({ meta, img: dark, imgLight }, i) => {
      const cx = x + i * cellW;
      const img = light && imgLight.complete && imgLight.naturalWidth ? imgLight : dark;
      if (img.complete && img.naturalWidth) g.drawImage(img, cx, y, size, size);
      labelH = Math.max(labelH, drawLabelFit(g, meta.name, cx + size / 2, y + size + 14, cellW - 10, { size: 20, spacing: 0 }));
    });
    return { w: cellW * items.length - gap, h: size + 14 + labelH };
  },
  water(g, x, y) {
    return bigStat(g, x, y, 'Water', String(ui.sum.waters));
  },
  food(g, x, y) {
    return bigStat(g, x, y, 'Food', String((ui.session.meals || []).length));
  },
  stops(g, x, y) {
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
  `leit-${new Date(ui.session.startedAt).toISOString().slice(0, 10)}.png`;

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
      toast('Saved to your gallery, in Pictures › Leit.');
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
  map: 'Map', route: 'Route', title: 'Title', stats: 'Stats', time: 'Time out', date: 'Date', stops: 'Stops',
  water: 'Water', food: 'Food', badges: 'Badges', avatar: 'Avatar', wordmark: 'Wordmark',
};

function layerIds() {
  const on = ui.elements;
  const hasTitle = !!ui.title.trim();
  const hasAvatar = ui.face !== 'none';
  if (ui.mode === 'preset') {
    return ['map', 'route', 'title', 'badges', 'stops', 'stats', 'time', 'date', 'avatar', 'wordmark'].filter((id) => {
      if (id === 'title') return hasTitle;
      if (id === 'avatar') return hasAvatar;
      if (id === 'badges') return on.badges.on && ui.badgeImgs.length;
      if (id === 'stops') return on.stops.on && ui.session.pins.length;
      if (id === 'map' || id === 'wordmark') return true;
      return on[id]?.on;
    });
  }
  return [...DRAW_ORDER.filter((id) => {
    if (id === 'title') return hasTitle && on.title.on;
    if (id === 'avatar') return hasAvatar && on.avatar.on;
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
      ? `Saved ${files.length} see-through image${files.length === 1 ? '' : 's'} to Pictures › Leit.`
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
export function __layersForTest(full = true) { return buildLayers(layerIds(), full); }
export { icon, km };
