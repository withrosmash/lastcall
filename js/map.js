import { el, btn, spacer, foot, head, sheet, toast, hms, km } from './ui.js';
import * as S from './state.js';
import * as geo from './geo.js';

// Dark basemap: the standard OSM raster is light, which fights a true-black
// night app and leaves the stats strip unreadable. CARTO's dark_all is free
// with attribution. The design brief asks for genuinely offline tiles — that
// needs bundled map data and is still open.
const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const SUBDOMAINS = 'abcd';
const ATTRIB = '&copy; OpenStreetMap, &copy; CARTO';

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
    head({ title: 'Tonight', back: () => ctx.go('live') }),

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
        ? btn('Back to session', 'btn--sec', () => ctx.go('live'))
        : btn('Drop pin', 'btn--pri', () => dropPin(ctx, s), { iconName: 'map-pin', lg: true }),
    ),
  ];
}

function initMap(host, s) {
  if (!globalThis.L || !host.isConnected) return;
  teardownMap();

  map = L.map(host, { zoomControl: false, attributionControl: true, preferCanvas: true });
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIB, subdomains: SUBDOMAINS, crossOrigin: true }).addTo(map);

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

/* ---------- 05 drop pin ---------- */

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

    // Filled in async once Overpass answers; invisible until then, and offline
    // or on failure it simply never appears — typing always works.
    const suggestions = el('div', { class: 'stack', style: 'gap:6px' });
    nearbyVenues(here).then((venues) => {
      if (!venues.length || !suggestions.isConnected) return;
      suggestions.append(
        el('div', { class: 'eb', text: 'Nearby' }),
        el('div', { class: 'chips' }, venues.slice(0, 6).map((v) =>
          el('button', {
            class: 'chip press', type: 'button',
            onclick: () => { name = v.name; nameInput.value = v.name; },
          }, v.name))),
        el('div', { class: 'cap', text: 'Suggestions from OpenStreetMap' }),
      );
    }).catch(() => { /* offline or slow — manual entry stands */ });

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
    head({ title: 'Everywhere you’ve been', back: () => ctx.go('history') }),
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
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIB, subdomains: SUBDOMAINS, crossOrigin: true }).addTo(map);

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

export function teardownMap() {
  if (onFix) { window.removeEventListener('lc:fix', onFix); onFix = null; }
  if (map) { map.remove(); map = null; }
  layers = { trail: null, me: null, pins: [] };
  centred = false;
}

export { hms };
