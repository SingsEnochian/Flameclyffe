import { getKelyranSupabase } from './kelyran-supabase.js';

export const PAGES_HOUSE_TRANSPORT_VERSION = 'arcsweep.pages-house-transport/v1';
export const ARCSWEEP_HOUSE_EDGE_URL = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/arcsweep-house';
export const OXALPHA_EDGE_URL = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/oxalpha';

const nativeFetch = globalThis.fetch?.bind(globalThis);
const pagesHost = () => globalThis.location?.hostname === 'singsenochian.github.io';

async function accessToken() {
  try {
    const client = await getKelyranSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return String(data.session?.access_token || '').trim();
  } catch {
    return '';
  }
}

function requestPath(input) {
  try {
    if (input instanceof Request) return new URL(input.url, globalThis.location?.href).pathname;
    return new URL(String(input), globalThis.location?.href).pathname;
  } catch {
    return '';
  }
}

function requestMethod(input, init = {}) {
  if (init.method) return String(init.method).toUpperCase();
  if (input instanceof Request) return String(input.method || 'GET').toUpperCase();
  return 'GET';
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function sessionResponse(method) {
  if (method === 'DELETE') return jsonResponse(200, { ok: true, transport: 'supabase-edge' });
  const token = await accessToken();
  if (!token) return jsonResponse(401, { error: 'supabase-session-required', transport: 'supabase-edge' });
  return jsonResponse(200, { ok: true, session: 'supabase-jwt', transport: 'supabase-edge' });
}

async function relayCommons(input, init = {}) {
  const token = await accessToken();
  if (!token) return jsonResponse(401, { error: 'supabase-session-required', transport: 'supabase-edge' });
  const method = requestMethod(input, init);
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('authorization', `Bearer ${token}`);
  if (method === 'POST' && !headers.has('content-type')) headers.set('content-type', 'application/json');
  let body = init.body;
  if (body == null && input instanceof Request && method !== 'GET' && method !== 'HEAD') body = await input.clone().text();
  return nativeFetch(ARCSWEEP_HOUSE_EDGE_URL, { method, headers, body, cache: 'no-store' });
}

async function relayOxAlphaStatus() {
  const response = await nativeFetch(OXALPHA_EDGE_URL, { method: 'GET', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return jsonResponse(response.status, data);
  return jsonResponse(200, {
    flame_id: 'oxalpha',
    display_name: data.display_name || 'Ox Alpha',
    configured: data.configured === true,
    provider: data.provider || 'openrouter',
    model: data.inference_model || data.model || 'z-ai/glm-5.3-flash',
    gateway_configured: true,
    runtime_reachable: true,
    model_available: data.configured === true,
    execution_path: data.execution_path || 'supabase-edge-to-openrouter',
    portable: true,
  });
}

export function installPagesHouseTransportBridge() {
  if (!nativeFetch || !pagesHost() || globalThis.__arcsweepPagesHouseTransportInstalled) return false;
  globalThis.__arcsweepPagesHouseTransportInstalled = PAGES_HOUSE_TRANSPORT_VERSION;

  globalThis.fetch = async function arcsweepPagesHouseFetch(input, init = {}) {
    const path = requestPath(input);
    const method = requestMethod(input, init);

    if (path === '/api/v1/house/session') return sessionResponse(method);
    if (path === '/api/v1/house/commons') return relayCommons(input, init);
    if (path === '/api/v1/flames/oxalpha/status' && method === 'GET') return relayOxAlphaStatus();

    return nativeFetch(input, init);
  };

  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:pages-house-transport-ready', {
    detail: { version: PAGES_HOUSE_TRANSPORT_VERSION, house: ARCSWEEP_HOUSE_EDGE_URL, oxalpha: OXALPHA_EDGE_URL },
  }));
  return true;
}

if (typeof window !== 'undefined') installPagesHouseTransportBridge();
