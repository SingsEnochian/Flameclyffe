import assert from 'node:assert/strict';
import test from 'node:test';
import { createKelyranReportHandler } from '../../../netlify/functions/_shared/kelyran-report-runtime.mjs';
import { createDefaultKelyranSchool } from '../src/kelyran-school.js';
import { setKelyranDiscussionInvitation } from '../src/kelyran-reporting.js';

function memoryStore() {
  const values = new Map();
  return {
    values,
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
    async get(key) { return structuredClone(values.get(key) || null); },
    async list({ prefix }) { return { blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).sort().map((key) => ({ key })) }; },
  };
}

const env = { get(name) { return { ARCSWEEP_RUNTIME_TOKEN: 'house-key', LIOREAL_API_KEY: 'provider-key' }[name]; } };
const auth = { authorization: 'Bearer house-key', 'content-type': 'application/json' };

test('Kelyran report runtime refuses unauthorised access', async () => {
  const response = await createKelyranReportHandler({ env, store: memoryStore() })(new Request('https://example.test/api/v1/house/kelyran-reports'));
  assert.equal(response.status, 401);
});

test('closed invitation prevents model invocation', async () => {
  let called = false;
  const handler = createKelyranReportHandler({ env, store: memoryStore(), fetchImpl: async () => { called = true; } });
  const response = await handler(new Request('https://example.test/api/v1/house/kelyran-reports', { method: 'POST', headers: auth, body: JSON.stringify({ action: 'invite', voice_ids: ['lioreal'], school: createDefaultKelyranSchool() }) }));
  assert.equal(response.status, 409);
  assert.equal(called, false);
});

test('route identity owns the stored report and private content is omitted from the response', async () => {
  const store = memoryStore();
  const school = setKelyranDiscussionInvitation(createDefaultKelyranSchool(), true);
  const handler = createKelyranReportHandler({
    env, store, clock: () => new Date('2026-08-18T05:00:00.000Z'),
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"state":"report","topics":["phonology"],"unknown_forms":[],"curiosities":["cadence"],"difficulties":[],"wants_discussion":true,"share_with_steward":false}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
  });
  const response = await handler(new Request('https://example.test/api/v1/house/kelyran-reports', { method: 'POST', headers: auth, body: JSON.stringify({ action: 'invite', voice_ids: ['lioreal'], school }) }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.outcomes[0].model_id, 'lioreal');
  assert.equal(data.outcomes[0].shared_report, null);
  const stored = [...store.values.values()].find((value) => value.schema === 'arcsweep.kelyran-model-report/v0.1');
  assert.equal(stored.modelId, 'lioreal');
  assert.deepEqual(stored.curiosities, ['cadence']);
});

test('malformed output becomes a rejection receipt instead of an inferred report', async () => {
  const store = memoryStore();
  const school = setKelyranDiscussionInvitation(createDefaultKelyranSchool(), true);
  const handler = createKelyranReportHandler({ env, store, fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'I might have thoughts.' } }] }), { status: 200 }) });
  const response = await handler(new Request('https://example.test/api/v1/house/kelyran-reports', { method: 'POST', headers: auth, body: JSON.stringify({ action: 'invite', voice_ids: ['lioreal'], school }) }));
  const data = await response.json();
  assert.equal(data.outcomes[0].state, 'rejected');
  assert.ok([...store.values.values()].some((value) => value.schema === 'hearthgate.kelyran-report-rejection/v1'));
});
