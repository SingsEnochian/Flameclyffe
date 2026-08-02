import {
  createCanonLibraryReceipt,
  validateCanonLibraryManifest,
} from './library-contract.js';

export const BIFROST_LIBRARY_BRIDGE_SCHEMA = 'hearthgate.bifrost-canon-library-bridge/v1';
export const DEFAULT_BIFROST_LIBRARY_ENDPOINT = 'http://127.0.0.1:31415/api/v1/bifrost/library';

function assertLoopback(url) {
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Bifröst Library Bridge must remain loopback-only.');
  }
  return parsed.toString().replace(/\/$/, '');
}

async function json(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Bifröst bridge request failed (${response.status}).`);
  return payload;
}

export function createBifrostLibraryBridge({
  endpoint = DEFAULT_BIFROST_LIBRARY_ENDPOINT,
  fetchImpl = globalThis.fetch,
  token = null,
} = {}) {
  const base = assertLoopback(endpoint);
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required.');

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bifröst ${token}`);
    return json(await fetchImpl(`${base}${path}`, { ...options, headers }));
  }

  return Object.freeze({
    schema: BIFROST_LIBRARY_BRIDGE_SCHEMA,
    endpoint: base,
    async health() {
      return request('/health');
    },
    async listLibraries() {
      return request('/libraries');
    },
    async inspect(manifest) {
      const validated = validateCanonLibraryManifest(manifest);
      const remote = await request('/inspect', { method: 'POST', body: JSON.stringify(validated) });
      return {
        manifest: validated,
        remote,
        receipt: createCanonLibraryReceipt({
          manifest: validated,
          operation: 'inspect',
          direction: 'web-to-desktop',
          status: remote.status || 'VERIFIED',
          detail: { endpoint: base },
        }),
      };
    },
    async importLibrary(manifest, { userApproved = false } = {}) {
      const validated = validateCanonLibraryManifest(manifest);
      if (!userApproved) throw new Error('Canon Library import requires explicit user approval.');
      const remote = await request('/imports', {
        method: 'POST',
        body: JSON.stringify({ manifest: validated, user_approved: true }),
      });
      return {
        manifest: validated,
        remote,
        receipt: createCanonLibraryReceipt({
          manifest: validated,
          operation: 'import',
          direction: 'web-to-desktop',
          status: remote.status || 'VERIFIED',
          detail: { import_id: remote.import_id || null, endpoint: base },
        }),
      };
    },
    async search({ house, query, limit = 50 }) {
      const params = new URLSearchParams({ house, q: query, limit: String(Math.min(200, Math.max(1, limit))) });
      return request(`/search?${params}`);
    },
    async rollback({ packageId, receiptId, userApproved = false }) {
      if (!userApproved) throw new Error('Canon Library rollback requires explicit user approval.');
      return request('/rollback', {
        method: 'POST',
        body: JSON.stringify({ package_id: packageId, receipt_id: receiptId, user_approved: true }),
      });
    },
  });
}
