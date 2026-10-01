import { el, btn, spacer, foot, head, sheet, toast, hms, km, currentTheme } from './ui.js';
import * as S from './state.js';
import * as geo from './geo.js';
import { drawMini } from './avatar.js';
import { t } from './words.js';
import { MODES } from './modes.js';

// Dark basemap: the standard OSM raster is light, which fights a true-black
// night app and leaves the stats strip unreadable. CARTO's dark_all used to be
// keyless but now stamps "API KEY REQUIRED" over every tile, so this is Esri's
// Dark Gray Canvas — keyless, CORS-enabled, attribution required. Its data
// stops at zoom 16 (z17 is a "not yet available" tile), so deeper zooms
// upscale z16. Note the {y}/{x} order. Offline tiles are still open.
// The light theme uses the matching Light Gray Canvas: same service, same
// keyless access and zoom ceiling.
const tiles = () =>
  `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/${currentTheme() === 'light' ? 'World_Light_Gray_Base' : 'World_Dark_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`;
const ATTRIB = 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const TILE_OPTS = { maxZoom: 19, maxNativeZoom: 16, attribution: ATTRIB, crossOrigin: true };

// Mint route on black. On the light map mint alone washes out, so it sits on a
// deep teal under-stroke (the design's --data-route over #0B6E55).
function route(latlngs, { weight = 4, opacity = 1 } = {}) {
  const base = { lineCap: 'round', lineJoin: 'round', interactive: false };
  if (currentTheme() !== 'light') return { line: L.polyline(latlngs, { ...base, color: '#7EE0C0', weight, opacity }) };
  return {
    under: L.polyline(latlngs, { ...base, color: '#0B6E55', weight: weight + 3, opacity }),
    line: L.polyline(latlngs, { ...base, color: '#3FC79E', weight, opacity }),
  };
}
const addRoute = (r) => { r.under?.addTo(map); r.line.addTo(map); return r; };

let map = null;
let layers = { trail: null, me: null, pins: [] };
let onFix = null;
let centred = false;

/* ---------- 04 map ---------- */

export function mapScreen(ctx) {
  const s = ctx.state.active;
  if (!s) { ctx.go('start'); return []; }

  const host = el('div', { id: 'map', role: 'application', 'aria-label': 'Your route' });
  const denied = ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported';
  const waiting = !denied && !s.trail.length;

  // Leaflet needs the container in the document with a real size before init.
  if (!denied) queueMicrotask(() => initMap(host, s));

  const stat = (k, v, tone) =>
    el('div', {},
      el('div', { class: 'tile__k', text: k }),
      el('div', { class: `tile__v${tone ? ' tile__v--' + tone : ''}`, text: v }));

  // Festival days log sets, not stops, so there's no pin to drop.
  const checkins = MODES[S.currentPart(s).mode].buttons.includes('checkin');
  return [
    head({ title: 'Your route', back: () => ctx.back() }),

    denied
      ? el('div', { class: 'glass', style: 'flex:1;display:flex;align-items:center' },
          el('p', { class: 'body', style: 'margin:0',
            text: t('Location is off, so there’s no map for this {n}.') + ' Drinks, water and time are all still being tracked.' }))
      : el('div', { class: 'map-wrap' },
          host,
          // Chrome over the map sits on a protection gradient, not a capsule.
          el('div', { class: 'map-foot' },
            checkins ? stat('Stops', String(s.pins.length)) : stat('Sets', String((s.sets || []).length)),
            stat('Drinks', String(s.drinks.length), 'drinks'),
            stat('Distance', `${km(s.distanceM)} km`),
          )),

    waiting ? el('p', { class: 'cap cap--up', text: 'Waiting for GPS. Everything else still works.' }) : null,

    denied ? spacer() : null,
    foot(
      denied || !checkins
        ? btn(t('Back to the {n}'), 'btn--sec', () => ctx.back())
        : btn('Drop pin', 'btn--pri', () => dropPin(ctx, s), { iconName: 'map-pin', lg: true }),
    ),
  ];
}

// Leaflet (about 150KB) loads the first time a map is opened rather than at
// start-up, so the app opens faster on older phones. The service worker still
// caches it, so it works offline.
let leaflet = null;
export function loadLeaflet() {
  if (globalThis.L) return Promise.resolve();
  leaflet ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = './vendor/leaflet.js';
    s.onload = () => resolve();
    s.onerror = () => { leaflet = null; reject(new Error('map library failed to load')); };
    document.head.append(s);
  });
  return leaflet;
}

function initMap(host, s) {
  if (!globalThis.L) { loadLeaflet().then(() => initMap(host, s), () => {}); return; }
  if (!host.isConnected) return;
  teardownMap();

  map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
  L.tileLayer(tiles(), TILE_OPTS).addTo(map);

  layers.trail = addRoute(route(s.trail.map((p) => [p.lat, p.lng])));

  for (const pin of s.pins) addPinMarker(pin);
  for (const set of s.sets || []) addSetMarker(set);

  const last = s.trail[s.trail.length - 1];
  if (last) {
    setMe(last);
    map.setView([last.lat, last.lng], 16);
    centred = true;
  } else {
    map.setView([51.5074, -0.1278], 12);
    geo.current().then((fix) => {
      if (!fix || !map || centred) return;
      setMe(fix);
      map.setView([fix.lat, fix.lng], 16);
      centred = true;
    });
  }

  onFix = (e) => {
    const fix = e.detail;
    if (!map) return;
    layers.trail.under?.addLatLng([fix.lat, fix.lng]);
    layers.trail.line.addLatLng([fix.lat, fix.lng]);
    setMe(fix);
    if (!centred) { map.setView([fix.lat, fix.lng], 16); centred = true; }
  };
  window.addEventListener('lc:fix', onFix);

  setTimeout(() => map?.invalidateSize(), 60);
}

function setMe(fix) {
  const pos = [fix.lat, fix.lng];
  if (layers.me) { layers.me.setLatLng(pos); return; }
  layers.me = L.marker(pos, {
    icon: L.divIcon({ className: '', html: '<div class="dot-me"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
    keyboard: false,
    interactive: false,
  }).addTo(map);
}

function addPinMarker(pin) {
  if (pin.lat == null || pin.lng == null) return;
  const label = escapeHtml(pin.name);
  const marker = L.marker([pin.lat, pin.lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
               <div class="dot-stop"></div>
               <span class="map-label map-label--stop">${label}</span>
             </div>`,
      iconSize: [11, 11],
      iconAnchor: [5, 5],
    }),
  }).addTo(map);
  layers.pins.push(marker);
}

// Sets are amber, stops are pink: a festival map reads acts at a glance.
function addSetMarker(set) {
  if (set.lat == null || set.lng == null) return;
  const marker = L.marker([set.lat, set.lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
               <div class="dot-set"></div>
               <span class="map-label map-label--set">${escapeHtml(set.name)}</span>
             </div>`,
      iconSize: [11, 11],
      iconAnchor: [5, 5],
    }),
  }).addTo(map);
  layers.pins.push(marker);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- 05 drop pin ----------
   Also exported as checkIn: the sheet works identically from the live screen
   without the trip through the map — it only needs a fix, not the map itself
   (every map-marker touch below is guarded on `map`). */

export { dropPin as checkIn };

function dropPin(ctx, s) {
  const here = s.trail[s.trail.length - 1]
    || (map && { lat: map.getCenter().lat, lng: map.getCenter().lng });
  // Without a position the stop is still named and still counts: it goes on
  // the map when a fix arrives, or stays off the map if location is off.
  const gpsOff = ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported';

  let name = '';
  let note = '';

  sheet((close) => {
    const nameInput = el('input', {
      type: 'text', placeholder: 'The Grapes', autocapitalize: 'words', enterkeyhint: 'done',
      oninput: (e) => { name = e.target.value; },
    });

    // A tester missed this section entirely, for two reasons: the heading sat
    // at --faint on a near-black sheet, and the whole block appeared late,
    // after the network answered. So the heading is mint, the chips carry a
    // mint hairline to read as tappable, and the section is present from the
    // start with a status line rather than materialising unannounced.
    const label = el('div', { class: 'eb eb--mint', text: 'Nearby' });
    const status = el('div', { class: 'cap cap--up', text: 'Looking for places nearby…' });
    const chips = el('div', { class: 'chips' });
    const suggestions = el('div', { class: 'stack', style: 'gap:6px' }, label, chips, status);

    if (!here) {
      label.hidden = true;
      status.textContent = gpsOff
        ? 'Location is off, so this stop won’t be on the map. It still counts.'
        : 'Still finding you. The stop goes on the map once your position arrives.';
    } else nearbyVenues(here).then((venues) => {
      if (!suggestions.isConnected) return;
      if (!venues.length) {
        status.textContent = 'Nothing found nearby. Type the name instead.';
        return;
      }
      chips.replaceChildren(...venues.slice(0, 6).map((v) =>
        el('button', {
          class: 'chip chip--suggest press', type: 'button',
          onclick: () => {
            name = v.name;
            nameInput.value = v.name;
            [...chips.children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
            chips.querySelector(`[data-name="${CSS.escape(v.name)}"]`)?.setAttribute('aria-pressed', 'true');
          },
          'data-name': v.name,
          'aria-pressed': 'false',
        }, v.name)));
      status.textContent = 'Tap one, or type your own. Places from OpenStreetMap.';
    }).catch(() => {
      if (suggestions.isConnected) status.textContent = 'Couldn’t reach the venue list. Type the name instead.';
    });

    return [
      el('h2', { class: 'title', text: 'Name this stop' }),
      suggestions,
      el('label', { class: 'field' },
        el('div', { class: 'field__k', text: 'Name this stop' }),
        nameInput,
      ),
      el('label', { class: 'field' },
        el('div', { class: 'field__k', text: 'Anything worth remembering' }),
        el('input', {
          type: 'text', placeholder: 'Met Tom outside',
          oninput: (e) => { note = e.target.value; },
        }),
      ),
      foot(btn('Drop pin', 'btn--pri', () => {
        close();
        // Empty name falls back rather than blocking the save.
        const pin = { lat: here?.lat ?? null, lng: here?.lng ?? null, name: name.trim() || 'Unnamed stop', note: note.trim(), pending: !here && !gpsOff };
        ctx.addPin(pin);
        if (map) addPinMarker({ ...pin, t: Date.now() });
        ctx.render();
        toast('Stop saved.');
      })),
    ];
  });
}

// Venues around the current fix from OpenStreetMap's free Overpass API — no
// key, no account. Sorted nearest-first. This is the app's one optional
// network lookup beyond map tiles; it only ever suggests, never blocks.
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const VENUE_KINDS = '^(pub|bar|restaurant|cafe|nightclub|fast_food|biergarten|casino)$';

async function nearbyVenues({ lat, lng }, radiusM = 150) {
  const query = `[out:json][timeout:8];node(around:${radiusM},${lat},${lng})["name"]["amenity"~"${VENUE_KINDS}"];out body 30;`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: ctl.signal,
    });
    if (!res.ok) return [];
    const json = await res.json();
    const seen = new Set();
    return (json.elements || [])
      .filter((e) => e.tags?.name && !seen.has(e.tags.name) && seen.add(e.tags.name))
      .map((e) => ({ name: e.tags.name, d: S.haversineM(lat, lng, e.lat, e.lon) }))
      .sort((a, b) => a.d - b.d);
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- everywhere you've been ----------
   Every stored trail on one map. Reuses the same Leaflet lifecycle as the
   night map, so navigating away tears it down identically. */

export function atlasScreen(ctx) {
  const done = ctx.state.sessions.filter((s) => s.endedAt && s.trail.length > 1);
  if (!done.length) { ctx.go('history'); return []; }

  const host = el('div', { id: 'map', role: 'application', 'aria-label': 'Every route you have recorded' });
  queueMicrotask(() => initAtlas(host, done));

  const totalKm = km(done.reduce((n, s) => n + s.distanceM, 0));

  return [
    head({ title: 'Everywhere you’ve been', back: () => ctx.back() }),
    el('div', { class: 'map-wrap' },
      host,
      el('div', { class: 'map-foot' },
        el('div', {},
          el('div', { class: 'tile__k', text: t('{Ns}') }),
          el('div', { class: 'tile__v', text: String(done.length) })),
        el('div', {},
          el('div', { class: 'tile__k', text: 'Distance' }),
          el('div', { class: 'tile__v', text: `${totalKm} km` })),
      )),
  ];
}

function initAtlas(host, done) {
  if (!globalThis.L) { loadLeaflet().then(() => initAtlas(host, done), () => {}); return; }
  if (!host.isConnected) return;
  teardownMap();

  map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
  L.tileLayer(tiles(), TILE_OPTS).addTo(map);

  let bounds = null;
  for (const s of done) {
    const { line } = addRoute(route(s.trail.map((p) => [p.lat, p.lng]), { weight: 3, opacity: 0.75 }));
    bounds = bounds ? bounds.extend(line.getBounds()) : line.getBounds();
  }
  if (bounds) map.fitBounds(bounds, { padding: [34, 34] });
  setTimeout(() => map?.invalidateSize(), 60);
}

/* ---------- night detail: the real route, scrubbable through time ----------
   Draws the whole route faint, the part walked by the chosen moment bright,
   and a dot where you were. setTime() moves all three; the detail screen
   drives it from a slider. */

// Where you were at time t: interpolated between the two fixes either side.
// Nights recorded before fixes kept their own time have runs of points that
// all share the moment the app was reopened. Spread each run back over the
// time since the point before it, in proportion to distance walked, so the
// rewind slider moves along the route instead of leaping to the end of the run.
// Display only: the stored night is untouched.
const BURST_MS = 3000;
export function retime(trail) {
  const out = trail.map((p) => ({ ...p }));
  let i = 1;
  while (i < out.length) {
    let j = i;
    while (j + 1 < out.length && out[j + 1].t - out[j].t < BURST_MS) j++;
    const prev = out[i - 1];
    const span = out[j].t - prev.t;
    if (j > i && span > BURST_MS) {
      const legs = [];
      let total = 0;
      for (let k = i; k <= j; k++) {
        total += S.haversineM(out[k - 1].lat, out[k - 1].lng, out[k].lat, out[k].lng);
        legs.push(total);
      }
      const end = out[j].t;
      for (let k = i; k <= j; k++) {
        const f = total > 0 ? legs[k - i] / total : (k - i + 1) / (j - i + 1);
        out[k].t = Math.round(prev.t + (end - prev.t) * f);
      }
    }
    i = j + 1;
  }
  return out;
}

export function positionAt(trail, t) {
  if (!trail.length) return null;
  if (t <= trail[0].t) return { lat: trail[0].lat, lng: trail[0].lng, i: 0 };
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    if (t <= b.t) {
      const f = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, i };
    }
  }
  const last = trail[trail.length - 1];
  return { lat: last.lat, lng: last.lng, i: trail.length };
}

// The history map, with your avatar walking the route as the slider moves:
// a 12 x 16 sprite, four frames, mirrored when walking left, standing still
// once you let go.
export function nightMap(host, s, look = null) {
  const controller = { setTime: () => {}, stand: () => {} };
  queueMicrotask(async () => {
    if (s.trail.length < 2) return;
    try { await loadLeaflet(); } catch { return; }
    if (!host.isConnected) return;
    teardownMap();

    map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
    L.tileLayer(tiles(), TILE_OPTS).addTo(map);

    const trail = retime(s.trail);
    const all = trail.map((p) => [p.lat, p.lng]);
    addRoute(route(all, { opacity: 0.3 }));
    const walked = addRoute(route(all));
    for (const pin of s.pins) addPinMarker(pin);
    for (const set of s.sets || []) addSetMarker(set);

    let sprite = null;
    let icon = L.divIcon({ className: '', html: '<div class="dot-me"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    if (look) {
      sprite = document.createElement('canvas');
      sprite.className = 'walker__sprite';
      drawMini(sprite, look, { frame: 0, scale: 1.5 });
      const wrap = document.createElement('div');
      wrap.className = 'walker';
      wrap.append(Object.assign(document.createElement('div'), { className: 'walker__halo' }), sprite);
      icon = L.divIcon({ className: '', html: wrap, iconSize: [24, 33], iconAnchor: [12, 31] });
    }
    const here = L.marker(all[all.length - 1], { icon, keyboard: false, interactive: false }).addTo(map);
    const walk = { frame: 0, flip: false, dist: 0, last: null };
    const pose = (frame, flip) => {
      if (!sprite || (frame === walk.frame && flip === walk.flip)) return;
      walk.frame = frame; walk.flip = flip;
      drawMini(sprite, look, { frame, flip, scale: 1.5 });
    };
    controller.stand = () => { walk.last = null; pose(0, walk.flip); };

    map.fitBounds(L.polyline(all).getBounds(), { padding: [30, 30] });
    setTimeout(() => map?.invalidateSize(), 60);

    controller.setTime = (t, { walking = false } = {}) => {
      const pos = positionAt(trail, t);
      if (!pos || !map) return;
      here.setLatLng([pos.lat, pos.lng]);
      if (walking && sprite) {
        // One step per few screen pixels travelled, facing the way it's going.
        const pt = map.latLngToLayerPoint([pos.lat, pos.lng]);
        if (walk.last) {
          const dx = pt.x - walk.last.x;
          walk.dist += Math.hypot(dx, pt.y - walk.last.y);
          pose(Math.floor(walk.dist / 6) % 4, dx < -0.5 ? true : dx > 0.5 ? false : walk.flip);
        }
        walk.last = pt;
      }
      const upTo = [...all.slice(0, pos.i), [pos.lat, pos.lng]];
      walked.under?.setLatLngs(upTo);
      walked.line.setLatLngs(upTo);
    };
  });
  return controller;
}

export function teardownMap() {
  if (onFix) { window.removeEventListener('lc:fix', onFix); onFix = null; }
  if (map) { map.remove(); map = null; }
  layers = { trail: null, me: null, pins: [] };
  centred = false;
}

export { hms };
