/* Contrail Service Worker — offline cache */
const CACHE = 'contrail-v8';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigation: network-first (avoids stale HTML after redeploy), cache fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./', cp)); return r; })
        .catch(() => caches.match('./').then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets & fonts: cache-first, then network (and cache successful GETs)
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        if (res && res.status === 200 && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.host))) {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(req, cp));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
