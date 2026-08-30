import { HOUSE_COOKIE_SESSION, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

function authHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}

async function activeSession(fetchImpl = fetch) {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession(fetchImpl);
}

async function request(options = {}, fetchImpl = fetch) {
  const token = await activeSession(fetchImpl);
  if (!token) throw new Error('Connect the House Runtime first.');
  const response = await fetchImpl('/api/v1/house/emergence-lab', {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { ...(options.headers || {}), ...authHeaders(token) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Emergence lab ${response.status}`);
  return data;
}

export function readEmergenceLabStatus(fetchImpl = fetch) {
  return request({}, fetchImpl);
}

export function runWildEmergenceTrial(trial, fetchImpl = fetch) {
  return request({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(trial || {}),
  }, fetchImpl);
}
