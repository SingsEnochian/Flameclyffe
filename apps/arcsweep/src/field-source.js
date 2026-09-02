const CACHE_SLOT_MS = 30 * 60 * 1000;

function pageUrl(location) {
  if (location instanceof URL) return location;
  if (typeof location === 'string') return new URL(location);
  if (location?.href) return new URL(location.href);
  throw new Error('Field source resolution requires a page URL.');
}

function isLocalHost(hostname) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

export function fieldSourceCandidates(location = globalThis.location, now = Date.now()) {
  const page = pageUrl(location);
  const cache = new URL('../../data/deep-current.json', page);
  cache.searchParams.set('field-slot', String(Math.floor(Number(now) / CACHE_SLOT_MS)));
  const api = new URL('/api/v1/field/current', page);

  return isLocalHost(page.hostname)
    ? [api.href, cache.href]
    : [cache.href, api.href];
}

export async function readCurrentField({
  fetchImpl = globalThis.fetch,
  location = globalThis.location,
  now = Date.now(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Field reading requires fetch.');
  const failures = [];

  for (const url of fieldSourceCandidates(location, now)) {
    try {
      const response = await fetchImpl(url, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
      const payload = await response.json();
      if (!payload?.field || typeof payload.field !== 'object') {
        throw new Error('field payload missing');
      }
      return payload;
    } catch (error) {
      failures.push(`${new URL(url).pathname}: ${error.message}`);
    }
  }

  throw new Error(failures.join(' · ') || 'No Field source was available.');
}
