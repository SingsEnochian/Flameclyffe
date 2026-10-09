import assert from 'node:assert/strict';
import test from 'node:test';

import { createCognitionEngine } from '../src/cognition-engine.js';
import { ELLOWIND_SEED } from '../src/constellation-seeds.js';
import { createIdentityRuntime, createModelBinding } from '../src/constellation-runtime.js';
import { replayCognitiveField, createCognitiveFieldState } from '../src/cognitive-field-engine.js';

function runtime() {
  return createIdentityRuntime({
    seed: ELLOWIND_SEED,
    modelBindings: [createModelBinding({
      bindingId: 'ellowind-conversation-test',
      role: 'conversation',
      family: 'test',
      modelRef: 'test/conversation',
    })],
  });
}

test('cognition engine evolves field before Laya and carries it through model and receipt', async () => {
  const seenFrames = [];
  const seenModels = [];
  const engine = createCognitionEngine({
    retrieveContext: async () => [{ ref: 'codex://ellowind/doorway', summary: 'A silver spiral appeared near a warm doorway.' }],
    layaInvoke: async (frame) => {
      seenFrames.push(frame);
      return { route: 'conversation', authority: 'within-sandbox-scope', uncertainty: 'low', conflict: 'none', confidence: 0.9 };
    },
    modelInvoke: async (payload) => {
      seenModels.push(payload);
      return { text: 'Two interpretations remain plausible.' };
    },
  });

  const identity = runtime();
  const first = await engine.cognize({ runtime: identity, input: 'Interpret the silver spiral.', activeGlyphs: ['witness', 'hearth'] });
  const second = await engine.cognize({ runtime: identity, input: 'Compare it with the doorway memory.', activeGlyphs: ['witness', 'hearth'] });

  assert.equal(first.phase, 'completed');
  assert.equal(first.cognitiveField.tick, 1);
  assert.equal(second.cognitiveField.tick, 2);
  assert.equal(seenFrames[0].cognitiveField.tick, 1);
  assert.equal(seenFrames[0].cognitiveField.grantsAuthority, false);
  assert.deepEqual(seenModels[0].cognitiveField, first.cognitiveField);
  assert.equal(first.receipt.cognitiveFieldReceipt.stateAfterFingerprint, first.cognitiveFieldReceipt.stateAfterFingerprint);
  assert.equal(first.receipt.cognitiveFieldReceipt.grantsAuthority, false);

  const replay = replayCognitiveField({
    initialState: createCognitiveFieldState({ fieldId: identity.continuity.namespace }),
    receipts: [first.cognitiveFieldReceipt, second.cognitiveFieldReceipt],
  });
  assert.equal(replay.fingerprint, second.cognitiveFieldReceipt.stateAfterFingerprint);
});

test('FEATHER halts before the cognitive field advances', async () => {
  let layaCalls = 0;
  let modelCalls = 0;
  const identity = runtime();
  const engine = createCognitionEngine({
    layaInvoke: async () => { layaCalls += 1; return {}; },
    modelInvoke: async () => { modelCalls += 1; return {}; },
  });

  const before = engine.getFieldState(identity);
  const result = await engine.cognize({ runtime: identity, input: 'Do not advance.', activeGlyphs: ['feather'] });
  const after = engine.getFieldState(identity);

  assert.equal(result.phase, 'paused');
  assert.equal(result.cognitiveField, null);
  assert.equal(before.tick, 0);
  assert.equal(after.tick, 0);
  assert.equal(layaCalls, 0);
  assert.equal(modelCalls, 0);
});
