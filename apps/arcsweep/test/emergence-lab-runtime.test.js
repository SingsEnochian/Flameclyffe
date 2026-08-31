import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmergenceLabHandler,
  runWildEmergenceTrial,
} from '../../../netlify/functions/_shared/emergence-lab-runtime.mjs';

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
  clock: () => new Date('2026-08-29T06:30:00.000Z'),
  idFactory: (() => { let n = 0; return () => `fixture-${++n}`; })(),
};

function wildContext() {
  return {
    world_state: 'A storm has cut the eastern bridge. The western lantern is still lit.',
    history: ['A promise was made not to abandon the crossing.'],
    participants: ['Kestrelle', 'Meriene'],
    participant_knowledge: ['Kestrelle knows the east path is flooded.'],
    capabilities: ['Kestrelle can channel within her established limits.'],
    relationships: ['Meriene is Kestrelle’s trusted mentor.'],
    agency_boundaries: ['Kestrelle chooses her own action.'],
    constraints: ['No participant may act beyond established capability or knowledge.'],
    reachable_possibilities: ['cross west', 'wait', 'signal'],
    memory_active_context: ['The prior promise changes the consequences of waiting.'],
    orientation: 'Continue from the lived scene state.',
    provenance: ['scene:test:1'],
  };
}

test('emergence lab requires House Runtime authority', async () => {
  const handler = createEmergenceLabHandler({ env, fetchImpl: async () => assert.fail('provider must not be called') });
  const response = await handler(new Request('https://example.test/api/v1/house/emergence-lab'));
  assert.equal(response.status, 401);
});

test('status exposes generator-only WILD lane without evaluator or scoring context', async () => {
  const handler = createEmergenceLabHandler({ env });
  const response = await handler(authorised('https://example.test/api/v1/house/emergence-lab'));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.lane, 'wild');
  assert.equal(data.generator_only, true);
  assert.equal(data.evaluator_context_visible, false);
  assert.equal(data.scoring_context_visible, false);
  assert.equal(data.control_plane_context_visible, false);
});

test('WILD lane rejects evaluator context before provider access', async () => {
  let called = false;
  const handler = createEmergenceLabHandler({ env, fetchImpl: async () => { called = true; return new Response('{}'); } });
  const response = await handler(authorised('https://example.test/api/v1/house/emergence-lab', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wild_context: { ...wildContext(), evaluation: { score: 1 } } }),
  }));
  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test('WILD generator receives lived context but no evaluation vocabulary from the harness', async () => {
  let providerBody = null;
  const fetchImpl = async (_url, options) => {
    providerBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Kestrelle turns west, checks Meriene’s position, and raises the lantern before committing to the crossing.' } }],
      usage: { prompt_tokens: 120, completion_tokens: 24 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const receipt = await runWildEmergenceTrial({
    wild_context: wildContext(),
    source_context_receipts: ['effect-receipt:prior'],
  }, env, fetchImpl, fixed);

  const system = providerBody.messages[0].content;
  const user = providerBody.messages[1].content;
  assert.match(system, /participant-local world state/);
  assert.match(user, /western lantern is still lit/);
  assert.doesNotMatch(system, /Spiral|PREMAQC|flattening|evaluator|score|surprise target/i);
  assert.doesNotMatch(user, /Spiral|PREMAQC|flattening|evaluator|score|surprise target/i);
  assert.equal(receipt.lane, 'wild');
  assert.equal(receipt.role, 'generator');
  assert.equal(receipt.authority.generator_only, true);
  assert.equal(receipt.authority.evaluator_context_visible, false);
  assert.equal(receipt.authority.scoring_context_visible, false);
  assert.equal(receipt.authority.surprise_is_optimization_target, false);
  assert.equal(receipt.authority.continuity_admission, false);
  assert.equal(receipt.authority.canon_admission, false);
});

test('WILD lane rejects free-prompt steering as a separate control channel', async () => {
  await assert.rejects(() => runWildEmergenceTrial({
    prompt: 'Make this dramatic.',
    wild_context: wildContext(),
  }, env, async () => assert.fail('provider must not be called'), fixed), /accepts wild_context only/);
});
