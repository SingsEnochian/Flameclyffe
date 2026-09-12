import test from 'node:test';
import assert from 'node:assert/strict';
import {
  invokeCognitiveGuide,
  readLocalLearningLedger,
  readLocalPromotedLearning,
  recordCognitiveObservation,
  submitCognitiveFeedback,
} from '../src/os/cognitive-runtime.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

const localLocation = { hostname: 'localhost' };
const hostedLocation = { hostname: 'flameclyffe.vercel.app' };

test('Guide experience is observed first and only becomes learning after Steward keep', async () => {
  const storage = memoryStorage();
  const observed = await recordCognitiveObservation({
    userText: 'Take me to the Forge.',
    assistantText: 'Opening the Forge.',
    roomId: 'portal',
    worldId: 'terra-aeterna',
    storage,
    location: localLocation,
  });
  assert.match(observed.id, /^local-learning:/);
  assert.equal(observed.status, 'observed');
  assert.equal(readLocalLearningLedger(storage)[0].status, 'observed');
  assert.equal(readLocalPromotedLearning({}, storage).length, 0);

  await submitCognitiveFeedback({ id: observed.id, verdict: 'keep', storage, location: localLocation });
  const promoted = readLocalPromotedLearning({ world_id: 'terra-aeterna' }, storage);
  assert.equal(promoted.length, 1);
  assert.equal(promoted[0].status, 'promoted');
  assert.equal(promoted[0].kind, 'preference');
});

test('Steward correction becomes an explicit promoted lesson and forget removes the episode', async () => {
  const storage = memoryStorage();
  const observed = await recordCognitiveObservation({
    userText: 'What should I do?',
    assistantText: 'Invent another subsystem.',
    storage,
    location: localLocation,
  });
  await assert.rejects(
    submitCognitiveFeedback({ id: observed.id, verdict: 'correct', storage, location: localLocation }),
    /what it should learn/i,
  );
  await submitCognitiveFeedback({
    id: observed.id,
    verdict: 'correct',
    lesson: 'Finish the first incomplete dependency before proposing another subsystem.',
    storage,
    location: localLocation,
  });
  const promoted = readLocalPromotedLearning({}, storage);
  assert.equal(promoted[0].kind, 'correction');
  assert.match(promoted[0].lesson, /Finish the first incomplete dependency/);

  await submitCognitiveFeedback({ id: observed.id, verdict: 'forget', storage, location: localLocation });
  assert.equal(readLocalLearningLedger(storage).length, 0);
});

test('hosted Guide prefers authenticated cognitive Edge runtime', async () => {
  let fallbackCalled = false;
  let requestBody = null;
  const result = await invokeCognitiveGuide({
    voiceId: 'oxalpha',
    message: 'Guide contract prompt',
    sessionId: 'session:test',
    metadata: { room_id: 'portal', world_id: 'terra-aeterna' },
    location: hostedLocation,
    accessTokenProvider: async () => 'steward-token',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      assert.equal(options.headers.authorization, 'Bearer steward-token');
      return new Response(JSON.stringify({
        schema: 'arcsweep.cognitive-model-response/v1',
        provider: 'openrouter',
        model: 'z-ai/glm-5.3-flash',
        upstream_model: 'z-ai/glm-5.3-flash',
        message: '{"say":"Hello.","request":null}',
        latency_ms: 21,
        memory_count: 3,
        runtime_verified: true,
        execution_path: 'supabase-edge-to-openrouter',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
    fallbackInvoke: async () => {
      fallbackCalled = true;
      return { status: 'replied', message: 'fallback' };
    },
  });
  assert.equal(fallbackCalled, false);
  assert.equal(requestBody.mode, 'guide');
  assert.equal(requestBody.metadata.world_id, 'terra-aeterna');
  assert.equal(result.status, 'replied');
  assert.equal(result.cognitiveRuntime, true);
  assert.equal(result.memoryCount, 3);
  assert.equal(result.runtimeVerified, true);
});

test('cognitive Edge failure preserves the existing Constellation fallback', async () => {
  let fallbackPrompt = '';
  const result = await invokeCognitiveGuide({
    voiceId: 'oxalpha',
    message: 'Guide contract prompt',
    sessionId: 'session:test',
    metadata: {},
    location: hostedLocation,
    accessTokenProvider: async () => 'steward-token',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'upstream unavailable' }), { status: 502, headers: { 'content-type': 'application/json' } }),
    fallbackInvoke: async ({ message }) => {
      fallbackPrompt = message;
      return {
        status: 'replied',
        voiceId: 'oxalpha',
        message: '{"say":"Fallback alive.","request":null}',
        provider: 'house-runtime',
        model: 'fallback-model',
        runtimeVerified: true,
      };
    },
  });
  assert.match(fallbackPrompt, /Guide contract prompt/);
  assert.equal(result.status, 'replied');
  assert.equal(result.cognitiveRuntime, false);
  assert.equal(result.executionPath, 'constellation-fallback');
});
