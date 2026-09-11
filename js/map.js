import { el, btn, spacer, foot, head, sheet, toast, hms, km } from './ui.js';
import * as S from './state.js';
import * as geo from './geo.js';

// Dark basemap: the standard OSM raster is light, which fights a true-black
// night app and leaves the stats strip unreadable. CARTO's dark_all used to be
// keyless but now stamps "API KEY REQUIRED" over every tile, so this is Esri's
// Dark Gray Canvas — keyless, CORS-enabled, attribution required. Its data
// stops at zoom 16 (z17 is a "not yet available" tile), so deeper zooms
// upscale z16. Note the {y}/{x} order. Offline tiles are still open.
const TILES =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const TILE_OPTS = { maxZoom: 19, maxNativeZoom: 16, attribution: ATTRIB, crossOrigin: true };

let map = null;
let layers = { trail: null, me: null, pins: [] };
let onFix = null;
let centred = false;

/* ---------- 04 map ---------- */

export function mapScreen(ctx) {
  const s = ctx.state.active;
  if (!s) { ctx.go('start'); return []; }

  const host = el('div', { id: 'map', role: 'application', 'aria-label': 'Your route tonight' });
  const denied = ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported';
  const waiting = !denied && !s.trail.length;

  // Leaflet needs the container in the document with a real size before init.
  if (!denied) queueMicrotask(() => initMap(host, s));

  const stat = (k, v, tone) =>
    el('div', {},
      el('div', { class: 'tile__k', text: k }),
      el('div', { class: `tile__v${tone ? ' tile__v--' + tone : ''}`, text: v }));

  return [
    head({ title: 'Tonight', back: () => ctx.back() }),

    denied
      ? el('div', { class: 'glass', style: 'flex:1;display:flex;align-items:center' },
          el('p', { class: 'body', style: 'margin:0',
            text: 'Location is off, so there’s no map tonight. Drinks, water and time are all still being tracked.' }))
      : el('div', { class: 'map-wrap' },
          host,
          // Chrome over the map sits on a protection gradient, not a capsule.
          el('div', { class: 'map-foot' },
            stat('Stops', String(s.pins.length)),
            stat('Drinks', String(s.drinks.length), 'drinks'),
            stat('Distance', `${km(s.distanceM)} km`),
          )),

    waiting ? el('p', { class: 'cap cap--up', text: 'Waiting for GPS. Everything else still works.' }) : null,

    denied ? spacer() : null,
    foot(
      denied
        ? btn('Back to session', 'btn--sec', () => ctx.back())
        : btn('Drop pin', 'btn--pri', () => dropPin(ctx, s), { iconName: 'map-pin', lg: true }),
    ),
  ];
}

function initMap(host, s) {
  if (!globalThis.L || !host.isConnected) return;
  teardownMap();

  map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
  L.tileLayer(TILES, TILE_OPTS).addTo(map);

  layers.trail = L.polyline(s.trail.map((p) => [p.lat, p.lng]), {
    color: '#7EE0C0', weight: 4, lineCap: 'round', lineJoin: 'round',
  }).addTo(map);

  for (const pin of s.pins) addPinMarker(pin);

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
    layers.trail.addLatLng([fix.lat, fix.lng]);
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
  const label = escapeHtml(pin.name);
  const marker = L.marker([pin.lat, pin.lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
               <div class="dot-stop"></div>
               <span style="font:600 11px system-ui;color:#F06C9B">${label}</span>
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
  if (!here) { toast('No position yet. Give GPS a moment.'); return; }

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

    nearbyVenues(here).then((venues) => {
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
        const pin = { lat: here.lat, lng: here.lng, name: name.trim() || 'Unnamed stop', note: note.trim() };
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
          el('div', { class: 'tile__k', text: 'Nights' }),
          el('div', { class: 'tile__v', text: String(done.length) })),
        el('div', {},
          el('div', { class: 'tile__k', text: 'Distance' }),
          el('div', { class: 'tile__v', text: `${totalKm} km` })),
      )),
  ];
}

function initAtlas(host, done) {
  if (!globalThis.L || !host.isConnected) return;
  teardownMap();

  map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
  L.tileLayer(TILES, TILE_OPTS).addTo(map);

  let bounds = null;
  for (const s of done) {
    const line = L.polyline(s.trail.map((p) => [p.lat, p.lng]), {
      color: '#7EE0C0', weight: 3, opacity: 0.75, lineCap: 'round', lineJoin: 'round',
    }).addTo(map);
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

export function nightMap(host, s) {
  const controller = { setTime: () => {} };
  queueMicrotask(() => {
    if (!globalThis.L || !host.isConnected || s.trail.length < 2) return;
    teardownMap();

    map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
    L.tileLayer(TILES, TILE_OPTS).addTo(map);

    const all = s.trail.map((p) => [p.lat, p.lng]);
    L.polyline(all, { color: '#7EE0C0', weight: 4, opacity: 0.3, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    const walked = L.polyline(all, { color: '#7EE0C0', weight: 4, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    for (const pin of s.pins) addPinMarker(pin);

    const here = L.marker(all[all.length - 1], {
      icon: L.divIcon({ className: '', html: '<div class="dot-me"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
      keyboard: false,
      interactive: false,
    }).addTo(map);

    map.fitBounds(L.polyline(all).getBounds(), { padding: [30, 30] });
    setTimeout(() => map?.invalidateSize(), 60);

    controller.setTime = (t) => {
      const pos = positionAt(s.trail, t);
      if (!pos || !map) return;
      here.setLatLng([pos.lat, pos.lng]);
      walked.setLatLngs([...all.slice(0, pos.i), [pos.lat, pos.lng]]);
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
