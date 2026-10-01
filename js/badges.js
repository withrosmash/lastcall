// The badge grid and badge art. The rules that award badges live in
// badge-checks.js.

import { BADGES } from './badges-data.js';
import { el, btn, spacer, foot, head, currentTheme } from './ui.js';
import { t } from './words.js';
import { evaluate } from './badge-checks.js';

export { evaluate };

/* ---------- UI ---------- */

// Light-theme versions are generated from these by scripts/light-badges.mjs.
// The share card isn't themed, so it asks for the dark art explicitly.
export const badgeSrc = (slug, theme = currentTheme()) =>
  `./icons/badges/${theme === 'light' ? 'light/' : ''}badge-${slug}.svg`;

const ACCENTS = { mint: '#7EE0C0', pink: '#F06C9B', amber: '#EF9F27', forest: '#35A26F' };

// Every badge has art as of the challenge set, so this never fires today. It
// stays as the guard for the next badge added ahead of its artwork: a missing
// SVG becomes a ringed monogram rather than a broken-image icon.
function placeholder(meta, size, earned) {
  const accent = earned ? (ACCENTS[meta?.accent] || ACCENTS.mint) : '#3A3A3A';
  const initials = (meta?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return el('div', {
    style: `width:${size}px;height:${size}px;border-radius:50%;background:#141414;`
      + `border:1.5px solid ${accent};color:${accent};display:flex;align-items:center;`
      + `justify-content:center;font-size:${Math.round(size * 0.3)}px;font-weight:700;letter-spacing:-.02em`,
    title: meta?.name || '',
  }, initials);
}

export function badgeChip(slug, { size = 64, earned = true } = {}) {
  const meta = BADGES.find((b) => b.slug === slug);
  const wrap = el('span', { style: `display:inline-flex;width:${size}px;height:${size}px` });
  const img = el('img', {
    src: badgeSrc(slug),
    // Hidden badges stay secret to screen readers too; locked ones say so.
    alt: !meta ? slug : earned ? meta.name : meta.hidden ? 'Hidden badge, locked' : `${meta.name}, locked`,
    width: size, height: size,
    class: earned ? '' : 'badge--locked',
    style: `width:${size}px;height:${size}px;border-radius:50%`,
  });
  img.addEventListener('error', () => wrap.replaceChildren(placeholder(meta, size, earned)));
  wrap.append(img);
  return wrap;
}

export function badgesScreen(ctx) {
  const earned = new Map(ctx.state.badges.map((b) => [b.slug, b]));
  const cats = [...new Set(BADGES.map((b) => b.cat))];

  return [
    head({ eyebrow: 'Badges', title: `${earned.size} of ${BADGES.length}`, back: () => ctx.back() }),

    ...cats.flatMap((cat) => [
      el('h2', { class: 'eb', style: 'margin:7px 0 0', text: cat }),
      el('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:9px' },
        BADGES.filter((b) => b.cat === cat).map((b) => {
          const got = earned.has(b.slug);
          const secret = b.hidden && !got;
          return el('div', { class: 'center', style: 'display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px 2px' },
            badgeChip(b.slug, { size: 64, earned: got }),
            el('div', { style: `font-size:12px;font-weight:700;letter-spacing:-.01em;color:${got ? 'var(--text)' : 'var(--muted-up)'}`, text: secret ? '???' : b.name, 'aria-hidden': 'true' }),
            el('div', { class: 'cap', style: 'font-size:11.5px;line-height:1.35', text: secret ? 'Keep going.' : t(b.criteria) }),
          );
        })),
    ]),

    spacer(),
    foot(btn('Back', 'btn--sec btn--sm', () => ctx.back())),
  ];
}

export { BADGES };
