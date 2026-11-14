'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { consultWayglass } = require('../lib/wayglass-co-development.cjs');
const source = { ref: 'git:Flameclyffe@abc:ROADMAP.md', sha256: 'a'.repeat(64), verified: true };
const args = { task: 'Choose the next testable Wayglass return step', sources: [source], endpoint: 'http://127.0.0.1:3000/api/v1/wayglass/respond', receiptId: 'trial-01' };

test('consults native router and returns attributed model-only receipt', async () => {
  let sent;
  const result = await consultWayglass({ ...args, fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output: 'Propose a cold-return replay test', route_id: 'openai:gpt', receipt: { observation_id: 'obs-01' } }) };
  } });
  assert.equal(sent.route_id, 'openai:gpt');
  assert.equal(sent.interaction.channel, 'OOC');
  assert.equal(result.status, 'model-responded');
  assert.equal(result.model_observation_id, 'obs-01');
  assert.match(result.verification, /no code or test execution/);
});
test('refuses unverified or malformed source references before invoking model', async () => {
  await assert.rejects(consultWayglass({ ...args, sources: [{ ...source, verified: false }], fetchImpl: () => { throw Error('must not invoke'); } }), /Unverified/);
  await assert.rejects(consultWayglass({ ...args, sources: [{ ...source, sha256: 'no' }] }), /Invalid source hash/);
});
test('fails closed on insecure remote model endpoint', async () => {
  await assert.rejects(consultWayglass({ ...args, endpoint: 'http://example.com/api/v1/wayglass/respond' }), /HTTPS/);
});
test('records route failure without fabricating a model proposal', async () => {
  const result = await consultWayglass({ ...args, fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(result.status, 'route-failed');
  assert.equal(result.proposal, undefined);
});
test('records empty response as invalid rather than attributing invented output', async () => {
  const result = await consultWayglass({ ...args, fetchImpl: async () => ({ ok: true, json: async () => ({ output: '' }) }) });
  assert.equal(result.status, 'invalid-response');
});
