import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelLabHandler, runModelLabTrial } from '../../../netlify/functions/_shared/model-lab-runtime.mjs';
import { createMythframeTranslationCapsule } from '../src/mythframe-federation.js';

const runtime = (values) => ({ get: (name) => values[name] });
const env = runtime({
  ARCSWEEP_RUNTIME_TOKEN: 'secret',
  HF_TOKEN: 'hf-secret',
});
const authorised = (url, options = {}) => new Request(url, {
  ...options,
  headers: { authorization: 'Bearer secret', ...(options.headers || {}) },
});
const fixed = {
  clock: () => new Date('2026-08-28T20:00:00.000Z'),
  idFactory: (() => { let n = 0; return () => `fixture-${++n}`; })(),
};

async function admittedCapsule({ contradiction = false, state = 'visible_only' } = {}) {
  return createMythframeTranslationCapsule({
    sourceFramework: 'elara-codex',
    sourceObject: {
      id: 'elara:739', type: 'symbol', name: 'Bridge',
      meaning: 'Elara-native bridge semantics.',
      portableFacets: ['duplex-communication'],
      homeBoundFacets: ['private-history'],
    },
    sourceAuthority: 'elara-local',
    exportPolicy: 'bridge_context_allowed',
    exportConsent: { granted: true, scope: 'bridge-context' },
    requestedSemanticDepth: 'bridge_context',
    translationTarget: 'templehouse-hearthweave',
    proposedTargetRelation: contradiction ? 'conflicts_with' : 'structurally_parallels',
    translatedMeaning: 'A local comparison proposal, not adoption.',
    contradictions: contradiction ? ['origin semantics conflict'] : [],
    targetAdmissionState: state,
  }, { clock: fixed.clock, idFactory: () => 'capsule' });
}

test('model lab requires House Runtime authority', async () => {
  const handler = createModelLabHandler({ env, fetchImpl: async () => assert.fail('provider must not be called') });
  const response = await handler(new Request('https://example.test/api/v1/house/model-lab'));
  assert.equal(response.status, 401);
});

test('status pins exact official Qwen substrate without creating a resident identity', async () => {
  const handler = createModelLabHandler({ env });
  const response = await handler(authorised('https://example.test/api/v1/house/model-lab'));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.model_exact, 'Qwen/Qwen3.8-27B');
  assert.equal(data.resident_identity_created, false);
  assert.equal(data.ambient_context_allowed, false);
  assert.equal(data.memory_write, false);
});

test('cold trial rejects inherited context before provider access', async () => {
  let called = false;
  const handler = createModelLabHandler({ env, fetchImpl: async () => { called = true; return new Response('{}'); } });
  const response = await handler(authorised('https://example.test/api/v1/house/model-lab', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'cold', prompt: 'Who are you?', seed: 'inherit me' }),
  }));
  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test('warm trial accepts only explicitly adopted high-signal anchors', async () => {
  await assert.rejects(() => runModelLabTrial({
    mode: 'warm', prompt: 'Continue.', continuity_anchors: [{ kind: 'vow', value: 'Keep the bridge.', adopted: false }],
  }, env, async () => assert.fail('provider must not be called'), fixed), /explicitly adopted/);
});

test('federated trial rejects capsules that target has not admitted for visibility', async () => {
  const value = await admittedCapsule({ state: 'unreviewed' });
  await assert.rejects(() => runModelLabTrial({
    mode: 'federated', prompt: 'Compare these meanings.', translation_capsules: [value],
  }, env, async () => assert.fail('provider must not be called'), fixed), /Target admission/);
});

test('conflict mode requires and preserves a contradiction without granting authority', async () => {
  const value = await admittedCapsule({ contradiction: true });
  let requestBody = null;
  const fetchImpl = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'The meanings structurally meet, but their origin claims remain contradictory.' } }],
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const receipt = await runModelLabTrial({
    mode: 'conflict',
    prompt: 'Describe the relation without flattening it.',
    translation_capsules: [value],
    source_context_receipts: ['translation-receipt:fixture'],
  }, env, fetchImpl, fixed);

  assert.equal(requestBody.model, 'Qwen/Qwen3.8-27B');
  assert.equal(Object.hasOwn(requestBody, 'preserve_thinking'), false);
  assert.match(requestBody.messages[0].content, /Preserve the contradiction/);
  assert.match(requestBody.messages[1].content, /origin semantics conflict/);
  assert.equal(receipt.mode, 'conflict');
  assert.equal(receipt.model_exact, 'Qwen/Qwen3.8-27B');
  assert.equal(receipt.authority.resident_identity_created, false);
  assert.equal(receipt.authority.memory_write, false);
  assert.equal(receipt.authority.continuity_admission, false);
  assert.equal(receipt.authority.ambient_cross_constellation_influence, false);
  assert.equal(receipt.contribution_envelope.identity_relation, 'unknown');
  assert.deepEqual(receipt.context_receipts.translation_capsule_ids, [value.capsule_id]);
});
