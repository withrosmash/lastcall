// The pixel avatar: Style B, a 64 x 80 chibi recoloured at draw time.
//
// The drawing is Claude Design's round 4 art (js/avatar-art.js, generated from
// design/round4/handback). It draws a look as separate layers. What this file
// adds is the life: each frame of an animation is mapped onto the art's arms,
// faces, props and poses (artLook), the layers are fetched from a cache, and
// whole parts are moved before they're combined, so the head bobs, the hair
// trails, the body sinks into a landing and the feet step.
//
// Everything snaps to whole pixels and steps at 12 frames a second. The loop
// runs on requestAnimationFrame and stops by itself once the canvas leaves the
// page, so a hidden or locked phone spends nothing on it. It never touches
// tracking. The movement brief is design/AVATAR-MOTION.md.

import * as Art from './avatar-art.js';
import { fxFrame } from './items-data.js';

export const { W, H, MW, MH } = Art;
// The animations were written for the 32 x 43 avatar. One of their pixels is
// two of Style B's, so a bob or a step looks the same size as before.
const OFF = 2;
const SX = W / 32, SY = H / 43;

/* ================= the wardrobe ================= */

const HAIR_NAMES = {
  short: 'Short', long: 'Long', bun: 'Bun', spacebuns: 'Space buns', curly: 'Curly', scruffy: 'Scruffy', mohawk: 'Mohawk',
  pigtails: 'Pigtails', bald: 'Bald', coily: 'Coily', braids: 'Braids', buzz: 'Buzz cut', wavy: 'Long wavy', fluffy: 'Fluffy',
};
// Elvis's hair, aviators and jumpsuit come with the costume, so they aren't in the pickers.
export const HAIRS = Art.HAIRS.filter((k) => HAIR_NAMES[k]).map((k) => [k, HAIR_NAMES[k]]);
export const GLASSES = [['none', 'None'], ['round', 'Round'], ['square', 'Square'], ['browline', 'Browline'], ['sun', 'Sunglasses']];
export const TOPS = [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['shirt', 'Shirt'], ['jacket', 'Jacket'], ['dress', 'Dress'], ['pyjamas', 'Pyjamas']];

// The wardrobe's items and what unlocks each live in items-data.js.
export { ITEMS, SUNGLASSES_BADGE } from './items-data.js';

export const SLOTS = [['skin', 'Skin'], ['hair', 'Hair & brows'], ['eyes', 'Eyes'], ['cheeks', 'Cheeks'],
  ['top', 'Top'], ['bottoms', 'Bottoms'], ['shoes', 'Shoes'], ['glasses', 'Glasses frame'], ['hat', 'Hat']];
export const SWATCHES = {
  skin: ['#F6D5BD', '#E8B48F', '#D19A6E', '#A96F45', '#7A4A2A', '#4E2F1C'],
  hair: ['#1E1A18', '#3B2A20', '#7A4B2A', '#C98A4B', '#E6C77A', '#B9B4AE', '#D95B7C', '#4B7BD9'],
  eyes: ['#2B2B2B', '#5B3A24', '#4A7A5C', '#3D6FB0', '#7A6A9E', '#8A8A8A'],
  cheeks: ['#F08A8A', '#F4A6C0', '#E07A5F', '#C85A7A'],
  cloth: ['#EDEDED', '#1E1E1E', '#21764F', '#7EE0C0', '#F06C9B', '#3D6FB0', '#E3B23C', '#8B3A3A'],
  glasses: ['#24252B', '#6B4A2E', '#B9B4AE', '#C9A227', '#8B3A3A', '#3D6FB0'],
};

export const DEFAULT_LOOK = {
  v: 3, hair: 'short', top: 'hoodie', glasses: 'square', hat: null, held: null, costume: null, shoes: 'plain',
  scarf: false, backpack: false, effect: null, colors: { ...Art.DEFAULT_COLORS },
};

// Saved looks are carried over rather than reset, so nobody loses the avatar
// they made: the first avatar's flat colours, round 2's v2, and today's v3.
const RENAMED = { quiff: 'short', bucket: 'sunhat' };
const PICK_TOPS = TOPS.map(([k]) => k);

function fromFirst(saved) {
  const c = DEFAULT_LOOK.colors;
  return {
    hair: String(saved.style || 'short').toLowerCase(), glasses: 'none',
    colors: {
      skin: saved.skin || c.skin, hair: saved.hair || c.hair, eyes: saved.eye || c.eyes, cheeks: saved.cheek || c.cheeks,
      top: saved.top || c.top, bottoms: saved.legs || c.bottoms, shoes: saved.shoes || c.shoes,
    },
  };
}

export function normaliseLook(saved) {
  if (!saved) return structuredClone(DEFAULT_LOOK);
  const src = saved.v === 2 || saved.v === 3 ? saved : fromFirst(saved);
  const known = (v, list, fallback) => (list.includes(RENAMED[v] || v) ? RENAMED[v] || v : fallback);
  let hat = RENAMED[src.hat] || src.hat || null;
  let costume = src.costume || null;
  // Panda, dinosaur and duck were hats; Style B draws them as costumes.
  if (Art.COSTUMES.includes(hat)) { costume = hat; hat = null; }
  const colors = {};
  for (const k of Object.keys(Art.DEFAULT_COLORS)) colors[k] = src.colors?.[k] || Art.DEFAULT_COLORS[k];
  return {
    v: 3,
    hair: known(src.hair, HAIRS.map(([k]) => k), 'short'),
    top: known(src.top, PICK_TOPS, 'hoodie'),
    glasses: known(src.glasses, Art.GLASSES, 'none'),
    hat: Art.HATS.includes(hat) ? hat : null,
    held: Art.HELD_ITEMS.includes(src.held) ? src.held : null,
    costume: costume === 'elvis' || Art.COSTUMES.includes(costume) ? costume : null,
    shoes: src.shoes === 'trainers' ? 'trainers' : 'plain',
    scarf: !!src.scarf, backpack: !!src.backpack,
    effect: Art.EFFECTS.includes(src.effect) ? src.effect : null,
    colors,
    // Added at draw time, never saved: the mode touch (wardrobe.dressedFor)
    // and the badge pin the unlock sheet shows.
    ...(Art.MODES.includes(src.touch) ? { touch: src.touch } : {}),
    ...(src.badge === 'pin' ? { badge: 'pin' } : {}),
  };
}

/* ================= colour ================= */

const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };

export function toHsl(h) {
  const [r, g, b] = hex(h).map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(hue * 60), Math.round(s * 100), Math.round(l * 100)];
}
export function fromHsl(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* ================= faces ================= */

// The animation vocabulary (AVATAR-MOTION.md) mapped onto the art's eyes and brows.
const LOOK = {
  open: { e: 'open' }, lookL: { e: 'lookL' }, lookR: { e: 'lookR' }, up: { e: 'lookUp', b: 'raised' },
  half: { e: 'heavy' }, sleepy: { e: 'heavy' }, determined: { e: 'open', b: 'neutral' },
  puppy: { e: 'puppy', b: 'raised' }, wide: { e: 'wide', b: 'raised' }, happy: { e: 'happy', b: 'proud' },
  content: { e: 'content', b: 'proud' }, closed: { e: 'shut' }, heart: { e: 'heart', b: 'raised' },
  star: { e: 'star', b: 'raised' }, wink: { e: 'wink', b: 'proud' },
};

/* ================= from a frame to the art ================= */

const ARM = { wave: 'wave1' };
// Dark lenses hide the eyes, so for the big reaction faces they go up on the head.
const BIG_EYES = new Set(['heart', 'star', 'wide', 'puppy']);
// The animations' drink is a glass and their water a cup; in the art, the
// cup is the soft drink with a straw and the glass is water.
const PROP = { glass: 'cup', cup: 'glass' };
const SLEEPY = new Set(['heavy', 'tired']);
const GRINS = new Set(['smile', 'cat', 'wide']);

/**
 * The art's look for one frame: the wardrobe plus the frame's face, arms,
 * pose and props. Colours are left out; they don't change the layers.
 */
export function artLook(look, fr, { fxFrame = 0 } = {}) {
  const f = fr.face || {};
  const a = {
    hair: look.hair, top: look.top, glasses: look.glasses, shoes: look.shoes,
    eyes: f.eyes || 'open', brows: f.brows || 'soft', mouth: f.mouth || 'smile', blush: f.blush ? 2 : 0,
    pose: fr.bend ? 'crouch' : fr.walk === 0 ? 'walk0' : fr.walk === 1 ? 'walk2' : 'stand',
  };
  if (look.hat) a.hat = look.hat;
  if (look.costume) a.costume = look.costume;
  if (look.scarf) a.scarf = true;
  if (look.backpack) a.backpack = true;
  if (look.touch) a.mode = look.touch;
  const effect = fr.sparkles ? 'sparkles' : look.effect;
  if (effect) { a.effect = effect; a.fxFrame = fxFrame; }
  if (fr.badge === 'held' || fr.badge === 'pin') a.badge = fr.badge;
  else if (look.badge) a.badge = look.badge;

  // What's in the hands. A reaction's prop goes in the hand it names (a drink
  // is always the soft drink with a straw); a worn item shows only
  // while both arms rest, and then the art poses the arms for it.
  const armL = ARM[fr.armL] || fr.armL || 'down', armR = ARM[fr.armR] || fr.armR || 'down';
  const prop = fr.prop && fr.prop[1] === 'hand' ? PROP[fr.prop[0]] || fr.prop[0] : null;
  const resting = armL === 'down' && armR === 'down' && !fr.armSwing && fr.badge !== 'held';
  // At rest the art poses the arms for whatever is held, a costume's own prop included.
  if (prop) Object.assign(a, { held: prop, armL, armR });
  else if (resting) { if (look.held) a.held = look.held; }
  else Object.assign(a, { held: null, armL, armR });

  if (f.glassesUp && (look.glasses === 'sun' || look.costume === 'elvis')) a.glassesUp = true;
  // Never drunk: sleepy eyes never come with a grin. A blink passes through
  // half-closed eyes for a frame and leaves the mouth alone.
  if (!f.blink && SLEEPY.has(a.eyes) && GRINS.has(a.mouth)) a.mouth = 'small';
  return a;
}

/* ================= building a frame ================= */

export const __stats = { builds: 0 };

// Built layers, most recently used last. Building is the slow part (a few
// milliseconds); moving and combining layers is cheap, so a reaction builds
// each new pose once and every bob and step after that reuses it.
//
// A build is ~17 layers of 64 x 80, nearly all empty, so each layer is kept
// as its filled pixels only, and identical pixels share one object. A cached
// pose costs tens of kilobytes rather than a megabyte.
const PIXELS = new Map();
const intern = (p) => {
  const k = JSON.stringify(p);
  let q = PIXELS.get(k);
  if (!q) { q = p; PIXELS.set(k, q); }
  return q;
};
const LAYERS = new Map();
function layersFor(a) {
  const key = JSON.stringify(a);
  let b = LAYERS.get(key);
  if (b) { LAYERS.delete(key); LAYERS.set(key, b); return b; }
  const built = Art.build(a);
  __stats.builds++;
  const layers = {};
  for (const [name, arr] of Object.entries(built.layers)) {
    const idx = [], px = [];
    arr.forEach((p, i) => { if (p) { idx.push(i); px.push(intern(p)); } });
    if (idx.length) layers[name] = { idx, px };
  }
  b = { look: { colors: built.look.colors }, layers };
  LAYERS.set(key, b);
  if (LAYERS.size > 160) LAYERS.delete(LAYERS.keys().next().value);
  return b;
}

// Which part each layer moves with.
const GROUP = {
  footL: 'footL', footR: 'footR',
  packBack: 'body', body: 'body', mode: 'body', armL: 'body', armR: 'body', held: 'body', grip: 'body',
  head: 'head', blush: 'head', mouth: 'head', eyes: 'head', glitter: 'head', brows: 'head', glasses: 'glasses', hat: 'head',
  hairBack: 'hair', hairFront: 'hair',
  fxBack: 'root', fx: 'root',
};

// Rows of headroom above the art on the live avatar, so a jump (five of the
// animations' pixels, plus a head bob) never loses the top of a hat.
const TOP = 14;
/** Height of the live avatar's canvas, in art pixels: the art plus headroom. */
export const LIVE_H = H + TOP;
const Z_ORDER = Object.keys(Art.LAYER_Z).sort((a, c) => Art.LAYER_Z[a] - Art.LAYER_Z[c]);
const FACE = { eyes: 1, mouth: 1, blush: 1, brows: 1 };

/**
 * The art's compose and outlineFixed, on a grid `gh` rows tall, placing each
 * sparse layer at its part's offset. Same rules: the higher z wins a pixel;
 * an outlined pixel by empty space goes deep, and by a lower layer steps down
 * a tone (face layers and glasses never cause one). The test "combining
 * layers matches the art exactly" holds this to the art's own result.
 */
function composeAt(sources, names, gh) {
  const N = W * gh;
  const g = new Array(N).fill(null);
  for (const n of names) {
    const z0 = Art.LAYER_Z[n];
    for (const { layer, dx, dy } of sources[n] || []) {
      const { idx, px } = layer;
      for (let k = 0; k < idx.length; k++) {
        const x = (idx[k] % W) + dx, y = ((idx[k] / W) | 0) + dy;
        if (x < 0 || x >= W || y < 0 || y >= gh) continue;
        const i = y * W + x, p = px[k], z = z0 + (p.z || 0), cur = g[i];
        if (!cur || cur.z <= z) g[i] = { ...p, z, layer: n };
      }
    }
  }
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= gh ? null : g[y * W + x]);
  const out = g.map((p, i) => {
    if (!p || !p.o || (p.f && !p.s)) return p;
    const x = i % W, y = (i / W) | 0;
    const n = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)];
    if (n.some((q) => !q)) return { ...p, t: 'deep' };
    if (n.some((q) => q.z < p.z - 0.01 && q.layer !== p.layer && !FACE[q.layer] && q.layer !== 'glasses')) {
      return { ...p, t: p.t === 'shade' || p.t === 'deep' ? 'deep' : 'shade' };
    }
    return p;
  });
  return out.map((p, i) => {
    if (!p || !p.f || !p.o) return p;
    const x = i % W, y = (i / W) | 0;
    const n = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, c]) => (a < 0 || c < 0 || a >= W || c >= gh ? null : out[c * W + a]));
    return n.some((q) => !q) ? { ...p, t: 'deep' } : p;
  });
}

// Things the art holds in a hand, drawn loose instead: the check-in pin
// dropping in, and the badge medal falling before it's caught.
function loose(kind, cx, top) {
  const b = layersFor(kind === 'pin' ? { held: 'pin', armL: 'down', armR: 'bent' } : { badge: 'held', armR: 'up' });
  const src = b.layers.held;
  if (!src) return null;
  const xs = src.idx.map((i) => i % W), y0 = Math.min(...src.idx.map((i) => (i / W) | 0));
  return { layer: src, dx: Math.round(cx - (Math.min(...xs) + Math.max(...xs)) / 2), dy: Math.round(top - y0) };
}

// What a wardrobe tile shows when it draws one item alone.
function onlyLayers(id) {
  if (!id) return null;
  if (Art.HATS.includes(id)) return ['hat'];
  if (Art.GLASSES.includes(id)) return ['glasses'];
  if (Art.HELD_ITEMS.includes(id)) return ['held'];
  if (Art.EFFECTS.includes(id)) return ['fx', 'fxBack'];
  if (id === 'trainers') return ['footL', 'footR'];
  if (id === 'scarf' || id === 'backpack') return ['mode', 'packBack'];
  if (HAIR_NAMES[id]) return ['hairBack', 'hairFront'];
  if (PICK_TOPS.includes(id)) return ['body', 'armL', 'armR'];
  return null; // a costume is the whole figure
}

const GRIDS = new Map();
// Finished pixels, shared by colour, so cached frames stay small too.
const COLOURS = new Map();
const colour = (c) => {
  const k = (c[0] << 16) | (c[1] << 8) | c[2];
  let o = COLOURS.get(k);
  if (!o) { o = { c }; COLOURS.set(k, o); }
  return o;
};
const NEUTRAL = {};

/**
 * One frame as a grid of { c: [r,g,b] } or null: 64 x 80, or with `room`
 * 64 x (80 + 14) with the headroom on top (the live avatar).
 * `fr` is a frame from toFrame; `only` draws one item for a wardrobe tile.
 */
export function build(look0, fr = NEUTRAL, only = null, { fxFrame = 0, room = false } = {}) {
  const look = look0.v === 3 ? look0 : normaliseLook(look0);
  const a = artLook(look, fr, { fxFrame });
  const b = layersFor(a);
  const top = room ? TOP : 0, gh = H + top;
  const root = [(fr.rootDX || 0) * OFF, (fr.rootDY || 0) * OFF + top];
  const body = [root[0], root[1] + (fr.bodyDY || 0) * OFF];
  const head = [body[0] + (fr.headDX || 0) * OFF, body[1] + (fr.headDY || 0) * OFF];
  const off = {
    root, body, head, hair: [head[0], head[1] + (fr.hairLag || 0) * OFF],
    glasses: a.glassesUp ? [head[0], head[1] - 9] : head,
    footL: root, footR: [root[0], root[1] + (fr.walk == null && fr.footR ? fr.footR[1] * OFF : 0)],
  };
  const pin = fr.prop && fr.prop[0] === 'pin' && fr.prop[1] !== 'hand' ? fr.prop : null;
  const falling = fr.badge === 'falling';
  const key = JSON.stringify([a, off, gh, look.colors, only, pin, falling && fr.badgeY]);
  const hit = GRIDS.get(key);
  if (hit) return hit;

  const sources = {};
  for (const [name, layer] of Object.entries(b.layers)) {
    const [dx, dy] = off[GROUP[name] || 'root'];
    (sources[name] ||= []).push({ layer, dx, dy });
  }
  // Loose things are placed on the root, after anything held in a hand.
  for (const e of [
    pin && loose('pin', pin[1] * SX + 2, pin[2] * SY),
    falling && loose('medal', 26 * SX + 2, (fr.badgeY ?? 3) * SY),
  ]) if (e) (sources.held ||= []).push({ layer: e.layer, dx: e.dx + root[0], dy: e.dy + root[1] });

  const colors = { ...Art.DEFAULT_COLORS, ...look.colors, ...(b.look.colors || {}) };
  const names = onlyLayers(only) || Z_ORDER;
  const grid = composeAt(sources, Z_ORDER.filter((n) => names.includes(n)), gh)
    .map((p) => (p ? colour(Art.colourOf(p, colors)) : null));
  GRIDS.set(key, grid);
  if (GRIDS.size > 48) GRIDS.delete(GRIDS.keys().next().value);
  return grid;
}

// Whole device pixels per art pixel, so a fractional CSS size stays crisp.
// Stills round down, so a tile's art never outgrows the box it was sized for.
export function deviceCell(cell, dpr = Math.min(3, globalThis.devicePixelRatio || 1), round = Math.round) {
  return Math.max(1, round(cell * dpr));
}

export const CROP = { head: [6, 0, 52, 50], upper: [0, 0, 64, 62], body: [6, 44, 52, 30], held: [30, 40, 32, 32], shoes: [10, 66, 44, 14] };

/** Draws one still frame: the whole avatar, or `only` one item, optionally as a flat silhouette. */
export function drawStill(canvas, look, opts = {}) {
  // Stills show an effect at its second frame, where every effect is in full swing.
  const grid = build(look, toFrame({ ...(opts.face || {}) }, { still: false }), opts.only || null, { fxFrame: opts.fxFrame ?? 1 });
  let s = opts.scale || 3;
  let crop = opts.crop || [0, 0, W, H];
  if (opts.fit) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    grid.forEach((p, i) => { if (!p) return; const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    if (x1 >= 0) { crop = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; s = Math.max(0.5, Math.min(opts.fit[0] / crop[2], opts.fit[1] / crop[3])); }
  }
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const d = deviceCell(s, dpr, Math.floor);
  canvas.width = crop[2] * d; canvas.height = crop[3] * d;
  canvas.style.width = `${(crop[2] * d) / dpr}px`; canvas.style.height = `${(crop[3] * d) / dpr}px`;
  const g = canvas.getContext('2d');
  const sil = opts.silhouette ? hex(opts.silhouette) : null;
  for (let y = crop[1]; y < crop[1] + crop[3]; y++) for (let x = crop[0]; x < crop[0] + crop[2]; x++) {
    const p = grid[y * W + x]; if (!p) continue;
    const c = sil || p.c;
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    g.fillRect((x - crop[0]) * d, (y - crop[1]) * d, d, d);
  }
  return canvas;
}

/** Paints one frame onto any 2D context at whole-pixel scale `s` (the share card). */
export function paintAvatar(g, look, x0, y0, s, face = {}) {
  const grid = build(normaliseLook(look), toFrame({ eyes: 'open', mouth: 'smile', blush: 1, ...face }, { still: false }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = grid[y * W + x]; if (!p) continue;
    g.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
    g.fillRect(Math.round(x0 + x * s), Math.round(y0 + y * s), s, s);
  }
  return { w: W * s, h: H * s };
}

/* ================= the map sprite =================
   At map scale the full avatar would be a smudge, so the art's 16 x 22
   walker follows the route: four frames, mirrored for walking left. */

export function mini(look0, frame = 0) {
  const look = normaliseLook(look0);
  const a = { hair: look.hair, top: look.top, glasses: look.glasses };
  if (look.hat) a.hat = look.hat;
  if (look.costume) a.costume = look.costume;
  const colors = { ...Art.DEFAULT_COLORS, ...look.colors, ...(Art.normalizeArt(a).colors || {}) };
  return Art.mini(a, frame).map((p) => (p ? { c: Art.colourOf(p, colors) } : null));
}

export function drawMini(canvas, look, { frame = 0, flip = false, scale = 2 } = {}) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const d = deviceCell(scale, dpr);
  canvas.width = MW * d; canvas.height = MH * d;
  canvas.style.width = `${(MW * d) / dpr}px`; canvas.style.height = `${(MH * d) / dpr}px`;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  mini(look, frame).forEach((p, i) => {
    if (!p) return;
    const x = i % MW, y = (i / MW) | 0;
    g.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
    g.fillRect((flip ? MW - 1 - x : x) * d, y * d, d, d);
  });
  return canvas;
}

/* ================= animation ================= */
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
    K(2, { armR: 'bent', prop: ['cup', 'hand'], mouth: 'flat' }),
    K(3, { armR: 'sip', prop: ['cup', 'hand'], mouth: 'ooh' }),
    K(5, { armR: 'sip', prop: ['cup', 'hand'], eyes: 'content', headDY: -1 }),
    K(2, { armR: 'bent', prop: ['cup', 'hand'], eyes: 'wide', mouth: 'ooh' }),
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
  // The art fills the grid to its top edge, so the pin drops in beside the head.
  checkin: [
    K(2, { eyes: 'lookR', mouth: 'ooh', prop: ['pin', 26, -5] }),
    K(2, { eyes: 'lookR', mouth: 'ooh', prop: ['pin', 26, -1] }),
    K(2, { eyes: 'wide', mouth: 'ooh', prop: ['pin', 26, 3], squash: 1 }),
    K(3, { armL: 'wave', eyes: 'happy', mouth: 'open', prop: ['pin', 26, 2], blush: 2 }),
    K(3, { armL: 'wave2', eyes: 'happy', mouth: 'open', prop: ['pin', 26, 2], blush: 2 }),
    K(3, { armL: 'wave', eyes: 'wink', mouth: 'smile', prop: ['pin', 26, 2], burst: ['#F06C9B', 10] }),
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
    K(2, { eyes: 'up', mouth: 'ooh', badge: 'falling', badgeY: -2 }),
    K(2, { eyes: 'up', mouth: 'ooh', badge: 'falling', badgeY: 3 }),
    K(3, { armR: 'up', eyes: 'star', mouth: 'wide', blush: 2, badge: 'held', burst: ['#F2C14E', 14] }),
    K(5, { armR: 'up', eyes: 'heart', mouth: 'open', blush: 2, badge: 'held', sparkles: true }),
    K(3, { eyes: 'happy', mouth: 'smile', blush: 2, badge: 'pin' }),
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
    K(3, { armR: 'bent', prop: ['cup', 'hand'], eyes: 'open', brows: 'soft', mouth: 'flat' }),
    K(10, { armR: 'bent', prop: ['cup', 'hand'], eyes: 'puppy', mouth: 'small', blush: 2 }),
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
  walk: [
    K(2, { legWalk: 0, armSwing: 1, headDY: -1 }), K(2, { legWalk: 1, armSwing: -1 }),
    K(2, { legWalk: 0, armSwing: 1, headDY: -1 }), K(2, { legWalk: 1, armSwing: -1 }),
    K(2, { legWalk: 0, armSwing: 1, headDY: -1 }), K(2, { legWalk: 1, armSwing: -1, eyes: 'happy' }),
    K(3, { mouth: 'smile', eyes: 'happy' }),
  ],
  hello: [K(3, { armR: 'wave', mouth: 'open' }), K(3, { armR: 'wave2', eyes: 'wink', mouth: 'smile', blush: 2 }), K(3, { armR: 'wave', mouth: 'smile' }), K(3, {})],
  // the morning after: sips from the mug, a slow blink, now and then a wave
  sip: [K(6, { headDY: 1, eyes: 'content', mouth: 'small' }), K(12, {})],
  slowblink: [K(2, { eyes: 'half' }), K(4, { eyes: 'closed' }), K(2, { eyes: 'half' }), K(8, {})],
  morningwave: [K(3, { armR: 'wave', eyes: 'happy' }), K(3, { armR: 'wave2', eyes: 'happy' }), K(3, { armR: 'wave' }), K(2, {})],
  // idle fidgets
  weight: [K(6, { rootDX: -1 }), K(8, { rootDX: -1, eyes: 'lookL' }), K(4, {})],
  look: [K(4, { eyes: 'lookL', headDX: -1 }), K(5, { eyes: 'lookL', headDX: -1 }), K(3, {}), K(4, { eyes: 'lookR', headDX: 1 }), K(4, {})],
  tap: [K(2, { legTap: 1 }), K(2, {}), K(2, { legTap: 1 }), K(2, {}), K(2, { legTap: 1 }), K(2, {})],
  yawn: [K(3, { mouth: 'ooh', eyes: 'sleepy' }), K(6, { mouth: 'wide', eyes: 'closed', headDY: -1, armL: 'up', brows: 'soft' }), K(3, { mouth: 'small', eyes: 'sleepy' }), K(3, {})],
  fan: [K(3, { armR: 'wave', mouth: 'ooh', eyes: 'half' }), K(3, { armR: 'wave2', mouth: 'ooh', eyes: 'half' }), K(3, { armR: 'wave', mouth: 'ooh', eyes: 'half' }), K(3, { armR: 'wave2', eyes: 'half' }), K(2, {})],
  hum: [K(4, { eyes: 'content', mouth: 'cat', headDX: -1, note: true }), K(4, { eyes: 'content', mouth: 'cat', headDX: 1 }), K(4, { eyes: 'content', mouth: 'cat', headDX: -1, note: true }), K(4, { eyes: 'content', mouth: 'cat' })],
};
export const ANIMATIONS = Object.keys(ANIM);

// Moods set the resting face and which fidgets play between actions.
const MOODS = {
  Fresh: { base: { eyes: 'open', mouth: 'smile', blush: 1 }, idle: ['weight', 'look', 'tap', 'hum', 'hello'], every: [36, 72] },
  Thirsty: { base: { eyes: 'half', mouth: 'flat', blush: 0 }, idle: ['fan', 'look', 'weight'], every: [30, 60] },
  Sleepy: { base: { eyes: 'sleepy', mouth: 'small', blush: 1 }, idle: ['yawn', 'weight'], every: [34, 64] },
  Buzzing: { base: { eyes: 'open', mouth: 'cat', blush: 2 }, idle: ['tap', 'dance', 'hum'], every: [22, 44] },
  Morning: { base: { eyes: 'open', mouth: 'small', blush: 1 }, idle: ['sip', 'slowblink', 'sip', 'sip', 'morningwave'], every: [6, 14] },
};

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A keyframe state (the animation vocabulary) as the frame build() draws.
 * `still` allows breathing; `hairPrev` is last frame's head height, so the
 * hair can trail by a pixel; `lid` is the blink.
 */
export function toFrame(st, { tick = 0, lid = 0, hairPrev = null, still = true } = {}) {
  const ph = tick % 40;
  // Breathing: shoulders then head rise a pixel, unless a frame moves them.
  const breathHead = still && ph >= 6 && ph < 26 ? -1 : 0;
  const sink = st.squash || st.legBend ? 1 : 0;
  const headDY = (st.headDY || 0) + breathHead;
  const bodyDY = (st.torsoDY || 0) + sink;
  // Hair trails the head by a frame, a pixel at most.
  const headY = (st.rootDY || 0) + bodyDY + headDY;
  const hairLag = hairPrev == null ? 0 : Math.max(-1, Math.min(1, hairPrev - headY));

  // Blinks swap in the heavy and shut eyes for open-eyed expressions.
  const eyesName = st.eyes || 'open';
  const lookup = LOOK[eyesName] || LOOK.open;
  let e = lookup.e;
  if (lid && (e === 'open' || e === 'lookL' || e === 'lookR' || e === 'puppy')) e = lid >= 1 ? 'shut' : 'heavy';
  const brows = st.brows ? (st.brows === 'normal' ? 'soft' : st.brows) : (lookup.b || 'soft');
  const face = { eyes: e, mouth: st.mouth || 'smile', brows, blush: (st.blush ?? 1) > 1, blink: lid > 0, glassesUp: BIG_EYES.has(eyesName) };

  return {
    rootDX: st.rootDX || 0, rootDY: st.rootDY || 0, bodyDY, headDX: st.headDX || 0, headDY, hairLag, headY,
    footL: [st.legWalk === 0 ? -1 : 0, 0], footR: [st.legWalk === 1 ? 1 : 0, st.legTap ? -1 : 0],
    walk: st.legWalk ?? null, bend: !!st.legBend,
    armL: st.armL || 'down', armR: st.armR || 'down', armSwing: st.armSwing || 0,
    prop: st.prop || null, badge: st.badge || null, badgeY: st.badgeY, sparkles: !!st.sparkles,
    face, zzz: !!st.zzz, tapGlass: !!st.tapGlass,
  };
}

// Exposed for verification: every keyframe of every animation.
// Every art pose the named reactions use, each effect frame included.
function posesFor(look, mood, names) {
  const fxs = look.effect ? [0, 1, 2, 3] : [0];
  return names.flatMap((name) => ANIM[name].flatMap(([, st]) => {
    const fr = toFrame({ ...MOODS[mood].base, ...st }, { still: false });
    return fxs.map((fxFrame) => artLook(look, fr, { fxFrame }));
  }));
}

/** Builds the reactions' poses now (the live avatar does this in idle time). */
export function warmPoses(look, mood, names) {
  posesFor(normaliseLook(look), mood, names).forEach(layersFor);
}

export const __ANIM = ANIM;
export const __MOODS = MOODS;

/* ================= an avatar on screen ================= */

// Calmer avatar (Settings, Accessibility): idle moves come a third as often
// and skip the bouncier ones. Reactions to what you log still play.
let calm = false;
export const setAvatarCalm = (on) => { calm = !!on; };
const LIVELY = new Set(['dance', 'hello', 'tap']);
const WARM = ['drink', 'water', 'food', 'checkin', 'cheer', 'start', 'badge', 'end'];

export function createAvatar({ cell = 1.5, look = DEFAULT_LOOK, onTap = null, label = 'Your avatar' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'avatar';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const g = canvas.getContext('2d');

  const me = {
    look: normaliseLook(look), mood: 'Fresh', face: null,
    cur: null, queue: [], tick: 0, acc: 0, lastTs: 0,
    idleIn: 30, blinkIn: 30, blinkStep: 0, lid: 0,
    sparks: [], hairPrev: null, running: false, pokes: [],
  };

  // `cell` is CSS pixels per art pixel and may be fractional (1.5 on the live
  // screen); `d` is whole device pixels per art pixel, so every pixel is crisp.
  let d = 1;
  function size(c) {
    cell = c;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    d = deviceCell(cell, dpr);
    canvas.width = W * d;
    canvas.height = LIVE_H * d;
    canvas.style.width = `${(W * d) / dpr}px`;
    canvas.style.height = `${(LIVE_H * d) / dpr}px`;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
  }
  size(cell);

  function frame() {
    const f = me.cur ? me.cur.frames[me.cur.i][1] : {};
    const st = { ...MOODS[me.mood].base, ...(me.face || {}), ...f };
    const fr = toFrame(st, { tick: me.tick, lid: me.lid, hairPrev: me.hairPrev, still: !('headDY' in f) && !('rootDY' in f) && !f.squash && !f.legBend });
    me.hairPrev = fr.headY;
    return fr;
  }

  function enter() {
    const s = me.cur.frames[me.cur.i][1];
    if (reduceMotion()) return;
    if (s.burst) {
      const [color, n] = s.burst;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.45 + Math.random() * 0.8;
        me.sparks.push({ x: 16 * SX, y: 21 * SY, vx: Math.cos(a) * v * SX, vy: (Math.sin(a) * v - 0.3) * SY, life: 0.9, color });
      }
    }
    if (s.note) me.sparks.push({ note: true, x: 25 * SX, y: 7 * SY, vx: 0.15 * SX, vy: -0.45 * SY, life: 1.4, color: '#7EE0C0' });
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
      const pool = calm ? m.idle.filter((k) => !LIVELY.has(k)) : m.idle;
      if (!reduceMotion() && pool.length) {
        const name = pool[Math.floor(Math.random() * pool.length)];
        me.cur = { frames: ANIM[name], i: 0, left: ANIM[name][0][0], idle: true };
        enter();
      }
      me.idleIn = (m.every[0] + Math.random() * (m.every[1] - m.every[0])) * (calm ? 3 : 1);
    }
    me.lid = 0;
    if (me.blinkStep > 0) { me.lid = [0, 0.5, 1, 0.5][me.blinkStep]; me.blinkStep = (me.blinkStep + 1) % 4; }
    else if (--me.blinkIn <= 0) { me.lid = 0.5; me.blinkStep = 2; me.blinkIn = Math.random() < 0.2 ? 5 : 28 + Math.random() * 44; }
    for (const s of me.sparks) { s.x += s.vx; s.y += s.vy; if (!s.note) s.vy += 0.12 * SY; s.life -= 1 / 12; }
  }

  const ZZ = ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'];
  const NOTE = ['.NN', '.N.', 'NN.', 'NN.'];
  // Overlays (impact marks, Zs, sparks, notes) are in the animations' own
  // 32 x 43 units; `u` is one of those units in device pixels.
  function paint() {
    const fr = frame();
    const fx = fxFrame(me.tick, { calm, reduced: reduceMotion() });
    const cells = build(me.look, fr, null, { fxFrame: fx, room: true });
    const u = OFF * d;
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < cells.length; i++) {
      const p = cells[i];
      if (!p) continue;
      g.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
      g.fillRect((i % W) * d, Math.floor(i / W) * d, d, d);
    }
    const at = (x, y) => [Math.round(x * SX) * d, (Math.round(y * SY) + TOP) * d];
    if (fr.tapGlass) {
      // Knocking on the inside of your screen: little impact marks by the hand.
      g.fillStyle = 'rgba(255,255,255,.9)';
      [[29, 30], [30, 29], [30, 33], [31, 33], [29, 36], [30, 37]].forEach(([x, y]) => g.fillRect(...at(x, y), u, u));
    }
    if (fr.zzz) {
      g.fillStyle = '#7EE0C0';
      for (let i = 0; i < 3; i++) {
        const o = ((me.tick / 12) * 0.7 + i * 0.33) % 1, k = i === 2 ? 2 : 1;
        g.globalAlpha = Math.max(0, 1 - o);
        // Each Z on whole art pixels (the last one twice the size), rising and fading.
        // Spaced to keep the big one inside the canvas.
        const [zx, zy] = at(21 + i * 2.5, 9 - o * 8);
        ZZ.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === 'Z') g.fillRect(zx + x * k * d, zy + y * k * d, k * d, k * d);
        }));
      }
      g.globalAlpha = 1;
    }
    me.sparks = me.sparks.filter((sp) => sp.life > 0);
    for (const sp of me.sparks) {
      g.globalAlpha = Math.max(0, Math.min(1, sp.life));
      g.fillStyle = sp.color;
      const sx = Math.round(sp.x) * d, sy = (Math.round(sp.y) + TOP) * d;
      if (sp.note) NOTE.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'N') g.fillRect(sx + x * u, sy + y * u, u, u); }));
      else g.fillRect(sx, sy, u, u);
    }
    g.globalAlpha = 1;
  }

  function loop(ts) {
    // Stops itself when the canvas leaves the page; start() brings it back.
    if (!canvas.isConnected) { me.running = false; return; }
    me.acc += Math.min(250, ts - (me.lastTs || ts));
    me.lastTs = ts;
    let stepped = false;
    while (me.acc >= 1000 / 12) { me.acc -= 1000 / 12; step(); stepped = true; }
    if (stepped) paint();
    requestAnimationFrame(loop);
  }

  // The reactions to logging build their poses ahead of time, a few per idle
  // moment, so the first drink of the night doesn't stutter on a slow phone.
  function warm() {
    const todo = posesFor(me.look, me.mood, WARM);
    const later = globalThis.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 150));
    const go = (dl) => {
      while (todo.length && dl.timeRemaining() > 4) layersFor(todo.shift());
      if (todo.length && canvas.isConnected) later(go);
    };
    later(go);
  }

  function start() {
    paint();
    if (!me.warmed) { me.warmed = true; warm(); }
    if (me.running) return;
    me.running = true;
    me.lastTs = 0;
    me.acc = 0;
    requestAnimationFrame(loop);
  }

  // Tappable avatars are buttons, so they can be reached and pressed without touch.
  if (onTap) {
    canvas.setAttribute('role', 'button');
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } });
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
    /** Holds a resting face (eyes, mouth, brows, blush) until cleared with null. */
    setFace(face) { me.face = face; paint(); },
    // Painted straight away rather than on the next tick, so choices feel instant.
    setLook(look) { me.look = normaliseLook(look); paint(); },
    setCell(c) { if (c !== cell) { size(c); paint(); } },
    get look() { return structuredClone(me.look); },
  };
}

// Shuffle: hair, top and colours from the design's pools. Items stay put.
export function shuffleLook(look) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return {
    ...look,
    hair: pick(HAIRS)[0], top: pick(TOPS)[0],
    colors: {
      ...look.colors, skin: pick(SWATCHES.skin), hair: pick(SWATCHES.hair), eyes: pick(SWATCHES.eyes),
      top: pick(SWATCHES.cloth), bottoms: pick(SWATCHES.cloth),
    },
  };
}
