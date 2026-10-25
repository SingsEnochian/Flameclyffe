import assert from 'node:assert/strict';
import test from 'node:test';

import { ELLOWIND_SEED } from '../src/constellation-seeds.js';
import { createCognitionEngine } from '../src/cognition-engine.js';
import { createIdentityRuntime, createModelBinding } from '../src/constellation-runtime.js';
import {
  CORE_COGNITIVE_GLYPHS,
  compileSymbolicState,
  createGlyphDefinition,
} from '../src/symbolic-cognition.js';

function runtime() {
  return createIdentityRuntime({
    seed: ELLOWIND_SEED,
    modelBindings: [createModelBinding({
      bindingId: 'ellowind-conversation',
      role: 'conversation',
      family: 'qwen',
      modelRef: 'qwen/test-conversation',
    })],
  });
}

test('core glyphs compile into deterministic symbolic state', () => {
  const state = compileSymbolicState({ activeGlyphs: ['witness', 'hearth'] });

  assert.deepEqual(state.activeGlyphs, ['witness', 'hearth']);
  assert.equal(state.grantsAuthority, false);
  assert.equal(state.flags.provenanceRequired, true);
  assert.equal(state.flags.continuitySensitive, true);
  assert.ok(state.retrievalTags.includes('receipts'));
  assert.ok(state.retrievalTags.includes('identity-memory'));
});

test('glyph definitions cannot smuggle authority into cognition', () => {
  assert.throws(() => createGlyphDefinition({
    id: 'crown',
    effects: { grantAuthority: true },
  }), /cannot manufacture authority/i);

  assert.equal(CORE_COGNITIVE_GLYPHS.threshold.grantsAuthority, false);
});

test('FEATHER pauses before retrieval, Laya, or model invocation', async () => {
  let retrievalCalls = 0;
  let layaCalls = 0;
  let modelCalls = 0;

  const engine = createCognitionEngine({
    retrieveContext: async () => {
      retrievalCalls += 1;
      return [];
    },
    layaInvoke: async () => {
      layaCalls += 1;
      return {};
    },
    modelInvoke: async () => {
      modelCalls += 1;
      return {};
    },
  });

  const result = await engine.cognize({
    runtime: runtime(),
    input: 'Continue.',
    activeGlyphs: ['feather'],
  });

  assert.equal(result.phase, 'paused');
  assert.equal(result.symbolicState.flags.halt, true);
  assert.equal(result.receipt.symbolicState.activeGlyphs[0], 'feather');
  assert.equal(retrievalCalls, 0);
  assert.equal(layaCalls, 0);
  assert.equal(modelCalls, 0);
});

test('THRESHOLD can force review even when Laya would otherwise continue', async () => {
  let modelCalls = 0;
  const engine = createCognitionEngine({
    layaInvoke: async () => ({
      route: 'conversation',
      authority: 'within-sandbox-scope',
      uncertainty: 'low',
      conflict: 'none',
    }),
    modelInvoke: async () => {
      modelCalls += 1;
      return { text: 'should not run' };
    },
  });

  const result = await engine.cognize({
    runtime: runtime(),
    input: 'Cross the boundary.',
    activeGlyphs: ['threshold'],
  });

  assert.equal(result.phase, 'review-required');
  assert.equal(result.actionEvaluation.allowed, false);
  assert.match(result.actionEvaluation.reason, /consequential boundary/i);
  assert.equal(modelCalls, 0);
});

test('symbolic state reaches retrieval, Laya frame, and deliberative model', async () => {
  let retrievedState = null;
  let layaState = null;
  let modelState = null;

  const engine = createCognitionEngine({
    retrieveContext: async ({ symbolicState }) => {
      retrievedState = symbolicState;
      return [{ ref: 'codex://ellowind/receipt-1', text: 'prior observation' }];
    },
    layaInvoke: async (frame) => {
      layaState = frame.symbolicState;
      return {
        route: 'conversation',
        authority: 'within-sandbox-scope',
        uncertainty: 'low',
        conflict: 'none',
      };
    },
    modelInvoke: async ({ symbolicState }) => {
      modelState = symbolicState;
      return { text: 'response' };
    },
  });

  const result = await engine.cognize({
    runtime: runtime(),
    input: 'Consider this in continuity.',
    activeGlyphs: ['witness', 'hearth'],
  });

  assert.equal(result.phase, 'completed');
  assert.deepEqual(retrievedState.activeGlyphs, ['witness', 'hearth']);
  assert.deepEqual(layaState.activeGlyphs, ['witness', 'hearth']);
  assert.deepEqual(modelState.activeGlyphs, ['witness', 'hearth']);
  assert.deepEqual(result.receipt.symbolicState.activeGlyphs, ['witness', 'hearth']);
});
