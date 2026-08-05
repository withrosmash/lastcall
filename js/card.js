import { el, btn, spacer, toast, hhmm, shortDate, clockTime, km } from './ui.js';
import * as S from './state.js';
import { fitPoints } from './session.js';

const RATIOS = { feed: [1080, 1350], story: [1080, 1920] };
const PAD = 64;
const C = { bg: '#000', text: '#fff', mint: '#7EE0C0', pink: '#F06C9B', faint: '#4D4D4D', line: '#1F1F1F' };
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

let ui = null;

export function cardScreen(ctx, session) {
  const s = session || ctx.lastSession;
  if (!s) { ctx.go('start'); return []; }

  ui = {
    session: s,
    sum: S.summarise(s),
    mode: 'preset',
    ratio: 'feed',
    photo: null,
    selected: null,
    drag: null,
    elements: defaultElements(),
    bounds: new Map(),
  };

  const canvas = el('canvas', { id: 'card-canvas' });
  ui.canvas = canvas;
  ui.g = canvas.getContext('2d');
  sizeCanvas();

  attachDrag(canvas);

  const modeRow = el('div', { class: 'seg' },
    btn('Preset', 'btn--pri btn--sm', () => setMode('preset')),
    btn('Your photo', 'btn--sec btn--sm', () => pickPhoto()),
  );

  const toggles = el('div', { class: 'tiles tiles--3', style: 'gap:6px' });
  const togglesLabel = el('div', { class: 'eb', text: 'Elements · drag to place' });
  const ratioRow = el('div', { class: 'seg' },
    btn('Feed 4:5', 'btn--sec btn--sm', () => setRatio('feed')),
    btn('Story 9:16', 'btn--ghost btn--sm', () => setRatio('story')),
  );

  ui.refreshChrome = () => {
    const preset = ui.mode === 'preset';
    modeRow.children[0].className = `btn btn--sm ${preset ? 'btn--pri' : 'btn--sec'}`;
    modeRow.children[1].className = `btn btn--sm ${preset ? 'btn--sec' : 'btn--pri'}`;
    ratioRow.children[0].className = `btn btn--sm ${ui.ratio === 'feed' ? 'btn--sec' : 'btn--ghost'}`;
    ratioRow.children[1].className = `btn btn--sm ${ui.ratio === 'story' ? 'btn--sec' : 'btn--ghost'}`;
    toggles.replaceChildren(...elementToggles());
    toggles.classList.toggle('hidden', preset);
    togglesLabel.classList.toggle('hidden', preset);
  };
  ui.refreshChrome();

  draw();

  return [
    el('div', { class: 'eb mint', text: 'Make a card' }),
    modeRow,
    el('div', { class: 'canvas-wrap' }, canvas),
    togglesLabel,
    toggles,
    ratioRow,
    btn('Share', 'btn--pri', () => shareCard(ctx)),
    el('div', { class: 'btn-pair' },
      btn('Save', 'btn--sec btn--sm', () => saveCard()),
      btn('Done', 'btn--ghost btn--sm', () => ctx.go(ctx.state.active ? 'live' : 'start')),
    ),
  ];
}

/* ---------- element model ---------- */

const TYPES = [
  { key: 'stats', label: 'Stats' },
  { key: 'route', label: 'Route' },
  { key: 'time', label: 'Time' },
  { key: 'stops', label: 'Stops' },
  { key: 'drink', label: 'Drink' },
  { key: 'mark', label: 'Mark' },
];

function defaultElements() {
  return {
    stats: { on: true, x: PAD, y: 1350 - PAD - 180 },
    route: { on: true, x: 1080 / 2 - 240, y: 420 },
    time: { on: true, x: PAD, y: PAD },
    stops: { on: false, x: PAD, y: 300 },
    drink: { on: false, x: PAD, y: 240 },
    mark: { on: true, x: 1080 - PAD - 230, y: 1350 - PAD - 30 },
  };
}

function elementToggles() {
  return TYPES.map((t) =>
    el('button', {
      class: 'chip', type: 'button', style: 'font-size:11.5px;min-height:40px',
      'aria-pressed': ui.elements[t.key].on ? 'true' : 'false',
      onclick: () => {
        ui.elements[t.key].on = !ui.elements[t.key].on;
        if (!ui.elements[t.key].on && ui.selected === t.key) ui.selected = null;
        ui.refreshChrome();
        draw();
      },
    }, t.label),
  );
}

function setMode(mode) {
  ui.mode = mode;
  ui.selected = null;
  ui.refreshChrome();
  draw();
}

function setRatio(ratio) {
  if (ui.ratio === ratio) return;
  ui.ratio = ratio;
  sizeCanvas();
  clampAll();
  ui.refreshChrome();
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
    e.x = Math.min(Math.max(e.x, 0), w - 120);
    e.y = Math.min(Math.max(e.y, 0), h - 60);
  }
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
    img.onload = () => {
      URL.revokeObjectURL(url);
      ui.photo = img;
      setMode('photo');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("That image didn't open."); };
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

  canvas.addEventListener('pointerdown', (e) => {
    if (ui.mode !== 'photo') return;
    const p = toCard(e);
    const hit = hitTest(p);
    ui.selected = hit;
    if (hit) {
      const b = ui.bounds.get(hit);
      ui.drag = { key: hit, dx: p.x - b.x, dy: p.y - b.y };
      canvas.setPointerCapture(e.pointerId);
    }
    draw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!ui.drag) return;
    e.preventDefault();
    const p = toCard(e);
    const el2 = ui.elements[ui.drag.key];
    el2.x = p.x - ui.drag.dx;
    el2.y = p.y - ui.drag.dy;
    clampAll();
    draw();
  });

  const end = (e) => {
    if (!ui.drag) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    ui.drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

// Topmost first, so the element drawn last wins an overlap.
function hitTest(p) {
  const keys = [...ui.bounds.keys()].reverse();
  for (const k of keys) {
    const b = ui.bounds.get(k);
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return k;
  }
  return null;
}

/* ---------- text helpers ---------- */

// Manual letter-spacing: ctx.letterSpacing is not universal, and the labels
// depend on wide tracking to read as labels at all.
function drawText(g, str, x, y, { size = 40, weight = 700, color = C.text, spacing = 0, align = 'left' } = {}) {
  g.font = `${weight} ${size}px ${SANS}`;
  g.fillStyle = color;
  g.textBaseline = 'top';
  const chars = [...str];
  const width = measure(g, chars, spacing);
  let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  for (const ch of chars) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + spacing;
  }
  return width;
}

function measure(g, chars, spacing) {
  let w = 0;
  for (const ch of chars) w += g.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

function textWidth(g, str, { size = 40, weight = 700, spacing = 0 } = {}) {
  g.font = `${weight} ${size}px ${SANS}`;
  return measure(g, [...str], spacing);
}

/* ---------- draw ---------- */

function draw({ forExport = false } = {}) {
  const g = ui.g;
  const [w, h] = RATIOS[ui.ratio];
  ui.bounds.clear();

  g.clearRect(0, 0, w, h);
  g.fillStyle = C.bg;
  g.fillRect(0, 0, w, h);

  if (ui.photo) drawCover(g, ui.photo, w, h);

  if (ui.mode === 'preset') drawPreset(g, w, h);
  else drawFree(g, w, h, forExport);
}

function drawCover(g, img, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawPreset(g, w, h) {
  const { session: s, sum } = ui;

  drawText(g, shortDate(s.startedAt).toUpperCase(), PAD, PAD, { size: 30, weight: 700, color: C.pink, spacing: 5 });
  drawText(g, clockTime(s.startedAt).toUpperCase() + ' — ' + clockTime(s.endedAt ?? Date.now()).toUpperCase(), PAD, PAD + 44, { size: 24, weight: 600, color: C.faint, spacing: 5 });

  // Anchor the stats just above the footer rule and let the route take
  // whatever height is left, so feed and story ratios both stay balanced
  // instead of leaving a dead band above the wordmark.
  const footerY = h - PAD - 62;
  const statsH = 264;
  const statsTop = footerY - 80 - statsH;
  const routeTop = PAD + 150;
  drawRoute(g, PAD, routeTop, w - PAD * 2, statsTop - 60 - routeTop);

  const cells = [
    ['DURATION', hhmm(sum.ms), C.text],
    ['DRINKS', String(sum.drinks), C.pink],
    ['STOPS', String(sum.stops), C.text],
    ['DISTANCE', km(sum.distanceM), C.text],
  ];
  const colW = (w - PAD * 2) / 2;
  cells.forEach(([k, v, color], i) => {
    const x = PAD + (i % 2) * colW;
    const y = statsTop + Math.floor(i / 2) * 132;
    drawText(g, k, x, y, { size: 22, weight: 600, color: C.faint, spacing: 4 });
    drawText(g, v, x, y + 34, { size: 62, weight: 700, color, spacing: -2 });
  });

  g.fillStyle = C.line;
  g.fillRect(PAD, footerY, w - PAD * 2, 2);
  drawText(g, 'LAST CALL', PAD, h - PAD - 40, { size: 24, weight: 700, color: C.mint, spacing: 7 });
  if (sum.kind) {
    drawText(g, sum.kind.toUpperCase(), w - PAD, h - PAD - 40, { size: 24, weight: 600, color: C.faint, spacing: 4, align: 'right' });
  }
}

function drawFree(g, w, h, forExport) {
  for (const t of TYPES) {
    const e = ui.elements[t.key];
    if (!e.on) continue;
    const box = DRAW[t.key](g, e.x, e.y);
    ui.bounds.set(t.key, { x: e.x, y: e.y, w: box.w, h: box.h });
  }

  if (!forExport && ui.selected && ui.bounds.has(ui.selected)) {
    const b = ui.bounds.get(ui.selected);
    g.save();
    g.strokeStyle = C.mint;
    g.lineWidth = 3;
    g.setLineDash([12, 10]);
    g.strokeRect(b.x - 14, b.y - 14, b.w + 28, b.h + 28);
    g.restore();
  }
}

const DRAW = {
  time(g, x, y) {
    const { sum } = ui;
    drawText(g, 'OUT FOR', x, y, { size: 22, weight: 600, color: '#CFD6D3', spacing: 5 });
    const w = drawText(g, hhmm(sum.ms), x, y + 32, { size: 78, weight: 700, spacing: -3 });
    return { w: Math.max(w, 150), h: 118 };
  },
  stats(g, x, y) {
    const { sum } = ui;
    const cells = [['DRINKS', String(sum.drinks), C.pink], ['STOPS', String(sum.stops), C.text], ['KM', km(sum.distanceM), C.text]];
    let cx = x;
    for (const [k, v, color] of cells) {
      drawText(g, k, cx, y, { size: 20, weight: 600, color: '#CFD6D3', spacing: 4 });
      drawText(g, v, cx, y + 28, { size: 54, weight: 700, color, spacing: -2 });
      cx += 190;
    }
    return { w: 190 * cells.length - 40, h: 92 };
  },
  route(g, x, y) {
    const w = 480, h = 220;
    drawRoute(g, x, y, w, h);
    return { w, h };
  },
  stops(g, x, y) {
    const names = ui.session.pins.map((p) => p.name).slice(0, 5);
    if (!names.length) {
      drawText(g, 'NO STOPS PINNED', x, y, { size: 20, weight: 600, color: '#CFD6D3', spacing: 4 });
      return { w: 260, h: 24 };
    }
    drawText(g, 'STOPS', x, y, { size: 20, weight: 600, color: '#CFD6D3', spacing: 4 });
    let widest = 0;
    names.forEach((n, i) => {
      const w = drawText(g, n, x, y + 34 + i * 42, { size: 34, weight: 700, spacing: -0.5 });
      widest = Math.max(widest, w);
    });
    return { w: Math.max(widest, 200), h: 34 + names.length * 42 };
  },
  drink(g, x, y) {
    const kind = ui.sum.kind || 'Water';
    drawText(g, 'DRINK OF CHOICE', x, y, { size: 20, weight: 600, color: '#CFD6D3', spacing: 4 });
    const w = drawText(g, kind.toUpperCase(), x, y + 28, { size: 46, weight: 700, color: C.pink, spacing: -1 });
    return { w: Math.max(w, 200), h: 80 };
  },
  mark(g, x, y) {
    const w = drawText(g, 'LAST CALL', x, y, { size: 26, weight: 700, color: C.mint, spacing: 7 });
    return { w, h: 30 };
  },
};

function drawRoute(g, x, y, w, h) {
  const pts = ui.session.trail;
  if (pts.length < 2) {
    drawText(g, 'NO ROUTE RECORDED', x, y + h / 2 - 12, { size: 22, weight: 600, color: C.faint, spacing: 4 });
    return;
  }
  const fitted = fitPoints(pts, w, h, 16).map((p) => ({ x: p.x + x, y: p.y + y }));
  g.save();
  g.strokeStyle = C.mint;
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  fitted.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.stroke();

  g.fillStyle = C.mint;
  g.beginPath();
  g.arc(fitted[0].x, fitted[0].y, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = C.pink;
  g.beginPath();
  g.arc(fitted[fitted.length - 1].x, fitted[fitted.length - 1].y, 13, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/* ---------- export ---------- */

function render() {
  // Redraw without the selection outline, then restore the editing view.
  draw({ forExport: true });
  return new Promise((resolve, reject) => {
    ui.canvas.toBlob((blob) => {
      draw();
      blob ? resolve(blob) : reject(new Error('toBlob returned null'));
    }, 'image/png');
  });
}

function filename() {
  return `lastcall-${new Date(ui.session.startedAt).toISOString().slice(0, 10)}.png`;
}

async function shareCard() {
  let blob;
  try { blob = await render(); } catch { toast("The card didn't render."); return; }

  const file = new File([blob], filename(), { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  download(blob);
  toast('Sharing is not available here, so it downloaded instead.');
}

async function saveCard() {
  try {
    download(await render());
    toast('Saved.');
  } catch {
    toast("The card didn't render.");
  }
}

function download(blob) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Exposed so the browser verification pass can prove toBlob works — the exact
// thing that would fail if the card were screenshotted from a live map.
export function __renderForTest() { return render(); }
