// Nimbets / Squishtopia service worker — offline support
// Bump CACHE when you deploy changes so clients fetch the new version.
const CACHE = 'squishtopia-v3';

// Core files needed to run the game offline. Paths are relative to the
// service worker's location (the repo's squishtopia/ folder on GitHub Pages).
const ASSETS = [
  'squishtopia.html',
  'manifest.json',
  'icon192.png',
  'icon512.png',
  'nimbets-music.mp3'
];

// Install: pre-cache the core assets, then activate immediately.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(err => {
        // Don't let one missing asset abort the whole install.
        console.warn('SW: some assets failed to pre-cache', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//  - HTML navigations: network-first (so a new deploy is picked up), fall back
//    to the cached squishtopia.html when offline.
//  - Everything else (icons, music, etc.): cache-first for speed + offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isDoc = e.request.mode === 'navigate' ||
                (e.request.headers.get('accept') || '').includes('text/html');

  if (isDoc) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('squishtopia.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
