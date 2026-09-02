export const ARCSWEEP_CANONICAL_RUNTIME_URL = 'https://flameclyffe.vercel.app/arcsweep/';
export const ARCSWEEP_STATIC_FALLBACK_PARAM = 'static';

export function canonicalRuntimeTarget(locationLike = globalThis.location) {
  if (!locationLike) return null;
  const hostname = String(locationLike.hostname || '').toLowerCase();
  if (!hostname.endsWith('github.io')) return null;

  const current = new URL(locationLike.href);
  if (current.searchParams.get(ARCSWEEP_STATIC_FALLBACK_PARAM) === '1') return null;

  const target = new URL(ARCSWEEP_CANONICAL_RUNTIME_URL);
  for (const [key, value] of current.searchParams.entries()) {
    if (key !== ARCSWEEP_STATIC_FALLBACK_PARAM) target.searchParams.append(key, value);
  }
  target.hash = current.hash;
  return target.href;
}

export function redirectToCanonicalRuntime(locationLike = globalThis.location) {
  const target = canonicalRuntimeTarget(locationLike);
  if (!target) return false;
  locationLike.replace(target);
  return true;
}

if (typeof location !== 'undefined') redirectToCanonicalRuntime(location);
