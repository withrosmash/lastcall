// Challenges — something to do when the night goes flat.
//
// Deliberate rule: not one of these involves drinking. In an app that tracks
// alcohol, a dare that pushes another round would be the wrong thing to ship.
// They're social, harmless, and doable sitting at a table.

import { el, btn, sheet, toast } from './ui.js';

export const CHALLENGES = [
  // From the testers
  { id: 'seat-swap', text: 'Convince someone in your group to swap seats with you without telling them why.' },
  { id: 'oddly-specific', text: 'Give someone a completely sincere compliment about something oddly specific.' },
  { id: 'fake-accent', text: 'Speak in a fake accent for the next five minutes and see who notices first.' },
  { id: 'album-cover', text: 'Get your group to recreate a famous album cover using only what’s around you.' },
  { id: 'new-name', text: 'Ask someone nearby to choose your new name for the next ten minutes.' },
  { id: 'dramatic-photo', text: 'Get a stranger to take a deliberately overdramatic group photo of you.' },
  { id: 'full-name', text: 'For the next three minutes, refer to one of your friends only by their full name.' },
  { id: 'pointless-vote', text: 'Start a completely unnecessary group vote on something stupid, like who would be the worst spy.' },
  { id: 'smuggle-word', text: 'Get someone in your group to tell you a word, then work it naturally into your next conversation.' },
  { id: 'serious-object', text: 'Take the most unnecessarily serious photo possible with the most ordinary object you can find.' },

  // Additions in the same spirit
  { id: 'documentary', text: 'Narrate what your group is doing as if it were a wildlife documentary. Keep going until someone joins in.' },
  { id: 'sincere-toast', text: 'Make a toast to something completely mundane, and mean every word of it.' },
  { id: 'swap-orders', text: 'Order for someone else in your group and let them order for you.' },
  { id: 'two-truths', text: 'Tell the group two true things and one lie about your week. See who guesses first.' },
  { id: 'best-photo', text: 'Take the best photo of the night in the next sixty seconds. No retakes.' },
  { id: 'expert', text: 'Become the group expert on something you know nothing about, for one full conversation.' },
  { id: 'handshake', text: 'Invent a group handshake and get everyone to do it correctly before you leave.' },
  { id: 'no-questions', text: 'Get through your next conversation without asking a single question.' },
  { id: 'menu-critic', text: 'Review something you are eating or drinking out loud, as a food critic would.' },
  { id: 'compliment-staff', text: 'Genuinely thank whoever is working tonight and mean it.' },
  { id: 'group-title', text: 'Give tonight an official title, and get everyone to use it for the rest of the night.' },
  { id: 'photograph-stranger', text: 'Ask another group to swap taking photos of each other.' },
  { id: 'sixty-seconds', text: 'Talk for sixty seconds about the last thing you looked up on your phone.' },
  { id: 'plan-heist', text: 'Get the group to plan a completely impractical heist of this venue.' },
  { id: 'oldest-story', text: 'Tell the oldest story you know about someone in the group. They get right of reply.' },
  { id: 'silent-minute', text: 'Get everyone to stay completely silent for one minute. Time it.' },
];

// Random, but never one already done tonight — and once every challenge is
// used the pool resets rather than dead-ending.
export function pick(session, exclude = []) {
  const doneIds = new Set([...(session.challenges || []).map((c) => c.id), ...exclude]);
  const pool = CHALLENGES.filter((c) => !doneIds.has(c.id));
  const from = pool.length ? pool : CHALLENGES;
  return from[Math.floor(Math.random() * from.length)];
}

export function openChallenge(ctx, session) {
  let current = pick(session);
  const skipped = [];

  sheet((close) => {
    const body = el('p', { class: 'body', style: 'margin:0;font-size:16px;line-height:1.5', text: current.text });
    const count = (session.challenges || []).length;

    const next = () => {
      skipped.push(current.id);
      current = pick(session, skipped);
      body.textContent = current.text;
    };

    return [
      el('div', { class: 'eb eb--mint', text: count ? `Challenge · ${count} done tonight` : 'Challenge' }),
      body,
      el('div', { class: 'foot' },
        btn('Done', 'btn--pri', () => { close(); ctx.logChallenge(current); }),
        el('div', { class: 'btn-pair' },
          btn('Another', 'btn--sec', next),
          btn('Not now', 'btn--sec', close),
        ),
      ),
    ];
  });
}
