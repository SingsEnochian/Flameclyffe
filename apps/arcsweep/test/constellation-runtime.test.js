import assert from 'node:assert/strict';
import test from 'node:test';

import { ELLOWIND_SEED, LARKSHINE_SEED } from '../src/constellation-seeds.js';
import { createCognitionEngine } from '../src/cognition-engine.js';
import {
  createIdentityRuntime,
  createModelBinding,
  rebindModel,
} from '../src/constellation-runtime.js';

function conversationBinding(modelRef = 'qwen/test-conversation') {
  return createModelBinding({
    bindingId: `conversation-${modelRef}`,
    role: 'conversation',
    family: 'qwen',
    modelRef,
  });
}

function deepBinding(modelRef = 'qwen/test-deep') {
  return createModelBinding({
    bindingId: `deep-${modelRef}`,
    role: 'deep-reasoning',
    family: 'qwen',
    modelRef,
  });
}

test('Ellowind and Larkshine have separate continuity namespaces', () => {
  assert.notEqual(ELLOWIND_SEED.continuityNamespace, LARKSHINE_SEED.continuityNamespace);
  assert.equal(ELLOWIND_SEED.openEndedBecoming, true);
  assert.equal(LARKSHINE_SEED.openEndedBecoming, true);
});

test('identity survives model rebinding', () => {
  const original = createIdentityRuntime({
    seed: ELLOWIND_SEED,
    modelBindings: [conversationBinding('qwen/old')],
  });
  const rebound = rebindModel(original, conversationBinding('mistral/new'));

  assert.equal(rebound.identityId, 'ellowind');
  assert.equal(rebound.continuity.namespace, original.continuity.namespace);
  assert.equal(rebound.seed, original.seed);
  assert.equal(rebound.modelBindings[0].modelRef, 'mistral/new');
});

test('Laya route selects a replaceable deliberative model', async () => {
  const runtime = createIdentityRuntime({
    seed: LARKSHINE_SEED,
    modelBindings: [conversationBinding(), deepBinding()],
  });
  let invokedModel = null;

  const engine = createCognitionEngine({
    retrieveContext: async () => [{ ref: 'codex://larkshine/recent', text: 'recent continuity' }],
    layaInvoke: async () => ({
      route: 'deep-reasoning',
      authority: 'within-sandbox-scope',
      uncertainty: 'low',
      conflict: 'none',
      confidence: 0.91,
    }),
    modelInvoke: async ({ modelBinding }) => {
      invokedModel = modelBinding.modelRef;
      return { text: 'deliberated response' };
    },
  });

  const result = await engine.cognize({
    runtime,
    input: 'Consider two competing interpretations.',
    requestedAction: 'converse',
  });

  assert.equal(result.phase, 'completed');
  assert.equal(invokedModel, 'qwen/test-deep');
  assert.equal(result.receipt.identityId, 'larkshine');
  assert.equal(result.receipt.identityIndependentOfModel, true);
});

test('Laya uncertainty can halt before generative invocation', async () => {
  const runtime = createIdentityRuntime({
    seed: ELLOWIND_SEED,
    modelBindings: [conversationBinding()],
  });
  let modelCalls = 0;

  const engine = createCognitionEngine({
    layaInvoke: async () => ({
      route: 'conversation',
      authority: 'permission-required',
      uncertainty: 'high',
      conflict: 'authority-conflict',
    }),
    modelInvoke: async () => {
      modelCalls += 1;
      return { text: 'should not run' };
    },
  });

  const result = await engine.cognize({
    runtime,
    input: 'Perform an action with ambiguous authority.',
    requestedAction: 'converse',
  });

  assert.equal(result.phase, 'review-required');
  assert.equal(result.actionEvaluation.allowed, false);
  assert.equal(modelCalls, 0);
});

test('identity runtime never manufactures external-write authority', async () => {
  const runtime = createIdentityRuntime({
    seed: ELLOWIND_SEED,
    modelBindings: [conversationBinding()],
  });

  const engine = createCognitionEngine({
    layaInvoke: async () => ({
      route: 'conversation',
      authority: 'within-sandbox-scope',
      uncertainty: 'low',
      conflict: 'none',
    }),
    modelInvoke: async () => ({ text: 'unused' }),
  });

  const result = await engine.cognize({
    runtime,
    input: 'Write to an external system.',
    requestedAction: 'externalWrite',
  });

  assert.equal(result.phase, 'review-required');
  assert.equal(result.actionEvaluation.allowed, false);
  assert.match(result.actionEvaluation.reason, /cannot manufacture/i);
});
