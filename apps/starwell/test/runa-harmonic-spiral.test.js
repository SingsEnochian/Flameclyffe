import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNA_LAYER_ORDER,
  validateWorldProfile,
  validateCompilerRequest,
  createSuggestion,
  createCompilerReceipt,
  evaluateRunaLivingGate
} from '../src/runa/harmonic-spiral-contract.js';

test('world profiles remain semantic and reject fixed canon frequencies', () => {
  const profile = {
    worldHum: ['ancient stone', 'sea', 'copper'],
    acousticIdentity: ['cathedral', 'wind', 'warmth'],
    visualIdentity: ['bone-white stonewood'],
    harmonicIdentity: ['three-moon resonance'],
    symbolicIdentity: ['hearth', 'threshold'],
    suggestedStates: ['creative-flow'],
    transferFunctions: ['PREMAQ-to-semantic-intent'],
    mythicMapping: ['wonder-without-end'],
    breathingCharacteristics: ['slow', 'tidal'],
    environmentalBehaviour: ['layered', 'continuous']
  };
  assert.equal(validateWorldProfile(profile), true);
  assert.throws(() => validateWorldProfile({ ...profile, worldHum: ['369 Hz'] }), /not fixed frequencies/);
});

test('compiler requests require the whole shared state body', () => {
  assert.equal(validateCompilerRequest({
    desiredState: 'creative-flow',
    world: 'terra-aeterna',
    PREMAQ: { P: 0.8 },
    sharedSpiralState: { phase: 'receive' },
    userPreferences: {},
    historicalReceipts: []
  }), true);
});

test('suggestions are advisory, provenance-bound, and require user choice', () => {
  const suggestion = createSuggestion({
    text: 'Use slower harmonic movement.',
    provenance: ['receipt:terra-session-1'],
    proposedAdjustment: { motion: 'slower' }
  });
  assert.equal(suggestion.advisory, true);
  assert.equal(suggestion.automatic, false);
  assert.equal(suggestion.requiresUserChoice, true);
  assert.throws(() => createSuggestion({ text: 'No receipts', provenance: [] }), /require provenance/);
});

test('compiler receipts preserve canonical accumulation and deterministic replay', () => {
  const receipt = createCompilerReceipt({
    inputFingerprint: 'input-1',
    worldProfileId: 'terra-v1',
    PREMAQReceiptId: 'premaq-1',
    spiralReceiptId: 'spiral-1',
    implementation: { engine: 'web-audio' },
    layerPlan: RUNA_LAYER_ORDER,
    replaySeed: 'seed-1'
  });
  assert.equal(receipt.deterministicReplay, true);
  assert.equal(receipt.userControlled, true);
});

test('Runa cannot pass LIVING with a missing organ', () => {
  const complete = {
    worldHumMounted: true,
    semanticCompilerMounted: true,
    PREMAQIntentMappingMounted: true,
    sharedSpiralSubscriptionMounted: true,
    provenanceSuggestionsMounted: true,
    deterministicReplayMounted: true,
    userControlMounted: true,
    debugPipelineVisible: true
  };
  assert.deepEqual(evaluateRunaLivingGate(complete), {
    pass: true,
    gate: 'LIVING',
    failures: []
  });
  const missing = evaluateRunaLivingGate({ ...complete, worldHumMounted: false });
  assert.equal(missing.pass, false);
  assert.ok(missing.failures.includes('MISSING_WORLD_HUM'));
});
