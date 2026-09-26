// The pixel avatar: a 32 x 43 chibi drawn from simple shapes and small pixel
// maps, recoloured at draw time so any colour works without new artwork.
//
// Everything snaps to the pixel grid and steps at 12 frames a second, like a
// real sprite. The loop runs on requestAnimationFrame and stops by itself once
// the canvas leaves the page, so a hidden or locked phone spends nothing on it.
// It never touches tracking.
//
// Animations refer to expressions by name (happy, puppy, heart…) rather than
// to pixels, so a redesign can redraw the parts without touching the motion.
// The full brief is design/AVATAR-MOTION.md.

const GW = 32, GH = 43;

export const STYLES = ['Short', 'Long', 'Bun', 'Quiff', 'Curly', 'Bald'];
export const FACIAL = ['None', 'Stubble', 'Moustache', 'Goatee', 'Beard', 'Full beard'];

export const DEFAULT_LOOK = {
  skin: '#E8B08A', hair: '#3A2A22', eye: '#3FA88A', cheek: '#F58FA8',
  top: '#7EE0C0', legs: '#3E5173', shoes: '#F06C9B', style: 'Short',
  // null: the beard follows the hair colour until someone picks its own.
  facial: 'None', beard: null,
};

// Quick picks per part. The sliders on the customise screen reach every other
// colour; these are just the common starting points.
export const PARTS = [
  { key: 'skin', label: 'Skin', presets: ['#FBE3CF', '#F3C9A5', '#E8B08A', '#D19A6E', '#B07A4F', '#8D5A3B', '#6B4128', '#4A2C1B'] },
  { key: 'hair', label: 'Hair & brows', presets: ['#1E1612', '#3A2A22', '#6B4428', '#A8703A', '#D9B26A', '#B8452A', '#9A9A9A', '#EDEDED'] },
  { key: 'beard', label: 'Beard', presets: ['#1E1612', '#3A2A22', '#6B4428', '#A8703A', '#D9B26A', '#B8452A', '#9A9A9A', '#EDEDED'] },
  { key: 'eye', label: 'Eyes', presets: ['#3FA88A', '#3E6FB8', '#6B4428', '#2E2E2E', '#7A9A3A', '#8A5AC8', '#C8A03A', '#D94A7A'] },
  { key: 'cheek', label: 'Cheeks', presets: ['#F58FA8', '#F2A07B', '#E86A7F', '#F7B6CB', '#D98FD9', '#C9745A'] },
  { key: 'top', label: 'Top', presets: ['#7EE0C0', '#F06C9B', '#F2C14E', '#3E6FB8', '#FFFFFF', '#222222', '#E8633A', '#8A5AC8'] },
  { key: 'legs', label: 'Bottoms', presets: ['#3E5173', '#222222', '#6B4428', '#C8C8C8', '#2E6E5B', '#8A3A3A'] },
  { key: 'shoes', label: 'Shoes', presets: ['#F06C9B', '#FFFFFF', '#222222', '#7EE0C0', '#F2C14E', '#E8633A'] },
];

/* ================= colour ================= */

const hex2 = (n) => n.toString(16).padStart(2, '0');
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const shade = (h, amt) => '#' + rgb(h).map((c) =>
  hex2(Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt)))))).join('');
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((c, i) => hex2(Math.round(c + (B[i] - c) * t))).join(''); };

export function toHsl(h) {
  const [r, g, b] = rgb(h).map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(hue * 60), Math.round(s * 100), Math.round(l * 100)];
}
export function fromHsl(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map((v) => hex2(Math.round(v * 255))).join('');
}

function palette(look, liquid) {
  const { skin, hair, eye } = look;
  return {
    skin, hair, hairL: shade(hair, 0.38), brow: shade(hair, -0.3),
    beard: look.beard || hair, stubble: mix(skin, look.beard || hair, 0.42),
    iris: eye, irisD: shade(eye, -0.66), white: '#FFFFFF',
    lash: shade(skin, -0.74), mouth: shade(skin, -0.6), tongue: '#E8697F', cheek: look.cheek,
    top: look.top, legs: look.legs, shoes: look.shoes,
    liquid: liquid === 'water' ? '#8ED3FA' : '#E8A33D', glass: '#A9B6BE', foam: '#F4EFE2',
    bun: '#D99A4E', seed: '#F6E3B4', lettuce: '#6CC46C', patty: '#6B3B2A',
    pink: '#F06C9B', pinkL: '#F7B6CB', gold: '#F2C14E', mint: '#7EE0C0',
  };
}

/* ================= grid ================= */
// One shared grid: frames are built synchronously, one avatar at a time.

const LAYER = { hairBack: 0, legs: 1, torso: 2, ears: 3, head: 4, hair: 5, arm: 6, prop: 7 };
let G = [];
const clear = () => { G = new Array(GW * GH).fill(null); };
const get = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? null : G[y * GW + x]);
function set(x, y, col, part) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= GW || y >= GH) return;
  G[y * GW + x] = { col, part };
}
// Filled (super)ellipse sampled at cell centres; pow above 2 gives chubbier cheeks.
function blob(cx, cy, rx, ry, col, part, keep, pow = 2) {
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++) {
      const dx = Math.abs((x + 0.5 - cx) / rx), dy = Math.abs((y + 0.5 - cy) / ry);
      if (dx ** pow + dy ** pow <= 1 && (!keep || keep(x, y))) set(x, y, col, part);
    }
  }
}
function stroke(x0, y0, x1, y1, col, part) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t - 0.5, y = y0 + (y1 - y0) * t - 0.5;
    set(x, y, col, part); set(x + 1, y, col, part); set(x, y + 1, col, part); set(x + 1, y + 1, col, part);
  }
}
function stamp(m, x0, y0, colours, part) {
  m.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') set(x0 + x, y0 + y, colours[ch], part);
  }));
}

/* ================= face ================= */

const EYE = {
  open: ['.DD.', 'DWWD', 'DWID', 'DIID', '.II.'],
  puppy: ['.DD.', 'DWWD', 'DWDD', 'DDDD', 'DIWD', '.II.'],
  wide: ['.WW.', 'WWWW', 'WDDW', 'WDDW', '.WW.'],
  happy: ['.LL.', 'L..L'],
  content: ['L..L', '.LL.'],
  closed: ['LLLL'],
  heart: ['AA.AA', 'AAAAA', '.AAA.', '..A..'],
  star: ['..Y..', '..Y..', 'YYWYY', '..Y..', '..Y..'],
};
const EYE_TOP = { open: -2, puppy: -3, wide: -2, happy: -1, content: 0, closed: 1, heart: -2, star: -2 };
// Named expressions: which drawing, how far the lids drop, the gaze, default brows.
const LOOK = {
  open: { m: 'open' },
  lookL: { m: 'open', dx: -1 },
  lookR: { m: 'open', dx: 1 },
  up: { m: 'open', dy: -1, brows: 'raised' },
  half: { m: 'open', lid: 0.4, brows: 'soft' },
  sleepy: { m: 'open', lid: 0.6, brows: 'soft' },
  determined: { m: 'open', lid: 0.2, brows: 'determined' },
  puppy: { m: 'puppy', brows: 'soft' },
  wide: { m: 'wide', brows: 'raised' },
  happy: { m: 'happy', brows: 'happy' },
  content: { m: 'content', brows: 'happy' },
  closed: { m: 'closed' },
  heart: { m: 'heart', brows: 'happy' },
  star: { m: 'star', brows: 'raised' },
  wink: { m: 'open', wink: true, brows: 'happy' },
};
const MOUTH = {
  // Corners one step up from the line, joined diagonally, so it reads as a
  // smile at phone size; the old 2-row version read as teeth.
  smile: ['M......M', '.M....M.', '..MMMM..'],
  cat: ['M.MM.M', '.M..M.'],
  open: ['MMMM', 'MTTM', '.MM.'],
  ooh: ['.MM.', 'M..M', '.MM.'],
  wide: ['MMMMMM', 'MTTTTM', 'MTTTTM', '.MMMM.'],
  flat: ['MMMM'],
  small: ['MM'],
};
const BROW = { normal: [0, 0, 0, 0], raised: [-1, -1, -1, -1], soft: [1, 0, 0, 0], determined: [0, 0, 0, 1], happy: [0, -1, -1, 0] };

function eye(side, ex, ey, name, lid, p) {
  const look = LOOK[name] || LOOK.open;
  let key = look.m;
  if (look.wink && side === 'L') key = 'happy';
  const lidAmt = Math.max(look.lid || 0, (key === 'open' || key === 'puppy') ? lid : 0);
  if (lidAmt >= 0.95) key = 'closed';
  const m = EYE[key], w = m[0].length, h = m.length;
  // Odd-width eyes can't centre on the face's midline, so each side leans outward.
  const x0 = (w % 2 ? (side === 'L' ? ex - (w + 1) / 2 : ex - (w - 1) / 2) : ex - w / 2) + (look.dx || 0);
  const y0 = ey + EYE_TOP[key] + (look.dy || 0);
  const covered = (key === 'open' || key === 'puppy') ? Math.round(lidAmt * h) : 0;
  const rows = m.map((r, i) => (i < covered - 1 ? '.'.repeat(w) : i === covered - 1 ? 'L'.repeat(w) : r));
  stamp(rows, x0, y0, { D: p.irisD, I: p.iris, W: p.white, L: p.lash, A: p.pink, Y: p.gold }, 'head');
}
function brows(ex, ey, kind, p, side) {
  const off = BROW[kind] || BROW.normal;
  for (let i = 0; i < 4; i++) {
    const x = ex - 2 + i, y = ey - 4 + (side === 'L' ? off[i] : off[3 - i]);
    if (get(x, y)?.part === 'head') set(x, y, p.brow, 'head');
  }
}

/* ================= hair ================= */

const bangs = (u) => (Math.floor(Math.abs(u)) % 3 === 1 ? 1 : 0);
const FRINGE = {
  Short: (u, top) => (Math.abs(u) > 8 ? top + 11.5 : top + 6.5 + bangs(u)),
  Long: (u, top) => (Math.abs(u) > 7.5 ? top + 14 : top + 6.5 + bangs(u)),
  Bun: (u, top) => (Math.abs(u) > 8.5 ? top + 9.5 : top + (u < 0 ? 6.5 : 5.2)),
  Quiff: (u, top) => (Math.abs(u) > 8.5 ? top + 8 : top + 4.6),
  Curly: (u, top) => (Math.abs(u) > 8 ? top + 12 : top + 6 + (Math.floor(Math.abs(u) / 2) % 2)),
  Bald: null,
};
function hairBack(style, cx, cy, p) {
  if (style !== 'Long') return;
  blob(cx - 8.4, cy + 5, 3.3, 8.5, p.hair, 'hairBack');
  blob(cx + 8.4, cy + 5, 3.3, 8.5, p.hair, 'hairBack');
}
const SHINE = [[-5, 2], [-4, 1], [-3, 1], [-6, 3]];
function hairFront(style, cx, cy, p) {
  const top = cy - 9.5, f = FRINGE[style];
  if (!f) {
    // No hair: the shine moves onto the scalp so the head still reads as round.
    const shine = shade(p.skin, 0.38);
    [...SHINE, [-5, 3]].forEach(([dx, dy]) => {
      const x = Math.floor(cx + dx), y = Math.floor(top + dy);
      if (get(x, y)?.part === 'head') set(x, y, shine, 'head');
    });
    return;
  }
  blob(cx, cy - 0.5, style === 'Quiff' ? 10.9 : 11.2, 10.3, p.hair, 'hair', (x, y) => y + 0.5 <= f(x + 0.5 - cx, top));
  if (style === 'Bun') blob(cx, top - 1, 3.2, 2.8, p.hair, 'hair');
  if (style === 'Quiff') blob(cx - 2, top + 0.4, 5.4, 2.7, p.hair, 'hair');
  if (style === 'Curly') {
    for (let a = 180; a <= 360; a += 22.5) {
      const r = a * Math.PI / 180;
      blob(cx + Math.cos(r) * 10.6, cy - 0.5 + Math.sin(r) * 9.8, 2, 2, p.hair, 'hair');
    }
  }
  SHINE.forEach(([dx, dy]) => {
    const x = Math.floor(cx + dx), y = Math.floor(top + dy + (style === 'Bun' ? 1 : 0));
    if (get(x, y)?.part === 'hair') set(x, y, p.hairL, 'hair');
  });
}

/* ================= facial hair ================= */
// Drawn on the face before the mouth, so every expression still shows. Beards
// that surround the mouth leave a window of skin round it, or a dark beard
// would swallow the smile.

function facialHair(kind, hx, hy, p, mouth) {
  if (!kind || kind === 'None') return;
  const onFace = (x, y) => get(x, y)?.part === 'head';
  const mw = mouth[0].length, mh = mouth.length;
  const mx0 = Math.floor(hx - mw / 2), my0 = hy + 6;
  const inMouth = (x, y, pad) => x >= mx0 - pad && x < mx0 + mw + pad && y >= my0 - pad && y < my0 + mh + pad;
  const dx = (x) => x + 0.5 - hx;

  if (kind === 'Stubble') {
    for (let y = hy + 3; y <= hy + 10; y++) {
      for (let x = hx - 11; x <= hx + 11; x++) {
        const edge = Math.abs(dx(x)) > 7 || y >= hy + 5;
        if (edge && onFace(x, y) && !inMouth(x, y, 0) && (x + y) % 2 === 0) set(x, y, p.stubble, 'head');
      }
    }
    return;
  }

  const moustache = () => {
    for (let x = hx - 4; x < hx + 4; x++) set(x, hy + 5, p.beard, 'head');
    set(hx - 5, hy + 6, p.beard, 'head');
    set(hx + 4, hy + 6, p.beard, 'head');
  };

  if (kind === 'Moustache') { moustache(); return; }

  if (kind === 'Goatee') {
    moustache();
    for (let y = my0 + mh; y <= hy + 10; y++) {
      for (let x = hx - 3; x < hx + 3; x++) if (onFace(x, y) || y <= hy + 10) set(x, y, p.beard, 'head');
    }
    return;
  }

  // Beard: the lower face from the mouth down, with sideburns. Full beard
  // climbs the cheeks too and hangs a little further below the chin.
  const full = kind === 'Full beard';
  for (let y = hy - 1; y <= hy + 12; y++) {
    for (let x = hx - 12; x <= hx + 12; x++) {
      const side = Math.abs(dx(x));
      const cover = full
        ? (y >= hy + 4) || (side > 8.2 && y >= hy - 1)
        : (y >= hy + 6) || (side > 8.6 && y >= hy + 1) || (side > 7 && y >= hy + 4);
      if (!cover || inMouth(x, y, 1)) continue;
      // Below the chin it tapers to a rounded point rather than a block.
      const rows = y - (hy + 9);
      const below = rows >= 1 && side < (full ? [0, 6, 4, 2] : [0, 4, 2, 0])[Math.min(rows, 3)];
      if (onFace(x, y) || below) set(x, y, p.beard, 'head');
    }
  }
  moustache();
  // Skin window round the mouth so the expression stays readable.
  for (let y = my0 - 1; y < my0 + mh + 1; y++) {
    for (let x = mx0 - 1; x < mx0 + mw + 1; x++) {
      if (y === hy + 5 && x >= hx - 4 && x < hx + 4) continue;
      if (onFace(x, y) && (full || y > hy + 5)) set(x, y, p.skin, 'head');
    }
  }
}

/* ================= body ================= */

// Upper arm and forearm angles in degrees for the right arm; the left mirrors.
const POSE = { down: [80, 95], out: [25, 60], bent: [100, 205], sip: [118, 258], up: [-55, -85], wave: [-15, -80], wave2: [-15, -45] };
function arm(side, sx, sy, pose, swing, p) {
  let [u, f] = POSE[pose] || POSE.down;
  u += swing * 16; f += swing * 16;
  if (side === 'L') { u = 180 - u; f = 180 - f; }
  const r = Math.PI / 180;
  const ex = sx + Math.cos(u * r) * 3.6, ey = sy + Math.sin(u * r) * 3.6;
  const hx = ex + Math.cos(f * r) * 3.4, hy = ey + Math.sin(f * r) * 3.4;
  stroke(sx, sy, ex, ey, p.top, 'arm');
  stroke(ex, ey, hx, hy, p.skin, 'arm');
  blob(hx, hy, 1.45, 1.45, p.skin, 'arm');
  return { x: hx, y: hy };
}
const PROP = {
  glass: { m: ['G...G', 'GFFFG', 'GlllG', 'GlllG', 'GlllG', '.GGG.'], c: { G: 'glass', F: 'foam', l: 'liquid' } },
  cup: { m: ['G..G', 'GllG', 'GllG', 'GllG', '.GG.'], c: { G: 'glass', l: 'liquid' } },
  food: { m: ['.BBBB.', 'BsBBsB', 'gggggg', 'PPPPPP', '.BBBB.'], c: { B: 'bun', s: 'seed', g: 'lettuce', P: 'patty' } },
  pin: { m: ['.AAA.', 'AAAAA', 'AAWAA', 'AAAAA', '.AAA.', '..A..', '..A..'], c: { A: 'pink', W: 'white' } },
  badge: { m: ['.YYYYY.', 'YYYYYYY', 'YYWYYYY', 'YYYYYYY', '.YYYYY.', '..A.A..', '.AA.AA.'], c: { Y: 'gold', W: 'white', A: 'pink' } },
};
function prop(name, at, p) {
  const d = PROP[name], w = d.m[0].length, h = d.m.length;
  const colours = Object.fromEntries(Object.entries(d.c).map(([k, v]) => [k, p[v]]));
  const x0 = at.hand ? Math.round(at.x - w / 2) : at.x;
  const y0 = at.hand ? Math.round(at.y) - h + 2 : at.y;
  stamp(d.m, x0, y0, colours, 'prop');
}

/* ================= one frame ================= */

function build(look, st, lid, me) {
  clear();
  const p = palette(look, st.liquid);
  const style = FRINGE[look.style] === undefined ? 'Short' : look.style;
  const rx = st.rootDX || 0, ry = st.rootDY || 0;
  const sink = st.squash || st.legBend ? 1 : 0;
  const ty = ry + (st.torsoDY || 0) + sink;
  const hx = 16 + rx + (st.headDX || 0);
  const hy = 17 + ty + (st.headDY || 0) + (st.breathHead || 0);
  // Hair trails the head by one frame, a pixel at most, so jumps land with a bounce.
  const hairDY = me.hairPrev == null ? 0 : Math.max(-1, Math.min(1, me.hairPrev - hy));
  me.hairPrev = hy;

  hairBack(style, hx, hy + hairDY, p);

  // Legs and shoes: the right shoe lifts for a tap, the legs part for a walk.
  const lx = 12 + rx - (st.legWalk === 0 ? 1 : 0), rxx = 17 + rx + (st.legWalk === 1 ? 1 : 0);
  const tap = st.legTap ? 1 : 0;
  for (let y = 31 + ty; y <= 37 + ry; y++) {
    for (let i = 0; i < 3; i++) {
      set(lx + i, y, p.legs, 'legs');
      if (y <= 37 + ry - tap) set(rxx + i, y, p.legs, 'legs');
    }
  }
  [[38, 1, 3], [39, 0, 4]].forEach(([y, a, n]) => {
    for (let i = 0; i < n; i++) {
      set(lx - 1 + a + i, y + ry, p.shoes, 'legs');
      set(rxx + i, y + ry - tap, p.shoes, 'legs');
    }
  });

  // Torso with rounded shoulders and a waistband in the bottoms colour.
  for (let y = 0; y < 8; y++) {
    for (let x = 10; x <= 21; x++) {
      if (y === 0 && (x === 10 || x === 21)) continue;
      set(x + rx, 26 + ty + y, y >= 6 ? p.legs : p.top, 'torso');
    }
  }

  blob(hx - 10.6, hy + 2, 1.5, 2, p.skin, 'ears');
  blob(hx + 10.6, hy + 2, 1.5, 2, p.skin, 'ears');
  // Hair hides a squarer, chubbier crown; bald heads get a rounder dome.
  blob(hx, hy, 10.5, 9.5, p.skin, 'head', null, FRINGE[style] ? 2.35 : 2.15);

  // Face: eyes set low and wide, cheeks, mouth, then hair and brows over it.
  const ex1 = hx - 4, ex2 = hx + 4, ey = hy + 2;
  const blush = st.blush ?? 1;
  if (blush) {
    const c = mix(p.skin, p.cheek, blush > 1 ? 0.8 : 0.5);
    const keep = (x, y) => get(x, y)?.part === 'head';
    const [bw, bh] = blush > 1 ? [2.1, 1.1] : [1.6, 0.7];
    blob(hx - 8, hy + 5.5, bw, bh, c, 'head', keep);
    blob(hx + 8, hy + 5.5, bw, bh, c, 'head', keep);
  }
  eye('L', ex1, ey, st.eyes, lid, p);
  eye('R', ex2, ey, st.eyes, lid, p);
  const mm = MOUTH[st.mouth] || MOUTH.smile;
  facialHair(look.facial, hx, hy, p, mm);
  stamp(mm, hx - mm[0].length / 2, hy + 6, { M: p.mouth, T: p.tongue }, 'head');

  hairFront(style, hx, hy + hairDY, p);
  const browKind = st.brows || (LOOK[st.eyes] || LOOK.open).brows || 'normal';
  brows(ex1, ey, browKind, p, 'L');
  brows(ex2, ey, browKind, p, 'R');

  // Arms from the shoulders, then anything held, then the hand again so it grips.
  const sw = st.armSwing || 0;
  const ay = 28.2 + ty + (st.breathArm || 0);
  arm('L', 11.8 + rx, ay, st.armL, -sw, p);
  const handR = arm('R', 20.2 + rx, ay, st.armR, sw, p);
  if (st.prop) {
    const [name, a, b] = st.prop;
    prop(name, a === 'hand' ? { hand: true, ...handR } : { x: a + rx, y: b + ry }, p);
    if (a === 'hand') blob(handR.x, handR.y, 1.45, 1.45, p.skin, 'arm');
  }
  return shadeAndOutline();
}

// Outlines take a darker tone of whatever they border, never flat black, so the
// character stays soft on the app's black ground. Inner edges darken where one
// part overlaps another, and a soft shadow runs down the lower right of shapes.
function shadeAndOutline() {
  const out = new Array(GW * GH).fill(null);
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const c = get(x, y);
      if (!c) {
        let best = null;
        for (const [dx, dy] of N) {
          const n = get(x + dx, y + dy);
          if (n && (!best || LAYER[n.part] > LAYER[best.part])) best = n;
        }
        if (best) out[y * GW + x] = shade(best.col, -0.62);
        continue;
      }
      let col = c.col;
      const r = get(x + 1, y), b = get(x, y + 1);
      if ((c.part === 'head' || c.part === 'torso' || c.part === 'hair' || c.part === 'hairBack')
          && (!r || r.part !== c.part || !b || b.part !== c.part)) col = shade(col, -0.13);
      for (const [dx, dy] of N) {
        const n = get(x + dx, y + dy);
        if (n && n.part !== c.part && LAYER[n.part] > LAYER[c.part]) { col = shade(c.col, -0.38); break; }
      }
      out[y * GW + x] = col;
    }
  }
  return out;
}

/* ================= animations ================= */
// Keyframes are [ticks, state]; one tick is a twelfth of a second.

const K = (n, s) => [n, s];
const ANIM = {
  drink: [
    K(2, { armR: 'bent', prop: ['glass', 'hand'], mouth: 'flat' }),
    K(2, { armR: 'bent', prop: ['glass', 'hand'], mouth: 'flat', torsoDY: 1 }),
    K(3, { armR: 'sip', prop: ['glass', 'hand'], mouth: 'ooh' }),
    K(6, { armR: 'sip', prop: ['glass', 'hand'], mouth: 'ooh', eyes: 'content', headDY: -1 }),
    K(3, { armR: 'bent', prop: ['glass', 'hand'], mouth: 'cat', eyes: 'happy', blush: 2 }),
    K(3, { eyes: 'happy', mouth: 'smile' }),
  ],
  water: [
    K(2, { armR: 'bent', prop: ['cup', 'hand'], liquid: 'water', mouth: 'flat' }),
    K(3, { armR: 'sip', prop: ['cup', 'hand'], liquid: 'water', mouth: 'ooh' }),
    K(5, { armR: 'sip', prop: ['cup', 'hand'], liquid: 'water', eyes: 'content', headDY: -1 }),
    K(2, { armR: 'bent', prop: ['cup', 'hand'], liquid: 'water', eyes: 'wide', mouth: 'ooh' }),
    K(4, { armL: 'up', armR: 'up', eyes: 'star', mouth: 'wide', blush: 2, rootDY: -3, burst: ['#8ED3FA', 14] }),
    K(2, { eyes: 'star', mouth: 'open', blush: 2, squash: 1 }),
    K(4, { eyes: 'happy', mouth: 'smile', blush: 2 }),
  ],
  food: [
    K(3, { armR: 'bent', prop: ['food', 'hand'], mouth: 'ooh', eyes: 'wide' }),
    K(2, { armR: 'sip', prop: ['food', 'hand'], mouth: 'wide', headDX: 1 }),
    K(2, { armR: 'bent', prop: ['food', 'hand'], mouth: 'cat', eyes: 'content', blush: 2 }),
    K(2, { armR: 'sip', prop: ['food', 'hand'], mouth: 'wide', headDX: 1 }),
    K(3, { armR: 'bent', prop: ['food', 'hand'], mouth: 'cat', eyes: 'content', blush: 2, burst: ['#F2C14E', 8] }),
    K(5, { eyes: 'heart', mouth: 'cat', blush: 2 }),
  ],
  checkin: [
    K(2, { eyes: 'up', mouth: 'ooh', prop: ['pin', 13, -8] }),
    K(2, { eyes: 'up', mouth: 'ooh', prop: ['pin', 13, -4] }),
    K(2, { eyes: 'wide', mouth: 'ooh', prop: ['pin', 13, -1], squash: 1 }),
    K(3, { armR: 'wave', eyes: 'happy', mouth: 'open', prop: ['pin', 13, -2], blush: 2 }),
    K(3, { armR: 'wave2', eyes: 'happy', mouth: 'open', prop: ['pin', 13, -2], blush: 2 }),
    K(3, { armR: 'wave', eyes: 'wink', mouth: 'smile', prop: ['pin', 13, -2], burst: ['#F06C9B', 10] }),
    K(3, { eyes: 'open', mouth: 'smile' }),
  ],
  start: [
    K(3, { legBend: 1, eyes: 'determined', mouth: 'flat' }),
    K(2, { rootDY: -5, armL: 'up', armR: 'up', eyes: 'star', mouth: 'wide', blush: 2, burst: ['#7EE0C0', 16] }),
    K(2, { rootDY: -7, armL: 'up', armR: 'up', eyes: 'star', mouth: 'wide', blush: 2 }),
    K(2, { rootDY: -3, armL: 'out', armR: 'out', eyes: 'happy', mouth: 'open' }),
    K(2, { squash: 1, eyes: 'happy', mouth: 'smile' }),
    K(3, { eyes: 'wink', mouth: 'smile' }),
  ],
  end: [
    K(3, { armL: 'up', armR: 'up', mouth: 'wide', eyes: 'closed', headDY: -1 }),
    K(3, { armL: 'up', armR: 'up', mouth: 'wide', eyes: 'closed' }),
    K(3, { mouth: 'flat', eyes: 'sleepy', torsoDY: 1 }),
    K(3, { mouth: 'small', eyes: 'sleepy', torsoDY: 1, headDY: 1 }),
    K(28, { mouth: 'small', eyes: 'content', brows: 'soft', torsoDY: 1, headDY: 1, zzz: true }),
  ],
  badge: [
    K(2, { eyes: 'up', mouth: 'ooh', prop: ['badge', 12, -8] }),
    K(2, { eyes: 'wide', mouth: 'ooh', prop: ['badge', 12, -3] }),
    K(3, { armL: 'up', armR: 'up', eyes: 'star', mouth: 'wide', blush: 2, prop: ['badge', 12, -5], burst: ['#F2C14E', 14] }),
    K(4, { armL: 'up', armR: 'up', eyes: 'heart', mouth: 'open', blush: 2, prop: ['badge', 12, -5] }),
    K(3, { eyes: 'happy', mouth: 'smile', blush: 2 }),
  ],
  cheer: [
    K(2, { rootDY: -4, armL: 'up', armR: 'up', eyes: 'happy', mouth: 'wide', blush: 2 }),
    K(2, { squash: 1, armL: 'out', armR: 'out', eyes: 'happy', mouth: 'open' }),
    K(2, { rootDY: -5, armL: 'up', armR: 'up', eyes: 'star', mouth: 'wide', blush: 2, burst: ['#7EE0C0', 12] }),
    K(2, { squash: 1, eyes: 'happy', mouth: 'smile' }),
    K(4, { eyes: 'wink', mouth: 'smile' }),
  ],
  nudge: [
    K(3, { eyes: 'lookR', mouth: 'flat' }),
    K(2, { armR: 'out', eyes: 'wide', mouth: 'ooh', tapGlass: true, headDY: -1 }),
    K(2, { armR: 'out', eyes: 'wide', mouth: 'ooh' }),
    K(2, { armR: 'out', eyes: 'wide', mouth: 'ooh', tapGlass: true, headDY: -1 }),
    K(3, { armR: 'bent', prop: ['cup', 'hand'], liquid: 'water', eyes: 'open', brows: 'soft', mouth: 'flat' }),
    K(10, { armR: 'bent', prop: ['cup', 'hand'], liquid: 'water', eyes: 'puppy', mouth: 'small', blush: 2 }),
  ],
  poke: [
    K(2, { rootDX: 2, eyes: 'wide', mouth: 'ooh', armL: 'out', armR: 'out' }),
    K(2, { rootDX: 1, eyes: 'wide', mouth: 'ooh' }),
    K(2, { headDY: -1, eyes: 'happy', mouth: 'wide', blush: 2 }),
    K(2, { eyes: 'happy', mouth: 'open', blush: 2 }),
    K(2, { headDY: -1, eyes: 'happy', mouth: 'wide', blush: 2 }),
    K(3, { eyes: 'wink', mouth: 'cat' }),
  ],
  tickle: [
    K(2, { eyes: 'content', mouth: 'wide', blush: 2, headDY: -1, armL: 'out', armR: 'out' }),
    K(2, { eyes: 'content', mouth: 'open', blush: 2, rootDX: 1 }),
    K(2, { eyes: 'content', mouth: 'wide', blush: 2, headDY: -1, armL: 'out', armR: 'out' }),
    K(2, { eyes: 'content', mouth: 'open', blush: 2, rootDX: -1 }),
    K(2, { eyes: 'content', mouth: 'wide', blush: 2, headDY: -1, armL: 'out', armR: 'out' }),
    K(6, { eyes: 'heart', mouth: 'cat', blush: 2, burst: ['#F06C9B', 12] }),
  ],
  dance: [
    K(2, { legWalk: 0, armR: 'up', headDX: -1, mouth: 'cat', eyes: 'happy', blush: 2 }),
    K(2, { legWalk: 1, armL: 'up', headDX: 1, mouth: 'open', eyes: 'happy', blush: 2, rootDY: -1 }),
    K(2, { legWalk: 0, armR: 'up', headDX: -1, mouth: 'cat', eyes: 'happy', blush: 2 }),
    K(2, { legWalk: 1, armL: 'up', headDX: 1, mouth: 'open', eyes: 'happy', blush: 2, rootDY: -1 }),
    K(2, { legWalk: 0, armR: 'up', headDX: -1, mouth: 'cat', eyes: 'content', blush: 2, note: true }),
    K(2, { legWalk: 1, armL: 'up', headDX: 1, mouth: 'open', eyes: 'star', blush: 2 }),
    K(3, { mouth: 'smile', eyes: 'wink' }),
  ],
  hello: [K(3, { armR: 'wave', mouth: 'open' }), K(3, { armR: 'wave2', eyes: 'wink', mouth: 'smile', blush: 2 }), K(3, { armR: 'wave', mouth: 'smile' }), K(3, {})],
  // idle fidgets
  weight: [K(6, { rootDX: -1 }), K(8, { rootDX: -1, eyes: 'lookL' }), K(4, {})],
  look: [K(4, { eyes: 'lookL', headDX: -1 }), K(5, { eyes: 'lookL', headDX: -1 }), K(3, {}), K(4, { eyes: 'lookR', headDX: 1 }), K(4, {})],
  tap: [K(2, { legTap: 1 }), K(2, {}), K(2, { legTap: 1 }), K(2, {}), K(2, { legTap: 1 }), K(2, {})],
  yawn: [K(3, { mouth: 'ooh', eyes: 'sleepy' }), K(6, { mouth: 'wide', eyes: 'closed', headDY: -1, armL: 'up', brows: 'soft' }), K(3, { mouth: 'small', eyes: 'sleepy' }), K(3, {})],
  fan: [K(3, { armR: 'wave', mouth: 'ooh', eyes: 'half' }), K(3, { armR: 'wave2', mouth: 'ooh', eyes: 'half' }), K(3, { armR: 'wave', mouth: 'ooh', eyes: 'half' }), K(3, { armR: 'wave2', eyes: 'half' }), K(2, {})],
  hum: [K(4, { eyes: 'content', mouth: 'cat', headDX: -1, note: true }), K(4, { eyes: 'content', mouth: 'cat', headDX: 1 }), K(4, { eyes: 'content', mouth: 'cat', headDX: -1, note: true }), K(4, { eyes: 'content', mouth: 'cat' })],
};

// Moods set the resting face and which fidgets play between actions.
const MOODS = {
  Fresh: { base: { eyes: 'open', mouth: 'smile', blush: 1 }, idle: ['weight', 'look', 'tap', 'hum', 'hello'], every: [36, 72] },
  Thirsty: { base: { eyes: 'half', mouth: 'flat', blush: 0 }, idle: ['fan', 'look', 'weight'], every: [30, 60] },
  Sleepy: { base: { eyes: 'sleepy', mouth: 'small', blush: 1 }, idle: ['yawn', 'weight'], every: [34, 64] },
  Buzzing: { base: { eyes: 'open', mouth: 'cat', blush: 2 }, idle: ['tap', 'dance', 'hum'], every: [22, 44] },
};

/* ================= an avatar on screen ================= */

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function createAvatar({ cell = 3, look = DEFAULT_LOOK, onTap = null, label = 'Your avatar' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'avatar';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const g = canvas.getContext('2d');

  const me = {
    look: { ...DEFAULT_LOOK, ...look }, mood: 'Fresh',
    cur: null, queue: [], tick: 0, acc: 0, lastTs: 0,
    idleIn: 30, blinkIn: 30, blinkStep: 0, lid: 0,
    sparks: [], hairPrev: null, running: false, pokes: [],
  };

  function size(c) {
    cell = c;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = GW * cell * dpr;
    canvas.height = GH * cell * dpr;
    canvas.style.width = `${GW * cell}px`;
    canvas.style.height = `${GH * cell}px`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
  }
  size(cell);

  function state() {
    const f = me.cur ? me.cur.frames[me.cur.i][1] : {};
    const ph = me.tick % 40;
    // Breathing: shoulders and head rise a pixel, a beat apart, unless a frame is moving them.
    const still = !('headDY' in f) && !('rootDY' in f) && !f.squash && !f.legBend;
    return {
      ...MOODS[me.mood].base, ...f,
      breathHead: still && ph >= 6 && ph < 26 ? -1 : 0,
      breathArm: still && ph < 20 ? -1 : 0,
    };
  }

  function enter() {
    const s = me.cur.frames[me.cur.i][1];
    if (reduceMotion()) return;
    if (s.burst) {
      const [color, n] = s.burst;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.45 + Math.random() * 0.8;
        me.sparks.push({ x: 16, y: 18, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, life: 0.9, color });
      }
    }
    if (s.note) me.sparks.push({ note: true, x: 24, y: 8, vx: 0.15, vy: -0.45, life: 1.4, color: '#7EE0C0' });
  }

  function run(name) {
    me.cur = { frames: ANIM[name], i: 0, left: ANIM[name][0][0], idle: false };
    me.idleIn = 40;
    enter();
  }
  // A reaction replaces whatever is playing; queue: true waits its turn instead,
  // so a drink that tips the night into "thirsty" still finishes before the nudge.
  function play(name, { queue = false } = {}) {
    if (!ANIM[name]) return;
    if (queue && me.cur && !me.cur.idle) { me.queue.push(name); return; }
    me.queue.length = 0;
    run(name);
  }

  function step() {
    me.tick++;
    if (me.cur) {
      if (--me.cur.left <= 0) {
        me.cur.i++;
        if (me.cur.i >= me.cur.frames.length) {
          me.cur = null;
          const next = me.queue.shift();
          if (next) run(next);
        } else {
          me.cur.left = me.cur.frames[me.cur.i][0];
          enter();
        }
      }
    } else if (--me.idleIn <= 0) {
      const m = MOODS[me.mood];
      if (!reduceMotion()) {
        const name = m.idle[Math.floor(Math.random() * m.idle.length)];
        me.cur = { frames: ANIM[name], i: 0, left: ANIM[name][0][0], idle: true };
        enter();
      }
      me.idleIn = m.every[0] + Math.random() * (m.every[1] - m.every[0]);
    }
    // Blinks: half, shut, half; now and then a second one straight after.
    me.lid = 0;
    if (me.blinkStep > 0) { me.lid = [0, 0.5, 1, 0.5][me.blinkStep]; me.blinkStep = (me.blinkStep + 1) % 4; }
    else if (--me.blinkIn <= 0) { me.lid = 0.5; me.blinkStep = 2; me.blinkIn = Math.random() < 0.2 ? 5 : 28 + Math.random() * 44; }
  }

  const Z = ['ZZZ', '.Z.', 'ZZZ'];
  const NOTE = ['.NN', '.N.', 'NN.', 'NN.'];
  function paint() {
    const st = state();
    const cells = build(me.look, st, me.lid, me);
    g.clearRect(0, 0, GW * cell, GH * cell);
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) continue;
      g.fillStyle = cells[i];
      g.fillRect((i % GW) * cell, Math.floor(i / GW) * cell, cell, cell);
    }
    if (st.tapGlass) {
      // Knocking on the inside of your screen: little impact marks by the hand.
      g.fillStyle = 'rgba(255,255,255,.9)';
      [[28, 28], [29, 27], [29, 31], [30, 31], [28, 34], [29, 35]].forEach(([x, y]) =>
        g.fillRect((x + (st.rootDX || 0)) * cell, y * cell, cell, cell));
    }
    if (st.zzz) {
      g.fillStyle = '#7EE0C0';
      for (let i = 0; i < 3; i++) {
        const o = ((me.tick / 12) * 0.7 + i * 0.33) % 1, s = i === 2 ? 2 : 1;
        g.globalAlpha = Math.max(0, 1 - o);
        Z.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === 'Z') g.fillRect(Math.round(24 + i * 2 + x * s) * cell, Math.round(10 - o * 8 + y * s) * cell, cell * s, cell * s);
        }));
      }
      g.globalAlpha = 1;
    }
    me.sparks = me.sparks.filter((s) => s.life > 0);
    for (const s of me.sparks) {
      g.globalAlpha = Math.max(0, Math.min(1, s.life));
      g.fillStyle = s.color;
      const sx = Math.round(s.x) * cell, sy = Math.round(s.y) * cell;
      if (s.note) NOTE.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'N') g.fillRect(sx + x * cell, sy + y * cell, cell, cell); }));
      else g.fillRect(sx, sy, cell, cell);
    }
    g.globalAlpha = 1;
  }
  function moveSparks() {
    for (const s of me.sparks) {
      s.x += s.vx; s.y += s.vy; if (!s.note) s.vy += 0.12; s.life -= 1 / 12;
    }
  }

  function frame(ts) {
    // Stops itself when the canvas leaves the page; start() brings it back.
    if (!canvas.isConnected) { me.running = false; return; }
    me.acc += Math.min(250, ts - (me.lastTs || ts));
    me.lastTs = ts;
    let stepped = false;
    while (me.acc >= 1000 / 12) { me.acc -= 1000 / 12; step(); moveSparks(); stepped = true; }
    if (stepped) paint();
    requestAnimationFrame(frame);
  }

  function start() {
    paint();
    if (me.running) return;
    me.running = true;
    me.lastTs = 0;
    me.acc = 0;
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('click', () => {
    if (onTap) { onTap(); return; }
    const now = Date.now();
    me.pokes = me.pokes.filter((t) => now - t < 4000).concat(now);
    if (me.pokes.length >= 5) { me.pokes = []; play('tickle'); } else play('poke');
  });

  return {
    canvas,
    start,
    play,
    setMood(m) { if (MOODS[m]) me.mood = m; },
    // Painted straight away rather than on the next tick, so sliders feel instant.
    setLook(look) { me.look = { ...DEFAULT_LOOK, ...look }; paint(); },
    setCell(c) { if (c !== cell) { size(c); paint(); } },
    get look() { return { ...me.look }; },
  };
}

// A random look for "Surprise me": any hue, kept out of the muddy extremes.
export function randomLook() {
  const any = () => fromHsl(Math.floor(Math.random() * 360), 45 + Math.floor(Math.random() * 45), 38 + Math.floor(Math.random() * 34));
  const skin = PARTS[0].presets[Math.floor(Math.random() * PARTS[0].presets.length)];
  return {
    // Skin stays in the natural range most of the time; one roll in five goes fantasy.
    skin: Math.random() < 0.2 ? any() : skin,
    hair: any(), eye: any(), cheek: PARTS[3].presets[Math.floor(Math.random() * 4)],
    top: any(), legs: any(), shoes: any(),
    style: STYLES[Math.floor(Math.random() * STYLES.length)],
    // Facial hair on roughly one surprise in three.
    facial: Math.random() < 0.33 ? FACIAL[1 + Math.floor(Math.random() * (FACIAL.length - 1))] : 'None',
    beard: null,
  };
}
