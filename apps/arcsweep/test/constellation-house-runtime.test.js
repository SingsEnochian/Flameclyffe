import test from 'node:test';
import assert from 'node:assert/strict';
import { constellationRuntimeRouteForVoice, invokeConstellationRuntimeVoice } from '../src/constellation-runtime-adapter.js';
import { createLearningCellFromMargin } from '../src/knowledge-learning-store.js';

const registry = { canonicalEstablishedVoices: [
  { id: 'lioreal', displayName: 'Lioreal', runtimeAliases: ['lioreal'] },
  { id: 'vethraluf', displayName: 'Vethraluf', runtimeAliases: ['vethrlauf'] },
], developingVoices: [] };
const response = (data, ok = true, status = 200) => ({ ok, status, json: async () => data });
const worldContext = {
  schema: 'arcsweep.runtime-world-context/v1',
  version: 1,
  active_world_id: 'terra-prime',
  identity_anchor: { world_id: 'terra-prime' },
  world: { id: 'terra-prime', name: 'Terra Prime', kind: 'Waking World' },
  context_id: 'runtime-world:terra-prime:abc123',
  context_fingerprint: 'a'.repeat(64),
};

function liveFetch(mismatched = false) {
  return async (input, options = {}) => {
    const url = String(input);
    if (url.endsWith('/voice-bank-registry.json')) return response(registry);
    if (url === '/api/v1/house/session') return response({ connected: true });
    if (url === '/api/v1/flames/lioreal/chat') {
      assert.equal(options.credentials, 'same-origin');
      const body = JSON.parse(options.body);
      assert.equal(body.metadata.world_id, 'terra-prime');
      assert.equal(body.metadata.world_context.schema, 'arcsweep.runtime-world-context/v1');
      assert.match(body.message, /^ARCSWEEP ACTIVE WORLD RUNTIME CONTEXT/);
      assert.match(body.message, /World: Terra Prime/);
      return response({ flame_id: mismatched ? 'uial' : 'lioreal', provider: 'openai', model: 'gpt-4o', message: '[CONTINUITY] Current surname: al’Var.', cited_sources: ['canon-overlay'], world_context: body.metadata.world_context });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

test('voice aliases resolve to living House routes without donor profile declarations', async () => {
  const route = await constellationRuntimeRouteForVoice('vethraluf', async () => response(registry));
  assert.equal(route.available, true);
  assert.equal(route.route, 'vethrlauf');
  assert.equal(Object.hasOwn(route, 'profileId'), false);
});

test('House response attests selected Flame, provider, model, and active World context', async () => {
  const reply = await invokeConstellationRuntimeVoice({ voiceId: 'lioreal', message: 'Check canon.', worldContext, fetchImpl: liveFetch(false) });
  assert.equal(reply.status, 'replied');
  assert.equal(reply.runtimeVerified, true);
  assert.equal(reply.profileId, 'house:lioreal:openai:gpt-4o');
  assert.deepEqual(reply.citedSources, ['canon-overlay']);
  assert.equal(reply.worldId, 'terra-prime');
  assert.equal(reply.runtimeWorldContextId, 'runtime-world:terra-prime:abc123');
  assert.equal(reply.worldContext.context_fingerprint, 'a'.repeat(64));
  assert.equal(Number.isFinite(reply.latencyMs), true);
});

test('a response from a different Flame is rejected as a runtime mismatch', async () => {
  const reply = await invokeConstellationRuntimeVoice({ voiceId: 'lioreal', message: 'Check canon.', worldContext, fetchImpl: liveFetch(true) });
  assert.equal(reply.status, 'runtime-mismatch');
});

test('attested visible reply can be kept only as provisional model observation', () => {
  const cell = createLearningCellFromMargin({
    voiceId: 'lioreal', voiceLabel: 'Lioreal', text: 'Current surname: al’Var.', runtimeVerified: true,
    profileId: 'house:lioreal:openai:gpt-4o', provider: 'openai', model: 'gpt-4o', sourceModel: 'gpt-4o',
    requestId: 'req-1', mode: 'writing', fieldContext: { field: { key: 'script:content' }, page: { worldId: 'taaveren-vaen' } },
  });
  assert.equal(cell.status, 'provisional');
  assert.equal(cell.authority.kind, 'model_inference');
  assert.equal(cell.source.runtimeVerified, true);
});
