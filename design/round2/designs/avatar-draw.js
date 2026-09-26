// Last Call avatar: 32 x 43 pixel chibi, recoloured at draw time.
// Head centre (16,17), eyes at (12,19) and (20,19). Outlines are a darker tone of the part, never black.
(function () {
  const W = 32, H = 43;
  const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const mul = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const ell = (x, y, cx, cy, rx, ry) => { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; return dx * dx + dy * dy <= 1; };
  const WHITE = [255, 255, 255];
  const HAIRS = ['short', 'long', 'bun', 'quiff', 'curly', 'scruffy', 'mohawk', 'pigtails', 'bald'];
  const TOPS = ['tee', 'hoodie', 'shirt', 'jacket', 'dress'];
  const Z = { hairBack: 0, shoes: 1, bottoms: 1.1, top: 1.2, arm: 1.3, neck: 1.05, head: 2, face: 3, hair: 4, glasses: 5, hat: 6, held: 7 };
  const GOLD = [232, 182, 74];

  function build(look0, only) {
    let look = look0;
    if (look0.costume === 'elvis') look = { ...look0, hair: 'elvis', glasses: 'aviator', top: 'jumpsuit', colors: { ...look0.colors, hair: '#16141C', top: '#F2F0EA', bottoms: '#F2F0EA' } };
    const g = new Array(W * H).fill(null);
    const C = {}; Object.keys(look.colors).forEach((k) => (C[k] = hex(look.colors[k])));
    const costumeParts = look.costume ? ['hair', 'hairBack', 'top', 'bottoms', 'glasses'] : [];
    const set = (x, y, c, part, outline = true, tag) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const t = costumeParts.includes(part) && part !== 'face' ? look.costume : (tag || part);
      if (only && only !== t) return;
      g[y * W + x] = { c, z: Z[part], part, outline };
    };
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : g[y * W + x]);
    const hat = look.hat || null;
    const hood = hat === 'duck' || hat === 'dino' || hat === 'panda';
    const hatClip = { cap: 11, bucket: 11, cowboy: 10, nightcap: 9 }[hat] || -1;
    const hs = look.hair;

    // hair back layer
    if (!hood && hs === 'long') {
      for (let y = 9; y <= 34; y++) for (let x = 3; x <= 28; x++) {
        if (y >= 32 && (x < 5 || x > 26)) continue;
        if (y > 20 && x > 7 && x < 24) continue;
        set(x, y, mul(C.hair, .88), 'hairBack');
      }
    }
    if (!hood && hs === 'bun' && hatClip < 0 && hat !== 'party') {
      for (let y = 0; y <= 8; y++) for (let x = 11; x <= 21; x++) if (ell(x, y, 16, 4.2, 4.6, 4.2)) set(x, y, C.hair, 'hair');
    }

    // body
    const top = look.top || 'tee';
    const longSleeve = top === 'hoodie' || top === 'jacket' || top === 'jumpsuit' || top === 'pyjamas';
    if (top === 'pyjamas') C.bottoms = C.top;
    for (let y = 27; y <= 29; y++) for (let x = 14; x <= 17; x++) set(x, y, C.skin, 'neck');
    if (top === 'hoodie') for (let y = 27; y <= 29; y++) for (let x = 10; x <= 21; x++) if (!(x >= 14 && x <= 17 && y === 29)) set(x, y, mul(C.top, .8), 'top');
    if (top === 'jumpsuit') {
      [[24, [5, 5]], [25, [5, 6]], [26, [5, 7]], [27, [6, 8]], [28, [7, 9]], [29, [8, 10]]].forEach(([y, [a, b]]) => { for (let x = a; x <= b; x++) { set(x, y, C.top, 'top'); set(31 - x, y, C.top, 'top'); } });
    }
    if (top === 'dress') {
      for (let y = 29; y <= 33; y++) for (let x = 11; x <= 20; x++) set(x, y, C.top, 'top');
      for (let y = 29; y <= 30; y++) for (const x of [8, 9, 10, 21, 22, 23]) set(x, y, mix(C.top, WHITE, .14), 'top');
      for (let y = 31; y <= 35; y++) for (const x of [8, 9, 22, 23]) set(x, y, C.skin, 'arm');
      const skirt = { 34: [10, 21], 35: [10, 21], 36: [9, 22], 37: [9, 22], 38: [8, 23] };
      Object.entries(skirt).forEach(([y, [a, b]]) => { for (let x = a; x <= b; x++) set(x, +y, C.top, 'top'); });
      for (const x of [12, 13, 18, 19]) set(x, 39, C.skin, 'arm');
    } else {
      for (let y = 29; y <= 36; y++) { const x0 = y === 29 ? 11 : 10, x1 = y === 29 ? 20 : 21; for (let x = x0; x <= x1; x++) set(x, y, C.top, 'top'); }
      const sleeveEnd = longSleeve ? 34 : 32;
      for (let y = 29; y <= sleeveEnd; y++) for (const x of [8, 9, 22, 23]) set(x, y, C.top, 'top');
      if (top === 'jumpsuit') for (const x of [7, 24]) set(x, 34, C.top, 'top');
      for (let y = sleeveEnd + 1; y <= sleeveEnd + 2; y++) for (const x of [8, 9, 22, 23]) set(x, y, C.skin, 'arm');
      for (let y = 37; y <= 39; y++) for (let x = 11; x <= 20; x++) { if (y === 39 && (x === 15 || x === 16)) continue; set(x, y, C.bottoms, 'bottoms'); }
      if (top === 'jumpsuit') { set(10, 39, C.bottoms, 'bottoms'); set(21, 39, C.bottoms, 'bottoms'); }
    }
    for (let y = 40; y <= 42; y++) {
      const l = y === 40 ? [11, 14] : [10, 14], r = y === 40 ? [17, 20] : [17, 21];
      const st = look.shoes === 'trainers' ? 'trainers' : 'shoes';
      for (let x = l[0]; x <= l[1]; x++) set(x, y, C.shoes, 'shoes', true, st);
      for (let x = r[0]; x <= r[1]; x++) set(x, y, C.shoes, 'shoes', true, st);
    }
    if (!only || only === look.costume || only === 'hair' || only === 'top') {
      if (top === 'hoodie') { [[14, 31], [14, 32], [17, 31], [17, 32]].forEach(([x, y]) => set(x, y, mix(C.top, WHITE, .55), 'top', false)); for (let x = 12; x <= 19; x++) set(x, 35, mul(C.top, .82), 'top', false); }
      if (top === 'shirt') { [[13, 29], [14, 30], [18, 29], [17, 30]].forEach(([x, y]) => set(x, y, mix(C.top, WHITE, .6), 'top', false)); [31, 33, 35].forEach((y) => set(15, y, mul(C.top, .7), 'top', false)); }
      if (top === 'jacket') { for (let y = 29; y <= 36; y++) for (const x of [15, 16]) set(x, y, [232, 230, 225], 'top', false); [[14, 29], [14, 30], [17, 29], [17, 30]].forEach(([x, y]) => set(x, y, mul(C.top, .75), 'top', false)); }
      if (top === 'dress') {
        set(14, 29, C.skin, 'top', false); set(15, 29, C.skin, 'top', false); set(16, 29, C.skin, 'top', false); set(17, 29, C.skin, 'top', false); set(15, 30, C.skin, 'top', false); set(16, 30, C.skin, 'top', false);
        for (let x = 11; x <= 20; x++) set(x, 33, mul(C.top, .72), 'top', false);
        for (let y = 35; y <= 37; y++) for (const x of [12, 15, 16, 19]) if ((y + x) % 2) set(x, y, mul(C.top, .84), 'top', false);
        for (let x = 9; x <= 22; x += 2) set(x, 38, mix(C.top, WHITE, .3), 'top', false);
      }
      if (top === 'jumpsuit') {
        [[14, 29], [15, 29], [16, 29], [17, 29], [15, 30], [16, 30], [15, 31], [16, 31]].forEach(([x, y]) => set(x, y, C.skin, 'top', false));
        [[12, 30], [19, 30], [13, 32], [18, 32], [12, 34], [19, 34], [8, 34], [23, 34], [9, 34], [22, 34]].forEach(([x, y]) => set(x, y, GOLD, 'top', false));
        for (let x = 10; x <= 21; x++) set(x, 36, x === 15 || x === 16 ? [255, 222, 140] : GOLD, 'top', false);
        [[12, 38], [19, 38], [11, 39], [20, 39]].forEach(([x, y]) => set(x, y, GOLD, 'bottoms', false));
      }
    }

    // head
    for (let y = 5; y <= 29; y++) for (let x = 3; x <= 28; x++) if (ell(x, y, 16, 17.5, 12.5, 11.6)) set(x, y, C.skin, 'head');

    // hair front
    const J = (x, arr) => arr[((x % arr.length) + arr.length) % arr.length];
    const fringe = (x) => {
      if (hs === 'bun') return 10 + (x > 12 && x < 20 ? 0 : J(x, [0, 1, 1, 0]));
      if (hs === 'quiff') return x >= 17 && x <= 24 ? 10 : 9;
      if (hs === 'curly') return 10 + J(x, [0, 1, 2, 1]);
      if (hs === 'scruffy') return 11 + J(x, [1, 0, 2, 1, 0, 2, 1, 1, 0, 2]);
      if (hs === 'mohawk') return 8;
      if (hs === 'pigtails') return 10 + (x === 15 || x === 16 ? -1 : J(x, [0, 1, 0, 1]));
      if (hs === 'elvis') return 10;
      return 11 + J(x, [0, 1, 1, 0, 1, 0, 0, 1]);
    };
    const faceMask = (x, y) => y > fringe(x) && ell(x, y, 16, 19.8, 9.6, 9.8);
    const Q = { 0: [16, 22], 1: [12, 24], 2: [9, 25], 3: [7, 26], 4: [6, 26], 5: [5, 26], 6: [4, 27], 7: [4, 27], 8: [4, 27] };
    const hairOn = (x, y) => {
      const inCap = ell(x, y, 16, 16.5, 13.6, 12.6);
      const base = inCap && y <= fringe(x);
      const sides = (lim) => inCap && (x <= 6 || x >= 25) && y <= lim;
      switch (hs) {
        case 'short': return base || sides(17);
        case 'long': return base || sides(26) || ((x === 3 || x === 28) && y >= 14 && y <= 26);
        case 'bun': return base || sides(16);
        case 'quiff': { const q = Q[y]; return (q && x >= q[0] && x <= q[1]) || base || (inCap && (x <= 5 || x >= 26) && y <= 14); }
        case 'curly': {
          const vol = ell(x, y, 16, 14, 15.8, 12.6) && y <= 23;
          if (!vol) return false;
          const rim = !ell(x, y, 16, 14, 14.4, 11.3);
          if (rim && (x + y) % 3 === 0) return false;
          return y <= fringe(x) || x <= 6 || x >= 25;
        }
        case 'scruffy': {
          const spikes = { 6: 5, 8: 3, 9: 4, 11: 2, 13: 2, 14: 1, 17: 1, 18: 2, 20: 2, 22: 3, 23: 4, 25: 5 };
          if (spikes[x] !== undefined && y >= spikes[x] && y <= 9) return true;
          if ((x === 3 && y === 12) || (x === 28 && y === 13)) return true;
          return base || (inCap && (x <= 6 || x >= 25) && y <= 17 + J(x, [0, 1, -1]));
        }
        case 'mohawk': {
          const tops = { 10: 6, 11: 4, 12: 2, 13: 1, 14: 0, 15: 0, 16: 0, 17: 0, 18: 1, 19: 2, 20: 4, 21: 6 };
          return x >= 10 && x <= 21 && y >= tops[x] && y <= (x >= 12 && x <= 19 ? 10 : 8);
        }
        case 'pigtails': {
          if (ell(x, y, 2.6, 19.5, 3.3, 3.6) || ell(x, y, 29.4, 19.5, 3.3, 3.6)) return true;
          return base || sides(17);
        }
        case 'elvis': return (ell(x, y, 15.5, 5.8, 11.6, 5.6) && y <= 10) || base || (((x >= 4 && x <= 6) || (x >= 25 && x <= 27)) && y <= 23 && ell(x, y, 16, 17, 13.8, 13.4));
      }
      return false;
    };
    if (!hood && hs !== 'bald') {
      for (let y = 0; y <= 27; y++) for (let x = 0; x < W; x++) {
        if (faceMask(x, y)) continue;
        if (!hairOn(x, y)) continue;
        if (y < hatClip && x >= 2 && x <= 29) continue;
        set(x, y, C.hair, 'hair');
      }
      if (!only || only === look.costume || only === 'hair' || only === 'top') {
        const recol = (pts, fn) => pts.forEach(([x, y]) => { const p = get(x, y); if (p && p.part === 'hair') { p.c = fn(p.c); p.outline = false; } });
        const shine = (c) => mix(c, WHITE, .32);
        if (hs === 'quiff') {
          for (let y = 1; y <= 7; y++) for (let x = 6; x <= 25; x++) if (y >= 2 && (x - 2 * y) % 9 === 0) recol([[x, y]], (c) => mul(c, .78));
          recol([[12, 2], [13, 2], [14, 1], [15, 1]], shine);
        } else if (hs === 'curly') {
          for (let y = 2; y <= 22; y++) for (let x = 1; x < 31; x++) if ((x * 3 + y * 5) % 11 === 0) { recol([[x, y]], (c) => mul(c, .78)); recol([[x + 1, y]], (c) => mul(c, .86)); }
        } else if (hs === 'mohawk') {
          for (let y = 6; y <= 12; y++) for (let x = 4; x <= 27; x++) if ((x < 10 || x > 21) && ell(x, y, 16, 16.5, 12.4, 11.4) && y <= 11) { const p = get(x, y); if (p && p.part === 'head') { p.c = mix(C.skin, C.hair, .16); } }
          recol([[14, 2], [14, 3], [15, 1], [15, 2]], shine);
        } else if (hs === 'pigtails') {
          const tie = [240, 108, 155];
          [[5, 18], [5, 19], [5, 20], [26, 18], [26, 19], [26, 20]].forEach(([x, y]) => { const p = get(x, y); if (p && p.part === 'hair') { p.c = tie; p.outline = false; } });
          recol([[9, 7], [10, 6], [20, 6], [21, 7]], shine);
          recol([[16, 4], [16, 5], [16, 6], [16, 7], [15, 8]], (c) => mul(c, .7));
        } else if (hs === 'elvis') {
          recol([[8, 4], [9, 3], [10, 2], [11, 2], [12, 1], [13, 1]], (c) => mix(c, [120, 140, 190], .5));
          recol([[14, 9], [15, 8], [16, 9]], (c) => mul(c, .6));
        } else {
          recol([[9, 8], [10, 7], [11, 7], [12, 6]], shine);
        }
      }
    } else if (!hood && !only) {
      [[10, 9], [11, 8], [12, 8]].forEach(([x, y]) => set(x, y, mix(C.skin, WHITE, .38), 'head', false));
    }

    if (!only) face(look, C, set);

    // glasses
    const gl = look.glasses;
    const gy = look.glassesUp ? -8 : 0;
    const gset = (x, y, c, part, o, tag) => set(x, y + gy, c, gy ? 'hat' : part, o, tag);
    const gget = (x, y) => get(x, y + gy);
    if (gl && gl !== 'none') {
      const F = gl === 'sun' ? [26, 26, 30] : gl === 'aviator' ? GOLD : hex(look.frameColor || '#2A2B30');
      const AV = ['FFFFFFF', 'FLLLLLF', 'FLHLLLF', 'FLLLLLF', '.FLLLLF', '..FFFF.'];
      const frame = (x0, flip) => {
        if (gl === 'aviator') {
          AV.forEach((row, dy) => [...row].forEach((ch, dx) => { const xx = flip ? x0 + 6 - dx : x0 + dx; if (ch === '.') return; gset(xx, 16 + dy, ch === 'F' ? F : ch === 'H' ? [170, 120, 70] : [92, 56, 30], 'glasses', false); }));
          return;
        }
        for (let y = 16; y <= 22; y++) for (let x = x0; x <= x0 + 6; x++) {
          const edge = y === 16 || y === 22 || x === x0 || x === x0 + 6;
          const corner = (y === 16 || y === 22) && (x === x0 || x === x0 + 6);
          if (gl === 'round' && corner) continue;
          if (gl === 'browline') { if (y <= 17 || ((x === x0 || x === x0 + 6) && y <= 19)) gset(x, y, F, 'glasses', false); continue; }
          if (gl === 'sun') { if (corner) continue; const hl = (x === x0 + 1 && y === 17) || (x === x0 + 2 && y === 17) || (x === x0 + 1 && y === 18); gset(x, y, edge ? F : hl ? [120, 124, 138] : [14, 14, 18], 'glasses', false, 'sun'); continue; }
          if (edge) gset(x, y, F, 'glasses', false);
        }
      };
      frame(8, false); frame(17, true);
      gset(15, gl === 'aviator' ? 16 : 18, F, 'glasses', false, gl === 'sun' ? 'sun' : undefined); gset(16, gl === 'aviator' ? 16 : 18, F, 'glasses', false, gl === 'sun' ? 'sun' : undefined);
      [5, 6, 7, 24, 25, 26].forEach((x) => { const p = gget(x, gl === 'aviator' ? 17 : 18); if (!p || p.part !== 'hair') gset(x, gl === 'aviator' ? 17 : 18, F, 'glasses', false, gl === 'sun' ? 'sun' : undefined); });
    }

    // hats
    if (hat) {
      const tag = hat;
      const S = (x, y, c, o = true) => set(x, y, c, 'hat', o, tag);
      if (hat === 'cap') {
        const c = C.top;
        for (let y = 2; y <= 10; y++) for (let x = 3; x <= 29; x++) if (ell(x, y, 16, 11, 12.8, 8.6)) S(x, y, c);
        for (let x = 5; x <= 26; x++) S(x, 11, mul(c, .78));
        for (let x = 8; x <= 23; x++) S(x, 12, mul(c, .7));
        S(16, 2, mix(c, WHITE, .4), false);
      }
      if (hat === 'bucket') {
        const c = C.bottoms;
        for (let y = 3; y <= 10; y++) for (let x = 4; x <= 28; x++) if (ell(x, y, 16, 10.5, 11.5, 7.6)) S(x, y, c);
        for (let x = 2; x <= 29; x++) S(x, 11, mul(c, .85));
        for (let x = 3; x <= 28; x++) S(x, 12, mul(c, .72));
        for (let x = 6; x <= 25; x++) S(x, 9, mul(c, .7), false);
      }
      if (hat === 'party') {
        const a = [240, 108, 155], b = [126, 224, 192];
        for (let y = 1; y <= 10; y++) { const hw = Math.round(y * .72); for (let x = 16 - hw; x <= 15 + hw; x++) S(x, y, ((x + y) % 4 < 2) ? a : b); }
        S(15, 0, WHITE, false); S(16, 0, WHITE, false);
      }
      if (hat === 'crown') {
        const c = [242, 193, 78];
        for (let y = 5; y <= 7; y++) for (let x = 9; x <= 22; x++) S(x, y, c);
        [[9, 11, 4], [14, 17, 4], [20, 22, 4], [9, 10, 3], [15, 16, 3], [21, 22, 3], [9, 9, 2], [15, 16, 2], [22, 22, 2]].forEach(([a0, a1, y]) => { for (let x = a0; x <= a1; x++) S(x, y, c); });
        S(12, 6, [240, 108, 155], false); S(19, 6, [240, 108, 155], false); S(15, 6, [126, 224, 192], false); S(16, 6, [126, 224, 192], false);
      }
      if (hat === 'headphones') {
        const band = [112, 118, 132], cup = [126, 224, 192];
        for (let y = 1; y <= 12; y++) for (let x = 0; x < W; x++) if (ell(x, y, 16, 16, 14.6, 14) && !ell(x, y, 16, 16, 12.6, 12.2)) S(x, y, band);
        for (let y = 14; y <= 22; y++) { for (let x = 1; x <= 4; x++) S(x, y, x === 4 ? cup : band); for (let x = 27; x <= 30; x++) S(x, y, x === 27 ? cup : band); }
      }
      if (hat === 'cowboy') {
        const c = [176, 122, 69];
        for (let y = 1; y <= 8; y++) for (let x = 10; x <= 21; x++) { if (y === 1 && (x < 11 || x > 20 || x === 15 || x === 16)) continue; S(x, y, y >= 7 ? mul(c, .55) : c); }
        [[8, 0, 2], [8, 29, 31], [9, 1, 30], [10, 3, 28]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) if (!(y === 8 && x > 9 && x < 22)) S(x, y, y === 10 ? mul(c, .8) : c); });
        S(12, 3, mix(c, WHITE, .3), false); S(12, 4, mix(c, WHITE, .3), false);
      }
      const ring = (c) => { for (let y = 1; y <= 28; y++) for (let x = 0; x < W; x++) if (ell(x, y, 16, 16.5, 14.4, 13.6) && !ell(x, y, 16, 20.2, 9.8, 8.8)) S(x, y, c); };
      const hoodEyes = (pts) => pts.forEach(([x, y]) => { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => S(x + a, y + b, [30, 26, 24], false)); S(x, y, WHITE, false); });
      if (hat === 'dino') {
        const gr = [112, 190, 92], sp = [242, 160, 64];
        [[9, 2], [13, 1], [18, 1], [22, 2]].forEach(([cx, ty]) => { S(cx, ty, sp); S(cx - 1, ty + 1, sp); S(cx, ty + 1, sp); S(cx + 1, ty + 1, sp); for (let x = cx - 1; x <= cx + 1; x++) S(x, ty + 2, sp); });
        ring(gr);
        for (let y = 20; y <= 27; y++) for (let x = 0; x < W; x++) { const p = get(x, y); if (p && p.part === 'hat' && y >= 24 && (x < 8 || x > 23)) p.c = mix(gr, [255, 240, 180], .35); }
        hoodEyes([[9, 6], [21, 6]]);
        [10, 12, 14, 17, 19, 21].forEach((x) => S(x, 11, WHITE, false));
        [11, 13, 18, 20].forEach((x) => S(x, 12, WHITE, false));
      }
      if (hat === 'panda') {
        const wh = [240, 240, 236], bk = [34, 34, 40];
        for (let y = 0; y <= 8; y++) for (let x = 0; x < W; x++) if (ell(x, y, 5.5, 4, 3.2, 3.2) || ell(x, y, 26.5, 4, 3.2, 3.2)) S(x, y, bk);
        ring(wh);
        for (let y = 6; y <= 9; y++) for (let x = 8; x <= 24; x++) if (ell(x, y, 11, 7.8, 2.4, 1.8) || ell(x, y, 21, 7.8, 2.4, 1.8)) S(x, y, bk, false);
        S(11, 7, WHITE, false); S(21, 7, WHITE, false);
        S(15, 10, bk, false); S(16, 10, bk, false);
      }
      if (hat === 'duck') {
        const y1 = [245, 200, 66], bill = [240, 138, 36];
        ring(y1);
        [[10, 6], [11, 6], [10, 7], [11, 7], [20, 6], [21, 6], [20, 7], [21, 7]].forEach(([x, y]) => S(x, y, [30, 26, 24], false));
        S(10, 6, WHITE, false); S(20, 6, WHITE, false);
        [[9, 12, 19], [10, 11, 20], [11, 12, 19]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) S(x, y, y === 11 ? mul(bill, .82) : bill); });
        S(15, 0, y1); S(16, 0, y1); S(17, 1, y1);
      }
      if (hat === 'nightcap') {
        const c = C.top, band = mix(C.top, WHITE, .6);
        for (let y = 2; y <= 8; y++) for (let x = 5; x <= 27; x++) if (ell(x, y, 16, 9.5, 11, 8.2)) S(x, y, x % 3 === 0 ? mix(c, WHITE, .38) : c);
        for (let i = 0; i <= 9; i++) { const x = 17 + i, y = 2 + Math.floor(i * .7); for (let d = 0; d < 3; d++) S(x, y + d, (x % 3 === 0) ? mix(c, WHITE, .38) : c); }
        for (let y = 8; y <= 10; y++) for (let x = 4; x <= 27; x++) if (y < 10 || (x > 5 && x < 26)) S(x, y, band);
        for (let y = 9; y <= 14; y++) for (let x = 25; x <= 31; x++) if (ell(x, y, 28, 11.8, 2.2, 2.2)) S(x, y, [245, 245, 240]);
      }
      if (hat === 'catears') {
        const c = C.hair, pink = [244, 166, 192];
        const ear = [[0, 6, 6], [1, 6, 7], [2, 5, 8], [3, 5, 9], [4, 4, 10], [5, 4, 11], [6, 4, 12], [7, 5, 12]];
        ear.forEach(([y, a, b]) => { for (let x = a; x <= b; x++) { S(x, y, c); S(31 - x, y, c); } });
        [[3, 7, 7], [4, 6, 8], [5, 6, 9], [6, 7, 10]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) { S(x, y, pink, false); S(31 - x, y, pink, false); } });
      }
    }

    // held + shoes
    if (look.held === 'bottle') {
      for (let y = 27; y <= 28; y++) for (let x = 24; x <= 26; x++) set(x, y, [236, 236, 236], 'held', true, 'bottle');
      for (let y = 29; y <= 36; y++) for (let x = 24; x <= 26; x++) set(x, y, x === 24 ? [150, 210, 245] : [95, 180, 232], 'held', true, 'bottle');
      if (!only) { set(23, 33, C.skin, 'held', false); set(23, 34, C.skin, 'held', false); }
    }
    const Hd = (x, y, c, o = true) => set(x, y, c, 'held', o, look.held);
    if (look.held === 'balloon') {
      const red = [232, 72, 86];
      for (let y = 6; y <= 18; y++) for (let x = 22; x <= 31; x++) if (ell(x, y, 27, 12, 4, 5.2)) Hd(x, y, red);
      Hd(27, 17, mul(red, .7)); Hd(26, 18, mul(red, .7)); Hd(27, 18, mul(red, .7));
      Hd(25, 9, mix(red, WHITE, .6), false); Hd(25, 10, mix(red, WHITE, .45), false);
      [[27, 19], [27, 20], [26, 21], [26, 22], [26, 23], [25, 24], [25, 25], [25, 26], [24, 27], [24, 28], [24, 29], [24, 30], [24, 31], [24, 32], [24, 33]].forEach(([x, y]) => Hd(x, y, [200, 200, 200], false));
    }
    if (look.held === 'pizza') {
      const crust = [214, 150, 72], cheese = [255, 204, 92], pep = [204, 62, 52];
      for (let x = 24; x <= 30; x++) Hd(x, 29, crust);
      [[30, 24, 29], [31, 24, 28], [32, 24, 27], [33, 24, 26], [34, 24, 25]].forEach(([y, a, b]) => { for (let x = a; x <= b; x++) Hd(x, y, cheese); });
      Hd(24, 35, cheese);
      [[26, 30], [28, 30], [25, 32]].forEach(([x, y]) => Hd(x, y, pep, false));
      if (!only) { set(23, 33, C.skin, 'held', false); set(23, 34, C.skin, 'held', false); }
    }
    if (look.shoes === 'trainers') {
      const up = [247, 247, 242], stripe = [126, 224, 192], sole = [206, 206, 200], lace = [240, 108, 155];
      const T = (x, y, c, o = true) => set(x, y, c, 'held', o, 'trainers');
      for (let y = 39; y <= 41; y++) { for (let x = 10; x <= 14; x++) T(x, y, up); for (let x = 17; x <= 21; x++) T(x, y, up); }
      for (let x = 9; x <= 15; x++) T(x, 42, sole); for (let x = 16; x <= 22; x++) T(x, 42, sole);
      [[11, 41], [12, 40], [13, 40], [20, 41], [19, 40], [18, 40]].forEach(([x, y]) => T(x, y, stripe, false));
      [[12, 39], [13, 39], [18, 39], [19, 39]].forEach(([x, y]) => T(x, y, lace, false));
    }

    // pyjama stripes and collar
    if (top === 'pyjamas' && (!only || only === 'top' || only === 'bottoms')) {
      for (let y = 29; y <= 39; y++) for (let x = 7; x <= 24; x++) { const p = get(x, y); if (p && (p.part === 'top' || p.part === 'bottoms') && x % 3 === 0 && p.outline) p.c = mix(C.top, WHITE, .38); }
      [[13, 29], [14, 30], [18, 29], [17, 30]].forEach(([x, y]) => set(x, y, mix(C.top, WHITE, .7), 'top', false));
    }
    // messy hair: flyaways
    if (look.messy && hs !== 'bald' && !hood) [[8, 3], [9, 2], [20, 2], [21, 1], [24, 4], [4, 9], [27, 8], [13, 3]].forEach(([x, y]) => { if (!get(x, y)) set(x, y, C.hair, 'hair'); });
    // pose: arms up
    const clearSides = (y0, y1, xs = [7, 8, 9, 22, 23, 24]) => { for (let y = y0; y <= y1; y++) for (const x of xs) { const p = get(x, y); if (p && (p.part === 'top' || p.part === 'arm')) g[y * W + x] = null; } };
    if (look.pose === 'armsUp' || look.pose === 'wave') {
      const both = look.pose === 'armsUp';
      clearSides(29, 37, both ? undefined : [22, 23, 24]);
      const sl = longSleeve ? 9 : 3;
      const path = [[29, 7, 9], [28, 6, 8], [27, 5, 7], [26, 4, 6], [25, 3, 5], [24, 2, 4], [23, 2, 4], [22, 1, 3], [21, 1, 3], [20, 1, 3]];
      path.forEach(([y, a, b], i) => { const c = i < sl && i < 7 ? C.top : C.skin, part = c === C.top ? 'top' : 'arm'; for (let x = a; x <= b; x++) { if (both) set(x, y, c, part); set(31 - x, y, c, part); } });
      for (let y = 20; y <= 29; y++) for (const x of [1, 2, 3, 4, 5, 6, 7, 8, 9]) { const p = get(x, y); if (p && p.part === 'arm' || p && p.part === 'top') p.z = 4.5; const q = get(31 - x, y); if (q && (q.part === 'arm' || q.part === 'top')) q.z = 4.5; }
    }
    // held mug, both hands
    if (look.held === 'mug') {
      const M = (x, y, c, o = true) => set(x, y, c, 'held', o, 'mug');
      if (!only) clearSides(35, 36);
      for (let y = 32; y <= 36; y++) for (let x = 13; x <= 18; x++) M(x, y, y === 34 ? [126, 224, 192] : [237, 230, 218]);
      for (let x = 14; x <= 17; x++) M(x, 32, [96, 60, 38], false);
      [[15, 30], [16, 29], [16, 31]].forEach(([x, y]) => M(x, y, [214, 214, 214], false));
      if (!only) { const w = look.pose === 'wave'; [[10, 33], [11, 33], ...(w ? [] : [[20, 33], [21, 33]])].forEach(([x, y]) => set(x, y, mul(C.top, .85), 'held')); [[12, 33], [12, 34], ...(w ? [] : [[19, 33], [19, 34]])].forEach(([x, y]) => set(x, y, C.skin, 'held')); }
    }
    if (look.badge) {
      const gold = [242, 193, 78], mint = [126, 224, 192], rib = [240, 108, 155];
      const B = (x, y, c, o = true) => set(x, y, c, 'held', o, 'badge');
      const medal = (cx, cy) => { for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) if (ell(x, y, cx + .5, cy + .5, 2.9, 2.9)) B(x, y, ell(x, y, cx + .5, cy + .5, 1.6, 1.6) ? mint : gold); B(cx - 1, cy - 1, WHITE, false); };
      if (look.badge === 'held') { medal(29, 15); B(28, 19, rib); B(30, 19, rib); }
      if (look.badge === 'falling') { medal(26, 3); B(22, 1, [255, 224, 138], false); B(23, 3, [255, 224, 138], false); }
      if (look.badge === 'pin') { for (let y = 30; y <= 32; y++) for (let x = 18; x <= 20; x++) B(x, y, x === 19 && y === 31 ? mint : gold, false); B(18, 33, rib, false); B(20, 33, rib, false); }
    }
    if (look.sparkles) {
      const Y = [255, 224, 138];
      [[3, 7], [28, 5], [27, 25], [4, 31]].forEach(([x, y], i) => { set(x, y, WHITE, 'held', false, 'sparkles'); if (i % 2 === 0) [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([a, b]) => set(a, b, Y, 'held', false, 'sparkles')); });
    }

    if (!only) for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const p = get(x, y), u = get(x, y - 1);
      if (p && p.part === 'head' && p.outline && u && (u.part === 'hair' || u.part === 'hat')) p.c = mul(p.c, .86);
      if (p && p.part === 'top' && (x === 20 || x === 21) && p.outline) p.c = mul(p.c, .9);
    }
    return g.map((p, i) => {
      if (!p || !p.outline) return p;
      const x = i % W, y = (i / W) | 0;
      const n = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)];
      const edge = n.some((q) => !q || (q.z < p.z && q.part !== p.part && q.part !== 'face'));
      if (!edge) return p;
      const lum = (.2126 * p.c[0] + .7152 * p.c[1] + .0722 * p.c[2]) / 255;
      return { ...p, c: lum < .12 ? mix(p.c, [150, 150, 150], .32) : mul(p.c, .58) };
    });
  }

  const EYES = {
    open: ['.DD.', 'DWDD', 'DDDD', 'EEEE', '.EE.'],
    happy: ['....', '....', '.DD.', 'D..D', '....'],
    content: ['....', '....', '....', 'D..D', '.DD.'],
    wide: ['.WW.', 'WWWW', 'WDDW', 'WWWW', '.WW.'],
    puppy: ['.DD.', 'DWDD', 'DDWD', 'DDDD', 'EEEE', '.EE.'],
    heavy: ['....', 'LLLL', 'DWDD', 'EEEE', '.EE.'],
    shut: ['....', '....', '....', 'DDDD', '....'],
    heart: ['.P.P.', 'PPPPP', 'PPPPP', '.PPP.', '..P..'],
    star: ['..S..', '.SSS.', 'SSSSS', '.SSS.', '.S.S.'],
    lookL: ['.DD.', 'WDDD', 'DDDD', 'EEEE', '.EE.'],
    lookR: ['.DD.', 'DDWD', 'DDDD', 'EEEE', '.EE.'],
    lookUp: ['DWDD', 'DDDD', 'DDDD', 'EEEE', '....'],
  };
  const MOUTHS = {
    smile: [[13, 24, 'M'], [18, 24, 'M'], [14, 25, 'M'], [15, 25, 'M'], [16, 25, 'M'], [17, 25, 'M']],
    cat: [[13, 24, 'M'], [14, 25, 'M'], [15, 24, 'M'], [16, 24, 'M'], [17, 25, 'M'], [18, 24, 'M']],
    open: [[14, 24, 'M'], [15, 24, 'M'], [16, 24, 'M'], [17, 24, 'M'], [14, 25, 'M'], [15, 25, 'T'], [16, 25, 'T'], [17, 25, 'M'], [15, 26, 'M'], [16, 26, 'M']],
    ooh: [[15, 24, 'M'], [16, 24, 'M'], [14, 25, 'M'], [15, 25, 'K'], [16, 25, 'K'], [17, 25, 'M'], [15, 26, 'M'], [16, 26, 'M']],
    wide: [[13, 24, 'M'], [14, 24, 'M'], [15, 24, 'M'], [16, 24, 'M'], [17, 24, 'M'], [18, 24, 'M'], [13, 25, 'M'], [14, 25, 'K'], [15, 25, 'T'], [16, 25, 'T'], [17, 25, 'K'], [18, 25, 'M'], [14, 26, 'M'], [15, 26, 'M'], [16, 26, 'M'], [17, 26, 'M']],
    flat: [[14, 25, 'M'], [15, 25, 'M'], [16, 25, 'M'], [17, 25, 'M']],
    small: [[15, 25, 'M'], [16, 25, 'M']],
  };
  const BROWS = {
    soft: [[10, 15], [11, 15], [12, 15], [19, 15], [20, 15], [21, 15]],
    raised: [[10, 14], [11, 13], [12, 13], [19, 13], [20, 13], [21, 14]],
    determined: [[10, 14], [11, 15], [12, 15], [19, 15], [20, 15], [21, 14]],
    happy: [[10, 15], [11, 14], [12, 15], [19, 15], [20, 14], [21, 15]],
  };

  function face(look, C, set) {
    const ex = look.eyes || 'open';
    const D = mix(C.eyes, [18, 14, 22], .72), E = C.eyes, L = mul(C.skin, .74);
    const pal = { D, E, W: WHITE, L, P: [255, 92, 138], S: [255, 211, 77] };
    const drawEye = (name, x0) => {
      const m = EYES[name]; const wide = m[0].length === 5; const y0 = m.length === 6 ? 16 : 17;
      m.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch !== '.') set(x0 - (wide ? 1 : 0) + dx, y0 + dy, pal[ch], 'face', false); }));
    };
    if (ex === 'wink') { drawEye('open', 10); drawEye('happy', 18); }
    else { drawEye(ex, 10); drawEye(ex, 18); }
    const cheek = look.blush ? mix(C.cheeks, WHITE, -.0) : C.cheeks;
    [[9, 23], [10, 23], [21, 23], [22, 23]].forEach(([x, y]) => set(x, y, cheek, 'face', false));
    if (look.blush) [[9, 22], [22, 22]].forEach(([x, y]) => set(x, y, mix(C.cheeks, C.skin, .45), 'face', false));
    const M = mul(C.skin, .48), T = [228, 106, 123], K = mul(C.skin, .3);
    (MOUTHS[look.mouth || 'smile']).forEach(([x, y, k]) => set(x, y, { M, T, K }[k], 'face', false));
    const B = look.hair === 'bald' ? mul(C.hair, .9) : mul(C.hair, .82);
    (BROWS[look.brows || 'soft']).forEach(([x, y]) => set(x, y, B, 'face', false));
  }

  function draw(canvas, look, opts = {}) {
    const g = build(look, opts.only);
    let s = opts.scale || 3;
    let crop = opts.crop || [0, 0, W, H];
    if (opts.fit) {
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      g.forEach((p, i) => { if (!p) return; const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      if (x1 >= 0) {
        crop = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
        s = Math.max(1, Math.floor(Math.min(opts.fit[0] / crop[2], opts.fit[1] / crop[3])));
      }
    }
    canvas.width = crop[2] * s; canvas.height = crop[3] * s;
    canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sil = opts.silhouette ? hex(opts.silhouette) : null;
    for (let y = crop[1]; y < crop[1] + crop[3]; y++) for (let x = crop[0]; x < crop[0] + crop[2]; x++) {
      const p = g[y * W + x]; if (!p) continue;
      const c = sil || p.c;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect((x - crop[0]) * s, (y - crop[1]) * s, s, s);
    }
  }

  // paint the full avatar onto any 2D context (share card). Whole-pixel scale only.
  function paint(ctx, look, x0, y0, s, flip, opts = {}) {
    const g = build(look, opts.only);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = g[y * W + x]; if (!p) continue;
      const c = opts.silhouette ? hex(opts.silhouette) : p.c;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(Math.round(x0 + (flip ? W - 1 - x : x) * s), Math.round(y0 + y * s), s, s);
    }
  }

  // map-scale sprite: 12 x 16, four-frame walk cycle
  const MW = 12, MH = 16;
  function mini(look, frame = 0) {
    const g = new Array(MW * MH).fill(null);
    const C = {}; Object.keys(look.colors).forEach((k) => (C[k] = hex(look.colors[k])));
    const S = (x, y, c, o = true) => { if (x < 0 || y < 0 || x >= MW || y >= MH) return; g[y * MW + x] = { c, outline: o }; };
    const b = frame === 1 || frame === 3 ? -1 : 0;
    const LEGS = [
      [[4, 13], [4, 14], [7, 13], [7, 14]], [[5, 13], [5, 14], [6, 13], [6, 14]],
      [[4, 13], [3, 14], [7, 13], [8, 14]], [[5, 13], [5, 14], [6, 13], [6, 14]],
    ];
    const SHOES = [[[3, 15], [4, 15], [7, 15], [8, 15]], [[5, 15], [6, 15]], [[2, 15], [3, 15], [8, 15], [9, 15]], [[5, 15], [6, 15]]];
    LEGS[frame].forEach(([x, y]) => S(x, y, C.bottoms));
    SHOES[frame].forEach(([x, y]) => S(x, y, C.shoes));
    for (let y = 9; y <= 12; y++) for (let x = 3; x <= 8; x++) S(x, y + b, C.top);
    const ARMS = [[[2, 10], [2, 11], [9, 9], [9, 10]], [[2, 10], [2, 11], [9, 10], [9, 11]], [[2, 9], [2, 10], [9, 10], [9, 11]], [[2, 10], [2, 11], [9, 10], [9, 11]]];
    ARMS[frame].forEach(([x, y]) => S(x, y + b, C.skin));
    for (let y = 3; y <= 8; y++) for (let x = 1; x <= 10; x++) { if ((y === 3 || y === 8) && (x === 1 || x === 10)) continue; S(x, y + b, C.skin); }
    const hs = look.hair;
    if (look.hat === 'duck' || look.hat === 'dino' || look.hat === 'panda') {
      const hc = hex({ duck: '#F5C842', dino: '#70BE5C', panda: '#F0F0EC' }[look.hat]);
      for (let y = 0; y <= 8; y++) for (let x = 0; x <= 11; x++) { const inner = y >= 4 && x >= 3 && x <= 8; if (inner) continue; if (y === 0 && (x < 3 || x > 8)) continue; if (y >= 6 && (x === 0 || x === 11)) continue; S(x, y + b, hc); }
    } else if (hs !== 'bald') {
      [[0, 3, 8], [1, 2, 9], [2, 1, 10], [3, 1, 10]].forEach(([y, a, c]) => { for (let x = a; x <= c; x++) S(x, y + b, C.hair); });
      [4, 5].forEach((y) => { S(1, y + b, C.hair); S(10, y + b, C.hair); });
      if (hs === 'long') for (let y = 6; y <= 10; y++) { S(0, y + b, C.hair); S(11, y + b, C.hair); S(1, y + b, C.hair); S(10, y + b, C.hair); }
      if (hs === 'pigtails') [5, 6].forEach((y) => { S(0, y + b, C.hair); S(11, y + b, C.hair); });
      if (hs === 'bun') { S(5, -1 + b + 1, C.hair); }
      if (hs === 'quiff' || hs === 'mohawk') { S(5, 0 + b, C.hair); S(6, 0 + b, C.hair); }
    }
    if (look.hat === 'party') { [[5, 0], [6, 0]].forEach(([x, y]) => S(x, y + b, [240, 108, 155])); }
    if (look.hat === 'crown') { for (let x = 3; x <= 8; x++) S(x, 1 + b, [242, 193, 78]); [3, 5, 6, 8].forEach((x) => S(x, 0 + b, [242, 193, 78])); }
    const E = mix(C.eyes, [18, 14, 22], .6);
    [[5, 5], [5, 6], [8, 5], [8, 6]].forEach(([x, y]) => S(x, y + b, E, false));
    [[4, 7], [9, 7]].forEach(([x, y]) => S(x, y + b, C.cheeks, false));
    const get = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? null : g[y * MW + x]);
    return g.map((p, i) => {
      if (!p || !p.outline) return p;
      const x = i % MW, y = (i / MW) | 0;
      if (![get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].some((q) => !q)) return p;
      const lum = (.2126 * p.c[0] + .7152 * p.c[1] + .0722 * p.c[2]) / 255;
      return { ...p, c: lum < .12 ? mix(p.c, [150, 150, 150], .32) : mul(p.c, .58) };
    });
  }
  function drawMini(canvas, look, opts = {}) {
    const s = opts.scale || 2, f = opts.frame || 0;
    canvas.width = MW * s; canvas.height = MH * s;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    mini(look, f).forEach((p, i) => { if (!p) return; const x = i % MW, y = (i / MW) | 0; ctx.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`; ctx.fillRect((opts.flip ? MW - 1 - x : x) * s, y * s, s, s); });
  }

  function drawAll(root) {
    if (!root) return;
    root.querySelectorAll('canvas[data-av]').forEach((cv) => {
      const key = cv.getAttribute('data-av');
      if (cv.__av === key) return;
      try { const { look, opts } = JSON.parse(key); if (opts && opts.mini) drawMini(cv, look, opts); else draw(cv, look, opts); cv.__av = key; } catch (e) { }
    });
  }

  window.LCAvatar = { W, H, HAIRS, TOPS, EYES: Object.keys(EYES), MOUTHS: Object.keys(MOUTHS), build, draw, drawAll, paint, mini, drawMini, MW, MH };
})();
