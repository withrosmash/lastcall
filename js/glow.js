// The background glow, as one recipe fed by a colour. Night out's colours are
// the round 2 forest (dark) and cobalt (light); the other modes bring their
// own. Used by the app's .bloom layer and by the share card, so both match.
// No imports, so node can test it.

const a = (rgb, o) => `rgba(${rgb.join(',')},${o})`;

/**
 * Dark: four tones, brightest first (a lift at the source, then the ramp
 * down to black). Light: one colour at low strength over the pale ground.
 */
export function bloomCss({ dark, light }, theme) {
  if (theme === 'light') {
    const L = light;
    return {
      hero: `radial-gradient(70% 30% at 50% 0%,${a(L, .14)} 0%,${a(L, 0)} 100%),radial-gradient(140% 95% at 50% 0%,${a(L, .24)} 0%,${a(L, .12)} 40%,${a(L, .04)} 68%,${a(L, 0)} 90%)`,
      foot: `radial-gradient(70% 28% at 50% 100%,${a(L, .12)} 0%,${a(L, 0)} 100%),radial-gradient(140% 85% at 50% 100%,${a(L, .22)} 0%,${a(L, .10)} 40%,${a(L, .03)} 68%,${a(L, 0)} 90%)`,
    };
  }
  const [g1, g2, g3, g4] = dark;
  return {
    hero: `radial-gradient(70% 34% at 50% 0%,${a(g1, .34)} 0%,${a(g1, 0)} 100%),radial-gradient(140% 100% at 50% 0%,${a(g2, .58)} 0%,${a(g3, .40)} 34%,${a(g4, .26)} 64%,rgba(0,0,0,0) 90%)`,
    foot: `radial-gradient(70% 30% at 50% 100%,${a(g1, .26)} 0%,${a(g1, 0)} 100%),radial-gradient(140% 85% at 50% 100%,${a(g2, .52)} 0%,${a(g3, .34)} 34%,${a(g4, .20)} 64%,rgba(0,0,0,0) 90%)`,
  };
}

export const NIGHT_GLOW = {
  dark: [[53, 162, 111], [33, 118, 79], [23, 85, 59], [10, 36, 25]],
  light: [0, 71, 171],
};

/** The share card's glow from the foot: three stops, as the route card draws it. */
export function cardBloom({ dark, light }, theme) {
  if (theme === 'light') return [a(light, .26), a(light, .1), a(light, 0)];
  return [a(dark[1], .42), a(dark[3], .22), 'rgba(0,0,0,0)'];
}

/** The photo card's glow from the top (dark only; photos sit on black). */
export function photoBloom({ dark }) {
  return [a(dark[1], .55), a(dark[3], .35), 'rgba(0,0,0,0)'];
}
