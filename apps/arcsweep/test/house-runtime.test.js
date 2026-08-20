import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { clearHouseRuntimeToken, readFlameStatuses, readHouseRuntimeToken, writeHouseRuntimeToken } from '../src/house-runtime.js';

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
