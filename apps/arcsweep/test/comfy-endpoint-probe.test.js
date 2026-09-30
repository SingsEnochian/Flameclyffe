import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMFY_ENDPOINT_CONFIG_SCHEMA,
  COMFY_ENDPOINT_STATUS_SCHEMA,
  createComfyEndpointConfig,
  probeComfyEndpoint,
} from '../src/architecture/comfy-endpoint-probe.js';

// --- Mock fetch helpers ---

function mockFetch(status, body = {}) {
  return async (_url, _opts) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function mockFetchNetworkError(message = 'connection refused') {
  return async () => { throw new Error(message); };
}

function mockFetchTimeout() {
  return (_url, opts) =>
    new Promise((_resolve, reject) => {
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    });
}

const MOCK_SYSTEM_STATS = {
  system: { os: 'nt', python_version: '3.12', embedded_python: false },
  devices: [{ name: 'NVIDIA RTX 4070', type: 'cuda' }],
};

// --- createComfyEndpointConfig ---

test('endpoint config is frozen and schema-tagged', () => {
  const cfg = createComfyEndpointConfig({
    installId: 'desktop-01',
    baseUrl: 'http://127.0.0.1:8188',
  });
  assert.equal(cfg.schema, COMFY_ENDPOINT_CONFIG_SCHEMA);
  assert.equal(cfg.install_id, 'desktop-01');
  assert.equal(cfg.base_url, 'http://127.0.0.1:8188');
  assert.equal(Object.isFrozen(cfg), true);
});

test('endpoint config strips trailing slash from baseUrl', () => {
  const cfg = createComfyEndpointConfig({
    installId: 'x',
    baseUrl: 'http://127.0.0.1:8188/',
  });
  assert.equal(cfg.base_url, 'http://127.0.0.1:8188');
});

test('endpoint config requires installId', () => {
  assert.throws(() => createComfyEndpointConfig({ baseUrl: 'http://127.0.0.1:8188' }), /installId is required/);
});

test('endpoint config requires baseUrl', () => {
  assert.throws(() => createComfyEndpointConfig({ installId: 'x' }), /baseUrl is required/);
});

test('endpoint config defaults timeoutMs to 5000', () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  assert.equal(cfg.timeout_ms, 5000);
});

test('endpoint config accepts custom timeoutMs', () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188', timeoutMs: 2000 });
  assert.equal(cfg.timeout_ms, 2000);
});

test('endpoint config probe_path is always /system_stats', () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  assert.equal(cfg.probe_path, '/system_stats');
});

test('endpoint config carries no credentials or authority fields', () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  for (const f of ['api_key', 'token', 'authority', 'credentials', 'password', 'secret']) {
    assert.equal(Object.hasOwn(cfg, f), false, `must not have field: ${f}`);
  }
});

// --- probeComfyEndpoint: reachable ---

test('probe returns reachable:true when server responds 200', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'desktop-01', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(200, MOCK_SYSTEM_STATS) });

  assert.equal(status.schema, COMFY_ENDPOINT_STATUS_SCHEMA);
  assert.equal(status.reachable, true);
  assert.equal(status.install_id, 'desktop-01');
  assert.equal(status.base_url, 'http://127.0.0.1:8188');
  assert.equal(status.http_status, 200);
  assert.equal(status.error_kind, null);
  assert.equal(status.error_message, null);
  assert.equal(Object.isFrozen(status), true);
});

test('probe captures system_stats payload when reachable', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'desktop-01', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(200, MOCK_SYSTEM_STATS) });
  assert.deepEqual(status.system_stats, MOCK_SYSTEM_STATS);
});

test('probe uses correct probe URL from config', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  assert.equal(status.probe_url, 'http://127.0.0.1:8188/system_stats');
});

test('probe records latency_ms when reachable', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  assert.ok(typeof status.latency_ms === 'number' && status.latency_ms >= 0, 'latency_ms must be non-negative number');
});

// --- probeComfyEndpoint: unreachable ---

test('probe returns reachable:false when server responds 404', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(404) });
  assert.equal(status.reachable, false);
  assert.equal(status.error_kind, 'http-error');
  assert.ok(status.error_message?.includes('404'));
});

test('probe returns reachable:false on network error', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetchNetworkError('ECONNREFUSED') });
  assert.equal(status.reachable, false);
  assert.equal(status.error_kind, 'network-error');
  assert.ok(status.error_message?.includes('ECONNREFUSED'));
});

test('probe returns reachable:false on timeout', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188', timeoutMs: 50 });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetchTimeout() });
  assert.equal(status.reachable, false);
  assert.equal(status.error_kind, 'timeout');
  assert.ok(status.error_message?.includes('timeout'));
});

test('probe status is always frozen regardless of outcome', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const ok = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  const fail = await probeComfyEndpoint(cfg, { fetch: mockFetchNetworkError() });
  assert.equal(Object.isFrozen(ok), true);
  assert.equal(Object.isFrozen(fail), true);
});

// --- Invariant: probe != execution ---

test('probe status has no execution or queue fields', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  for (const f of ['prompt_id', 'queue_remaining', 'may_execute', 'may_download_models',
    'may_install_custom_nodes', 'may_canonize', 'workflow_hash']) {
    assert.equal(Object.hasOwn(status, f), false, `probe must not have field: ${f}`);
  }
});

test('probe status has probed_at timestamp', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const status = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  assert.ok(typeof status.probed_at === 'string' && status.probed_at.length > 0);
});

test('probe rejects non-schema config', async () => {
  await assert.rejects(
    () => probeComfyEndpoint({ base_url: 'http://127.0.0.1:8188' }),
    /must be a createComfyEndpointConfig record/,
  );
});

// --- Config reuse: multiple probe calls ---

test('same config can be probed multiple times returning independent frozen records', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const s1 = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  const s2 = await probeComfyEndpoint(cfg, { fetch: mockFetch(200) });
  assert.notEqual(s1, s2, 'each probe returns a distinct record');
  assert.equal(Object.isFrozen(s1), true);
  assert.equal(Object.isFrozen(s2), true);
});
