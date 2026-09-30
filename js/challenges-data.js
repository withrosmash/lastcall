// Challenges: something to do when the adventure goes flat.
//
// Deliberate rule: not one of these involves drinking. In an app that tracks
// drinks, a challenge that pushes another round would be the wrong thing to
// ship. They're social or solo, harmless, and doable where you are.
//
// Each one names the modes it fits (some are for modes still being built) and
// whether it needs a group. No imports, so node can test it.

const ALL = ['night', 'day', 'walk', 'festival'];

export const CHALLENGES = [
  // From the testers
  { id: 'seat-swap', text: 'Convince someone in your group to swap seats with you without telling them why.' , modes: ['night', 'day'], group: true },
  { id: 'oddly-specific', text: 'Give someone a completely sincere compliment about something oddly specific.' , modes: ALL, group: true },
  { id: 'fake-accent', text: 'Speak in a fake accent for the next five minutes and see who notices first.' , modes: ALL, group: true },
  { id: 'album-cover', text: 'Get your group to recreate a famous album cover using only what’s around you.' , modes: ALL, group: true },
  { id: 'new-name', text: 'Ask someone nearby to choose your new name for the next ten minutes.' , modes: ALL, group: true },
  { id: 'dramatic-photo', text: 'Get a stranger to take a deliberately overdramatic group photo of you.' , modes: ['night', 'day', 'festival'], group: true },
  { id: 'full-name', text: 'For the next three minutes, refer to one of your friends only by their full name.' , modes: ALL, group: true },
  { id: 'pointless-vote', text: 'Start a completely unnecessary group vote on something stupid, like who would be the worst spy.' , modes: ALL, group: true },
  { id: 'smuggle-word', text: 'Get someone in your group to tell you a word, then work it naturally into your next conversation.' , modes: ALL, group: true },
  { id: 'serious-object', text: 'Take the most unnecessarily serious photo possible with the most ordinary object you can find.' , modes: ALL, group: false },

  // Additions in the same spirit
  { id: 'documentary', text: 'Narrate what your group is doing as if it were a wildlife documentary. Keep going until someone joins in.' , modes: ALL, group: true },
  { id: 'sincere-toast', text: 'Make a toast to something completely mundane, and mean every word of it.' , modes: ALL, group: true },
  { id: 'swap-orders', text: 'Order for someone else in your group and let them order for you.' , modes: ['night', 'day'], group: true },
  { id: 'two-truths', text: 'Tell the group two true things and one lie about your week. See who guesses first.' , modes: ALL, group: true },
  { id: 'best-photo', text: 'Take the best photo of the {n} in the next sixty seconds. No retakes.' , modes: ALL, group: false },
  { id: 'expert', text: 'Become the group expert on something you know nothing about, for one full conversation.' , modes: ALL, group: true },
  { id: 'handshake', text: 'Invent a group handshake and get everyone to do it correctly before you leave.' , modes: ALL, group: true },
  { id: 'no-questions', text: 'Get through your next conversation without asking a single question.' , modes: ALL, group: true },
  { id: 'menu-critic', text: 'Review something you are eating or drinking out loud, as a food critic would.' , modes: ['night', 'day', 'festival'], group: false },
  { id: 'compliment-staff', text: 'Genuinely thank whoever is working here and mean it.' , modes: ['night', 'day'], group: false },
  { id: 'group-title', text: 'Give this {n} an official title, and get everyone to use it from now on.' , modes: ALL, group: true },
  { id: 'photograph-stranger', text: 'Ask another group to swap taking photos of each other.' , modes: ['night', 'day', 'festival'], group: true },
  { id: 'sixty-seconds', text: 'Talk for sixty seconds about the last thing you looked up on your phone.' , modes: ALL, group: true },
  { id: 'plan-heist', text: 'Get the group to plan a completely impractical heist of this venue.' , modes: ['night', 'day'], group: true },
  { id: 'oldest-story', text: 'Tell the oldest story you know about someone in the group. They get right of reply.' , modes: ALL, group: true },
  { id: 'silent-minute', text: 'Get everyone to stay completely silent for one minute. Time it.' , modes: ALL, group: true },

  // Day out, Walk and Festival (M3). group: false means it works on your own.
  { id: 'older-than', text: 'Find something older than your grandparents and take its photo.', modes: ['day', 'walk'], group: false },
  { id: 'dream-door', text: 'Take a photo of a door you’d like to live behind.', modes: ['day', 'walk'], group: false },
  { id: 'five-birds', text: 'Spot five different birds before your next stop. Made-up names count.', modes: ['walk', 'day'], group: false },
  { id: 'best-view', text: 'Find the best view within ten minutes of here. Look at it for a full minute before you take a photo.', modes: ['walk', 'day'], group: false },
  { id: 'other-path', text: 'Take a path you’d normally walk past and follow it for five minutes.', modes: ['walk', 'day'], group: false },
  { id: 'five-hellos', text: 'Say hello to the next five people you pass.', modes: ['walk'], group: false },
  { id: 'bench-plaque', text: 'Find a bench with a plaque and read the whole thing.', modes: ['walk', 'day'], group: false },
  { id: 'keepsake', text: 'Keep a leaf, a stone or a ticket stub to remember today by.', modes: ['walk', 'day', 'festival'], group: false },
  { id: 'film-set', text: 'Take a photo that makes this place look like a film set.', modes: ['day', 'walk', 'festival'], group: false },
  { id: 'phone-down', text: 'Go the next five minutes without looking at your phone once.', modes: ['walk', 'day'], group: false },
  { id: 'dog-name', text: 'Give the next dog you see a full name, middle name included.', modes: ['walk', 'day'], group: false },
  { id: 'new-chorus', text: 'Pick an act you’ve never heard of and learn one of their choruses before the set ends.', modes: ['festival'], group: false },
  { id: 'swap-picks', text: 'Swap recommendations with a stranger, then go and see their pick.', modes: ['festival'], group: false },
  { id: 'best-outfit', text: 'Find the best outfit on site and tell its owner exactly why.', modes: ['festival'], group: false },
  { id: 'photobomb', text: 'Get your group into the background of someone else’s photo without them noticing.', modes: ['festival', 'day'], group: true },
  { id: 'new-chant', text: 'Get your group chanting for an act you’ve only just discovered.', modes: ['festival'], group: true },
  { id: 'oldest-date', text: 'Race your group to find the oldest date written or carved on anything nearby.', modes: ['walk', 'day'], group: true },
  // On your own on a night out (M3). Also fit other modes where they work.
  { id: 'best-name', text: 'Find the best-named thing on the menu and tell whoever’s serving why it won.', modes: ['night', 'day'], group: false },
  { id: 'staff-song', text: 'Ask whoever’s working which song they’d play if it were up to them.', modes: ['night'], group: false },
  { id: 'oldest-thing', text: 'Find the oldest-looking thing in the room and make up its life story.', modes: ['night', 'day'], group: false },
  { id: 'next-time', text: 'Ask someone nearby where you should go next time. Write it down, then do it.', modes: ['night', 'day', 'festival'], group: false },
  { id: 'one-fact', text: 'Learn someone’s name and one thing about them you’d never have guessed.', modes: ['night', 'day', 'festival'], group: false },
  { id: 'dramatic-angle', text: 'Take a photo of the room from the most dramatic angle you can find.', modes: ['night', 'day'], group: false },
  { id: 'superfan', text: 'Go find an artist you’ve never heard of, preferably a small one, and superfan them. It’ll make their day.', modes: ['night', 'festival'], group: false },
];

/**
 * The challenges that fit where you are: the current part's mode, and only
 * solo ones when you're on your own. Done ones are skipped until every fitting
 * one has been done, then the pool starts again rather than running dry.
 */
export function poolFor(list, part, done) {
  const fits = list.filter((c) => c.modes.includes(part.mode) && (part.company === 'group' || !c.group));
  if (!fits.length) return list;
  const fresh = fits.filter((c) => !done.has(c.id));
  return fresh.length ? fresh : fits;
}

/** A random one from the pool, never the one already on screen unless it's the only one. */
export function pickFrom(pool, avoidId = null) {
  const choices = pool.length > 1 ? pool.filter((c) => c.id !== avoidId) : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}
