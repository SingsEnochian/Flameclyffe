import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASPECT_MESH_EVENTS,
  createAspectMeshRuntime,
} from '../src/aspects/aspect-mesh-runtime.js';

test('live Aspect Mesh publishes message events without requiring House persistence', async () => {
  const events = [];
  const target = new EventTarget();
  target.addEventListener(ASPECT_MESH_EVENTS.message, (event) => events.push(event.detail));
  const runtime = createAspectMeshRuntime({ target, persistence: false });

  const envelope = runtime.publish({
    id: 'runtime-msg-1',
    traceId: 'runtime-trace-1',
    sender: { aspectId: 'mapper' },
    recipients: ['maker'],
    kind: 'proposal',
    body: 'Reuse the existing runtime seam.',
  });

  assert.equal(runtime.schema, 'hearthweave.aspect-mesh-runtime/v0.3');
  assert.equal(runtime.houseBridge, null);
  assert.equal(runtime.bus.all().length, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, envelope.id);
  assert.ok(runtime.experimentBed);
  runtime.stop();
});

test('live runtime can launch a real coalition path with injected model transport', async () => {
  const target = new EventTarget();
  const completions = [];
  target.addEventListener(ASPECT_MESH_EVENTS.coalitionComplete, (event) => completions.push(event.detail));
  const runtime = createAspectMeshRuntime({ target, persistence: false });

  const mockVoice = async ({ voiceId }) => ({
    status: 'replied',
    voiceId,
    route: voiceId,
    profileId: `house:${voiceId}:provider:model`,
    runtimeVerified: true,
    provider: 'provider',
    model: `model-${voiceId}`,
    message: voiceId === 'vethrlauf'
      ? '[CHALLENGE] Keep runtime identity visible.'
      : voiceId === 'atlas'
        ? '[PROPOSAL] Reuse the existing adapter.'
        : '[RESULT] The reversible binding is viable.',
    citedSources: [],
    latencyMs: 1,
  });

  const result = await runtime.startCoalition({
    purpose: 'Prove the Aspect Mesh can inhabit the existing runtime.',
    members: ['mapper', 'maker', 'critic'],
    synthesisAspectId: 'mapper',
    seed: { body: 'Work the smallest reversible route.' },
    runtimeOptions: { invokeVoice: mockVoice },
  });

  assert.equal(result.rounds.length, 1);
  assert.equal(result.synthesis.status, 'synthesized');
  assert.ok(result.trace.some((entry) => entry.sender.aspectId === 'critic' && entry.kind === 'challenge'));
  assert.equal(completions.length, 1);
  assert.equal(completions[0].traceId, result.trace[0].traceId);
  runtime.stop();
});
