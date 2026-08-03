const CACHE_VERSION = 'hearthgate-ipad-somatic-v1';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './hearthgate-somatic-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('hearthgate-ipad-somatic-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    try {
      const response = await fetch(request);
      if (response && response.ok && new URL(request.url).origin === self.location.origin) {
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./');
        if (fallback) return fallback;
      }
      throw new Error('HEARTHGATE_SOMATIC_OFFLINE_CACHE_MISS');
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.action === 'skip-waiting') self.skipWaiting();
});
