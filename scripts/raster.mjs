// Fills SVG paths into pixel coverage, for scripts/icons.mjs: the Sprell
// wordmark is curved outlines, so the icons are drawn from its path rather
// than from rectangles. Pure functions, no file writes, so node can test it.

const NUM = /[MmLlHhVvQqCcZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const CURVE_STEPS = 16;

/** SVG path data (M L H V Q C Z, absolute or relative) as closed polygons. */
export function pathToPolygons(d) {
  const tokens = d.match(NUM) || [];
  const polys = [];
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0, cur = null;
  const num = () => +tokens[i++];
  const isNum = () => i < tokens.length && !/[A-Za-z]/.test(tokens[i]);
  const start = (px, py) => { cur = [[px, py]]; polys.push(cur); sx = px; sy = py; };
  const to = (px, py) => { if (!cur) start(x, y); cur.push([px, py]); };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') { x = sx; y = sy; cur = null; continue; }
    if (C === 'M') {
      x = num() + (rel ? x : 0); y = num() + (rel ? y : 0);
      start(x, y);
      cmd = rel ? 'l' : 'L'; // further pairs are lines
    } else if (C === 'L') {
      x = num() + (rel ? x : 0); y = num() + (rel ? y : 0); to(x, y);
    } else if (C === 'H') {
      x = num() + (rel ? x : 0); to(x, y);
    } else if (C === 'V') {
      y = num() + (rel ? y : 0); to(x, y);
    } else if (C === 'Q') {
      const cx = num() + (rel ? x : 0), cy = num() + (rel ? y : 0);
      const ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
      for (let s = 1; s <= CURVE_STEPS; s++) {
        const t = s / CURVE_STEPS, u = 1 - t;
        to(u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey);
      }
      x = ex; y = ey;
    } else if (C === 'C') {
      const c1x = num() + (rel ? x : 0), c1y = num() + (rel ? y : 0);
      const c2x = num() + (rel ? x : 0), c2y = num() + (rel ? y : 0);
      const ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
      for (let s = 1; s <= CURVE_STEPS; s++) {
        const t = s / CURVE_STEPS, u = 1 - t;
        to(u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey);
      }
      x = ex; y = ey;
    } else {
      throw new Error(`Unsupported path command ${cmd}`);
    }
    if (!isNum() && i < tokens.length && !/[A-Za-z]/.test(tokens[i])) i++;
  }
  // A closing point equal to the start is implied by the fill.
  for (const p of polys) {
    const a = p[0], b = p[p.length - 1];
    if (p.length > 1 && a[0] === b[0] && a[1] === b[1]) p.pop();
  }
  return polys.filter((p) => p.length >= 3);
}

/**
 * Nonzero-winding coverage of polygons on a P x P grid, 4 x 4 supersampled.
 * `box` = [x, y, size] is the square of path units the grid covers.
 */
export function fillCoverage(polys, P, [bx, by, bs]) {
  const k = P / bs;
  const edges = [];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
      if (y0 === y1) continue;
      edges.push([(x0 - bx) * k, (y0 - by) * k, (x1 - bx) * k, (y1 - by) * k]);
    }
  }
  const cov = new Float32Array(P * P);
  const hits = [];
  for (let row = 0; row < P * 4; row++) {
    const ys = (row + 0.5) / 4;
    hits.length = 0;
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= ys && ys < y1) || (y1 <= ys && ys < y0)) {
        hits.push([x0 + ((ys - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
      }
    }
    if (!hits.length) continue;
    hits.sort((a, b) => a[0] - b[0]);
    const pixRow = Math.floor(row / 4) * P;
    let wind = 0;
    for (let h = 0; h < hits.length - 1; h++) {
      wind += hits[h][1];
      if (!wind) continue;
      // Sample columns whose centres (s + 0.5) / 4 fall in [xa, xb).
      const s0 = Math.max(0, Math.ceil(hits[h][0] * 4 - 0.5));
      const s1 = Math.min(P * 4 - 1, Math.ceil(hits[h + 1][0] * 4 - 0.5) - 1);
      for (let s = s0; s <= s1; s++) cov[pixRow + (s >> 2)] += 1 / 16;
    }
  }
  for (let i = 0; i < cov.length; i++) if (cov[i] > 1) cov[i] = 1;
  return cov;
}

/**
 * The polygons of an SVG file's path, with the path's own
 * `translate(x y) scale(s)` transform applied (how the icons place the word).
 */
export function svgPolygons(svg) {
  const tag = svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, '').match(/<path\b[^>]*>/)[0];
  const d = tag.match(/ d="([^"]+)"/)[1];
  const t = tag.match(/transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*scale\(([-\d.]+)\)"/);
  const [tx, ty, s] = t ? [+t[1], +t[2], +t[3]] : [0, 0, 1];
  return pathToPolygons(d).map((poly) => poly.map(([x, y]) => [tx + x * s, ty + y * s]));
}
