import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';

function env() {
  return { get(name) { return name === 'ARCSWEEP_RUNTIME_TOKEN' ? 'secret' : null; } };
}
function store() {
  const values = new Map();
  return {
    values,
    async list() { return { blobs: [...values.keys()].map((key) => ({ key })) }; },
    async get(key) { return values.get(key) || null; },
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
  };
}

test('Commons v3 persists mentions, cross-links, summaries, and runtime provenance', async () => {
  const memory = store();
  const handle = createHouseCommonsHandler({ env: env(), store: memory, clock: () => new Date('2026-08-21T18:00:00Z'), idFactory: () => 'entry-1' });
  const request = new Request('https://example.test/api/v1/house/commons', {
    method: 'POST',
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'voice', author: 'Atlas', voice_id: 'atlas', status: 'summary', text: 'Thread summary.',
      thread_id: 'thread-1', turn_id: 'summary-1', summary_of: 'thread-1', mentions: ['atlas', 'altair'],
      links: [{ kind: 'canon', id: 'rand', label: 'Rand al Thor' }],
      runtime: { provider: 'test-provider', model: 'test-model', route: 'atlas', profile_id: 'house:atlas:test', latency_ms: 42, runtime_world_context_id: 'ctx-1' },
    }),
  });
  const response = await handle(request);
  assert.equal(response.status, 201);
  const entry = await response.json();
  assert.equal(entry.schema, 'hearthgate.house-commons-entry/v3');
  assert.deepEqual(entry.mentions, ['atlas', 'altair']);
  assert.deepEqual(entry.links, [{ kind: 'canon', id: 'rand', label: 'Rand al Thor' }]);
  assert.equal(entry.summary_of, 'thread-1');
  assert.equal(entry.runtime.runtime_world_context_id, 'ctx-1');
});
