// Makes the light-theme badges from the dark ones by swapping colours.
//
// Every badge is built on one template: a #141414 disc, a white highlight arc,
// and a single accent (mint, pink, amber or forest) for the ring, glow and
// symbol. Light mode keeps the template and swaps each colour for its light
// token, so a new badge only ever needs drawing once.
//
//   node scripts/light-badges.mjs    (rerun whenever a badge is added)

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'icons/badges');
const out = resolve(src, 'light');

// Accents: the dark token → the light token (colors-light.css).
const HEX = { '#7EE0C0': '#0B6E55', '#F06C9B': '#C92F68', '#EF9F27': '#A35F00', '#35A26F': '#21764F' };
// The same colours inside rgba(), plus the white highlight, which becomes navy.
const RGB = {
  '126,224,192': '11,110,85', '240,108,155': '201,47,104', '239,159,39': '163,95,0',
  '53,162,111': '33,118,79', '255,255,255': '11,21,38',
};
const DISC_DARK = '<circle cx="256" cy="256" r="225" fill="#141414"></circle>';
const DISC_LIGHT = '<circle cx="256" cy="256" r="225" fill="#FFFFFF" stroke="#D5DDE9" stroke-width="4"></circle>';

await mkdir(out, { recursive: true });
let n = 0;
for (const f of (await readdir(src)).filter((f) => f.endsWith('.svg'))) {
  let s = await readFile(resolve(src, f), 'utf8');
  if (!s.includes(DISC_DARK)) { console.warn(`skipped ${f}: not on the badge template`); continue; }
  s = s.replace(DISC_DARK, DISC_LIGHT);
  for (const [a, b] of Object.entries(HEX)) s = s.replaceAll(a, b).replaceAll(a.toLowerCase(), b);
  for (const [a, b] of Object.entries(RGB)) s = s.replaceAll(`rgba(${a},`, `rgba(${b},`);
  await writeFile(resolve(out, f), s);
  n++;
}
console.log(`light badges: ${n} written to icons/badges/light/`);
