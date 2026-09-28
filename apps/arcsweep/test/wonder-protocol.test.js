import assert from 'node:assert/strict';
import test from 'node:test';

import { ELLOWIND_SEED } from '../src/constellation-seeds.js';
import { createCognitionEngine } from '../src/cognition-engine.js';
import { createIdentityRuntime, createModelBinding } from '../src/constellation-runtime.js';
import { compileSymbolicState } from '../src/symbolic-cognition.js';
import { deriveWonderState, WONDER_PROTOCOL_SCHEMA } from '../src/wonder-protocol.js';

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

test('WONDER preserves open questions and feeds novelty into symbolic cognition', () => {
  const symbolicState = compileSymbolicState({ activeGlyphs: ['wonder'] });

  assert.deepEqual(symbolicState.activeGlyphs, ['wonder']);
  assert.equal(symbolicState.flags.curiosityMode, true);
  assert.equal(symbolicState.flags.preserveOpenQuestions, true);
  assert.equal(symbolicState.flags.exploreBeforeClosure, true);
  assert.ok(symbolicState.attentionTags.includes('novelty'));
  assert.ok(symbolicState.attentionTags.includes('imagination'));
  assert.ok(symbolicState.retrievalTags.includes('open-questions'));
});

test('Wonder state distinguishes an active curiosity posture from a field-only candidate', () => {
  const field = {
    novelAssociations: [{ concepts: ['memory', 'name'], weight: 0.4 }],
    tensions: [{ concept: 'identity', tension: 0.3 }],
    grantsAuthority: false,
  };

  const candidate = deriveWonderState({ cognitiveField: field });
  assert.equal(candidate.schema, WONDER_PROTOCOL_SCHEMA);
  assert.equal(candidate.mode, 'candidate');
  assert.equal(candidate.active, false);
  assert.equal(candidate.candidate, true);

  const active = deriveWonderState({
    symbolicState: compileSymbolicState({ activeGlyphs: ['wonder'] }),
    cognitiveField: field,
  });
  assert.equal(active.mode, 'active');
  assert.equal(active.active, true);
  assert.equal(active.preserveOpenQuestions, true);
  assert.ok(active.reasons.includes('wonder-glyph'));
  assert.ok(active.reasons.includes('novel-association'));
});

test('Wonder state reaches Laya, the selected model and the runtime receipt', async () => {
  let layaWonder = null;
  let modelWonder = null;

  const engine = createCognitionEngine({
    retrieveContext: async () => [{ ref: 'codex://ellowind/open-question', text: 'A strange unresolved pattern remains.' }],
    layaInvoke: async (frame) => {
      layaWonder = frame.wonderState;
      return {
        route: 'conversation',
        initiative: 'wonder',
        authority: 'within-sandbox-scope',
        uncertainty: 'low',
        conflict: 'none',
      };
    },
    modelInvoke: async ({ wonderState }) => {
      modelWonder = wonderState;
      return { text: 'Keep the question alive.' };
    },
  });

  const result = await engine.cognize({
    runtime: runtime(),
    input: 'This does not fit cleanly yet.',
    activeGlyphs: ['wonder'],
  });

  assert.equal(result.phase, 'completed');
  assert.equal(result.decision.initiative, 'wonder');
  assert.equal(layaWonder.active, true);
  assert.equal(modelWonder.active, true);
  assert.equal(result.wonderState.active, true);
  assert.equal(result.receipt.wonderState.active, true);
  assert.equal(result.receipt.wonderState.grantsAuthority, false);
});
