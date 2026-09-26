// Last Call share card with the avatar. Canvas 2D only: gradients, paths, rects, text and map tiles.
// Map tiles load with crossOrigin so the canvas stays exportable.
(function () {
  const W = 1080, M = 64;
  const SANS = '-apple-system, system-ui, Roboto, sans-serif';
  const PTS = [[40, 310], [72, 276], [98, 286], [128, 238], [150, 206], [192, 196], [214, 154], [252, 132], [270, 92], [302, 70]];
  const STOPS = [[98, 286], [192, 196], [270, 92]];
  const ROUTE_ROWS = [
    [['Distance', '6.8 km'], ['Steps', '11.2k']],
    [['Stops', '3'], ['Drinks', '7', true], ['Water', '4'], ['Food', '2']],
    [['Time out', '5h 12m']],
  ];
  const PHOTO_STATS = [['Distance', '6.8 km'], ['Steps', '11.2k'], ['Stops', '3'], ['Drinks', '7', true]];
  let H = 1350;
  const heightOf = (o) => (o && o.ratio === 'story' ? 1920 : 1350);
  const DATE = 'Sat 2 August';
  const TITLE_MAX = 24;

  // map tiles: Esri Dark Gray Canvas, z16 around Deansgate
  const Z = 16, X0 = 32357, Y0 = 21196, TS = 512;
  const tiles = [], tilesLight = []; let loaded = 0, total = 0;
  const api = { ready: false, onReady: null };
  [['World_Dark_Gray_Base', tiles], ['World_Light_Gray_Base', tilesLight]].forEach(([svc, arr]) => {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const img = new Image(); img.crossOrigin = 'anonymous'; total++;
      img.onload = img.onerror = () => { if (++loaded === total) { api.ready = true; api.onReady && api.onReady(); } };
      img.src = `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/${svc}/MapServer/tile/${Z}/${Y0 + j}/${X0 + i}`;
      arr.push({ img, i, j });
    }
  });
  let T = null;
  const DARK = { bg: '#000000', bgRGB: '0,0,0', text: '#FFFFFF', label: '#A3A3A3', date: '#8A8A8A', pink: '#F06C9B', mark: '#7EE0C0', route: '#7EE0C0', under: 'rgba(0,0,0,.55)', pinRing: '#000', wash: 'rgba(0,0,0,.04)' };
  const LIGHT = { bg: '#EEF2F8', bgRGB: '238,242,248', text: '#0B1526', label: '#626E81', date: '#4A576B', pink: '#C92F68', mark: '#0B6E55', route: '#7EE0C0', under: '#0B6E55', pinRing: '#FFFFFF', wash: 'rgba(238,242,248,.10)' };
  function mapBg(c) {
    const MAP_H = H - 520;
    c.save();
    c.beginPath(); c.rect(0, 0, W, MAP_H); c.clip();
    const oy = H > 1400 ? 0 : -90;
    (T === LIGHT ? tilesLight : tiles).forEach(({ img, i, j }) => { if (img.complete && img.naturalWidth) c.drawImage(img, i * TS - 228, j * TS + oy, TS, TS); });
    c.fillStyle = T.wash; c.fillRect(0, 0, W, MAP_H);
    const g = c.createLinearGradient(0, MAP_H - 360, 0, MAP_H);
    g.addColorStop(0, `rgba(${T.bgRGB},0)`); g.addColorStop(1, `rgba(${T.bgRGB},1)`);
    c.fillStyle = g; c.fillRect(0, MAP_H - 360, W, 360);
    const t = c.createLinearGradient(0, 0, 0, 220);
    t.addColorStop(0, `rgba(${T.bgRGB},.72)`); t.addColorStop(1, `rgba(${T.bgRGB},0)`);
    c.fillStyle = t; c.fillRect(0, 0, W, 220);
    c.restore();
  }
  function bloom(c) {
    let g = c.createRadialGradient(W / 2, H, 0, W / 2, H, W * .9);
    if (T === LIGHT) { g.addColorStop(0, 'rgba(0,71,171,.26)'); g.addColorStop(.5, 'rgba(0,71,171,.10)'); g.addColorStop(1, 'rgba(0,71,171,0)'); }
    else { g.addColorStop(0, 'rgba(33,118,79,.42)'); g.addColorStop(.5, 'rgba(10,36,25,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function route(c, x, y, w, h, lw = 11, under) {
    const s = Math.min(w / 340, h / 360);
    c.save(); c.translate(x + (w - 340 * s) / 2, y + (h - 360 * s) / 2); c.scale(s, s);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const path = () => { c.beginPath(); PTS.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); };
    const th = T || DARK;
    if (under) { c.strokeStyle = th.under; c.lineWidth = (lw + (th === LIGHT ? 7 : 10)) / s; path(); c.stroke(); }
    c.strokeStyle = th.route; c.lineWidth = lw / s; path(); c.stroke();
    STOPS.forEach(([a, b]) => { c.beginPath(); c.arc(a, b, (lw * 1.6) / s, 0, 7); c.fillStyle = th.pink; c.fill(); if (under) { c.lineWidth = 4 / s; c.strokeStyle = th.pinRing; c.stroke(); } });
    c.restore();
  }
  function text(c, str, x, y, font, color, halo) {
    c.font = font; c.textBaseline = 'alphabetic';
    if (halo) { c.save(); c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 22; c.fillStyle = color; c.fillText(str, x, y); c.fillText(str, x, y); c.restore(); }
    c.fillStyle = color; c.fillText(str, x, y);
  }
  const clip = (t) => (t || '').slice(0, TITLE_MAX);

  const EL = {
    title: (c, x, y, o) => { if (!clip(o.title)) return null; c.font = `700 72px ${SANS}`; const w = c.measureText(clip(o.title)).width; text(c, clip(o.title), x, y + 62, c.font, '#FFFFFF', true); return [w, 80]; },
    time: (c, x, y) => { text(c, 'Time out', x, y + 26, `600 28px ${SANS}`, '#E6E6E6', true); text(c, '5h 12m', x, y + 104, `700 72px ${SANS}`, '#FFFFFF', true); c.font = `700 72px ${SANS}`; return [c.measureText('5h 12m').width, 116]; },
    stats: (c, x, y) => { const cols = [0, 290, 530, 720]; PHOTO_STATS.forEach(([l, v, pink], i) => { const xx = x + cols[i]; text(c, l, xx, y + 26, `600 28px ${SANS}`, '#E6E6E6', true); text(c, v, xx, y + 104, `700 72px ${SANS}`, pink ? '#F06C9B' : '#FFFFFF', true); }); return [720 + 150, 116]; },
    water: (c, x, y) => { text(c, 'Water', x, y + 26, `600 28px ${SANS}`, '#E6E6E6', true); text(c, '4', x, y + 104, `700 72px ${SANS}`, '#FFFFFF', true); return [110, 116]; },
    food: (c, x, y) => { text(c, 'Food', x, y + 26, `600 28px ${SANS}`, '#E6E6E6', true); text(c, '2', x, y + 104, `700 72px ${SANS}`, '#FFFFFF', true); return [110, 116]; },
    place: (c, x, y) => { c.font = `400 32px ${SANS}`; text(c, DATE, x, y + 30, c.font, '#F0F0F0', true); return [c.measureText(DATE).width, 40]; },
    route: (c, x, y) => { route(c, x, y, 420, 440); return [420, 440]; },
    avatar: (c, x, y, o) => { const a = o.avatar; if (!window.LCAvatar) return null; window.LCAvatar.paint(c, a.look, x, y, a.s, a.flip); return [32 * a.s, 43 * a.s]; },
  };
  const ORDER = ['route', 'avatar', 'title', 'time', 'stats', 'water', 'food', 'place'];
  const LABELS = { map: 'Map', route: 'Route', avatar: 'Avatar', title: 'Title', time: 'Time out', stats: 'Stats', water: 'Water', food: 'Food', place: 'Date', wordmark: 'Wordmark' };

  // o.only: draw a single layer on a transparent ground (for Save for video)
  function drawCard(cv, o) {
    H = heightOf(o);
    T = o.theme === 'light' && (o.layout || 'route') === 'route' ? LIGHT : DARK;
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    const only = o.only, want = (id) => !only || only === id;
    if (!only) { c.fillStyle = T.bg; c.fillRect(0, 0, W, H); }
    const boxes = {};
    const title = clip(o.title);
    const a = o.avatar;
    if ((o.layout || 'route') === 'route') {
      if (want('map')) { if (only) { c.fillStyle = T.bg; c.fillRect(0, 0, W, H); } mapBg(c); bloom(c); }
      if (want('title') && title) text(c, title, M, M + 58, `700 64px ${SANS}`, T.text, T === DARK);
      if (want('route')) route(c, M, title ? 150 : 90, W - M * 2, H - 790 - (title ? 60 : 0), 11, true);
      ROUTE_ROWS.forEach((row, r) => row.forEach(([l, v, pink], i) => {
        if (!want(r === 2 ? 'time' : 'stats')) return;
        const x = M + i * (row.length > 2 ? 150 : 300), y = H - M - 410 + r * 130;
        text(c, l, x, y - 62, `600 28px ${SANS}`, T.label);
        text(c, v, x, y, `700 76px ${SANS}`, pink ? T.pink : T.text);
      }));
      if (want('place')) text(c, DATE, M, H - M - 40, `400 30px ${SANS}`, T.date);
      if (want('wordmark')) text(c, 'Last Call', M, H - M + 10, `700 40px ${SANS}`, T.mark);
      if (want('avatar') && a && !a.hidden && window.LCAvatar) window.LCAvatar.paint(c, a.look, W - M - 290, H - M - 430 - 40, 10, false);
      return boxes;
    }
    if (!only) {
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#5A3A2A'); g.addColorStop(.5, '#A0603C'); g.addColorStop(1, '#2A1C24');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const g2 = c.createRadialGradient(W * .7, H * .3, 0, W * .7, H * .3, W * .6);
      g2.addColorStop(0, 'rgba(255,214,150,.45)'); g2.addColorStop(1, 'rgba(255,214,150,0)');
      c.fillStyle = g2; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(0,0,0,.34)'; c.fillRect(0, 0, W, H);
    }
    const els = o.elements || {};
    ORDER.forEach((id) => {
      const e = els[id]; if (!e || !e.on || !want(id)) return;
      if (id === 'avatar' && a && a.hidden) return;
      const k = id === 'avatar' ? 1 : (e.k || 1);
      c.save(); c.translate(e.x, e.y); c.scale(k, k);
      const sz = EL[id](c, 0, 0, o);
      c.restore();
      if (sz) boxes[id] = [e.x, e.y, sz[0] * k, sz[1] * k];
    });
    if (want('wordmark')) text(c, 'Last Call', W - M - 170, H - M, `700 40px ${SANS}`, '#7EE0C0', true);
    return boxes;
  }

  function layerIds(o) {
    const route = (o.layout || 'route') === 'route';
    const ids = route ? ['map', 'route', 'title', 'stats', 'time', 'place', 'avatar', 'wordmark'] : [...ORDER, 'wordmark'];
    return ids.filter((id) => {
      if (id === 'title' && !clip(o.title)) return false;
      if (id === 'avatar' && o.avatar && o.avatar.hidden) return false;
      if (!route && id !== 'wordmark' && !(o.elements && o.elements[id] && o.elements[id].on)) return false;
      return true;
    });
  }
  function cropCanvas(cv) {
    try {
      const CH = cv.height;
      const d = cv.getContext('2d').getImageData(0, 0, W, CH).data;
      let x0 = W, y0 = CH, x1 = -1, y1 = -1;
      for (let y = 0; y < CH; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return cv;
      const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
      out.getContext('2d').drawImage(cv, -x0, -y0); return out;
    } catch (e) { return cv; }
  }
  // Save for video: one transparent PNG per layer. fullFrame keeps 1080 x 1350 so layers stack in place.
  async function exportLayers(o, { fullFrame = true, ids } = {}) {
    const list = ids || layerIds(o);
    for (const id of list) {
      const cv = document.createElement('canvas');
      drawCard(cv, { ...o, only: id });
      const out = fullFrame ? cv : cropCanvas(cv);
      const blob = await new Promise((r) => out.toBlob(r, 'image/png'));
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `last-call-${id}.png`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  Object.assign(api, { W, M, heightOf, get H() { return H; }, TITLE_MAX, ORDER, LABELS, drawCard, layerIds, exportLayers });
  window.LCCard = api;
})();
