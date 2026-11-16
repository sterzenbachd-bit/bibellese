/* Service Worker: legt die App-Dateien im Gerätespeicher ab, damit die App ohne Netz startet.
   Bei jeder neuen App-Version CACHE hochzählen. */
const CACHE = 'bibellese-1.0.0';
const FILES = ['./', './index.html', './style.css', './app.js', './plan.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request)
        .then((res) => { if (res && res.ok) c.put(e.request, res.clone()); return res; })
        .catch(() => null);
      if (hit) return hit;
      const res = await net;
      if (res) return res;
      if (e.request.mode === 'navigate') {
        const idx = await c.match('./index.html');
        if (idx) return idx;
      }
      return Response.error();
    })
  );
});
