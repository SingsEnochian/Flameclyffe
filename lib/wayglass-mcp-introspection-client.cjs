'use strict';

// RFC7662 protected-resource client. The endpoint and its confidential client
// credentials are operator trust configuration, never derived from bearer text.
const MAX_TOKEN_BYTES = 8192;
const MAX_RESPONSE_BYTES = 64 * 1024;
function privateString(value, maximum = MAX_TOKEN_BYTES) {
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= maximum && !/[\u0000-\u0020\u007f]/.test(value);
}
function formComponent(value) {
  return new URLSearchParams({ value }).toString().slice('value='.length);
}
function createHttpsTokenIntrospector({ endpoint, clientId, clientSecret, fetchImpl = globalThis.fetch,
  timeoutMs = 5000, maxResponseBytes = MAX_RESPONSE_BYTES } = {}) {
  let url;
  try { url = new URL(endpoint); } catch { throw new TypeError('Explicit HTTPS introspection endpoint required'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new TypeError('Introspection endpoint must be HTTPS without credentials, query or fragment');
  }
  if (!privateString(clientId, 4096) || !privateString(clientSecret, 4096)) {
    throw new TypeError('Confidential introspection client credentials required');
  }
  if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000 ||
      !Number.isInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > MAX_RESPONSE_BYTES) {
    throw new TypeError('Bounded introspection transport configuration required');
  }
  const authorization = 'Basic ' + Buffer.from(formComponent(clientId) + ':' + formComponent(clientSecret)).toString('base64');
  const address = url.href;
  return async function introspect(token) {
    if (!privateString(token)) return null;
    let response;
    let reader;
    try {
      response = await fetchImpl(address, { method: 'POST', redirect: 'error', cache: 'no-store',
        headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded', authorization },
        body: new URLSearchParams({ token, token_type_hint: 'access_token' }).toString(),
        signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok || response.redirected || response.status !== 200) return null;
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/json') return null;
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxResponseBytes)) return null;
      if (!response.body || typeof response.body.getReader !== 'function') return null;
      reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxResponseBytes) return null;
        chunks.push(Buffer.from(value));
      }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
      const result = JSON.parse(text);
      return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
    } catch {
      // No private response, token, credential or upstream error leaves the boundary.
      return null;
    } finally {
      if (reader) await reader.cancel().catch(() => {});
      else if (response?.body) await response.body.cancel().catch(() => {});
    }
  };
}
module.exports = { createHttpsTokenIntrospector };
