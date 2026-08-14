export const HOUSE_RUNTIME_SESSION_KEY = 'hearthgate:house-runtime-session/v1';

export function readHouseRuntimeToken(storage = globalThis.sessionStorage) {
  try { return storage?.getItem(HOUSE_RUNTIME_SESSION_KEY) || ''; } catch { return ''; }
}

export function writeHouseRuntimeToken(token, storage = globalThis.sessionStorage) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Enter the House runtime token.');
  storage?.setItem(HOUSE_RUNTIME_SESSION_KEY, value);
  return value;
}

export function clearHouseRuntimeToken(storage = globalThis.sessionStorage) {
  try { storage?.removeItem(HOUSE_RUNTIME_SESSION_KEY); } catch {}
}

export async function readFlameStatuses(voices, token, fetchImpl = fetch) {
  if (!token) return voices.map((voice) => ({ id: voice.id, name: voice.name, state: 'house-offline', configured: false, missing: ['HOUSE_RUNTIME_SESSION'] }));
  return Promise.all(voices.map(async (voice) => {
    try {
      const response = await fetchImpl(`/api/v1/flames/${voice.route}/status`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return { id: voice.id, name: voice.name, state: 'unauthorised', configured: false, missing: [] };
      if (!response.ok) return { id: voice.id, name: voice.name, state: 'route-error', configured: false, missing: [], error: data.error || `${response.status}` };
      return { id: voice.id, name: voice.name, state: data.configured ? 'live' : 'provider-unavailable', configured: Boolean(data.configured), provider: data.provider, model: data.model, missing: data.missing || [] };
    } catch (error) {
      return { id: voice.id, name: voice.name, state: 'offline', configured: false, missing: [], error: error.message };
    }
  }));
}

async function commonsRequest(token, options = {}, fetchImpl = fetch) {
  if (!token) throw new Error('Connect the House Runtime first.');
  const response = await fetchImpl('/api/v1/house/commons', { ...options, headers: { ...(options.headers || {}), authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `House Commons ${response.status}`);
  return data;
}

export function readHouseCommons(token, fetchImpl = fetch) {
  return commonsRequest(token, { cache: 'no-store' }, fetchImpl);
}

export function appendHouseCommons(token, entry, fetchImpl = fetch) {
  return commonsRequest(token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) }, fetchImpl);
}
