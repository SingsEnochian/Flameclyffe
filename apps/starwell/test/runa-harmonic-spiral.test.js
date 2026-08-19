import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNA_LAYER_ORDER,
  SPIRAL_STATE_SCHEMA,
  validateSpiralState,
  harmonicStateFromPacket,
  validateWorldProfile,
  validateCompilerRequest,
  createSuggestion,
  createCompilerReceipt,
  evaluateRunaLivingGate
} from '../src/runa/harmonic-spiral-contract.js';

function spiralState() {
  return {
    schema: SPIRAL_STATE_SCHEMA,
    phase: 'release',
    direction: 'ascending',
    confidence: 0.91,
    suggested_actions: [
      { token: 'deepen_scene', weight: 0.87, reason_code: 'story_arc_opening' }
    ],
    subsystem_contexts: {
      llm: { breath_note: 'Allow descriptive space before dialogue.' },
      audio: { directive: 'widen', intensity: 0.7 },
      glyph: { evolution_hint: 'open_path' },
      ui: { attention_level: 0.6 }
    },
    supporting_receipts: {
      story: ['deepstory:1'],
      time: ['deeptime:1'],
      theory: ['deeptheory:1']
    }
  };
}

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

test('Spiral State is versioned and extracted only from DualAspectPacket.harmonic_state', () => {
  const state = spiralState();
  assert.equal(validateSpiralState(state), true);
  assert.equal(harmonicStateFromPacket({ harmonic_state: state }), state);
  assert.throws(() => harmonicStateFromPacket({}), /requires harmonic_state/);
});

test('compiler requests require the DualAspectPacket Spiral State contract', () => {
  assert.equal(validateCompilerRequest({
    desiredState: 'creative-flow',
    world: 'terra-aeterna',
    PREMAQ: { P: 0.8 },
    dualAspectPacket: { harmonic_state: spiralState() },
    userPreferences: {},
    historicalReceipts: []
  }), true);
});

test('Runa rejects direct DEEP dataset access', () => {
  assert.throws(() => validateCompilerRequest({
    desiredState: 'creative-flow',
    world: 'terra-aeterna',
    PREMAQ: { P: 0.8 },
    dualAspectPacket: { harmonic_state: spiralState() },
    userPreferences: {},
    historicalReceipts: [],
    DEEPStory: {}
  }), /never DEEP datasets directly/);
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
    spiralStatePacketSubscriptionMounted: true,
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
