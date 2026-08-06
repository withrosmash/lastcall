// IMPORTANT: adding a file under js/ or vendor/ means adding it to SHELL below
// AND bumping CACHE. Miss either and phones serve a stale mix of old and new
// modules, which fails in ways that look nothing like a caching bug.

const CACHE = 'lastcall-v5';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/tokens/colors.css',
  './css/tokens/typography.css',
  './css/tokens/spacing.css',
  './css/tokens/effects.css',
  './vendor/leaflet.js',
  './vendor/leaflet.css',
  './vendor/capacitor-core.js',
  './js/app.js',
  './js/icons.js',
  './js/notify.js',
  './js/keepalive.js',
  './js/state.js',
  './js/storage.js',
  './js/ui.js',
  './js/session.js',
  './js/drinks.js',
  './js/geo.js',
  './js/map.js',
  './js/steps.js',
  './js/card.js',
  './js/history.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is atomic: one 404 would throw away the whole install, so each
      // entry is added on its own and a missing icon can't break the app.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Map tiles are someone else's servers and change rarely — let the network
  // and the HTTP cache handle them rather than filling our own cache.
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate: the app shell boots instantly offline, and a fresh
  // copy lands in the cache for next launch.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) return cached;
      const fresh = await network;
      if (fresh) return fresh;
      // Offline and never cached: fall back to the shell for navigations.
      if (request.mode === 'navigate') {
        return (await cache.match('./index.html')) || Response.error();
      }
      return Response.error();
    }),
  );
});
