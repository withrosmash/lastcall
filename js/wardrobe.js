// The avatar's wardrobe: which items are unlocked, what each one asks for,
// how close you are, and the moment a night's badges hand one over.
//
// Unlocks are never stored. They're read from the badges already earned, so
// anyone who earned a badge before items existed finds the item waiting.

import { el, btn, sheet, words } from './ui.js';
import { BADGES } from './badges-data.js';
import { ITEMS, SUNGLASSES_BADGE, normaliseLook, createAvatar } from './avatar.js';
import { t } from './words.js';

export const avatarLook = (ctx) => normaliseLook(ctx.state.prefs.avatar);

/** The look dressed for a mode: one small touch, unless it's turned off. */
export function dressedFor(ctx, look, mode) {
  if (ctx.state.prefs.modeTouches === false || !mode || mode === 'night') return look;
  return { ...look, touch: mode };
}

export function saveLook(ctx, look) {
  ctx.state.prefs.avatar = structuredClone(look);
  ctx.save();
}

// In the design's words. The crown's badge is hidden, so its line says so.
const REQ = {
  'early-doors': 'Start {a} before 5pm.',
  'game-on': 'Three challenges in one {n}.',
  'no-notes': 'Five challenges in one {n}.',
  'ringleader': '25 challenges, all time.',
  'long-haul': 'Walk 50 km, all time.',
  'chaos-agent': 'Comes with a badge that stays hidden until you earn it.',
  'snack-break': 'Log food three times in one {n}.',
  'big-stomp': '20,000 steps in one {n}.',
  'just-add-water': '50 waters, all time.',
  'pin-cushion': 'Five stops in one {n}.',
  'hydro-homie': 'Log more waters than drinks in {a}.',
  'late-bite': 'Log food after midnight.',
  'anniversary': 'One year since your first {n}.',
  'ten-k': '10,000 steps in one {n}.',
  'first-dare': 'Complete your first challenge.',
};
const PHRASE = {
  cap: 'cap', party: 'party hat', headphones: 'headphones', sunhat: 'sun hat', cowboy: 'cowboy hat',
  bowler: 'bowler hat', flowercrown: 'flower crown', bunnyears: 'bunny ears', nightcap: 'nightcap', crown: 'crown',
  panda: 'panda costume', dino: 'dinosaur costume', duck: 'duck costume', teddy: 'teddy costume',
  explorer: 'explorer outfit', chef: 'chef’s whites', superhero: 'superhero suit', pirate: 'pirate outfit',
  wizard: 'wizard robes', astronaut: 'spacesuit', elvis: 'Elvis costume',
  bottle: 'water bottle', coffee: 'coffee', pizza: 'pizza slice', balloon: 'balloon', map: 'map', camera: 'camera',
  binoculars: 'binoculars', umbrella: 'umbrella', torch: 'torch', skateboard: 'skateboard', rod: 'fishing rod',
  guitar: 'guitar', trainers: 'trainers', sun: 'sunglasses',
  confetti: 'confetti', hearts: 'hearts', rainbow: 'rainbow', fireworks: 'fireworks', snow: 'snow',
  bubbles: 'bubbles', thought: 'thought bubble', aura: 'golden aura',
};

// Badges without a line of their own read their criteria as a sentence.
export const requirement = (slug) => {
  const criteria = BADGES.find((b) => b.slug === slug)?.criteria;
  return t(REQ[slug] || (criteria ? `${criteria}.` : ''));
};

/** The look with one item on. Scarf and backpack are switches, not slots. */
export function wear(look, item) {
  if (item.slot === 'shoes') return { ...look, shoes: item.id };
  if (item.slot === 'extra') return { ...look, [item.id]: true };
  return { ...look, [item.slot]: item.id };
}

/** Whether the look has the item on. */
export function wears(look, item) {
  if (item.slot === 'shoes') return look.shoes === item.id;
  if (item.slot === 'extra') return !!look[item.id];
  return look[item.slot] === item.id;
}
export const badgeName = (slug) => {
  const b = BADGES.find((x) => x.slug === slug);
  return b?.hidden ? 'Hidden badge' : (b?.name || slug);
};

/** Every wardrobe entry unlocked by a badge, sunglasses included. */
export function unlockables() {
  return [
    ...ITEMS.filter((i) => i.id),
    { id: 'sun', slot: 'glasses', name: 'Sunglasses', badge: SUNGLASSES_BADGE },
  ];
}

export function isUnlocked(ctx, item) {
  if (!item.badge) return true;
  return ctx.state.badges.some((b) => b.slug === item.badge);
}

const lower = (n) => (n <= 10 ? words(n).toLowerCase() : n.toLocaleString());

/** How close you are, in the design's phrasing. Empty when there's no count to show. */
export function progress(ctx, slug) {
  const done = ctx.state.sessions.filter((s) => s.endedAt);
  const best = (f) => done.reduce((m, s) => Math.max(m, f(s)), 0);
  const total = (f) => done.reduce((n, s) => n + f(s), 0);
  const nightBest = (n) => (n ? `Your best so far is ${lower(n)}.` : 'Not yet.');
  switch (slug) {
    case 'game-on': case 'no-notes': return nightBest(best((s) => (s.challenges || []).length));
    case 'ringleader': return `${total((s) => (s.challenges || []).length)} so far.`;
    case 'chaos-agent': return 'Keep doing challenges.';
    case 'long-haul': return `${Math.floor(total((s) => s.distanceM) / 1000)} km so far.`;
    case 'snack-break': return nightBest(best((s) => (s.meals || []).length));
    case 'pin-cushion': return nightBest(best((s) => s.pins.length));
    case 'big-stomp': case 'ten-k': { const n = best((s) => s.steps || 0); return n ? `Your best so far is ${n.toLocaleString()}.` : 'Not yet.'; }
    case 'just-add-water': return `${total((s) => s.waters.length)} so far.`;
    case 'anniversary': {
      const first = done.reduce((m, s) => Math.min(m, s.startedAt), Infinity);
      if (!Number.isFinite(first)) return '';
      const months = Math.floor((Date.now() - first) / (30.44 * 24 * 3600e3));
      if (months < 1) return 'Under a month so far.';
      return `${months === 1 ? 'One month' : `${words(months)} months`} so far.`;
    }
    default: return '';
  }
}

/* ---------- the unlock moment ----------
   Badges earned in a night wait for the recap, so nothing interrupts logging a
   drink. The catch plays once when the sheet opens; after that you page through
   the new badges, each showing its item on the avatar. Wear it puts the item
   on and moves on; Next badge skips it. */

export function itemsForBadges(slugs) {
  return unlockables().filter((i) => slugs.includes(i.badge));
}

export function openUnlocks(ctx, slugs, { onClose } = {}) {
  const items = itemsForBadges(slugs);
  if (!items.length) return false;
  let i = 0;
  const base = avatarLook(ctx);
  // Read fresh each page, so anything put on with Wear it stays on for the next.
  const wearing = (item) => ({ ...wear(avatarLook(ctx), item), badge: 'pin' });

  sheet((close) => {
    const box = el('div', { class: 'unlock__stage' });
    const count = el('span', { class: 'unlock__count num' });
    const dots = el('div', { class: 'unlock__dots' });
    const name = el('h2', { class: 'title', style: 'margin:0' });
    const body = el('p', { class: 'body', style: 'margin:0' });
    const next = btn('Next badge', 'btn--sec', () => advance());
    const av = createAvatar({ cell: 1.5, look: base, label: 'Your avatar wearing the new item' });
    box.append(el('div', { class: 'unlock__bloom' }), av.canvas, count, dots);

    const show = (first) => {
      const item = items[i];
      const badge = BADGES.find((b) => b.slug === item.badge);
      count.textContent = `${i + 1} of ${items.length}`;
      count.hidden = items.length < 2;
      dots.replaceChildren(...items.map((_, k) => el('span', { class: k === i ? 'on' : '' })));
      dots.hidden = items.length < 2;
      name.textContent = badge?.name || 'New badge';
      body.textContent = `${requirement(item.badge).replace('Comes with a badge that stays hidden until you earn it.', '100 challenges, all time.')} Comes with the ${PHRASE[item.id]}.`;
      next.querySelector('span').textContent = i === items.length - 1 ? 'Done' : 'Next badge';
      if (first) {
        // Looks up as it falls, catches it, holds it up, then wears it.
        av.play('badge');
        setTimeout(() => av.setLook(wearing(item)), 1250);
      } else {
        av.setLook(wearing(item));
      }
    };
    const advance = () => {
      if (i >= items.length - 1) { close(); return; }
      i++;
      show(false);
    };
    const wearBtn = btn('Wear it', 'btn--pri', () => {
      saveLook(ctx, wear(avatarLook(ctx), items[i]));
      advance();
    }, { lg: true });

    queueMicrotask(() => { av.start(); show(true); });
    return [
      box,
      el('div', { class: 'stack', style: 'gap:6px' },
        el('div', { class: 'eb', text: 'New badge' }), name, body),
      el('div', { class: 'stack', style: 'gap:7px' }, wearBtn, next),
    ];
  }, { onClose });
  return true;
}
