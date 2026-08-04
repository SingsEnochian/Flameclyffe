const CACHE_VERSION = 'hearthgate-ipad-somatic-v2';
const STATIC_SHELL = [
  './manifest.webmanifest',
  './hearthgate-somatic-icon.svg',
  './service-worker.js',
];

function sameOrigin(url) {
  return new URL(url, self.registration.scope).origin === self.location.origin;
}

function discoverDocumentAssets(html, baseUrl) {
  const assets = new Set();
  const pattern = /(?:src|href)=["']([^"'#]+)["']/g;
  for (const match of html.matchAll(pattern)) {
    const url = new URL(match[1], baseUrl);
    if (sameOrigin(url)) assets.add(url.href);
  }
  return [...assets];
}

async function cacheResponse(cache, url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HEARTHGATE_SOMATIC_CACHE_HTTP_${response.status}:${url}`);
  }
  await cache.put(url, response.clone());
  return response;
}

async function primeAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  const documentUrl = new URL('./', self.registration.scope);
  const documentResponse = await cacheResponse(cache, documentUrl, { cache: 'reload' });
  const html = await documentResponse.clone().text();
  const discoveredAssets = discoverDocumentAssets(html, documentUrl);
  const staticAssets = STATIC_SHELL.map((path) => new URL(path, self.registration.scope).href);
  const assets = [...new Set([...staticAssets, ...discoveredAssets])];
  await Promise.all(assets.map((url) => cacheResponse(cache, url, { cache: 'reload' })));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    primeAppShell().then(() => self.skipWaiting()),
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
      if (response.ok && sameOrigin(request.url)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request, { ignoreSearch: false })
        || await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match(new URL('./', self.registration.scope));
        if (fallback) return fallback;
      }
      throw new Error('HEARTHGATE_SOMATIC_OFFLINE_CACHE_MISS');
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.action === 'skip-waiting') {
    self.skipWaiting();
    return;
  }
  if (event.data?.action === 'prime-shell') {
    event.waitUntil(primeAppShell());
  }
});
