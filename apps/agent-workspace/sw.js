const CACHE = 'house-workspace-os-v0.6.0-test-flight';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './brain-core.js',
  './host-bridge.js',
  './app.js',
  './chat.css',
  './chat.js',
  './crow-nest.css',
  './crow-nest-motion.css',
  './crow-nest-bootstrap.js',
  './crow-nest.js',
  './sensory-feedback.css',
  './spatial-polish.css',
  './sensory-feedback.js',
  './spatial-polish.js',
  './return-engine.css',
  './return-engine-ui.js',
  './refractive-glass-three.js',
  './refractive-glass-three.css',
  './connection-doctor.js',
  './connection-doctor.css',
  '../arcsweep/src/return-engine.js',
  './astra-bridge.js',
  './neural-bridge.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {});
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && url.pathname.includes('/agents/')) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
    }
    return response;
  })));
});
