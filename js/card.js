import { el, btn, foot, head, spacer, toast, icon, hms, km } from './ui.js';
import * as S from './state.js';
import { fitPoints } from './session.js';
import { saveImage } from './keepalive.js';
import { badgeSrc, BADGES } from './badges.js';

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
    shadow: { color: 'rgba(255,255,255,.75)', blur: 22 },
  },
];

let ui = null;

/* ---------- 09 card builder ---------- */

export function cardScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  if (!ui || ui.session !== s) ui = makeState(s, ctx.state.badges);

  const canvas = el('canvas', { id: 'card-canvas' });
  bindCanvas(canvas);

  const tabs = el('div', { class: 'chips' },
    tab('Preset', () => setMode('preset'), ui.mode === 'preset'),
    // A photo already picked switches back without reopening the picker;
    // tapping again while active re-picks.
    tab('Your photo', () => {
      if (ui.photo && ui.mode !== 'photo') setMode('photo');
      else pickPhoto();
    }, ui.mode === 'photo'),
  );

  // Shape sits with the other composition choices, not after them — you frame
  // the card before you place things on it.
  const ratios = el('div', { class: 'chips' },
    tab('Feed 4:5', () => { setRatio('feed'); ui.refreshChrome(); }, ui.ratio === 'feed'),
    tab('Story 9:16', () => { setRatio('story'); ui.refreshChrome(); }, ui.ratio === 'story'),
  );

  const themes = el('div', { class: 'chips' });
  const toggles = el('div', { class: 'chips' });
  const togglesLabel = el('div', { class: 'eb', text: 'Elements' });
  const hint = el('p', { class: 'cap', style: 'margin:0',
    text: 'Drag to move. Pinch, or pull the corner dot, to resize.' });

  // Element toggles gate content in both modes: preset stacks whatever is on,
  // photo mode makes the same pieces draggable.
  ui.refreshChrome = () => {
    const preset = ui.mode === 'preset';
    tabs.children[0].setAttribute('aria-pressed', preset ? 'true' : 'false');
    tabs.children[1].setAttribute('aria-pressed', preset ? 'false' : 'true');
    ratios.children[0].setAttribute('aria-pressed', ui.ratio === 'feed' ? 'true' : 'false');
    ratios.children[1].setAttribute('aria-pressed', ui.ratio === 'story' ? 'true' : 'false');
    themes.replaceChildren(...THEMES.map((t) =>
      tab(t.label, () => { ui.theme = t.key; ui.refreshChrome(); draw(); }, ui.theme === t.key)));
    toggles.replaceChildren(...elementToggles());
    hint.classList.toggle('hidden', preset);
  };
  ui.refreshChrome();
  draw();

  return [
    head({ title: 'Your card', back: () => ctx.back() }),
    tabs,
    ratios,
    el('div', { class: 'canvas-wrap' }, canvas),
    hint,
    el('div', { class: 'eb', text: 'Text' }),
    themes,
    togglesLabel,
    toggles,
    spacer(),
    foot(btn('Next', 'btn--pri', () => ctx.go('share', s), { lg: true })),
  ];
}

/* ---------- 10 share ---------- */

export function shareScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }
  if (!ui || ui.session !== s) ui = makeState(s, ctx.state.badges);

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

const TYPES = [
  { key: 'route', label: 'Route' },
  { key: 'stats', label: 'Stats' },
  { key: 'time', label: 'Time' },
  { key: 'date', label: 'Date + place' },
  { key: 'stops', label: 'Stops' },
  { key: 'water', label: 'Water' },
  { key: 'food', label: 'Food' },
  { key: 'badges', label: 'Badges' },
];

function makeState(s, allBadges = []) {
  // Badges the night itself earned, art preloaded for the canvas. The SVGs are
  // same-origin, so drawing them never taints the export.
  const sessionBadges = allBadges
    .filter((b) => b.sessionId === s.id)
    .map((b) => BADGES.find((m) => m.slug === b.slug))
    .filter(Boolean)
    .slice(0, 4);
  // Same guard as the grid's monogram fallback: a badge whose art is missing
  // drops out of the card rather than exporting a labelled gap. Inert now that
  // all 32 have artwork.
  const badgeImgs = [];
  for (const meta of sessionBadges) {
    const entry = { meta, img: new Image() };
    entry.img.onload = () => draw();
    entry.img.onerror = () => {
      const i = badgeImgs.indexOf(entry);
      if (i >= 0) badgeImgs.splice(i, 1);
      if (!badgeImgs.length && ui) ui.elements.badges.on = false;
      ui?.refreshChrome?.();
      draw();
    };
    entry.img.src = badgeSrc(meta.slug);
    badgeImgs.push(entry);
  }

  return {
    session: s,
    sum: S.summarise(s),
    badgeImgs,
    mode: 'preset',
    ratio: 'feed',
    theme: 'light',
    photo: null,
    selected: null,
    drag: null,
    // Defaults reproduce Mode B — the stats bar sitting along the foot.
    elements: {
      route: { on: true, x: PAD, y: 300, scale: 1 },
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

function elementToggles() {
  // The badges toggle only exists when the night actually earned some.
  return TYPES.filter((t) => t.key !== 'badges' || ui.badgeImgs.length).map((t) =>
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
    if (e.y > oldH / 2) e.y += newH - oldH;
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

function clampAll() {
  const [w, h] = RATIOS[ui.ratio];
  for (const e of Object.values(ui.elements)) {
    e.x = Math.min(Math.max(e.x, 0), w - 140);
    e.y = Math.min(Math.max(e.y, 0), h - 60);
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
      ui.pinch = { key: ui.selected, baseDist: Math.max(dist(a, b), 1), baseScale: ui.elements[ui.selected].scale || 1 };
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
      ui.elements[ui.pinch.key].scale = clampScale(ui.pinch.baseScale * (dist(a, b) / ui.pinch.baseDist));
      draw();
      return;
    }

    if (ui.resize) {
      const el2 = ui.elements[ui.resize.key];
      const b = ui.bounds.get(ui.resize.key);
      el2.scale = clampScale(ui.resize.baseScale * (dist(p, { x: b.x, y: b.y }) / ui.resize.baseDist));
      draw();
      return;
    }

    if (ui.drag) {
      const node = ui.elements[ui.drag.key];
      node.x = p.x - ui.drag.dx;
      node.y = p.y - ui.drag.dy;
      clampAll();
      draw();
    }
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (pointers.size < 2) ui.pinch = null;
    if (!pointers.size) { ui.drag = null; ui.resize = null; }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
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

const theme = () => THEMES.find((t) => t.key === ui.theme) || THEMES[0];

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
const labelInk = () => (ui.photo && ui.mode === 'photo' ? theme().labelInk : C.faint);
const mutedInk = () => (ui.photo && ui.mode === 'photo' ? theme().muted : C.muted);

function placeLine(s) {
  const date = new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' });
  const place = s.pins[0]?.name;
  return place ? `${date} · ${place}` : date;
}

/* ---------- draw ---------- */

function draw({ forExport = false } = {}) {
  if (!ui?.g) return;
  const g = ui.g;
  const [w, h] = RATIOS[ui.ratio];
  ui.bounds.clear();

  g.clearRect(0, 0, w, h);
  g.fillStyle = C.bg;
  g.fillRect(0, 0, w, h);

  // The photo belongs to photo mode only — preset always shows the black
  // bloom card, even when a photo has been picked and is waiting in state.
  if (ui.photo && ui.mode === 'photo') {
    drawCover(g, ui.photo, w, h);
    // A 34% wash so white type holds over any picture.
    g.fillStyle = 'rgba(0,0,0,.34)';
    g.fillRect(0, 0, w, h);
  } else {
    drawBloom(g, w, h);
  }

  if (ui.mode === 'preset') drawPreset(g, w, h);
  else drawFree(g, w, h, forExport);

  // The wordmark is the one fixed element — always mint, always present.
  drawText(g, 'Last Call', PAD, h - PAD - 26, { size: 26, weight: 700, color: C.mint, spacing: 1 });
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

// Fixed composition: whichever blocks are enabled stack up from just above the
// wordmark, and the route takes whatever height is left.
function drawPreset(g, w, h) {
  const on = ui.elements;
  const blocks = [];
  if (on.time.on) blocks.push({ h: 118, draw: (y) => drawTime(g, PAD, y) });
  if (on.stats.on) blocks.push({ h: 100, draw: (y) => drawStats(g, PAD, y) });
  if (on.stops.on) blocks.push({ h: 36 + Math.min(ui.session.pins.length, 5) * 44 + 14, draw: (y) => DRAW.stops(g, PAD, y, w) });
  if (on.water.on || on.food.on) {
    blocks.push({ h: 110, draw: (y) => {
      let x = PAD;
      if (on.water.on) { x += DRAW.water(g, x, y).w + 70; }
      if (on.food.on) DRAW.food(g, x, y);
    } });
  }
  if (on.badges?.on && ui.badgeImgs.length) blocks.push({ h: 195, draw: (y) => DRAW.badges(g, PAD, y, w) });
  if (on.date.on) blocks.push({ h: 40, draw: (y) => drawText(g, placeLine(ui.session), PAD, y, { size: 24, weight: 400, color: mutedInk() }) });

  const stackH = blocks.reduce((n, b) => n + b.h, 0);
  const stackTop = h - PAD - 26 - 30 - stackH;

  if (on.route.on) {
    const top = PAD + 60;
    drawRoute(g, PAD, top, w - PAD * 2, stackTop - top - 40);
  }

  let y = stackTop;
  for (const b of blocks) { b.draw(y); y += b.h; }
}

function drawFree(g, w, h, forExport) {
  for (const t of TYPES) {
    const e = ui.elements[t.key];
    if (!e.on) continue;
    const scale = e.scale || 1;
    // Elements draw themselves at the origin under a transform, so every DRAW
    // routine scales for free and the stored bounds stay in card coordinates.
    g.save();
    g.translate(e.x, e.y);
    g.scale(scale, scale);
    const box = DRAW[t.key](g, 0, 0, w);
    g.restore();
    ui.bounds.set(t.key, { x: e.x, y: e.y, w: box.w * scale, h: box.h * scale });
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

// One labelled figure — the shape water and food share.
function bigStat(g, x, y, label, value) {
  drawText(g, label, x, y, { size: 20, weight: 600, color: labelInk(), spacing: 3.5 });
  const w = drawText(g, value, x, y + 30, { size: 52, weight: 700, spacing: -2 });
  return { w: Math.max(w, 90), h: 92 };
}

function drawStats(g, x, y) {
  const cells = [
    ['DRINKS', String(ui.sum.drinks), C.pink],
    ['STOPS', String(ui.sum.stops), null],
    ['STEPS', abbrev(ui.sum.steps), null],
    ['KM', km(ui.sum.distanceM), null],
  ];
  let cx = x;
  for (const [k, v, color] of cells) {
    drawText(g, k, cx, y, { size: 20, weight: 600, color: labelInk(), spacing: 3.5 });
    drawText(g, v, cx, y + 30, { size: 52, weight: 700, color, spacing: -2 });
    cx += 190;
  }
  return { w: 190 * cells.length - 60, h: 92 };
}

const DRAW = {
  route(g, x, y, w) {
    const rw = Math.min(w - x - PAD, 620);
    const rh = 420;
    drawRoute(g, x, y, rw, rh);
    return { w: rw, h: rh };
  },
  time: drawTime,
  stats: drawStats,
  date(g, x, y) {
    const w = drawText(g, placeLine(ui.session), x, y, { size: 24, weight: 400, color: mutedInk() });
    return { w, h: 30 };
  },
  badges(g, x, y) {
    const items = ui.badgeImgs;
    if (!items.length) return { w: 0, h: 0 };
    const size = 120, gap = 34, cell = size + gap;
    let labelH = 0;
    items.forEach(({ meta, img }, i) => {
      const cx = x + i * cell;
      if (img.complete && img.naturalWidth) g.drawImage(img, cx, y, size, size);
      labelH = Math.max(labelH, drawLabelFit(
        g, meta.name.toUpperCase(), cx + size / 2, y + size + 14, cell - 10));
    });
    return { w: cell * items.length - gap, h: size + 14 + labelH };
  },
  water(g, x, y) {
    return bigStat(g, x, y, 'WATER', String(ui.sum.waters));
  },
  food(g, x, y) {
    return bigStat(g, x, y, 'FOOD', String((ui.session.meals || []).length));
  },
  stops(g, x, y) {
    const names = ui.session.pins.map((p) => p.name).slice(0, 5);
    if (!names.length) {
      const w = drawText(g, 'NO STOPS PINNED', x, y, { size: 20, weight: 600, color: labelInk(), spacing: 3.5 });
      return { w, h: 24 };
    }
    drawText(g, 'STOPS', x, y, { size: 20, weight: 600, color: labelInk(), spacing: 3.5 });
    let widest = 0;
    names.forEach((n, i) => {
      widest = Math.max(widest, drawText(g, n, x, y + 36 + i * 44, { size: 34, weight: 700, spacing: -0.5 }));
    });
    return { w: Math.max(widest, 220), h: 36 + names.length * 44 };
  },
};

function drawRoute(g, x, y, w, h) {
  const pts = ui.session.trail;
  if (pts.length < 2 || w < 40 || h < 40) return;
  const fitted = fitPoints(pts, w, h, 20).map((p) => ({ x: p.x + x, y: p.y + y }));

  g.save();
  g.strokeStyle = C.mint;
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  fitted.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.stroke();

  for (const pin of ui.session.pins) {
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i].t - pin.t) < Math.abs(pts[best].t - pin.t)) best = i;
    }
    g.fillStyle = C.pink;
    g.beginPath();
    g.arc(fitted[best].x, fitted[best].y, 12, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/* ---------- export ---------- */

function render() {
  draw({ forExport: true });
  return new Promise((resolve, reject) => {
    ui.canvas.toBlob((blob) => {
      draw();
      blob ? resolve(blob) : reject(new Error('toBlob returned null'));
    }, 'image/png');
  });
}

const filename = () =>
  `lastcall-${new Date(ui.session.startedAt).toISOString().slice(0, 10)}.png`;

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
      toast('Saved to your gallery, in Pictures › Last Call.');
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

function download(blob) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Exposed so verification can prove toBlob works — the exact thing that fails
// if a card is composited from a live map instead of drawn — and can read the
// element geometry the pointer gestures mutate.
export function __renderForTest() { return render(); }
export function __stateForTest() { return ui; }
export { icon, km };
