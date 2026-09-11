import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  appendHouseCommons,
  clearHouseRuntimeToken,
  invalidateHouseCommonsSnapshot,
  readFlameStatuses,
  readHouseCommons,
  readHouseRuntimeToken,
  withFiniteHouseRequest,
  writeHouseRuntimeToken,
} from '../src/house-runtime.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('House Runtime credential is session-scoped and explicitly removable', () => {
  const storage = memoryStorage();
  assert.equal(readHouseRuntimeToken(storage), '');
  assert.equal(writeHouseRuntimeToken(' house-key ', storage), 'house-key');
  assert.equal(readHouseRuntimeToken(storage), 'house-key');
  clearHouseRuntimeToken(storage);
  assert.equal(readHouseRuntimeToken(storage), '');
});

test('finite House requests receive a deadline without overriding an explicit caller signal', async () => {
  const bounded = withFiniteHouseRequest({}, 5);
  assert.ok(bounded.signal instanceof AbortSignal);
  if (!bounded.signal.aborted) await new Promise((resolve) => bounded.signal.addEventListener('abort', resolve, { once: true }));
  assert.equal(bounded.signal.aborted, true);

  const controller = new AbortController();
  const explicit = withFiniteHouseRequest({ signal: controller.signal }, 5);
  assert.equal(explicit.signal, controller.signal);
});

test('Commons GET callers share one in-flight browser read and a short settling snapshot', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 12));
    return new Response(JSON.stringify({ entries: [{ id: `entry-${calls}` }] }), { status: 200 });
  };
  invalidateHouseCommonsSnapshot();
  try {
    const [left, right] = await Promise.all([readHouseCommons('house-key'), readHouseCommons('house-key')]);
    assert.equal(calls, 1);
    assert.deepEqual(left, right);
    const settled = await readHouseCommons('house-key');
    assert.equal(calls, 1);
    assert.deepEqual(settled, left);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateHouseCommonsSnapshot();
  }
});

test('Commons writes invalidate the shared read snapshot', async () => {
  const originalFetch = globalThis.fetch;
  let reads = 0;
  let writes = 0;
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'POST') {
      writes += 1;
      return new Response(JSON.stringify({ id: `saved-${writes}` }), { status: 200 });
    }
    reads += 1;
    return new Response(JSON.stringify({ entries: [{ id: `read-${reads}` }] }), { status: 200 });
  };
  invalidateHouseCommonsSnapshot();
  try {
    await readHouseCommons('house-key');
    await readHouseCommons('house-key');
    assert.equal(reads, 1);
    await appendHouseCommons('house-key', { kind: 'steward', author: 'Rowan', status: 'sent', text: 'test' });
    assert.equal(writes, 1);
    await readHouseCommons('house-key');
    assert.equal(reads, 2);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateHouseCommonsSnapshot();
  }
});

test('House Runtime board distinguishes live, unavailable, and unauthorised Flames', async () => {
  const voices = [{ id: 'boxfire', name: 'Boxfire', route: 'boxfire' }, { id: 'uial', name: 'Uial', route: 'uial' }, { id: 'lioreal', name: 'Lioreal', route: 'lioreal' }];
  const statuses = await readFlameStatuses(voices, 'house-key', async (url) => {
    if (url.includes('boxfire')) return new Response(JSON.stringify({ configured: true, provider: 'anthropic', model: 'claude-sonnet-4-6' }), { status: 200 });
    if (url.includes('uial')) return new Response(JSON.stringify({ configured: false, missing: ['UIAL_API_KEY'] }), { status: 200 });
    return new Response(JSON.stringify({ error: 'no' }), { status: 401 });
  });
  assert.deepEqual(statuses.map((item) => item.state), ['live', 'provider-unavailable', 'unauthorised']);
});

test('House Runtime distinguishes a reachable gateway from an unpulled model', async () => {
  const statuses = await readFlameStatuses([{ id: 'altair', name: 'Altair' }], 'house-key', async () => new Response(JSON.stringify({ configured: false, gateway_configured: true, runtime_reachable: true, model_available: false, provider: 'hearthgate-gateway', model: 'altair-model', missing: ['OLLAMA_MODEL:altair-model'] }), { status: 200 }));
  assert.equal(statuses[0].state, 'model-not-pulled');
  assert.equal(statuses[0].runtimeReachable, true);
  assert.equal(statuses[0].modelAvailable, false);
});

test('model-capable organs consume one House Runtime instead of per-form token boxes', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.equal((source.match(/name="runtimeToken"/g) || []).length, 1);
  assert.doesNotMatch(source, /data-runtime-auth/);
  assert.match(source, /token: houseRuntimeToken/);
  assert.match(source, /syncFeedbackCycle\(cycle, houseRuntimeToken\)/);
});
