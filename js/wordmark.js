// The Leit wordmark ("Norr", Claude Design round 3): four spaced capitals in
// a fine square stroke. Held here once, as paths moved to a 0,0 origin, so the
// app (SVG), the share card (canvas) and the store images (rectangles in
// scripts/icons.mjs) all draw exactly the delivered shapes.
// No DOM at import, so node can test it.

export const WORDMARK = {
  w: 190.25,
  h: 52,
  paths: [
    'M0 0H4.5V47.5H32.25V52H0Z',
    'M60 0H90.25V4.5H64.5V23.75H85.25V28.25H64.5V47.5H90.25V52H60Z',
    'M118 0H122.5V52H118Z',
    'M148.25 0H190.25V4.5H171.5V52H167V4.5H148.25Z',
  ],
};

// Clear space is one cap height all round; it never draws smaller than this.
export const MIN_HEIGHT = 8;

const RECTS = [
  [0, 0, 4.5, 52], [0, 47.5, 32.25, 4.5],
  [60, 0, 4.5, 52], [60, 0, 30.25, 4.5], [60, 23.75, 25.25, 4.5], [60, 47.5, 30.25, 4.5],
  [118, 0, 4.5, 52],
  [148.25, 0, 42, 4.5], [167, 0, 4.5, 52],
];

/** The wordmark as filled rectangles at a given height (it's all right angles). */
export function rects(height) {
  const k = Math.max(height, MIN_HEIGHT) / WORDMARK.h;
  return RECTS.map(([x, y, w, h]) => ({ x: x * k, y: y * k, w: w * k, h: h * k }));
}

export const wordmarkWidth = (height) => (WORDMARK.w / WORDMARK.h) * Math.max(height, MIN_HEIGHT);

/** Inline SVG in the current text colour. */
export function wordmarkSvg(height, { className = 'wordmark' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const h = Math.max(height, MIN_HEIGHT);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WORDMARK.w} ${WORDMARK.h}`);
  svg.setAttribute('width', String(+wordmarkWidth(h).toFixed(2)));
  svg.setAttribute('height', String(h));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Leit');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'currentColor');
  for (const d of WORDMARK.paths) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

/**
 * On a canvas: (x, y) is the top of the wordmark at its left, centre or right
 * edge. `shadow` is the photo card's halo, when the text theme has one.
 * Returns the width drawn.
 */
export function drawWordmark(g, x, y, height, { color, align = 'left', shadow = null } = {}) {
  const h = Math.max(height, MIN_HEIGHT);
  const w = wordmarkWidth(h);
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.save();
  g.translate(x0, y);
  g.scale(h / WORDMARK.h, h / WORDMARK.h);
  g.fillStyle = color;
  if (shadow) { g.shadowColor = shadow.color; g.shadowBlur = shadow.blur * (WORDMARK.h / h); }
  for (const d of WORDMARK.paths) g.fill(new Path2D(d));
  g.restore();
  return w;
}
