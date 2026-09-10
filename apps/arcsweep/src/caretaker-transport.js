import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';
import { getKelyranSupabase } from './kelyran-supabase.js';

export const ARCSWEEP_CANONICAL_RUNTIME_ORIGIN = 'https://flameclyffe.vercel.app';
export const CARETAKER_API_PATH = '/api/v1/house/caretaker';

function locationHost(location = globalThis.location) {
  return String(location?.hostname || '').toLowerCase();
}

export function isArcSweepGitHubPages(location = globalThis.location) {
  return locationHost(location) === 'singsenochian.github.io';
}

export function caretakerEndpointForLocation(location = globalThis.location) {
  const override = String(globalThis.window?.__arcsweepApiOrigin || '').trim().replace(/\/$/, '');
  if (override) return `${override}${CARETAKER_API_PATH}`;
  if (isArcSweepGitHubPages(location)) return `${ARCSWEEP_CANONICAL_RUNTIME_ORIGIN}${CARETAKER_API_PATH}`;
  return CARETAKER_API_PATH;
}

export async function readCaretakerSupabaseAccessToken(clientProvider = getKelyranSupabase) {
  try {
    const client = await clientProvider();
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return String(data?.session?.access_token || '').trim();
  } catch {
    return '';
  }
}

export async function resolveCaretakerTransport({
  location = globalThis.location,
  storage = globalThis.sessionStorage,
  fetchImpl = fetch,
  readStoredToken = readHouseRuntimeToken,
  restoreSession = restoreHouseRuntimeSession,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
} = {}) {
  const endpoint = caretakerEndpointForLocation(location);

  // GitHub Pages is static. It reaches the canonical protected runtime directly
  // with the signed-in Steward's short-lived Supabase access token. Do not send
  // a locally stored House master credential across origins.
  if (isArcSweepGitHubPages(location)) {
    const accessToken = String(await accessTokenProvider() || '').trim();
    return Object.freeze({
      endpoint,
      token: accessToken,
      auth_mode: accessToken ? 'supabase-bearer' : 'signed-out',
      execution_surface: 'github-pages-to-canonical-runtime',
      cross_origin: true,
    });
  }

  const stored = String(readStoredToken(storage) || '').trim();
  if (stored) {
    return Object.freeze({
      endpoint,
      token: stored,
      auth_mode: stored === HOUSE_COOKIE_SESSION ? 'house-cookie' : 'house-bearer',
      execution_surface: 'same-origin-runtime',
      cross_origin: false,
    });
  }

  const restored = String(await restoreSession(fetchImpl, accessTokenProvider) || '').trim();
  if (restored) {
    return Object.freeze({
      endpoint,
      token: restored,
      auth_mode: restored === HOUSE_COOKIE_SESSION ? 'house-cookie' : 'house-bearer',
      execution_surface: 'same-origin-runtime',
      cross_origin: false,
    });
  }

  // Same-origin hosted runtime may still use the signed-in Supabase token
  // directly if cookie exchange is unavailable for any reason.
  const accessToken = String(await accessTokenProvider() || '').trim();
  return Object.freeze({
    endpoint,
    token: accessToken,
    auth_mode: accessToken ? 'supabase-bearer' : 'signed-out',
    execution_surface: 'same-origin-runtime',
    cross_origin: false,
  });
}

export function caretakerTransportLabel(transport) {
  if (!transport?.token) return 'Steward sign-in required';
  if (transport.cross_origin) return 'GitHub Pages ↔ ArcSweep runtime';
  if (transport.auth_mode === 'house-cookie') return 'ArcSweep runtime · sealed session';
  if (transport.auth_mode === 'supabase-bearer') return 'ArcSweep runtime · Steward identity';
  return 'ArcSweep runtime · connected';
}
