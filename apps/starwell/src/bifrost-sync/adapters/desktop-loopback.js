const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

export function createDesktopLoopbackRemote({ baseUrl = 'http://127.0.0.1:47831', pairingToken, fetchImpl = fetch }) {
  const url = new URL(baseUrl);
  if (!LOOPBACK.has(url.hostname)) throw new TypeError('Desktop bridge must be loopback-only');
  if (!pairingToken) throw new TypeError('Desktop bridge pairing token is required');

  async function request(path, options = {}) {
    const response = await fetchImpl(new URL(path, url), {
      ...options,
      headers: {
        'content-type': 'application/json',
        'x-bifrost-pairing': pairingToken,
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`Bifröst desktop bridge HTTP ${response.status}`);
    return response.json();
  }

  return Object.freeze({
    async push(envelopes) {
      return request('/api/v1/bifrost/sync/push', { method: 'POST', body: JSON.stringify({ envelopes }) });
    },
    async pull(cursor) {
      const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return request(`/api/v1/bifrost/sync/pull${suffix}`);
    },
    async health() {
      return request('/api/v1/bifrost/sync/health');
    },
  });
}
