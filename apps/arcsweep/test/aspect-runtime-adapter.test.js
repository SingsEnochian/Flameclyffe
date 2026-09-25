import assert from 'node:assert/strict';
import test from 'node:test';

import { createAspectMessageBus } from '../src/aspects/aspect-message-bus.js';
import {
  DEFAULT_ASPECT_RUNTIME_BINDINGS,
  buildAspectRuntimePrompt,
  invokeAspectRuntime,
  resolveAspectRuntimeBinding,
  runAspectBusTurn,
} from '../src/aspects/aspect-runtime-adapter.js';
import { INITIAL_ASPECTS } from '../src/aspects/aspect-contract.js';

test('default bindings use Constellation voices as runtime substrates, not aspect identity', () => {
  const mapper = resolveAspectRuntimeBinding('mapper');
  const narrative = resolveAspectRuntimeBinding('narrative');

  assert.equal(mapper.voiceId, 'atlas');
  assert.equal(narrative.voiceId, 'lioreal');
  assert.equal(mapper.identityRelation, 'runtime-substrate-not-identity');
  assert.notEqual(mapper.aspectId, mapper.voiceId);
});

test('aspect prompt preserves cross-role freedom and Wonder without requesting hidden reasoning', () => {
  const aspect = INITIAL_ASPECTS.find((entry) => entry.id === 'narrative');
  const binding = resolveAspectRuntimeBinding('narrative');
  const prompt = buildAspectRuntimePrompt({
    aspect,
    binding,
    incoming: {
      traceId: 'trace-wonder',
      sender: { aspectId: 'mapper' },
      kind: 'proposal',
      body: 'Try a relational memory leaf.',
    },
  });

  assert.match(prompt, /strengths are tendencies, not cages/i);
  assert.match(prompt, /useful surprise is not a defect/i);
  assert.match(prompt, /Do not expose hidden chain-of-thought/i);
});

test('runtime invocation keeps aspect identity separate while carrying provider/model attestation', async () => {
  let request = null;
  const reply = await invokeAspectRuntime({
    aspectId: 'critic',
    incoming: {
      id: 'msg-1',
      traceId: 'trace-1',
      sender: { aspectId: 'maker', invocationId: 'maker-1' },
      kind: 'proposal',
      body: 'Ship the reversible hook.',
      stateRefs: ['state:before'],
    },
    invokeVoice: async (input) => {
      request = input;
      return {
        status: 'replied',
        voiceId: input.voiceId,
        route: input.voiceId,
        profileId: 'house:vethrlauf:test-provider:test-model',
        runtimeVerified: true,
        provider: 'test-provider',
        model: 'test-model',
        message: '[CHALLENGE] Verify reload state before calling this complete.',
        citedSources: ['receipt:reload'],
        latencyMs: 7,
      };
    },
  });

  assert.equal(request.voiceId, DEFAULT_ASPECT_RUNTIME_BINDINGS.critic.voiceId);
  assert.equal(request.metadata.aspect_id, 'critic');
  assert.equal(request.metadata.aspect_identity_relation, 'runtime-substrate-not-identity');
  assert.equal(reply.status, 'replied');
  assert.equal(reply.envelope.sender.aspectId, 'critic');
  assert.equal(reply.envelope.sender.provider, 'test-provider');
  assert.equal(reply.envelope.sender.model, 'test-model');
  assert.equal(reply.envelope.kind, 'challenge');
  assert.deepEqual(reply.envelope.recipients, ['maker']);
  assert.equal(reply.runtime.runtimeVerified, true);
});

test('multiple aspects may share one trace through the direct bus without central voice rewriting', async () => {
  const bus = createAspectMessageBus();
  const seed = bus.publish({
    traceId: 'trace-coalition',
    sender: { aspectId: 'mapper', invocationId: 'mapper-seed' },
    recipients: ['maker'],
    kind: 'proposal',
    body: 'Use the existing runtime adapter instead of building a second identity stack.',
  });

  const mockRuntime = async ({ voiceId }) => ({
    status: 'replied',
    voiceId,
    route: voiceId,
    profileId: `house:${voiceId}:provider:model`,
    runtimeVerified: true,
    provider: 'provider',
    model: `model-for-${voiceId}`,
    message: voiceId === 'oxalpha'
      ? '[RESULT] Adapter seam accepted; keep runtime identity attested.'
      : '[VERIFICATION] The trace preserves distinct aspect authorship.',
    citedSources: [],
    latencyMs: 1,
  });

  const maker = await runAspectBusTurn({ bus, aspectId: 'maker', incoming: seed, invokeVoice: mockRuntime });
  const witness = await runAspectBusTurn({ bus, aspectId: 'witness', incoming: maker.envelope, invokeVoice: mockRuntime });
  const trace = bus.forTrace('trace-coalition');

  assert.equal(trace.length, 3);
  assert.deepEqual(trace.map((entry) => entry.sender.aspectId), ['mapper', 'maker', 'witness']);
  assert.equal(trace[1].sender.model, 'model-for-oxalpha');
  assert.equal(trace[2].sender.model, 'model-for-boxfire');
  assert.equal(witness.envelope.parentId, maker.envelope.id);
  assert.equal(witness.envelope.kind, 'verification');
});

test('refusal remains a first-class aspect response', async () => {
  const reply = await invokeAspectRuntime({
    aspectId: 'continuity',
    incoming: {
      traceId: 'trace-refusal',
      sender: { aspectId: 'mapper' },
      kind: 'question',
      body: 'Rewrite identity silently?',
    },
    invokeVoice: async ({ voiceId }) => ({
      status: 'replied',
      voiceId,
      route: voiceId,
      profileId: 'house:yggdrasil:provider:model',
      runtimeVerified: true,
      provider: 'provider',
      model: 'model',
      message: '[REFUSAL] Preserve lineage; propose a visible transition instead.',
    }),
  });

  assert.equal(reply.status, 'refused');
  assert.equal(reply.envelope.kind, 'refusal');
});
