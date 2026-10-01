// The pixel avatar: a 32 x 43 chibi, recoloured at draw time.
//
// The drawing is Claude Design's round 2 engine (design/round2/designs/
// avatar-draw.js), ported: same shapes, colour slots, derived tones, layer
// order and items. What this file adds is the life. Every part is drawn into
// one of a few groups (root, body, head, hair, feet) and each group can be
// offset per frame, so the head bobs, the hair trails, the body sinks into a
// landing and the feet step. Arms that aren't hanging by the sides are drawn
// from angles, so they can hold a glass, sip, wave or swing.
//
// Everything snaps to whole pixels and steps at 12 frames a second. The loop
// runs on requestAnimationFrame and stops by itself once the canvas leaves the
// page, so a hidden or locked phone spends nothing on it. It never touches
// tracking. The movement brief is design/AVATAR-MOTION.md.

const W = 32, H = 43;

/* ================= the wardrobe ================= */

export const HAIRS = [['short', 'Short'], ['long', 'Long'], ['bun', 'Bun'], ['quiff', 'Quiff'], ['curly', 'Curly'],
  ['scruffy', 'Scruffy'], ['mohawk', 'Mohawk'], ['pigtails', 'Pigtails'], ['bald', 'Bald']];
export const GLASSES = [['none', 'None'], ['round', 'Round'], ['square', 'Square'], ['browline', 'Browline'], ['sun', 'Sunglasses']];
export const TOPS = [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['shirt', 'Shirt'], ['jacket', 'Jacket'], ['dress', 'Dress']];

// Items and the badge that unlocks each. `badge: null` is free from install.
// Nothing unlocks from a drinking badge (design/BADGES-ROUND-2.md).
export const ITEMS = [
  { group: 'Hats' },
  { id: 'cap', slot: 'hat', name: 'Cap', badge: 'early-doors' },
  { id: 'party', slot: 'hat', name: 'Party hat', badge: 'game-on' },
  { id: 'headphones', slot: 'hat', name: 'Headphones', badge: 'no-notes' },
  { id: 'bucket', slot: 'hat', name: 'Bucket hat', badge: 'ringleader' },
  { id: 'cowboy', slot: 'hat', name: 'Cowboy hat', badge: 'long-haul' },
  { id: 'crown', slot: 'hat', name: 'Crown', badge: 'chaos-agent' },
  { group: 'Costumes' },
  { id: 'catears', slot: 'hat', name: 'Cat ears', badge: null },
  { id: 'panda', slot: 'hat', name: 'Panda', badge: 'snack-break' },
  { id: 'dino', slot: 'hat', name: 'Dinosaur', badge: 'big-stomp' },
  { id: 'duck', slot: 'hat', name: 'Duck', badge: 'just-add-water' },
  { id: 'elvis', slot: 'costume', name: 'Elvis', badge: 'pin-cushion' },
  { group: 'Other' },
  { id: 'mug', slot: 'held', name: 'Mug', badge: null },
  { id: 'bottle', slot: 'held', name: 'Water bottle', badge: 'hydro-homie' },
  { id: 'pizza', slot: 'held', name: 'Pizza slice', badge: 'late-bite' },
  { id: 'balloon', slot: 'held', name: 'Balloon', badge: 'anniversary' },
  { id: 'trainers', slot: 'shoes', name: 'Trainers', badge: 'ten-k' },
];
// Sunglasses live in the Glasses tab but unlock like an item.
export const SUNGLASSES_BADGE = 'first-dare';

export const SLOTS = [['skin', 'Skin'], ['hair', 'Hair & brows'], ['eyes', 'Eyes'], ['cheeks', 'Cheeks'],
  ['top', 'Top'], ['bottoms', 'Bottoms'], ['shoes', 'Shoes']];
export const SWATCHES = {
  skin: ['#F6D5BD', '#E8B48F', '#D19A6E', '#A96F45', '#7A4A2A', '#4E2F1C'],
  hair: ['#1E1A18', '#3B2A20', '#7A4B2A', '#C98A4B', '#E6C77A', '#B9B4AE', '#D95B7C', '#4B7BD9'],
  eyes: ['#2B2B2B', '#5B3A24', '#4A7A5C', '#3D6FB0', '#7A6A9E', '#8A8A8A'],
  cheeks: ['#F08A8A', '#F4A6C0', '#E07A5F', '#C85A7A'],
  cloth: ['#EDEDED', '#1E1E1E', '#21764F', '#7EE0C0', '#F06C9B', '#3D6FB0', '#E3B23C', '#8B3A3A'],
};

export const DEFAULT_LOOK = {
  v: 2, hair: 'quiff', top: 'tee', glasses: 'round', hat: null, held: null, costume: null, shoes: 'plain',
  colors: { skin: '#E8B48F', hair: '#3B2A20', eyes: '#4A7A5C', cheeks: '#F08A8A', top: '#21764F', bottoms: '#2D3A4F', shoes: '#EDEDED' },
};

// Looks saved by the first avatar (flat colours, capitalised hair styles) are
// carried over rather than reset, so nobody loses the avatar they made.
export function normaliseLook(saved) {
  if (!saved) return structuredClone(DEFAULT_LOOK);
  if (saved.v === 2) return { ...structuredClone(DEFAULT_LOOK), ...saved, colors: { ...DEFAULT_LOOK.colors, ...saved.colors } };
  const hair = String(saved.style || 'short').toLowerCase();
  return {
    ...structuredClone(DEFAULT_LOOK),
    hair: HAIRS.some(([k]) => k === hair) ? hair : 'short',
    glasses: 'none',
    colors: {
      skin: saved.skin || DEFAULT_LOOK.colors.skin, hair: saved.hair || DEFAULT_LOOK.colors.hair,
      eyes: saved.eye || DEFAULT_LOOK.colors.eyes, cheeks: saved.cheek || DEFAULT_LOOK.colors.cheeks,
      top: saved.top || DEFAULT_LOOK.colors.top, bottoms: saved.legs || DEFAULT_LOOK.colors.bottoms,
      shoes: saved.shoes || DEFAULT_LOOK.colors.shoes,
    },
  };
}

/* ================= colour ================= */

const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const mul = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const ell = (x, y, cx, cy, rx, ry) => { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; return dx * dx + dy * dy <= 1; };
const WHITE = [255, 255, 255];
const GOLD = [232, 182, 74];

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

const EYES = {
  open: ['.DD.', 'DWDD', 'DDDD', 'EEEE', '.EE.'],
  happy: ['....', '....', '.DD.', 'D..D', '....'],
  content: ['....', '....', '....', 'D..D', '.DD.'],
  wide: ['.WW.', 'WWWW', 'WDDW', 'WWWW', '.WW.'],
  puppy: ['.DD.', 'DWDD', 'DDWD', 'DDDD', 'EEEE', '.EE.'],
  heavy: ['....', 'LLLL', 'DWDD', 'EEEE', '.EE.'],
  shut: ['....', '....', '....', 'DDDD', '....'],
  heart: ['.P.P.', 'PPPPP', 'PPPPP', '.PPP.', '..P..'],
  star: ['..S..', '.SSS.', 'SSSSS', '.SSS.', '.S.S.'],
  lookL: ['.DD.', 'WDDD', 'DDDD', 'EEEE', '.EE.'],
  lookR: ['.DD.', 'DDWD', 'DDDD', 'EEEE', '.EE.'],
  lookUp: ['DWDD', 'DDDD', 'DDDD', 'EEEE', '....'],
};
const MOUTHS = {
  smile: [[13, 24, 'M'], [18, 24, 'M'], [14, 25, 'M'], [15, 25, 'M'], [16, 25, 'M'], [17, 25, 'M']],
  cat: [[13, 24, 'M'], [14, 25, 'M'], [15, 24, 'M'], [16, 24, 'M'], [17, 25, 'M'], [18, 24, 'M']],
  open: [[14, 24, 'M'], [15, 24, 'M'], [16, 24, 'M'], [17, 24, 'M'], [14, 25, 'M'], [15, 25, 'T'], [16, 25, 'T'], [17, 25, 'M'], [15, 26, 'M'], [16, 26, 'M']],
  ooh: [[15, 24, 'M'], [16, 24, 'M'], [14, 25, 'M'], [15, 25, 'K'], [16, 25, 'K'], [17, 25, 'M'], [15, 26, 'M'], [16, 26, 'M']],
  wide: [[13, 24, 'M'], [14, 24, 'M'], [15, 24, 'M'], [16, 24, 'M'], [17, 24, 'M'], [18, 24, 'M'], [13, 25, 'M'], [14, 25, 'K'], [15, 25, 'T'], [16, 25, 'T'], [17, 25, 'K'], [18, 25, 'M'], [14, 26, 'M'], [15, 26, 'M'], [16, 26, 'M'], [17, 26, 'M']],
  flat: [[14, 25, 'M'], [15, 25, 'M'], [16, 25, 'M'], [17, 25, 'M']],
  small: [[15, 25, 'M'], [16, 25, 'M']],
};
const BROWS = {
  soft: [[10, 15], [11, 15], [12, 15], [19, 15], [20, 15], [21, 15]],
  raised: [[10, 14], [11, 13], [12, 13], [19, 13], [20, 13], [21, 14]],
  determined: [[10, 14], [11, 15], [12, 15], [19, 15], [20, 15], [21, 14]],
  happy: [[10, 15], [11, 14], [12, 15], [19, 15], [20, 14], [21, 15]],
};

// The animation vocabulary (AVATAR-MOTION.md) mapped onto the drawn eyes.
const LOOK = {
  open: { e: 'open' }, lookL: { e: 'lookL' }, lookR: { e: 'lookR' }, up: { e: 'lookUp', b: 'raised' },
  half: { e: 'heavy' }, sleepy: { e: 'heavy' }, determined: { e: 'open', b: 'determined' },
  puppy: { e: 'puppy', b: 'raised' }, wide: { e: 'wide', b: 'raised' }, happy: { e: 'happy', b: 'happy' },
  content: { e: 'content', b: 'happy' }, closed: { e: 'shut' }, heart: { e: 'heart', b: 'raised' },
  star: { e: 'star', b: 'raised' }, wink: { e: 'wink', b: 'happy' },
};
// Sunglasses hide the eyes, so for the big reactions they go up on the head.
const BIG_EYES = new Set(['heart', 'star', 'wide', 'puppy']);

/* ================= building a frame ================= */

const Z = { hairBack: 0, shoes: 1, bottoms: 1.1, top: 1.2, touch: 1.25, arm: 1.3, neck: 1.05, head: 2, face: 3, hair: 4, glasses: 5, hat: 6, held: 7, lift: 4.5 };
const LONG_SLEEVES = new Set(['hoodie', 'jacket', 'jumpsuit', 'pyjamas']);
// Upper arm and forearm angles in degrees for the right arm; the left mirrors.
const POSE = { down: [80, 95], out: [25, 60], bent: [100, 200], sip: [125, 245], wave: [-15, -80], wave2: [-15, -45] };
const SHOULDER = { L: [9.2, 29.8], R: [22.8, 29.8] };

// Props our reactions hold. Pixel maps in the design's outline style.
const PROPS = {
  // Sized for the round 2 head, which is much bigger than the first avatar's.
  glass: { m: ['G....G', 'GFFFFG', 'GllllG', 'GllllG', 'GllllG', 'GllllG', 'GllllG', '.GGGG.'], c: { G: [169, 182, 190], F: [244, 239, 226], l: [232, 163, 61] } },
  cup: { m: ['G...G', 'GlllG', 'GlllG', 'GlllG', 'GlllG', 'GlllG', '.GGG.'], c: { G: [169, 182, 190], l: [142, 211, 250] } },
  food: { m: ['..BBBB..', '.BsBBsB.', 'BBBBBBBB', 'gggggggg', 'PPPPPPPP', '.BBBBBB.'], c: { B: [217, 154, 78], s: [246, 227, 180], g: [108, 196, 108], P: [107, 59, 42] } },
  pin: { m: ['.AAA.', 'AAAAA', 'AAWAA', 'AAAAA', '.AAA.', '..A..', '..A..'], c: { A: [240, 108, 155], W: WHITE } },
};

const NEUTRAL = {};

/**
 * One frame as a 32 x 43 grid of { c: [r,g,b] } or null.
 * `fr` is the frame: offsets, arms, face, props. `only`/`silhouette` are for
 * the wardrobe tiles, which draw a single item.
 */
export function build(look0, fr = NEUTRAL, only = null) {
  let look = look0;
  if (look0.costume === 'elvis') look = { ...look0, hair: 'elvis', glasses: 'aviator', top: 'jumpsuit', colors: { ...look0.colors, hair: '#16141C', top: '#F2F0EA', bottoms: '#F2F0EA' } };
  const g = new Array(W * H).fill(null);
  const C = {};
  Object.keys(look.colors).forEach((k) => (C[k] = hex(look.colors[k])));
  const costumeParts = look.costume ? ['hair', 'hairBack', 'top', 'bottoms', 'glasses'] : [];

  // Group offsets. `O` is the one in force while a section draws; get() and
  // set() both read through it, so every rule below works in the part's own
  // coordinates exactly as designed.
  const root = [fr.rootDX || 0, fr.rootDY || 0];
  const body = [root[0], root[1] + (fr.bodyDY || 0)];
  const headO = [body[0] + (fr.headDX || 0), body[1] + (fr.headDY || 0)];
  const hairO = [headO[0], headO[1] + (fr.hairLag || 0)];
  let O = root;
  const raw = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : g[y * W + x]);
  const set = (x, y, c, part, outline = true, tag) => {
    x += O[0]; y += O[1];
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const t = costumeParts.includes(part) && part !== 'face' ? look.costume : (tag || part);
    if (only && only !== t) return;
    g[y * W + x] = { c, z: Z[part], part, outline };
  };
  const get = (x, y) => raw(x + O[0], y + O[1]);

  const hat = look.hat || null;
  const hood = hat === 'duck' || hat === 'dino' || hat === 'panda';
  const hatClip = { cap: 11, bucket: 11, cowboy: 10, nightcap: 9 }[hat] || -1;
  const hs = look.hair;
  const top = look.top || 'tee';
  const longSleeve = LONG_SLEEVES.has(top);

  // What the frame's arms are doing decides which held items can show.
  const armL = fr.armL || 'down', armR = fr.armR || 'down';
  const armsBusy = armL !== 'down' || armR !== 'down' || !!fr.armSwing;
  // The mug is two-handed, but the right hand can let go of it to wave.
  const held = look.held === 'mug' ? (armL !== 'down' || fr.armSwing ? null : 'mug') : (armR !== 'down' || fr.prop || fr.armSwing ? null : look.held);
  const oneHand = held === 'mug' && armR !== 'down';

  // hair back
  O = hairO;
  if (!hood && hs === 'long') {
    for (let y = 9; y <= 34; y++) for (let x = 3; x <= 28; x++) {
      if (y >= 32 && (x < 5 || x > 26)) continue;
      if (y > 20 && x > 7 && x < 24) continue;
      set(x, y, mul(C.hair, .88), 'hairBack');
    }
  }
  if (!hood && hs === 'bun' && hatClip < 0 && hat !== 'party') {
    for (let y = 0; y <= 8; y++) for (let x = 11; x <= 21; x++) if (ell(x, y, 16, 4.2, 4.6, 4.2)) set(x, y, C.hair, 'hair');
  }

  // body
  O = body;
  if (top === 'pyjamas') C.bottoms = C.top;
  for (let y = 27; y <= 29; y++) for (let x = 14; x <= 17; x++) set(x, y, C.skin, 'neck');
  if (top === 'hoodie') for (let y = 27; y <= 29; y++) for (let x = 10; x <= 21; x++) if (!(x >= 14 && x <= 17 && y === 29)) set(x, y, mul(C.top, .8), 'top');
  if (top === 'jumpsuit') {
    [[24, [5, 5]], [25, [5, 6]], [26, [5, 7]], [27, [6, 8]], [28, [7, 9]], [29, [8, 10]]].forEach(([y, [a, b]]) => { for (let x = a; x <= b; x++) { set(x, y, C.top, 'top'); set(31 - x, y, C.top, 'top'); } });
  }
  if (top === 'dress') {
    for (let y = 29; y <= 33; y++) for (let x = 11; x <= 20; x++) set(x, y, C.top, 'top');
    for (let y = 29; y <= 30; y++) for (const x of [8, 9, 10, 21, 22, 23]) set(x, y, mix(C.top, WHITE, .14), 'top');
    for (let y = 31; y <= 35; y++) for (const x of [8, 9, 22, 23]) set(x, y, C.skin, 'arm');
    const skirt = { 34: [10, 21], 35: [10, 21], 36: [9, 22], 37: [9, 22], 38: [8, 23] };
    Object.entries(skirt).forEach(([y, [a, b]]) => { for (let x = a; x <= b; x++) set(x, +y, C.top, 'top'); });
    for (const x of [12, 13, 18, 19]) set(x, 39, C.skin, 'arm');
  } else {
    for (let y = 29; y <= 36; y++) { const x0 = y === 29 ? 11 : 10, x1 = y === 29 ? 20 : 21; for (let x = x0; x <= x1; x++) set(x, y, C.top, 'top'); }
    const sleeveEnd = longSleeve ? 34 : 32;
    for (let y = 29; y <= sleeveEnd; y++) for (const x of [8, 9, 22, 23]) set(x, y, C.top, 'top');
    if (top === 'jumpsuit') for (const x of [7, 24]) set(x, 34, C.top, 'top');
    for (let y = sleeveEnd + 1; y <= sleeveEnd + 2; y++) for (const x of [8, 9, 22, 23]) set(x, y, C.skin, 'arm');
    for (let y = 37; y <= 39; y++) for (let x = 11; x <= 20; x++) { if (y === 39 && (x === 15 || x === 16)) continue; set(x, y, C.bottoms, 'bottoms'); }
    if (top === 'jumpsuit') { set(10, 39, C.bottoms, 'bottoms'); set(21, 39, C.bottoms, 'bottoms'); }
  }

  // shoes, each foot on its own so the feet can step and tap
  const feet = { L: fr.footL || [0, 0], R: fr.footR || [0, 0] };
  const st = look.shoes === 'trainers' ? 'trainers' : 'shoes';
  for (let y = 40; y <= 42; y++) {
    const l = y === 40 ? [11, 14] : [10, 14], r = y === 40 ? [17, 20] : [17, 21];
    O = [root[0] + feet.L[0], root[1] + feet.L[1]];
    for (let x = l[0]; x <= l[1]; x++) set(x, y, C.shoes, 'shoes', true, st);
    O = [root[0] + feet.R[0], root[1] + feet.R[1]];
    for (let x = r[0]; x <= r[1]; x++) set(x, y, C.shoes, 'shoes', true, st);
  }
  O = body;
  if (!only || only === look.costume || only === 'hair' || only === 'top') {
    if (top === 'hoodie') { [[14, 31], [14, 32], [17, 31], [17, 32]].forEach(([x, y]) => set(x, y, mix(C.top, WHITE, .55), 'top', false)); for (let x = 12; x <= 19; x++) set(x, 35, mul(C.top, .82), 'top', false); }
    if (top === 'shirt') { [[13, 29], [14, 30], [18, 29], [17, 30]].forEach(([x, y]) => set(x, y, mix(C.top, WHITE, .6), 'top', false)); [31, 33, 35].forEach((y) => set(15, y, mul(C.top, .7), 'top', false)); }
    if (top === 'jacket') { for (let y = 29; y <= 36; y++) for (const x of [15, 16]) set(x, y, [232, 230, 225], 'top', false); [[14, 29], [14, 30], [17, 29], [17, 30]].forEach(([x, y]) => set(x, y, mul(C.top, .75), 'top', false)); }
    if (top === 'dress') {
      [[14, 29], [15, 29], [16, 29], [17, 29], [15, 30], [16, 30]].forEach(([x, y]) => set(x, y, C.skin, 'top', false));
      for (let x = 11; x <= 20; x++) set(x, 33, mul(C.top, .72), 'top', false);
      for (let y = 35; y <= 37; y++) for (const x of [12, 15, 16, 19]) if ((y + x) % 2) set(x, y, mul(C.top, .84), 'top', false);
      for (let x = 9; x <= 22; x += 2) set(x, 38, mix(C.top, WHITE, .3), 'top', false);
    }
    if (top === 'jumpsuit') {
      [[14, 29], [15, 29], [16, 29], [17, 29], [15, 30], [16, 30], [15, 31], [16, 31]].forEach(([x, y]) => set(x, y, C.skin, 'top', false));
      [[12, 30], [19, 30], [13, 32], [18, 32], [12, 34], [19, 34], [8, 34], [23, 34], [9, 34], [22, 34]].forEach(([x, y]) => set(x, y, GOLD, 'top', false));
      for (let x = 10; x <= 21; x++) set(x, 36, x === 15 || x === 16 ? [255, 222, 140] : GOLD, 'top', false);
      [[12, 38], [19, 38], [11, 39], [20, 39]].forEach(([x, y]) => set(x, y, GOLD, 'bottoms', false));
    }
  }

  // Mode touches: one small thing for the kind of adventure, worn over the
  // look without replacing anything chosen or unlocked. Arms, held items and
  // props draw after, so they sit in front.
  const touch = only ? null : look.touch;
  if (touch === 'day') {
    // a camera on a neck strap
    const strap = [44, 44, 50], cam = [58, 58, 66], ring = [150, 152, 162], lens = [96, 150, 204];
    for (let y = 29; y <= 31; y++) { set(13, y, strap, 'touch', false); set(18, y, strap, 'touch', false); }
    for (let y = 32; y <= 35; y++) for (let x = 12; x <= 19; x++) set(x, y, cam, 'touch');
    [[14, 33], [17, 33], [14, 34], [17, 34], [15, 32], [16, 32], [15, 35], [16, 35]].forEach(([x, y]) => set(x, y, ring, 'touch', false));
    [[15, 33], [16, 33], [15, 34], [16, 34]].forEach(([x, y]) => set(x, y, lens, 'touch', false));
    set(15, 33, mix(lens, WHITE, .6), 'touch', false);
    set(18, 32, [226, 226, 214], 'touch', false);
  }
  if (touch === 'walk') {
    // backpack straps, with a strap across the chest
    const strap = [206, 112, 48], clip = [236, 232, 220];
    for (let y = 29; y <= 36; y++) for (const x of [11, 12, 19, 20]) set(x, y, x === 12 || x === 19 ? mul(strap, 1.12) : strap, 'touch');
    for (let x = 13; x <= 18; x++) set(x, 33, mul(strap, .9), 'touch', false);
    [[15, 33], [16, 33]].forEach(([x, y]) => set(x, y, clip, 'touch', false));
  }
  if (touch === 'festival' && armL === 'down' && !fr.armSwing && top !== 'dress') {
    // a wristband on the left wrist, while that arm hangs down
    const y = (longSleeve ? 34 : 32) + 1;
    set(8, y, [255, 206, 72], 'touch', false);
    set(9, y, [168, 112, 240], 'touch', false);
  }

  // head
  O = headO;
  for (let y = 5; y <= 29; y++) for (let x = 3; x <= 28; x++) if (ell(x, y, 16, 17.5, 12.5, 11.6)) set(x, y, C.skin, 'head');

  // hair front
  const J = (x, arr) => arr[((x % arr.length) + arr.length) % arr.length];
  const fringe = (x) => {
    if (hs === 'bun') return 10 + (x > 12 && x < 20 ? 0 : J(x, [0, 1, 1, 0]));
    if (hs === 'quiff') return x >= 17 && x <= 24 ? 10 : 9;
    if (hs === 'curly') return 10 + J(x, [0, 1, 2, 1]);
    if (hs === 'scruffy') return 11 + J(x, [1, 0, 2, 1, 0, 2, 1, 1, 0, 2]);
    if (hs === 'mohawk') return 8;
    if (hs === 'pigtails') return 10 + (x === 15 || x === 16 ? -1 : J(x, [0, 1, 0, 1]));
    if (hs === 'elvis') return 10;
    return 11 + J(x, [0, 1, 1, 0, 1, 0, 0, 1]);
  };
  const faceMask = (x, y) => y > fringe(x) && ell(x, y, 16, 19.8, 9.6, 9.8);
  const Q = { 0: [16, 22], 1: [12, 24], 2: [9, 25], 3: [7, 26], 4: [6, 26], 5: [5, 26], 6: [4, 27], 7: [4, 27], 8: [4, 27] };
  const hairOn = (x, y) => {
    const inCap = ell(x, y, 16, 16.5, 13.6, 12.6);
    const base = inCap && y <= fringe(x);
    const sides = (lim) => inCap && (x <= 6 || x >= 25) && y <= lim;
    switch (hs) {
      case 'short': return base || sides(17);
      case 'long': return base || sides(26) || ((x === 3 || x === 28) && y >= 14 && y <= 26);
      case 'bun': return base || sides(16);
      case 'quiff': { const q = Q[y]; return (q && x >= q[0] && x <= q[1]) || base || (inCap && (x <= 5 || x >= 26) && y <= 14); }
      case 'curly': {
        const vol = ell(x, y, 16, 14, 15.8, 12.6) && y <= 23;
        if (!vol) return false;
        const rim = !ell(x, y, 16, 14, 14.4, 11.3);
        if (rim && (x + y) % 3 === 0) return false;
        return y <= fringe(x) || x <= 6 || x >= 25;
      }
      case 'scruffy': {
        const spikes = { 6: 5, 8: 3, 9: 4, 11: 2, 13: 2, 14: 1, 17: 1, 18: 2, 20: 2, 22: 3, 23: 4, 25: 5 };
        if (spikes[x] !== undefined && y >= spikes[x] && y <= 9) return true;
        if ((x === 3 && y === 12) || (x === 28 && y === 13)) return true;
        return base || (inCap && (x <= 6 || x >= 25) && y <= 17 + J(x, [0, 1, -1]));
      }
      case 'mohawk': {
        const tops = { 10: 6, 11: 4, 12: 2, 13: 1, 14: 0, 15: 0, 16: 0, 17: 0, 18: 1, 19: 2, 20: 4, 21: 6 };
        return x >= 10 && x <= 21 && y >= tops[x] && y <= (x >= 12 && x <= 19 ? 10 : 8);
      }
      case 'pigtails': {
        if (ell(x, y, 2.6, 19.5, 3.3, 3.6) || ell(x, y, 29.4, 19.5, 3.3, 3.6)) return true;
        return base || sides(17);
      }
      case 'elvis': return (ell(x, y, 15.5, 5.8, 11.6, 5.6) && y <= 10) || base || (((x >= 4 && x <= 6) || (x >= 25 && x <= 27)) && y <= 23 && ell(x, y, 16, 17, 13.8, 13.4));
    }
    return false;
  };
  if (!hood && hs !== 'bald') {
    O = hairO;
    for (let y = 0; y <= 27; y++) for (let x = 0; x < W; x++) {
      if (faceMask(x, y)) continue;
      if (!hairOn(x, y)) continue;
      if (y < hatClip && x >= 2 && x <= 29) continue;
      set(x, y, C.hair, 'hair');
    }
    if (!only || only === look.costume || only === 'hair' || only === 'top') {
      const recol = (pts, fn) => pts.forEach(([x, y]) => { const p = get(x, y); if (p && p.part === 'hair') { p.c = fn(p.c); p.outline = false; } });
      const shine = (c) => mix(c, WHITE, .32);
      if (hs === 'quiff') {
        for (let y = 1; y <= 7; y++) for (let x = 6; x <= 25; x++) if (y >= 2 && (x - 2 * y) % 9 === 0) recol([[x, y]], (c) => mul(c, .78));
        recol([[12, 2], [13, 2], [14, 1], [15, 1]], shine);
      } else if (hs === 'curly') {
        for (let y = 2; y <= 22; y++) for (let x = 1; x < 31; x++) if ((x * 3 + y * 5) % 11 === 0) { recol([[x, y]], (c) => mul(c, .78)); recol([[x + 1, y]], (c) => mul(c, .86)); }
      } else if (hs === 'mohawk') {
        O = headO;
        for (let y = 6; y <= 12; y++) for (let x = 4; x <= 27; x++) if ((x < 10 || x > 21) && ell(x, y, 16, 16.5, 12.4, 11.4) && y <= 11) { const p = get(x, y); if (p && p.part === 'head') p.c = mix(C.skin, C.hair, .16); }
        O = hairO;
        recol([[14, 2], [14, 3], [15, 1], [15, 2]], shine);
      } else if (hs === 'pigtails') {
        const tie = [240, 108, 155];
        [[5, 18], [5, 19], [5, 20], [26, 18], [26, 19], [26, 20]].forEach(([x, y]) => { const p = get(x, y); if (p && p.part === 'hair') { p.c = tie; p.outline = false; } });
        recol([[9, 7], [10, 6], [20, 6], [21, 7]], shine);
        recol([[16, 4], [16, 5], [16, 6], [16, 7], [15, 8]], (c) => mul(c, .7));
      } else if (hs === 'elvis') {
        recol([[8, 4], [9, 3], [10, 2], [11, 2], [12, 1], [13, 1]], (c) => mix(c, [120, 140, 190], .5));
        recol([[14, 9], [15, 8], [16, 9]], (c) => mul(c, .6));
      } else {
        recol([[9, 8], [10, 7], [11, 7], [12, 6]], shine);
      }
    }
  } else if (!hood && !only) {
    O = headO;
    [[10, 9], [11, 8], [12, 8]].forEach(([x, y]) => set(x, y, mix(C.skin, WHITE, .38), 'head', false));
  }

  // face
  O = headO;
  const face = fr.face || { eyes: 'open', mouth: 'smile', brows: 'soft' };
  if (!only) drawFace(face, look, C, set);
  if (touch === 'festival') {
    // festival glitter on the cheekbones, below any glasses frame
    const gold = [255, 224, 138];
    [[8, 24, WHITE], [7, 23, gold], [23, 24, WHITE], [24, 23, gold]].forEach(([x, y, c]) => set(x, y, c, 'face', false));
  }

  // glasses
  const gl = look.glasses;
  const gy = gl === 'sun' && face.glassesUp ? -8 : 0;
  const gset = (x, y, c, part, o, tag) => set(x, y + gy, c, gy ? 'hat' : part, o, tag);
  const gget = (x, y) => get(x, y + gy);
  if (gl && gl !== 'none') {
    const F = gl === 'sun' ? [26, 26, 30] : gl === 'aviator' ? GOLD : hex(look.frameColor || '#2A2B30');
    const AV = ['FFFFFFF', 'FLLLLLF', 'FLHLLLF', 'FLLLLLF', '.FLLLLF', '..FFFF.'];
    const frame = (x0, flip) => {
      if (gl === 'aviator') {
        AV.forEach((row, dy) => [...row].forEach((ch, dx) => { const xx = flip ? x0 + 6 - dx : x0 + dx; if (ch === '.') return; gset(xx, 16 + dy, ch === 'F' ? F : ch === 'H' ? [170, 120, 70] : [92, 56, 30], 'glasses', false); }));
        return;
      }
      for (let y = 16; y <= 22; y++) for (let x = x0; x <= x0 + 6; x++) {
        const edge = y === 16 || y === 22 || x === x0 || x === x0 + 6;
        const corner = (y === 16 || y === 22) && (x === x0 || x === x0 + 6);
        if (gl === 'round' && corner) continue;
        if (gl === 'browline') { if (y <= 17 || ((x === x0 || x === x0 + 6) && y <= 19)) gset(x, y, F, 'glasses', false); continue; }
        if (gl === 'sun') { if (corner) continue; const hl = (x === x0 + 1 && y === 17) || (x === x0 + 2 && y === 17) || (x === x0 + 1 && y === 18); gset(x, y, edge ? F : hl ? [120, 124, 138] : [14, 14, 18], 'glasses', false, 'sun'); continue; }
        if (edge) gset(x, y, F, 'glasses', false);
      }
    };
    frame(8, false); frame(17, true);
    gset(15, gl === 'aviator' ? 16 : 18, F, 'glasses', false, gl === 'sun' ? 'sun' : undefined); gset(16, gl === 'aviator' ? 16 : 18, F, 'glasses', false, gl === 'sun' ? 'sun' : undefined);
    [5, 6, 7, 24, 25, 26].forEach((x) => { const p = gget(x, gl === 'aviator' ? 17 : 18); if (!p || p.part !== 'hair') gset(x, gl === 'aviator' ? 17 : 18, F, 'glasses', false, gl === 'sun' ? 'sun' : undefined); });
  }

  // hats (they sit on the hair, so they trail with it)
  if (hat) {
    O = hairO;
    const tag = hat;
    const S = (x, y, c, o = true) => set(x, y, c, 'hat', o, tag);
    if (hat === 'cap') {
      const c = C.top;
      for (let y = 2; y <= 10; y++) for (let x = 3; x <= 29; x++) if (ell(x, y, 16, 11, 12.8, 8.6)) S(x, y, c);
      for (let x = 5; x <= 26; x++) S(x, 11, mul(c, .78));
      for (let x = 8; x <= 23; x++) S(x, 12, mul(c, .7));
      S(16, 2, mix(c, WHITE, .4), false);
    }
    if (hat === 'bucket') {
      const c = C.bottoms;
      for (let y = 3; y <= 10; y++) for (let x = 4; x <= 28; x++) if (ell(x, y, 16, 10.5, 11.5, 7.6)) S(x, y, c);
      for (let x = 2; x <= 29; x++) S(x, 11, mul(c, .85));
      for (let x = 3; x <= 28; x++) S(x, 12, mul(c, .72));
      for (let x = 6; x <= 25; x++) S(x, 9, mul(c, .7), false);
    }
    if (hat === 'party') {
      const a = [240, 108, 155], b = [126, 224, 192];
      for (let y = 1; y <= 10; y++) { const hw = Math.round(y * .72); for (let x = 16 - hw; x <= 15 + hw; x++) S(x, y, ((x + y) % 4 < 2) ? a : b); }
      S(15, 0, WHITE, false); S(16, 0, WHITE, false);
    }
    if (hat === 'crown') {
      const c = [242, 193, 78];
      for (let y = 5; y <= 7; y++) for (let x = 9; x <= 22; x++) S(x, y, c);
      [[9, 11, 4], [14, 17, 4], [20, 22, 4], [9, 10, 3], [15, 16, 3], [21, 22, 3], [9, 9, 2], [15, 16, 2], [22, 22, 2]].forEach(([a0, a1, y]) => { for (let x = a0; x <= a1; x++) S(x, y, c); });
      S(12, 6, [240, 108, 155], false); S(19, 6, [240, 108, 155], false); S(15, 6, [126, 224, 192], false); S(16, 6, [126, 224, 192], false);
    }
    if (hat === 'headphones') {
      const band = [112, 118, 132], cup = [126, 224, 192];
      for (let y = 1; y <= 12; y++) for (let x = 0; x < W; x++) if (ell(x, y, 16, 16, 14.6, 14) && !ell(x, y, 16, 16, 12.6, 12.2)) S(x, y, band);
      for (let y = 14; y <= 22; y++) { for (let x = 1; x <= 4; x++) S(x, y, x === 4 ? cup : band); for (let x = 27; x <= 30; x++) S(x, y, x === 27 ? cup : band); }
    }
    if (hat === 'cowboy') {
      const c = [176, 122, 69];
      for (let y = 1; y <= 8; y++) for (let x = 10; x <= 21; x++) { if (y === 1 && (x < 11 || x > 20 || x === 15 || x === 16)) continue; S(x, y, y >= 7 ? mul(c, .55) : c); }
      [[8, 0, 2], [8, 29, 31], [9, 1, 30], [10, 3, 28]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) if (!(y === 8 && x > 9 && x < 22)) S(x, y, y === 10 ? mul(c, .8) : c); });
      S(12, 3, mix(c, WHITE, .3), false); S(12, 4, mix(c, WHITE, .3), false);
    }
    const ring = (c) => { for (let y = 1; y <= 28; y++) for (let x = 0; x < W; x++) if (ell(x, y, 16, 16.5, 14.4, 13.6) && !ell(x, y, 16, 20.2, 9.8, 8.8)) S(x, y, c); };
    const hoodEyes = (pts) => pts.forEach(([x, y]) => { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => S(x + a, y + b, [30, 26, 24], false)); S(x, y, WHITE, false); });
    if (hat === 'dino') {
      const gr = [112, 190, 92], sp = [242, 160, 64];
      [[9, 2], [13, 1], [18, 1], [22, 2]].forEach(([cx, ty]) => { S(cx, ty, sp); S(cx - 1, ty + 1, sp); S(cx, ty + 1, sp); S(cx + 1, ty + 1, sp); for (let x = cx - 1; x <= cx + 1; x++) S(x, ty + 2, sp); });
      ring(gr);
      for (let y = 20; y <= 27; y++) for (let x = 0; x < W; x++) { const p = get(x, y); if (p && p.part === 'hat' && y >= 24 && (x < 8 || x > 23)) p.c = mix(gr, [255, 240, 180], .35); }
      hoodEyes([[9, 6], [21, 6]]);
      [10, 12, 14, 17, 19, 21].forEach((x) => S(x, 11, WHITE, false));
      [11, 13, 18, 20].forEach((x) => S(x, 12, WHITE, false));
    }
    if (hat === 'panda') {
      const wh = [240, 240, 236], bk = [34, 34, 40];
      for (let y = 0; y <= 8; y++) for (let x = 0; x < W; x++) if (ell(x, y, 5.5, 4, 3.2, 3.2) || ell(x, y, 26.5, 4, 3.2, 3.2)) S(x, y, bk);
      ring(wh);
      for (let y = 6; y <= 9; y++) for (let x = 8; x <= 24; x++) if (ell(x, y, 11, 7.8, 2.4, 1.8) || ell(x, y, 21, 7.8, 2.4, 1.8)) S(x, y, bk, false);
      S(11, 7, WHITE, false); S(21, 7, WHITE, false);
      S(15, 10, bk, false); S(16, 10, bk, false);
    }
    if (hat === 'duck') {
      const y1 = [245, 200, 66], bill = [240, 138, 36];
      ring(y1);
      [[10, 6], [11, 6], [10, 7], [11, 7], [20, 6], [21, 6], [20, 7], [21, 7]].forEach(([x, y]) => S(x, y, [30, 26, 24], false));
      S(10, 6, WHITE, false); S(20, 6, WHITE, false);
      [[9, 12, 19], [10, 11, 20], [11, 12, 19]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) S(x, y, y === 11 ? mul(bill, .82) : bill); });
      S(15, 0, y1); S(16, 0, y1); S(17, 1, y1);
    }
    if (hat === 'nightcap') {
      const c = C.top, band = mix(C.top, WHITE, .6);
      for (let y = 2; y <= 8; y++) for (let x = 5; x <= 27; x++) if (ell(x, y, 16, 9.5, 11, 8.2)) S(x, y, x % 3 === 0 ? mix(c, WHITE, .38) : c);
      for (let i = 0; i <= 9; i++) { const x = 17 + i, y = 2 + Math.floor(i * .7); for (let d = 0; d < 3; d++) S(x, y + d, (x % 3 === 0) ? mix(c, WHITE, .38) : c); }
      for (let y = 8; y <= 10; y++) for (let x = 4; x <= 27; x++) if (y < 10 || (x > 5 && x < 26)) S(x, y, band);
      for (let y = 9; y <= 14; y++) for (let x = 25; x <= 31; x++) if (ell(x, y, 28, 11.8, 2.2, 2.2)) S(x, y, [245, 245, 240]);
    }
    if (hat === 'catears') {
      const c = C.hair, pink = [244, 166, 192];
      const ear = [[0, 6, 6], [1, 6, 7], [2, 5, 8], [3, 5, 9], [4, 4, 10], [5, 4, 11], [6, 4, 12], [7, 5, 12]];
      ear.forEach(([y, a, b]) => { for (let x = a; x <= b; x++) { S(x, y, c); S(31 - x, y, c); } });
      [[3, 7, 7], [4, 6, 8], [5, 6, 9], [6, 7, 10]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) { S(x, y, pink, false); S(31 - x, y, pink, false); } });
    }
  }

  // held items and shoes
  O = body;
  if (held === 'bottle') {
    for (let y = 27; y <= 28; y++) for (let x = 24; x <= 26; x++) set(x, y, [236, 236, 236], 'held', true, 'bottle');
    for (let y = 29; y <= 36; y++) for (let x = 24; x <= 26; x++) set(x, y, x === 24 ? [150, 210, 245] : [95, 180, 232], 'held', true, 'bottle');
    if (!only) { set(23, 33, C.skin, 'held', false); set(23, 34, C.skin, 'held', false); }
  }
  const Hd = (x, y, c, o = true) => set(x, y, c, 'held', o, held);
  if (held === 'balloon') {
    const red = [232, 72, 86];
    for (let y = 6; y <= 18; y++) for (let x = 22; x <= 31; x++) if (ell(x, y, 27, 12, 4, 5.2)) Hd(x, y, red);
    Hd(27, 17, mul(red, .7)); Hd(26, 18, mul(red, .7)); Hd(27, 18, mul(red, .7));
    Hd(25, 9, mix(red, WHITE, .6), false); Hd(25, 10, mix(red, WHITE, .45), false);
    [[27, 19], [27, 20], [26, 21], [26, 22], [26, 23], [25, 24], [25, 25], [25, 26], [24, 27], [24, 28], [24, 29], [24, 30], [24, 31], [24, 32], [24, 33]].forEach(([x, y]) => Hd(x, y, [200, 200, 200], false));
  }
  if (held === 'pizza') {
    const crust = [214, 150, 72], cheese = [255, 204, 92], pep = [204, 62, 52];
    for (let x = 24; x <= 30; x++) Hd(x, 29, crust);
    [[30, 24, 29], [31, 24, 28], [32, 24, 27], [33, 24, 26], [34, 24, 25]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) Hd(x, y, cheese); });
    Hd(24, 35, cheese);
    [[26, 30], [28, 30], [25, 32]].forEach(([x, y]) => Hd(x, y, pep, false));
    if (!only) { set(23, 33, C.skin, 'held', false); set(23, 34, C.skin, 'held', false); }
  }
  if (look.shoes === 'trainers') {
    const up = [247, 247, 242], stripe = [126, 224, 192], sole = [206, 206, 200], lace = [240, 108, 155];
    const T = (x, y, c, o = true) => set(x, y, c, 'held', o, 'trainers');
    const foot = (side, fn) => { O = [root[0] + feet[side][0], root[1] + feet[side][1]]; fn(); };
    foot('L', () => { for (let y = 39; y <= 41; y++) for (let x = 10; x <= 14; x++) T(x, y, up); for (let x = 9; x <= 15; x++) T(x, 42, sole); [[11, 41], [12, 40], [13, 40]].forEach(([x, y]) => T(x, y, stripe, false)); [[12, 39], [13, 39]].forEach(([x, y]) => T(x, y, lace, false)); });
    foot('R', () => { for (let y = 39; y <= 41; y++) for (let x = 17; x <= 21; x++) T(x, y, up); for (let x = 16; x <= 22; x++) T(x, 42, sole); [[20, 41], [19, 40], [18, 40]].forEach(([x, y]) => T(x, y, stripe, false)); [[18, 39], [19, 39]].forEach(([x, y]) => T(x, y, lace, false)); });
    O = body;
  }

  // pyjama stripes and collar
  if (top === 'pyjamas' && (!only || only === 'top' || only === 'bottoms')) {
    for (let y = 29; y <= 39; y++) for (let x = 7; x <= 24; x++) { const p = get(x, y); if (p && (p.part === 'top' || p.part === 'bottoms') && x % 3 === 0 && p.outline) p.c = mix(C.top, WHITE, .38); }
    [[13, 29], [14, 30], [18, 29], [17, 30]].forEach(([x, y]) => set(x, y, mix(C.top, WHITE, .7), 'top', false));
  }
  // messy hair: flyaways
  if (look.messy && hs !== 'bald' && !hood) {
    O = hairO;
    [[8, 3], [9, 2], [20, 2], [21, 1], [24, 4], [4, 9], [27, 8], [13, 3]].forEach(([x, y]) => { if (!get(x, y)) set(x, y, C.hair, 'hair'); });
  }

  // arms
  O = body;
  let hand = null;
  if (!only) hand = drawArms({ armL, armR, swing: fr.armSwing || 0, top, longSleeve, C, set, get, g, O, W });
  if (held === 'mug') {
    const M = (x, y, c, o = true) => set(x, y, c, 'held', o, 'mug');
    if (!only) clearSides(get, g, O, 35, 36);
    for (let y = 32; y <= 36; y++) for (let x = 13; x <= 18; x++) M(x, y, y === 34 ? [126, 224, 192] : [237, 230, 218]);
    for (let x = 14; x <= 17; x++) M(x, 32, [96, 60, 38], false);
    [[15, 30], [16, 29], [16, 31]].forEach(([x, y]) => M(x, y, [214, 214, 214], false));
    if (!only) {
      [[10, 33], [11, 33], ...(oneHand ? [] : [[20, 33], [21, 33]])].forEach(([x, y]) => set(x, y, mul(C.top, .85), 'held'));
      [[12, 33], [12, 34], ...(oneHand ? [] : [[19, 33], [19, 34]])].forEach(([x, y]) => set(x, y, C.skin, 'held'));
    }
  }

  // reaction props: held in the right hand, or dropped from above
  if (fr.prop && !only) {
    const [name, a, b] = fr.prop;
    const d = PROPS[name];
    const w = d.m[0].length, h = d.m.length;
    // Held by its lower right corner, so the hand covers as little of it as possible.
    const at = a === 'hand' && hand ? [Math.round(hand.x) - w + 2, Math.round(hand.y) - h + 2] : [a, b];
    O = a === 'hand' ? [0, 0] : root;
    d.m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') set(at[0] + x, at[1] + y, d.c[ch], 'held'); }));
    // the hand again, over the prop, so it grips it
    if (a === 'hand' && hand) {
      O = [0, 0];
      const hx = Math.round(hand.x), hy = Math.round(hand.y);
      [[hx, hy], [hx + 1, hy], [hx, hy + 1], [hx + 1, hy + 1]].forEach(([x, y]) => set(x, y, C.skin, 'lift'));
    }
    O = body;
  }
  if (fr.badge || look.badge) {
    const mode = fr.badge || look.badge;
    const gold = [242, 193, 78], mint = [126, 224, 192], rib = [240, 108, 155];
    const B = (x, y, c, o = true) => set(x, y, c, 'held', o, 'badge');
    const medal = (cx, cy) => { for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) if (ell(x, y, cx + .5, cy + .5, 2.9, 2.9)) B(x, y, ell(x, y, cx + .5, cy + .5, 1.6, 1.6) ? mint : gold); B(cx - 1, cy - 1, WHITE, false); };
    if (mode === 'held') { medal(29, 15); B(28, 19, rib); B(30, 19, rib); }
    if (mode === 'falling') { O = root; medal(26, (fr.badgeY ?? 3)); B(22, 1, [255, 224, 138], false); B(23, 3, [255, 224, 138], false); O = body; }
    if (mode === 'pin') { for (let y = 30; y <= 32; y++) for (let x = 18; x <= 20; x++) B(x, y, x === 19 && y === 31 ? mint : gold, false); B(18, 33, rib, false); B(20, 33, rib, false); }
  }
  if (fr.sparkles || look.sparkles) {
    O = root;
    const Y = [255, 224, 138];
    [[3, 7], [28, 5], [27, 25], [4, 31]].forEach(([x, y], i) => { set(x, y, WHITE, 'held', false, 'sparkles'); if (i % 2 === 0) [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([a, b]) => set(a, b, Y, 'held', false, 'sparkles')); });
  }

  // derived tones, on the finished grid
  if (!only) for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const p = raw(x, y), u = raw(x, y - 1);
    if (p && p.part === 'head' && p.outline && u && (u.part === 'hair' || u.part === 'hat')) p.c = mul(p.c, .86);
  }
  // Outlines: a darker tone of the part where it meets empty space or a lower
  // layer; near-black parts lighten instead so they still read on black.
  return g.map((p, i) => {
    if (!p || !p.outline) return p;
    const x = i % W, y = (i / W) | 0;
    const n = [raw(x - 1, y), raw(x + 1, y), raw(x, y - 1), raw(x, y + 1)];
    const edge = n.some((q) => !q || (q.z < p.z && q.part !== p.part && q.part !== 'face'));
    if (!edge) return p;
    const lum = (.2126 * p.c[0] + .7152 * p.c[1] + .0722 * p.c[2]) / 255;
    return { ...p, c: lum < .12 ? mix(p.c, [150, 150, 150], .32) : mul(p.c, .58) };
  });
}

function clearSides(get, g, O, y0, y1, xs = [7, 8, 9, 22, 23, 24]) {
  for (let y = y0; y <= y1; y++) for (const x of xs) {
    const p = get(x, y);
    if (p && (p.part === 'top' || p.part === 'arm')) {
      const gx = x + O[0], gy = y + O[1];
      if (gx >= 0 && gy >= 0 && gx < W && gy < H) g[gy * W + gx] = null;
    }
  }
}

function blob(set, cx, cy, r, c, part) {
  for (let y = Math.floor(cy - r) - 1; y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r) - 1; x <= Math.ceil(cx + r); x++) {
    if (ell(x, y, cx, cy, r + .3, r + .3)) set(x, y, c, part);
  }
}

// Arms by the sides keep the designed pixels. Raised arms use the design's
// arms-up path; everything else (holding, sipping, waving, swinging) is drawn
// from two angles, sleeve then skin, two pixels thick. Returns the right hand.
function drawArms({ armL, armR, swing, top, longSleeve, C, set, get, g, O }) {
  let hand = { x: 22.5, y: longSleeve ? 35.5 : 33.5 };
  const sides = { L: armL, R: armR };
  for (const side of ['L', 'R']) {
    const pose = sides[side];
    if (pose === 'down' && !swing) continue;
    clearSides(get, g, O, 29, 37, side === 'L' ? [7, 8, 9] : [22, 23, 24]);
    if (pose === 'up') {
      const sl = longSleeve ? 9 : 3;
      const path = [[29, 7, 9], [28, 6, 8], [27, 5, 7], [26, 4, 6], [25, 3, 5], [24, 2, 4], [23, 2, 4], [22, 1, 3], [21, 1, 3], [20, 1, 3]];
      path.forEach(([y, a, b], i) => {
        const c = i < sl && i < 7 && top !== 'dress' ? C.top : C.skin;
        for (let x = a; x <= b; x++) set(side === 'L' ? x : 31 - x, y, c, 'lift');
      });
      if (side === 'R') hand = { x: 29, y: 20.5 };
      continue;
    }
    let [u, f] = POSE[pose] || POSE.down;
    const sw = side === 'L' ? -swing : swing;
    u += sw * 16; f += sw * 16;
    if (side === 'L') { u = 180 - u; f = 180 - f; }
    const r = Math.PI / 180;
    const [sx, sy] = SHOULDER[side];
    const ex = sx + Math.cos(u * r) * 3.3, ey = sy + Math.sin(u * r) * 3.3;
    const hx = ex + Math.cos(f * r) * 3.3, hy = ey + Math.sin(f * r) * 3.3;
    const sleeve = top === 'dress' ? C.skin : C.top;
    const fore = longSleeve ? C.top : C.skin;
    stroke(set, sx, sy, ex, ey, sleeve);
    stroke(set, ex, ey, hx, hy, fore);
    blob(set, hx, hy, 1.1, C.skin, 'lift');
    if (side === 'R') hand = { x: hx + O[0], y: hy + O[1] };
  }
  return hand;
}

function stroke(set, x0, y0, x1, y1, c) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.floor(x0 + (x1 - x0) * t - 0.5), y = Math.floor(y0 + (y1 - y0) * t - 0.5);
    set(x, y, c, 'lift'); set(x + 1, y, c, 'lift'); set(x, y + 1, c, 'lift'); set(x + 1, y + 1, c, 'lift');
  }
}

function drawFace(face, look, C, set) {
  const ex = face.eyes || 'open';
  const D = mix(C.eyes, [18, 14, 22], .72), E = C.eyes, L = mul(C.skin, .74);
  const pal = { D, E, W: WHITE, L, P: [255, 92, 138], S: [255, 211, 77] };
  const drawEye = (name, x0) => {
    const m = EYES[name]; const wide = m[0].length === 5; const y0 = m.length === 6 ? 16 : 17;
    m.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch !== '.') set(x0 - (wide ? 1 : 0) + dx, y0 + dy, pal[ch], 'face', false); }));
  };
  if (ex === 'wink') { drawEye('open', 10); drawEye('happy', 18); } else { drawEye(ex, 10); drawEye(ex, 18); }
  [[9, 23], [10, 23], [21, 23], [22, 23]].forEach(([x, y]) => set(x, y, C.cheeks, 'face', false));
  if (face.blush) [[9, 22], [22, 22]].forEach(([x, y]) => set(x, y, mix(C.cheeks, C.skin, .45), 'face', false));
  const M = mul(C.skin, .48), T = [228, 106, 123], K = mul(C.skin, .3);
  (MOUTHS[face.mouth] || MOUTHS.smile).forEach(([x, y, k]) => set(x, y, { M, T, K }[k], 'face', false));
  const B = look.hair === 'bald' ? mul(C.hair, .9) : mul(C.hair, .82);
  (BROWS[face.brows] || BROWS.soft).forEach(([x, y]) => set(x, y, B, 'face', false));
}

/* ================= still pictures (wardrobe tiles) ================= */

export const CROP = { head: [0, 0, 32, 30], body: [0, 24, 32, 19], held: [14, 24, 16, 14], shoes: [6, 36, 20, 7] };

/** Draws one still frame: the whole avatar, or `only` one item, optionally as a flat silhouette. */
export function drawStill(canvas, look, opts = {}) {
  const grid = build(look, { face: opts.face }, opts.only || null);
  let s = opts.scale || 3;
  let crop = opts.crop || [0, 0, W, H];
  if (opts.fit) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    grid.forEach((p, i) => { if (!p) return; const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    if (x1 >= 0) { crop = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; s = Math.max(1, Math.floor(Math.min(opts.fit[0] / crop[2], opts.fit[1] / crop[3]))); }
  }
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = crop[2] * s * dpr; canvas.height = crop[3] * s * dpr;
  canvas.style.width = `${crop[2] * s}px`; canvas.style.height = `${crop[3] * s}px`;
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sil = opts.silhouette ? hex(opts.silhouette) : null;
  for (let y = crop[1]; y < crop[1] + crop[3]; y++) for (let x = crop[0]; x < crop[0] + crop[2]; x++) {
    const p = grid[y * W + x]; if (!p) continue;
    const c = sil || p.c;
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    g.fillRect((x - crop[0]) * s, (y - crop[1]) * s, s, s);
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
   At map scale the full avatar would be a smudge, so a 12 x 16 sprite from the
   same colour slots walks the route: four frames, mirrored for walking left.
   Hoods, the crown and the party hat show at this size; other hats don't. */

export const MW = 12, MH = 16;
export function mini(look0, frame = 0) {
  const look = normaliseLook(look0);
  const g = new Array(MW * MH).fill(null);
  const C = {}; Object.keys(look.colors).forEach((k) => (C[k] = hex(look.colors[k])));
  const S = (x, y, c, o = true) => { if (x < 0 || y < 0 || x >= MW || y >= MH) return; g[y * MW + x] = { c, outline: o }; };
  const b = frame === 1 || frame === 3 ? -1 : 0;
  const LEGS = [
    [[4, 13], [4, 14], [7, 13], [7, 14]], [[5, 13], [5, 14], [6, 13], [6, 14]],
    [[4, 13], [3, 14], [7, 13], [8, 14]], [[5, 13], [5, 14], [6, 13], [6, 14]],
  ];
  const SHOES = [[[3, 15], [4, 15], [7, 15], [8, 15]], [[5, 15], [6, 15]], [[2, 15], [3, 15], [8, 15], [9, 15]], [[5, 15], [6, 15]]];
  LEGS[frame].forEach(([x, y]) => S(x, y, C.bottoms));
  SHOES[frame].forEach(([x, y]) => S(x, y, C.shoes));
  for (let y = 9; y <= 12; y++) for (let x = 3; x <= 8; x++) S(x, y + b, C.top);
  const ARMS = [[[2, 10], [2, 11], [9, 9], [9, 10]], [[2, 10], [2, 11], [9, 10], [9, 11]], [[2, 9], [2, 10], [9, 10], [9, 11]], [[2, 10], [2, 11], [9, 10], [9, 11]]];
  ARMS[frame].forEach(([x, y]) => S(x, y + b, C.skin));
  for (let y = 3; y <= 8; y++) for (let x = 1; x <= 10; x++) { if ((y === 3 || y === 8) && (x === 1 || x === 10)) continue; S(x, y + b, C.skin); }
  const hs = look.hair;
  if (look.hat === 'duck' || look.hat === 'dino' || look.hat === 'panda') {
    const hc = hex({ duck: '#F5C842', dino: '#70BE5C', panda: '#F0F0EC' }[look.hat]);
    for (let y = 0; y <= 8; y++) for (let x = 0; x <= 11; x++) { const inner = y >= 4 && x >= 3 && x <= 8; if (inner) continue; if (y === 0 && (x < 3 || x > 8)) continue; if (y >= 6 && (x === 0 || x === 11)) continue; S(x, y + b, hc); }
  } else if (hs !== 'bald') {
    [[0, 3, 8], [1, 2, 9], [2, 1, 10], [3, 1, 10]].forEach(([y, a, c]) => { for (let x = a; x <= c; x++) S(x, y + b, C.hair); });
    [4, 5].forEach((y) => { S(1, y + b, C.hair); S(10, y + b, C.hair); });
    if (hs === 'long') for (let y = 6; y <= 10; y++) { S(0, y + b, C.hair); S(11, y + b, C.hair); S(1, y + b, C.hair); S(10, y + b, C.hair); }
    if (hs === 'pigtails') [5, 6].forEach((y) => { S(0, y + b, C.hair); S(11, y + b, C.hair); });
    if (hs === 'bun') S(5, b, C.hair);
    if (hs === 'quiff' || hs === 'mohawk') { S(5, b, C.hair); S(6, b, C.hair); }
  }
  if (look.hat === 'party') [[5, 0], [6, 0]].forEach(([x, y]) => S(x, y + b, [240, 108, 155]));
  if (look.hat === 'crown') { for (let x = 3; x <= 8; x++) S(x, 1 + b, [242, 193, 78]); [3, 5, 6, 8].forEach((x) => S(x, b, [242, 193, 78])); }
  const E = mix(C.eyes, [18, 14, 22], .6);
  [[5, 5], [5, 6], [8, 5], [8, 6]].forEach(([x, y]) => S(x, y + b, E, false));
  [[4, 7], [9, 7]].forEach(([x, y]) => S(x, y + b, C.cheeks, false));
  const get = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? null : g[y * MW + x]);
  return g.map((p, i) => {
    if (!p || !p.outline) return p;
    const x = i % MW, y = (i / MW) | 0;
    if (![get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].some((q) => !q)) return p;
    const lum = (.2126 * p.c[0] + .7152 * p.c[1] + .0722 * p.c[2]) / 255;
    return { ...p, c: lum < .12 ? mix(p.c, [150, 150, 150], .32) : mul(p.c, .58) };
  });
}
export function drawMini(canvas, look, { frame = 0, flip = false, scale = 2 } = {}) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = MW * scale * dpr; canvas.height = MH * scale * dpr;
  canvas.style.width = `${MW * scale}px`; canvas.style.height = `${MH * scale}px`;
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, MW * scale, MH * scale);
  mini(look, frame).forEach((p, i) => {
    if (!p) return;
    const x = i % MW, y = (i / MW) | 0;
    g.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
    g.fillRect((flip ? MW - 1 - x : x) * scale, y * scale, scale, scale);
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
  const face = { eyes: e, mouth: st.mouth || 'smile', brows, blush: (st.blush ?? 1) > 1, glassesUp: BIG_EYES.has(eyesName) };

  return {
    rootDX: st.rootDX || 0, rootDY: st.rootDY || 0, bodyDY, headDX: st.headDX || 0, headDY, hairLag, headY,
    footL: [st.legWalk === 0 ? -1 : 0, 0], footR: [st.legWalk === 1 ? 1 : 0, st.legTap ? -1 : 0],
    armL: st.armL || 'down', armR: st.armR || 'down', armSwing: st.armSwing || 0,
    prop: st.prop || null, badge: st.badge || null, badgeY: st.badgeY, sparkles: !!st.sparkles,
    face, zzz: !!st.zzz, tapGlass: !!st.tapGlass,
  };
}

// Exposed for verification: every keyframe of every animation.
export const __ANIM = ANIM;

/* ================= an avatar on screen ================= */

// Calmer avatar (Settings, Accessibility): idle moves come a third as often
// and skip the bouncier ones. Reactions to what you log still play.
let calm = false;
export const setAvatarCalm = (on) => { calm = !!on; };
const LIVELY = new Set(['dance', 'hello', 'tap']);

export function createAvatar({ cell = 3, look = DEFAULT_LOOK, onTap = null, label = 'Your avatar' } = {}) {
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

  function size(c) {
    cell = c;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = W * cell * dpr;
    canvas.height = H * cell * dpr;
    canvas.style.width = `${W * cell}px`;
    canvas.style.height = `${H * cell}px`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        me.sparks.push({ x: 16, y: 21, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, life: 0.9, color });
      }
    }
    if (s.note) me.sparks.push({ note: true, x: 25, y: 7, vx: 0.15, vy: -0.45, life: 1.4, color: '#7EE0C0' });
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
    for (const s of me.sparks) { s.x += s.vx; s.y += s.vy; if (!s.note) s.vy += 0.12; s.life -= 1 / 12; }
  }

  const ZZ = ['ZZZ', '.Z.', 'ZZZ'];
  const NOTE = ['.NN', '.N.', 'NN.', 'NN.'];
  function paint() {
    const fr = frame();
    const cells = build(me.look, fr);
    g.clearRect(0, 0, W * cell, H * cell);
    for (let i = 0; i < cells.length; i++) {
      const p = cells[i];
      if (!p) continue;
      g.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
      g.fillRect((i % W) * cell, Math.floor(i / W) * cell, cell, cell);
    }
    if (fr.tapGlass) {
      // Knocking on the inside of your screen: little impact marks by the hand.
      g.fillStyle = 'rgba(255,255,255,.9)';
      [[29, 30], [30, 29], [30, 33], [31, 33], [29, 36], [30, 37]].forEach(([x, y]) => g.fillRect(x * cell, y * cell, cell, cell));
    }
    if (fr.zzz) {
      g.fillStyle = '#7EE0C0';
      for (let i = 0; i < 3; i++) {
        const o = ((me.tick / 12) * 0.7 + i * 0.33) % 1, s = i === 2 ? 2 : 1;
        g.globalAlpha = Math.max(0, 1 - o);
        ZZ.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === 'Z') g.fillRect(Math.round(24 + i * 2 + x * s) * cell, Math.round(9 - o * 8 + y * s) * cell, cell * s, cell * s);
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

  function start() {
    paint();
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
