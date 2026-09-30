// What the app calls each time you head out. The name is still being tried
// on real people, so every user-facing "night" goes through t() and the word
// is chosen here, in one place (WORDING). No imports, so node can test it.
//
// Tokens: {n} noun, {N} capitalised, {ns} plural, {Ns}, {a} with its
// article ("an adventure"), {A} capitalised.

export const WORDINGS = {
  adventure: { label: 'Adventure', n: 'adventure', ns: 'adventures', art: 'an' },
  outing: { label: 'Outing', n: 'outing', ns: 'outings', art: 'an' },
  quest: { label: 'Quest', n: 'quest', ns: 'quests', art: 'a', recapTitle: 'Quest complete.' },
  sidequest: { label: 'Sidequest', n: 'sidequest', ns: 'sidequests', art: 'a', recapTitle: 'Sidequest complete.' },
  night: { label: 'Night', n: 'night', ns: 'nights', art: 'a', endTitle: 'Call it a night?', recapTitle: 'That was a night.' },
};

const WORDING = 'adventure';
const GENERIC = { endTitle: 'End the {n}?', recapTitle: 'What {a}.' };

let current = WORDING;

export function setWording(key) {
  current = WORDINGS[key] ? key : WORDING;
}

export const currentWording = () => current;

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function t(text, key = current) {
  const w = WORDINGS[key] || WORDINGS[WORDING];
  const a = `${w.art} ${w.n}`;
  const fill = { n: w.n, N: cap(w.n), ns: w.ns, Ns: cap(w.ns), a, A: cap(a) };
  return text.replace(/\{(n|N|ns|Ns|a|A)\}/g, (_, k) => fill[k]);
}

export function phrase(name, key = current) {
  const w = WORDINGS[key] || WORDINGS[WORDING];
  return t(w[name] || GENERIC[name], key);
}
