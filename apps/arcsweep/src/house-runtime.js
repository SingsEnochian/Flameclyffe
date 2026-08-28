import { canonicaliseHouseCommonsEntry } from './house-formatted-text-bridge.js';

export const HOUSE_RUNTIME_SESSION_KEY = 'hearthgate:house-runtime-session/v1';
export const HOUSE_COOKIE_SESSION = 'cookie-session';

export function readHouseRuntimeToken(storage = globalThis.sessionStorage) {
  try { return storage?.getItem(HOUSE_RUNTIME_SESSION_KEY) || ''; } catch { return ''; }
}

export function writeHouseRuntimeToken(token, storage = globalThis.sessionStorage) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Enter the Steward credential.');
  storage?.setItem(HOUSE_RUNTIME_SESSION_KEY, value);
  return value;
}

export function clearHouseRuntimeToken(storage = globalThis.sessionStorage) {
  try { storage?.removeItem(HOUSE_RUNTIME_SESSION_KEY); } catch {}
}

const bearerHeaders = (token) => token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};

async function sessionRequest(options = {}, fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/house/session', { ...options, credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function signedInSupabaseAccessToken() {
  try {
    const { getKelyranSupabase } = await import('./kelyran-supabase.js');
    const client = await getKelyranSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return data.session?.access_token || '';
  } catch { return ''; }
}

export async function restoreHouseRuntimeSession(fetchImpl = fetch, accessTokenProvider = signedInSupabaseAccessToken) {
  try {
    const current = await sessionRequest({}, fetchImpl);
    if (current.response.ok) return HOUSE_COOKIE_SESSION;
    const accessToken = String(await accessTokenProvider() || '').trim();
    if (!accessToken) return '';
    const exchanged = await sessionRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ supabase_access_token: accessToken }),
    }, fetchImpl);
    return exchanged.response.ok ? HOUSE_COOKIE_SESSION : '';
  } catch { return ''; }
}

export async function connectHouseRuntime(credential, { hosted = true, storage = globalThis.sessionStorage, fetchImpl = fetch } = {}) {
  const value = String(credential || '').trim();
  if (!value) throw new Error('Enter the Steward credential.');
  if (!hosted) return writeHouseRuntimeToken(value, storage);
  const { response, data } = await sessionRequest({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential: value }) }, fetchImpl);
  if (!response.ok) throw new Error(data.error || `House Runtime ${response.status}`);
  clearHouseRuntimeToken(storage);
  return HOUSE_COOKIE_SESSION;
}

export async function disconnectHouseRuntime({ hosted = true, storage = globalThis.sessionStorage, fetchImpl = fetch } = {}) {
  clearHouseRuntimeToken(storage);
  if (hosted) await sessionRequest({ method: 'DELETE' }, fetchImpl).catch(() => null);
}

export async function readFlameStatuses(voices, token, fetchImpl = fetch) {
  if (!token) return voices.map((voice) => ({ id: voice.id, name: voice.name, state: 'house-offline', configured: false, missing: ['HOUSE_RUNTIME_SESSION'] }));
  return Promise.all(voices.map(async (voice) => {
    try {
      const response = await fetchImpl(`/api/v1/flames/${voice.route}/status`, { headers: bearerHeaders(token), credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return { id: voice.id, name: voice.name, state: 'unauthorised', configured: false, missing: [] };
      if (!response.ok) return { id: voice.id, name: voice.name, state: 'route-error', configured: false, missing: [], error: data.error || `${response.status}` };
      const fallback = data.hosted_fallback || null;
      const fallbackReady = fallback?.configured === true;
      const state = data.configured ? 'live' : fallbackReady ? 'hosted-fallback-ready' : data.gateway_configured && data.runtime_reachable ? 'model-not-pulled' : 'provider-unavailable';
      return {
        id: voice.id, name: voice.name, state, configured: Boolean(data.configured),
        provider: fallbackReady ? fallback.provider : data.provider,
        model: fallbackReady ? fallback.model : data.model,
        missing: fallbackReady ? [] : data.missing || [],
        gatewayConfigured: data.gateway_configured ?? null,
        runtimeReachable: data.runtime_reachable ?? null,
        modelAvailable: data.model_available ?? null,
        runtimeError: data.runtime_error || null,
        hostedFallback: fallback ? {
          configured: fallbackReady, provider: fallback.provider || null, model: fallback.model || null,
          executionPath: fallback.execution_path || null, primaryRouteUnchanged: fallback.primary_route_unchanged === true,
          missing: fallback.missing || [],
        } : null,
      };
    } catch (error) {
      return { id: voice.id, name: voice.name, state: 'offline', configured: false, missing: [], error: error.message };
    }
  }));
}

async function commonsRequest(token, options = {}, fetchImpl = fetch) {
  if (!token) throw new Error('Connect the House Runtime first.');
  const response = await fetchImpl('/api/v1/house/commons', { ...options, credentials: 'same-origin', headers: { ...(options.headers || {}), ...bearerHeaders(token) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `House Commons ${response.status}`);
  return data;
}

export function readHouseCommons(token, fetchImpl = fetch) { return commonsRequest(token, { cache: 'no-store' }, fetchImpl); }
export function appendHouseCommons(token, entry, fetchImpl = fetch) {
  const canonical = canonicaliseHouseCommonsEntry(entry);
  return commonsRequest(token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(canonical) }, fetchImpl);
}

async function kelyranReportRequest(token, options = {}, fetchImpl = fetch) {
  if (!token) throw new Error('Connect the House Runtime first.');
  const response = await fetchImpl('/api/v1/house/kelyran-reports', { ...options, credentials: 'same-origin', cache: 'no-store', headers: { ...(options.headers || {}), ...bearerHeaders(token) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Kelyran model reporting ${response.status}`);
  return data;
}

export function readKelyranModelReportLog(token, fetchImpl = fetch) { return kelyranReportRequest(token, {}, fetchImpl); }
export function inviteKelyranModelReports(token, school, voiceIds, fetchImpl = fetch) { return kelyranReportRequest(token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'invite', voice_ids: voiceIds, school }) }, fetchImpl); }

export async function readHouseObservations(token, worldId = null, fetchImpl = fetch) {
  if (!token) throw new Error('Connect the House Runtime first.');
  const params = new URLSearchParams();
  if (worldId) params.set('world_id', worldId);
  const suffix = params.size ? `?${params}` : '';
  const response = await fetchImpl(`/api/v1/house/observations${suffix}`, { headers: bearerHeaders(token), credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `House observation live read ${response.status}`);
  return data;
}

function commandId(prefix = 'braid-command') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export async function commandHouseObservation(token, { action, cycleId, decision = null, reviewedBy = 'Rowan', commandId: suppliedCommandId = null, requestedAt = new Date().toISOString() } = {}, fetchImpl = fetch) {
  if (!token) throw new Error('Connect the House Runtime first.');
  const body = { schema: 'hearthgate.runtime-braid-command/v1', command_id: suppliedCommandId || commandId(action || 'braid-command'), action, cycle_id: cycleId, reviewed_by: reviewedBy, requested_at: requestedAt };
  if (decision) body.decision = decision;
  const response = await fetchImpl('/api/v1/house/observations', { method: 'POST', headers: { 'content-type': 'application/json', ...bearerHeaders(token) }, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `House Runtime command ${response.status}`);
  return data;
}

export function reviewHouseObservation(token, cycleId, decision, options = {}, fetchImpl = fetch) { return commandHouseObservation(token, { ...options, action: 'review-observation', cycleId, decision }, fetchImpl); }
export function admitHouseObservationToDeepTime(token, cycleId, options = {}, fetchImpl = fetch) { return commandHouseObservation(token, { ...options, action: 'admit-deeptime', cycleId }, fetchImpl); }

function parseSseBlock(block) {
  if (!block || block.startsWith(':')) return null;
  const message = { event: 'message', id: null, data: '' };
  for (const line of block.split(/\r?\n/)) {
    const split = line.indexOf(':');
    const field = split < 0 ? line : line.slice(0, split);
    const value = split < 0 ? '' : line.slice(split + 1).replace(/^ /, '');
    if (field === 'event') message.event = value;
    if (field === 'id') message.id = value;
    if (field === 'data') message.data += `${value}\n`;
  }
  message.data = message.data.replace(/\n$/, '');
  return message;
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function startHouseBraidLiveUpdates(token, {
  worldId = null,
  cursor = 0,
  onEvent = () => {},
  onState = () => {},
  fetchImpl = fetch,
  reconnect = true,
  reconnectDelayMs = 1_500,
} = {}) {
  if (!token) throw new Error('Connect the House Runtime first.');
  const controller = new AbortController();
  let stopped = false;
  let activeCursor = Number.isSafeInteger(Number(cursor)) ? Number(cursor) : 0;
  let reportedState = null;
  let hasBeenLive = false;
  let failureSince = null;
  let failureTimer = null;

  const emitState = (state, extra = {}) => {
    if (state === reportedState) return;
    reportedState = state;
    onState({ state, cursor: activeCursor, ...extra });
  };

  const clearFailure = () => {
    failureSince = null;
    if (failureTimer) clearTimeout(failureTimer);
    failureTimer = null;
  };

  const reportSustainedFailure = (error) => {
    if (stopped) return;
    if (!failureSince) failureSince = Date.now();
    if (failureTimer) return;
    failureTimer = setTimeout(() => {
      failureTimer = null;
      if (!stopped && failureSince && Date.now() - failureSince >= 5_000) emitState('error', { error });
    }, 5_000);
  };

  const done = (async () => {
    do {
      const params = new URLSearchParams({ cursor: String(activeCursor) });
      if (worldId) params.set('world_id', worldId);
      try {
        if (!hasBeenLive) emitState('connecting');
        const response = await fetchImpl(`/api/v1/house/braid/stream?${params}`, {
          headers: { accept: 'text/event-stream', ...bearerHeaders(token) },
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Runtime Braid stream ${response.status}`);
        }
        clearFailure();
        hasBeenLive = true;
        emitState('live');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const { value, done: ended } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !ended });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() || '';
          for (const block of blocks) {
            const message = parseSseBlock(block);
            if (!message) continue;
            let data = null;
            try { data = message.data ? JSON.parse(message.data) : null; } catch {}
            if (message.id && Number.isSafeInteger(Number(message.id))) activeCursor = Math.max(activeCursor, Number(message.id));
            if (message.event === 'braid' && data?.event) onEvent(data.event, { cursor: activeCursor, envelope: data });
            if (message.event === 'ready') { clearFailure(); if (!hasBeenLive) { hasBeenLive = true; emitState('live', { data }); } }
            if (message.event === 'error') reportSustainedFailure(new Error(data?.error || 'Runtime Braid stream error'));
            // Server reconnect hints are transport chatter. The live state remains stable while this client reconnects.
          }
          if (ended) break;
        }
      } catch (error) {
        if (stopped || error?.name === 'AbortError') break;
        reportSustainedFailure(error);
      }
      if (!stopped && reconnect) await delay(reconnectDelayMs);
    } while (!stopped && reconnect);
    clearFailure();
    emitState('closed');
  })();

  return Object.freeze({
    stop() { stopped = true; clearFailure(); controller.abort(); },
    get cursor() { return activeCursor; },
    done,
  });
}
