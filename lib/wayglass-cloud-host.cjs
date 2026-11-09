'use strict';
const http = require('node:http');

const REQUIRED_CHECKS = Object.freeze(['oauth_pkce', 'bearer_verification', 'native_router', 'durable_receipts', 'grant_revocation']);
const SHA = /^[a-f0-9]{40}$/;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function validEvidence(value, sourceSha, now, maxAgeMs) {
  if (!Number.isFinite(now) || !value || value.schema !== 'wayglass.cloud-readiness/v1' || value.source_sha !== sourceSha) return false;
  const observed = Date.parse(value.observed_at);
  if (!Number.isFinite(observed) || observed > now || now - observed > maxAgeMs) return false;
  return REQUIRED_CHECKS.every(name => {
    const check = value.checks?.[name];
    return check?.ok === true && typeof check.evidence_id === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(check.evidence_id);
  });
}

// Hosting boundary only. The trusted adapter owns real protocol/auth/router/store
// probes and the receiving host retains its own atomic Feather/current-grant gate.
function createWayglassCloudHost({ gatewayHandler, checkReadiness, isStopped, sourceSha,
  readinessTimeoutMs = 2000, maxEvidenceAgeMs = 60000, now = Date.now } = {}) {
  if (typeof gatewayHandler !== 'function' || typeof isStopped !== 'function' || !SHA.test(sourceSha || '')) {
    throw new TypeError('Gateway handler, trusted Feather adapter and exact source SHA required');
  }
  if (!Number.isInteger(readinessTimeoutMs) || readinessTimeoutMs < 1 || readinessTimeoutMs > 10000 ||
      !Number.isInteger(maxEvidenceAgeMs) || maxEvidenceAgeMs < 1 || maxEvidenceAgeMs > 300000) {
    throw new TypeError('Bounded readiness timeout and freshness required');
  }
  async function stopped() {
    // Unknown or unreachable Feather state is held, including hung adapters.
    const controller = new AbortController();
    let timer;
    try {
      const expiry = new Promise(resolve => { timer = setTimeout(() => {
        controller.abort(); resolve(undefined);
      }, readinessTimeoutMs); });
      const value = await Promise.race([
        Promise.resolve().then(() => isStopped({ signal: controller.signal })), expiry,
      ]);
      return value !== false;
    } catch { return true; }
    finally { clearTimeout(timer); }
  }
  async function ready() {
    if (typeof checkReadiness !== 'function' || await stopped()) return false;
    const controller = new AbortController();
    let timer;
    try {
      const expiry = new Promise(resolve => { timer = setTimeout(() => {
        controller.abort(); resolve(null);
      }, readinessTimeoutMs); });
      const evidence = await Promise.race([
        Promise.resolve().then(() => checkReadiness({ sourceSha, signal: controller.signal })), expiry,
      ]);
      return validEvidence(evidence, sourceSha, now(), maxEvidenceAgeMs) && !await stopped();
    } catch { return false; }
    finally { clearTimeout(timer); }
  }
  const server = http.createServer((req, res) => {
    void (async () => {
      if (req.url === '/healthz' && req.method === 'GET') {
        return json(res, 200, { ok: true, service: 'wayglass-cloud-host', source_sha: sourceSha });
      }
      if (req.url === '/readyz' && req.method === 'GET') {
        const result = await ready();
        return json(res, result ? 200 : 503, { ready: result, service: 'wayglass-cloud-host' });
      }
      // A host-level stop protects every delegated entry, including discovery.
      if (await stopped()) return json(res, 503, { error: 'Wayglass crossing held' });
      await gatewayHandler(req, res);
    })().catch(() => {
      if (!res.headersSent) json(res, 503, { error: 'Wayglass crossing unavailable' });
      else res.destroy();
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}

module.exports = { createWayglassCloudHost, REQUIRED_CHECKS };
