import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMFY_ENDPOINT_CONFIG_SCHEMA,
  COMFY_ENDPOINT_STATUS_SCHEMA,
  COMFY_WAIT_RESULT_SCHEMA,
  createComfyEndpointConfig,
  probeComfyEndpoint,
  waitForComfyEndpoint,
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

// --- waitForComfyEndpoint ---

test('wait resolves immediately when endpoint is already reachable', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const result = await waitForComfyEndpoint(cfg, {
    fetch: mockFetch(200, MOCK_SYSTEM_STATS),
    maxWaitMs: 10_000,
    retryIntervalMs: 500,
  });
  assert.equal(result.schema, COMFY_WAIT_RESULT_SCHEMA);
  assert.equal(result.reachable, true);
  assert.equal(result.attempts, 1, 'should succeed on first attempt');
  assert.equal(Object.isFrozen(result), true);
});

test('wait retries until reachable then stops', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  let calls = 0;
  // First two calls fail, third succeeds
  const fetch = async () => {
    calls += 1;
    if (calls < 3) throw new Error('ECONNREFUSED');
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const result = await waitForComfyEndpoint(cfg, {
    fetch,
    maxWaitMs: 10_000,
    retryIntervalMs: 10, // very short for test speed
  });
  assert.equal(result.reachable, true);
  assert.equal(result.attempts, 3);
});

test('wait gives up after maxWaitMs exhausted', async () => {
  const cfg = createComfyEndpointConfig({
    installId: 'x',
    baseUrl: 'http://127.0.0.1:8188',
    timeoutMs: 20,
  });
  const result = await waitForComfyEndpoint(cfg, {
    fetch: mockFetchNetworkError('ECONNREFUSED'),
    maxWaitMs: 80,
    retryIntervalMs: 10,
  });
  assert.equal(result.reachable, false);
  assert.ok(result.attempts >= 1, 'must have attempted at least once');
});

test('wait result is always frozen', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const ok = await waitForComfyEndpoint(cfg, { fetch: mockFetch(200), retryIntervalMs: 10, maxWaitMs: 500 });
  const fail = await waitForComfyEndpoint(cfg, {
    fetch: mockFetchNetworkError(),
    retryIntervalMs: 10,
    maxWaitMs: 30,
  });
  assert.equal(Object.isFrozen(ok), true);
  assert.equal(Object.isFrozen(fail), true);
});

test('wait result preserves install_id and base_url', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'desktop-01', baseUrl: 'http://127.0.0.1:8188' });
  const result = await waitForComfyEndpoint(cfg, { fetch: mockFetch(200) });
  assert.equal(result.install_id, 'desktop-01');
  assert.equal(result.base_url, 'http://127.0.0.1:8188');
});

test('wait result carries last_status from final probe', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  const result = await waitForComfyEndpoint(cfg, { fetch: mockFetch(200, MOCK_SYSTEM_STATS) });
  assert.ok(result.last_status != null, 'last_status must be present');
  assert.equal(result.last_status.schema, COMFY_ENDPOINT_STATUS_SCHEMA);
});

test('wait fires onAttempt callback for each probe', async () => {
  const cfg = createComfyEndpointConfig({ installId: 'x', baseUrl: 'http://127.0.0.1:8188' });
  let calls = 0;
  let callCount = 0;
  const fetch = async () => {
    calls += 1;
    if (calls < 3) throw new Error('ECONNREFUSED');
    return { ok: true, status: 200, json: async () => ({}) };
  };
  await waitForComfyEndpoint(cfg, {
    fetch,
    retryIntervalMs: 10,
    maxWaitMs: 10_000,
    onAttempt: () => { callCount += 1; },
  });
  assert.equal(callCount, 3, 'onAttempt must fire once per probe attempt');
});

test('wait rejects non-schema config', async () => {
  await assert.rejects(
    () => waitForComfyEndpoint({ base_url: 'http://127.0.0.1:8188' }),
    /must be a createComfyEndpointConfig record/,
  );
});
