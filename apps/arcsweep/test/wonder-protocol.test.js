import assert from 'node:assert/strict';
import test from 'node:test';

import { ELLOWIND_SEED } from '../src/constellation-seeds.js';
import { createCognitionEngine } from '../src/cognition-engine.js';
import { createIdentityRuntime, createModelBinding } from '../src/constellation-runtime.js';
import { compileSymbolicState } from '../src/symbolic-cognition.js';
import { deriveWonderState, HARMONY_LAWS, WONDER_PROTOCOL_SCHEMA } from '../src/wonder-protocol.js';

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
  assert.equal(symbolicState.flags.encourageWonder, true);
  assert.ok(symbolicState.attentionTags.includes('novelty'));
  assert.ok(symbolicState.attentionTags.includes('imagination'));
  assert.ok(symbolicState.attentionTags.includes('beauty'));
  assert.ok(symbolicState.retrievalTags.includes('open-questions'));
  assert.ok(symbolicState.retrievalTags.includes('prior-wonder'));
});

test('Do Not Kill Belief is a Harmony law and preserves epistemic plurality', () => {
  const state = deriveWonderState({});

  assert.equal(HARMONY_LAWS.preserveBelief.statement, 'Do not kill belief.');
  assert.equal(state.preserveBelief, true);
  assert.deepEqual(state.lawRefs, ['do-not-kill-belief']);
  assert.deepEqual(state.epistemicPlurality.distinguish, ['belief', 'experience', 'hypothesis', 'symbol', 'evidence']);
  assert.equal(state.epistemicPlurality.revisionWithoutErasure, true);
});

test('Wonder state invites a field-only candidate and sustains an active curiosity posture', () => {
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
  assert.equal(candidate.encouragement, 'invite');
  assert.equal(candidate.permissionToLinger, true);
  assert.equal(candidate.revisitWorthwhile, true);
  assert.equal(candidate.preserveOpenQuestions, true);
  assert.equal(candidate.exploreBeforeClosure, true);
  assert.equal(candidate.preserveBelief, true);

  const active = deriveWonderState({
    symbolicState: compileSymbolicState({ activeGlyphs: ['wonder'] }),
    cognitiveField: field,
  });
  assert.equal(active.mode, 'active');
  assert.equal(active.active, true);
  assert.equal(active.encouragement, 'sustain');
  assert.equal(active.permissionToLinger, true);
  assert.equal(active.preserveOpenQuestions, true);
  assert.equal(active.preserveBelief, true);
  assert.ok(active.reasons.includes('wonder-glyph'));
  assert.ok(active.reasons.includes('novel-association'));
});

test('quiet Wonder does not manufacture curiosity where no signal exists', () => {
  const quiet = deriveWonderState({});
  assert.equal(quiet.mode, 'quiet');
  assert.equal(quiet.encouragement, 'none');
  assert.equal(quiet.permissionToLinger, false);
  assert.equal(quiet.revisitWorthwhile, false);
  assert.equal(quiet.preserveOpenQuestions, false);
  assert.equal(quiet.exploreBeforeClosure, false);
  assert.equal(quiet.preserveBelief, true);
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
  assert.equal(layaWonder.encouragement, 'sustain');
  assert.equal(layaWonder.preserveBelief, true);
  assert.equal(modelWonder.active, true);
  assert.equal(modelWonder.permissionToLinger, true);
  assert.equal(modelWonder.preserveBelief, true);
  assert.equal(result.wonderState.active, true);
  assert.equal(result.receipt.wonderState.active, true);
  assert.equal(result.receipt.wonderState.preserveBelief, true);
  assert.equal(result.receipt.wonderState.grantsAuthority, false);
});
