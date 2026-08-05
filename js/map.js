import { el, btn, tile, sheet, toast, hhmm, km } from './ui.js';
import * as S from './state.js';
import * as geo from './geo.js';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIB = '&copy; OpenStreetMap';

let map = null;
let layers = { trail: null, me: null, pins: [] };
let onFix = null;
let centred = false;

export function mapScreen(ctx) {
  const s = ctx.state.active;
  if (!s) { ctx.go('start'); return []; }

  const host = el('div', { id: 'map', role: 'application', 'aria-label': 'Your route tonight' });

  // Leaflet needs the container in the document with a real size before init.
  queueMicrotask(() => initMap(ctx, host, s));

  const denied = ctx.geoStatus === 'denied' || ctx.geoStatus === 'unsupported';

  return [
    host,
    el('div', { class: 'map-pane' },
      denied
        ? el('div', { class: 'cap', text: 'Location is off, so there is no map tonight. Drinks, water and time are all still being tracked.' })
        : el('div', { class: 'tiles tiles--3' },
            tile('Dist', km(s.distanceM), { mod: 'tile__v--sm' }),
            tile('Stops', s.pins.length, { mod: 'tile__v--sm' }),
            tile('Time', hhmm(S.elapsedMs(s)), { mod: 'tile__v--sm' }),
          ),
      denied ? null : btn('Drop pin here', 'btn--pri', () => dropPin(ctx, s)),
      btn('Back to session', 'btn--sec btn--sm', () => ctx.go('live')),
    ),
  ];
}

function initMap(ctx, host, s) {
  if (!globalThis.L || !host.isConnected) return;
  teardownMap();

  map = L.map(host, { zoomControl: true, attributionControl: true, preferCanvas: true });
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIB, crossOrigin: true }).addTo(map);

  layers.trail = L.polyline(s.trail.map((p) => [p.lat, p.lng]), {
    color: '#7EE0C0', weight: 5, lineCap: 'round', lineJoin: 'round',
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
    icon: L.divIcon({ className: '', html: '<div class="dot-me" style="width:16px;height:16px"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    keyboard: false,
    interactive: false,
  }).addTo(map);
}

function addPinMarker(pin) {
  const marker = L.marker([pin.lat, pin.lng], {
    icon: L.divIcon({ className: '', html: '<div class="dot-stop" style="width:14px;height:14px"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
  }).addTo(map);
  marker.bindPopup(`<b>${escapeHtml(pin.name)}</b>${pin.note ? '<br>' + escapeHtml(pin.note) : ''}`);
  layers.pins.push(marker);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dropPin(ctx, s) {
  const here = s.trail[s.trail.length - 1] || (map && { lat: map.getCenter().lat, lng: map.getCenter().lng });
  if (!here) { toast('No position yet. Give GPS a moment.'); return; }

  let name = '';
  let note = '';

  sheet((close) => {
    const save = btn('Save stop', 'btn--pri', () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      close();
      const pin = { lat: here.lat, lng: here.lng, name: trimmed, note: note.trim() };
      ctx.addPin(pin);
      if (map) addPinMarker({ ...pin, t: Date.now() });
      ctx.go('map');
      toast('Stop saved.');
    });
    save.disabled = true;

    return [
      el('div', { class: 'title', text: 'Name this stop' }),
      el('label', { class: 'field' },
        el('div', { class: 'field__k', text: 'Venue' }),
        el('input', {
          type: 'text', autocapitalize: 'words', enterkeyhint: 'done', placeholder: 'The Fox and Hounds',
          oninput: (e) => { name = e.target.value; save.disabled = !name.trim(); },
          onkeydown: (e) => { if (e.key === 'Enter' && !save.disabled) save.click(); },
        }),
      ),
      el('label', { class: 'field' },
        el('div', { class: 'field__k', text: 'Note · optional' }),
        el('input', {
          type: 'text', placeholder: 'Anything worth remembering',
          oninput: (e) => { note = e.target.value; },
        }),
      ),
      save,
      btn('Cancel', 'btn--ghost btn--sm', close),
    ];
  });
}

export function teardownMap() {
  if (onFix) { window.removeEventListener('lc:fix', onFix); onFix = null; }
  if (map) { map.remove(); map = null; }
  layers = { trail: null, me: null, pins: [] };
  centred = false;
}
