import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';
import { getKelyranSupabase } from './kelyran-supabase.js';

export const ARCSWEEP_CANONICAL_RUNTIME_ORIGIN = 'https://flameclyffe.vercel.app';
export const ARCSWEEP_SUPABASE_EDGE_ORIGIN = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1';
export const ARCSWEEP_CARETAKER_EDGE_ENDPOINT = `${ARCSWEEP_SUPABASE_EDGE_ORIGIN}/arcsweep-caretaker`;
export const CARETAKER_API_PATH = '/api/v1/house/caretaker';

function locationHost(location = globalThis.location) {
  return String(location?.hostname || '').toLowerCase();
}

export function isArcSweepGitHubPages(location = globalThis.location) {
  return locationHost(location) === 'singsenochian.github.io';
}

export function isArcSweepCanonicalVercel(location = globalThis.location) {
  return locationHost(location) === 'flameclyffe.vercel.app';
}

export function isHostedCaretakerSurface(location = globalThis.location) {
  return isArcSweepGitHubPages(location) || isArcSweepCanonicalVercel(location);
}

function apiOriginOverride() {
  return String(globalThis.window?.__arcsweepApiOrigin || '').trim().replace(/\/$/, '');
}

export function caretakerEndpointForLocation(location = globalThis.location) {
  const override = apiOriginOverride();
  if (override) return `${override}${CARETAKER_API_PATH}`;
  if (isHostedCaretakerSurface(location)) return ARCSWEEP_CARETAKER_EDGE_ENDPOINT;
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
  const hostedEdge = endpoint === ARCSWEEP_CARETAKER_EDGE_ENDPOINT;

  // Hosted ArcSweep uses the signed-in Steward's existing Supabase session and
  // talks directly to the portable Caretaker Edge service. This removes the
  // Vercel rewrite/function-router from the chat path entirely. Local ArcSweep
  // keeps the existing Hearthgate/Ollama lane below.
  if (hostedEdge) {
    const accessToken = String(await accessTokenProvider() || '').trim();
    const surface = isArcSweepGitHubPages(location) ? 'github-pages-to-supabase-edge' : 'vercel-to-supabase-edge';
    return Object.freeze({
      endpoint,
      token: accessToken,
      auth_mode: accessToken ? 'supabase-bearer' : 'signed-out',
      execution_surface: surface,
      cross_origin: true,
    });
  }

  const stored = String(readStoredToken(storage) || '').trim();
  if (stored) {
    return Object.freeze({
      endpoint,
      token: stored,
      auth_mode: stored === HOUSE_COOKIE_SESSION ? 'house-cookie' : 'house-bearer',
      execution_surface: 'local-or-overridden-runtime',
      cross_origin: false,
    });
  }

  const restored = String(await restoreSession(fetchImpl, accessTokenProvider) || '').trim();
  if (restored) {
    return Object.freeze({
      endpoint,
      token: restored,
      auth_mode: restored === HOUSE_COOKIE_SESSION ? 'house-cookie' : 'house-bearer',
      execution_surface: 'local-or-overridden-runtime',
      cross_origin: false,
    });
  }

  const accessToken = String(await accessTokenProvider() || '').trim();
  return Object.freeze({
    endpoint,
    token: accessToken,
    auth_mode: accessToken ? 'supabase-bearer' : 'signed-out',
    execution_surface: 'local-or-overridden-runtime',
    cross_origin: false,
  });
}

export function caretakerTransportLabel(transport) {
  if (!transport?.token) return 'Steward sign-in required';
  if (transport.execution_surface === 'github-pages-to-supabase-edge') return 'GitHub Pages ↔ Caretaker Edge';
  if (transport.execution_surface === 'vercel-to-supabase-edge') return 'ArcSweep ↔ Caretaker Edge';
  if (transport.auth_mode === 'house-cookie') return 'ArcSweep runtime · sealed session';
  if (transport.auth_mode === 'supabase-bearer') return 'ArcSweep runtime · Steward identity';
  return 'ArcSweep runtime · connected';
}
