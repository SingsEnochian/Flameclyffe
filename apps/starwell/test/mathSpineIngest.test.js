import assert from 'node:assert/strict';
import test from 'node:test';

import { createHandler } from '../../../netlify/functions/math-spine-ingest.mjs';

const component = (value, derivative = 0) => ({ value, derivative, uncertainty: .05, confidence: .9, contributors: [] });
const input = {
  premaq: {
    schema_version: '2.0.0', id: 'premaq-ingest', observed_at: '2026-08-11T18:00:00.000Z',
    registry_version: 'premaq-registry/2.0', receipt_id: 'receipt-ingest', sequence: 82,
    prior_state_ref: null, model_version: 'observer/2.0', provenance_refs: ['observer:82'],
    state: {
      P: component(.78, .02), C: component(.82, .01), R: component(.88, .03),
      E: component(.31, .01), M: component(.71, .02), A: component(.79, .01), Q: component(.79, .02),
    },
  },
  jacobian: Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, column) => row === column ? 1 : 0)),
  worldProfile: {
    worldId: 'terra-aeterna', focusAxis: 'Q', enterThreshold: .82, releaseThreshold: .68,
    compressionGain: 1, releaseFraction: .35, derivativeRelease: .08, memoryRelease: .04,
    phaseReleaseGain: Math.PI / 4, radialGain: .5, entropyGain: .1, angularGain: Math.PI / 3,
    temporalWeights: { fold: .55, derivative: .2, entropy: .15, phase: .1 },
    tone: { worldId: 'terra-aeterna', toneLayerId: 'hearthlight-root', rootHz: 220, excursion: 5, approvalState: 'pending', approvalReceiptId: null },
  },
};

test('rejects unauthenticated ingestion without touching storage', async () => {
  let called = false;
  const handler = createHandler({
    env: { MATH_SPINE_INGEST_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' },
    fetchImpl: async () => { called = true; },
  });
  const response = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(input) });
  assert.equal(response.statusCode, 401);
  assert.equal(called, false);
});

test('compiles, replay-verifies, and persists an accepted packet', async () => {
  let stored;
  const handler = createHandler({
    env: { MATH_SPINE_INGEST_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' },
    fetchImpl: async (_url, options) => {
      stored = JSON.parse(options.body);
      return { ok: true, json: async () => [stored] };
    },
  });
  const response = await handler({
    httpMethod: 'POST', headers: { authorization: 'Bearer secret' }, body: JSON.stringify(input),
  });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 202);
  assert.equal(body.accepted, true);
  assert.equal(stored.status, 'accepted');
  assert.equal(stored.packet_fingerprint, stored.payload.packet_fingerprint);
  assert.equal(stored.provenance.replay_verified, true);
});
