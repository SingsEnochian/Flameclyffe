import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';

function bearerHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}

function add(params, key, value) {
  const text = String(value ?? '').trim();
  if (text) params.set(key, text);
}

export function observerArchiveQueryString(filters = {}) {
  const params = new URLSearchParams();
  add(params, 'q', filters.q);
  add(params, 'tag', filters.tag);
  add(params, 'event_type', filters.event_type);
  add(params, 'from', filters.from);
  add(params, 'to', filters.to);
  add(params, 'time_basis', filters.time_basis);
  add(params, 'as_of', filters.as_of);
  add(params, 'cursor', filters.cursor);
  add(params, 'limit', filters.limit);
  add(params, 'id', filters.id);
  if (Array.isArray(filters.include) && filters.include.length) params.set('include', filters.include.join(','));
  else add(params, 'include', filters.include);
  return params.toString();
}

export async function resolveObserverArchiveSession({
  storage = globalThis.sessionStorage,
  fetchImpl = fetch,
  accessTokenProvider,
} = {}) {
  const existing = readHouseRuntimeToken(storage);
  if (existing) return existing;
  return restoreHouseRuntimeSession(fetchImpl, accessTokenProvider);
}

export async function readObserverArchive(filters = {}, {
  token = null,
  storage = globalThis.sessionStorage,
  fetchImpl = fetch,
  accessTokenProvider,
} = {}) {
  const session = token || await resolveObserverArchiveSession({ storage, fetchImpl, accessTokenProvider });
  const query = observerArchiveQueryString(filters);
  const suffix = query ? `?${query}` : '';
  const response = await fetchImpl(`/api/v1/house/observer-reports${suffix}`, {
    headers: bearerHeaders(session),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Observer archive ${response.status}`);
  return data;
}

export function readObserverArchiveDetail(id, options = {}, requestOptions = {}) {
  const include = options.include || ['body', 'state', 'links', 'location', 'rendering'];
  return readObserverArchive({ id, include, as_of: options.as_of }, requestOptions);
}

export function readObserverArchiveRaw(id, options = {}, requestOptions = {}) {
  return readObserverArchive({ id, include: ['raw'], as_of: options.as_of }, requestOptions);
}
