// The animated avatar on Style B art. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, normaliseLook, toFrame, artLook, __ANIM, __MOODS, __stats, W, H } from '../js/avatar.js';
import { ARMS, EYES, MOUTHS, BROWS, HELD_ITEMS, DEFAULT_COLORS } from '../js/avatar-art.js';

const still = (st = {}) => toFrame(st, { still: false });
const rows = (px) => px.map((p, i) => (p ? (i / W) | 0 : null)).filter((y) => y != null);

test('the avatar is 64 x 80', () => {
  assert.equal(W, 64);
  assert.equal(H, 80);
  const px = build(normaliseLook(null), still());
  assert.equal(px.length, 64 * 80);
  assert.ok(px.some((p) => p && p.c.length === 3));
});

test('a v2 look moves to v3 without losing anything', () => {
  const v2 = {
    v: 2, hair: 'quiff', top: 'tee', glasses: 'round', hat: 'bucket', held: 'mug', costume: null, shoes: 'trainers',
    colors: { skin: '#A96F45', hair: '#D95B7C', eyes: '#3D6FB0', cheeks: '#F4A6C0', top: '#3D6FB0', bottoms: '#1E1E1E', shoes: '#EDEDED' },
  };
  const v3 = normaliseLook(v2);
  assert.equal(v3.v, 3);
  assert.equal(v3.hair, 'short');
  assert.equal(v3.hat, 'sunhat');
  assert.equal(v3.held, 'mug');
  assert.equal(v3.glasses, 'round');
  assert.equal(v3.shoes, 'trainers');
  assert.deepEqual({ ...v3.colors, glasses: undefined, hat: undefined }, { ...v2.colors, glasses: undefined, hat: undefined });
  assert.equal(v3.colors.glasses, DEFAULT_COLORS.glasses);
  assert.equal(v3.colors.hat, DEFAULT_COLORS.hat);
});

test('hood costumes saved as hats become costumes, and unknown parts fall back', () => {
  for (const id of ['panda', 'dino', 'duck']) {
    const v3 = normaliseLook({ v: 2, hat: id, colors: {} });
    assert.equal(v3.costume, id);
    assert.equal(v3.hat, null);
  }
  const odd = normaliseLook({ v: 3, hair: 'mullet', hat: 'fez', held: 'sword', top: 'cape', effect: 'smoke', colors: {} });
  assert.equal(odd.hair, 'short');
  assert.equal(odd.hat, null);
  assert.equal(odd.held, null);
  assert.equal(odd.top, 'hoodie');
  assert.equal(odd.effect, null);
});

test('the very first avatar still carries over', () => {
  const v1 = normaliseLook({ style: 'Long', skin: '#7A4A2A', hair: '#1E1A18', top: '#21764F' });
  assert.equal(v1.hair, 'long');
  assert.equal(v1.colors.skin, '#7A4A2A');
  assert.equal(v1.colors.top, '#21764F');
});

test('the default look is Style B’s default', () => {
  const d = normaliseLook(null);
  assert.equal(d.v, 3);
  assert.equal(d.hair, 'short');
  assert.equal(d.top, 'hoodie');
  assert.equal(d.colors.top, DEFAULT_COLORS.top);
});

// Every face the engine can show: each mood's resting face under each keyframe.
function* everyState() {
  for (const mood of Object.values(__MOODS)) {
    for (const frames of Object.values(__ANIM)) for (const [, st] of frames) yield { ...mood.base, ...st };
    yield { ...mood.base };
  }
}

test('every keyframe of every animation maps to names the art knows', () => {
  const look = normaliseLook(null);
  for (const st of everyState()) {
    for (const lid of [0, 0.5, 1]) {
      const a = artLook(look, toFrame(st, { lid, still: false }));
      if (a.armL) assert.ok(ARMS.includes(a.armL), `armL ${a.armL}`);
      if (a.armR) assert.ok(ARMS.includes(a.armR), `armR ${a.armR}`);
      assert.ok(EYES.includes(a.eyes), `eyes ${a.eyes}`);
      assert.ok(MOUTHS.includes(a.mouth), `mouth ${a.mouth}`);
      assert.ok(BROWS.includes(a.brows), `brows ${a.brows}`);
      if (a.held) assert.ok(HELD_ITEMS.includes(a.held), `held ${a.held}`);
    }
  }
});

test('never drunk: sleepy eyes never smile, and a drink is a soft drink', () => {
  const look = normaliseLook(null);
  for (const st of everyState()) {
    const a = artLook(look, toFrame(st, { still: false }));
    if (['heavy', 'tired'].includes(a.eyes)) assert.ok(!['smile', 'cat', 'wide'].includes(a.mouth), `${a.eyes} with ${a.mouth}`);
  }
  for (const [, st] of __ANIM.drink) {
    const a = artLook(look, toFrame(st, { still: false }));
    if (st.prop) assert.equal(a.held, 'cup');
  }
});

test('a blink closes open eyes', () => {
  const look = normaliseLook(null);
  assert.equal(artLook(look, toFrame({ eyes: 'open' }, { lid: 1, still: false })).eyes, 'shut');
  assert.equal(artLook(look, toFrame({ eyes: 'open' }, { lid: 0.5, still: false })).eyes, 'heavy');
});

test('layers are cached: moving parts around builds the art once', () => {
  const look = normaliseLook({ v: 3, hair: 'curly', colors: {} });
  const before = __stats.builds;
  build(look, still({ headDY: -1 }));
  build(look, still({ headDY: 0, rootDX: 1 }));
  build(look, still({ torsoDY: 1 }));
  assert.equal(__stats.builds - before, 1);
});

test('the frame offsets move whole parts', () => {
  const look = normaliseLook(null);
  const a = build(look, still());
  const b = build(look, still({ headDY: -1 }));
  assert.equal(Math.min(...rows(b)), Math.min(...rows(a)) - 2, 'head up two rows (one old pixel)');
  assert.equal(Math.max(...rows(b)), Math.max(...rows(a)), 'feet stay put');
});

test('a wardrobe tile can draw one item alone', () => {
  const look = { ...normaliseLook(null), hat: 'crown' };
  const all = build(look, still()).filter(Boolean).length;
  const crown = build(look, still(), 'crown').filter(Boolean).length;
  assert.ok(crown > 10 && crown < all / 4, `${crown} of ${all}`);
});

test('dressedFor adds the mode touch, except on a night out or when turned off', async () => {
  const { dressedFor } = await import('../js/wardrobe.js');
  const look = normaliseLook(null);
  const ctx = (prefs = {}) => ({ state: { prefs } });
  assert.equal(dressedFor(ctx(), look, 'walk').touch, 'walk');
  assert.equal(dressedFor(ctx(), look, 'festival').touch, 'festival');
  assert.equal(dressedFor(ctx(), look, 'night'), look);
  assert.equal(dressedFor(ctx(), look, undefined), look);
  assert.equal(dressedFor(ctx({ modeTouches: false }), look, 'day'), look);
});

test('the mode touch reaches the art', () => {
  const look = { ...normaliseLook(null), touch: 'walk' };
  assert.equal(artLook(look, still()).mode, 'walk');
  assert.equal(artLook(normaliseLook(null), still()).mode, undefined);
});

test('combining layers matches the art exactly when nothing moves', async () => {
  const Art = await import('../js/avatar-art.js');
  const { DEFAULT_COLORS } = Art;
  for (const extra of [{}, { costume: 'wizard' }, { hat: 'crown', held: 'guitar', effect: 'rainbow' }, { costume: 'elvis' }]) {
    const look = { ...normaliseLook(null), ...extra };
    const ours = build(look, still()).map((p) => p && p.c.join());
    const a = artLook(look, still());
    const b = Art.build(a);
    const colors = { ...DEFAULT_COLORS, ...look.colors, ...(b.look.colors || {}) };
    const theirs = Art.outlineFixed(Art.compose(b)).map((p) => p && Art.colourOf(p, colors).join());
    assert.deepEqual(ours, theirs, JSON.stringify(extra));
  }
});

test('the live avatar has headroom, so a jump keeps the whole head', () => {
  const look = { ...normaliseLook(null), hat: 'party' };
  const rest = build(look, still(), null, { room: true });
  const jump = build(look, still({ rootDY: -5, headDY: -1 }), null, { room: true });
  assert.equal(rest.length, W * (H + 14));
  const top = (g) => Math.min(...g.map((p, i) => (p ? (i / W) | 0 : Infinity)));
  assert.equal(top(jump), top(rest) - 12, 'the party hat rises the full jump');
  assert.ok(top(jump) > 0, 'and never reaches the edge');
});
