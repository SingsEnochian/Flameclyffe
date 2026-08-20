export const RUNA_LAYER_ORDER = Object.freeze([
  'reality',
  'worldHum',
  'location',
  'weather',
  'story',
  'observer',
  'interaction',
  'suggestions'
]);

export const SPIRAL_STATE_SCHEMA = 'hearthgate/spiral-state/v1';

export const RUNA_REQUIRED_INPUTS = Object.freeze([
  'desiredState',
  'world',
  'PREMAQ',
  'dualAspectPacket',
  'userPreferences',
  'historicalReceipts'
]);

export const RUNA_REQUIRED_OUTPUTS = Object.freeze([
  'adaptiveWorldHum',
  'keyboardHarmonics',
  'environmentalSoundscape',
  'haptics',
  'adaptiveSuggestions',
  'sessionReceipts'
]);

export const WORLD_PROFILE_SEMANTIC_FIELDS = Object.freeze([
  'worldHum',
  'acousticIdentity',
  'visualIdentity',
  'harmonicIdentity',
  'symbolicIdentity',
  'suggestedStates',
  'transferFunctions',
  'mythicMapping',
  'breathingCharacteristics',
  'environmentalBehaviour'
]);

export const HARMONIC_SPIRAL_PHASES = Object.freeze([
  'observe',
  'receive',
  'compress',
  'integrate',
  'release',
  'expand',
  'reorient',
  'contribute'
]);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function assertUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must be between 0 and 1`);
  }
}

function validateReceiptList(value, label) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length === 0)) {
    throw new TypeError(`${label} must be an array of receipt identifiers`);
  }
}

export function validateSpiralState(state) {
  assertObject(state, 'Spiral State');
  if (state.schema !== SPIRAL_STATE_SCHEMA) {
    throw new TypeError(`Spiral State must use ${SPIRAL_STATE_SCHEMA}`);
  }
  if (!HARMONIC_SPIRAL_PHASES.includes(state.phase)) {
    throw new TypeError('Spiral State phase is not recognised');
  }
  if (!['ascending', 'holding', 'descending', 'indeterminate'].includes(state.direction)) {
    throw new TypeError('Spiral State direction is not recognised');
  }
  assertUnitInterval(state.confidence, 'Spiral State confidence');
  if (!Array.isArray(state.suggested_actions)) {
    throw new TypeError('Spiral State suggested_actions must be an array');
  }
  for (const action of state.suggested_actions) {
    assertObject(action, 'Spiral State action');
    if (!action.token || typeof action.token !== 'string') {
      throw new TypeError('Spiral State action token is required');
    }
    assertUnitInterval(action.weight, `Spiral State action ${action.token} weight`);
  }
  assertObject(state.subsystem_contexts, 'Spiral State subsystem_contexts');
  for (const subsystem of ['llm', 'audio', 'glyph', 'ui']) {
    assertObject(state.subsystem_contexts[subsystem], `Spiral State ${subsystem} context`);
  }
  assertObject(state.supporting_receipts, 'Spiral State supporting_receipts');
  for (const dataset of ['story', 'time', 'theory']) {
    validateReceiptList(state.supporting_receipts[dataset], `Spiral State ${dataset} receipts`);
  }
  return true;
}

export function harmonicStateFromPacket(packet) {
  assertObject(packet, 'DualAspectPacket');
  if (!Object.hasOwn(packet, 'harmonic_state')) {
    throw new TypeError('DualAspectPacket requires harmonic_state populated by the Spiral Engine');
  }
  validateSpiralState(packet.harmonic_state);
  return packet.harmonic_state;
}

export function validateWorldProfile(profile) {
  assertObject(profile, 'world profile');
  for (const field of WORLD_PROFILE_SEMANTIC_FIELDS) {
    if (!(field in profile)) throw new TypeError(`world profile requires ${field}`);
  }

  const serialized = JSON.stringify(profile);
  if (/\b\d+(?:\.\d+)?\s*(?:hz|khz|mhz)\b/i.test(serialized)) {
    throw new TypeError('world canon must express semantic acoustic intent, not fixed frequencies');
  }

  return true;
}

export function validateCompilerRequest(request) {
  assertObject(request, 'Runa compiler request');
  for (const field of RUNA_REQUIRED_INPUTS) {
    if (!(field in request)) throw new TypeError(`Runa compiler request requires ${field}`);
  }
  harmonicStateFromPacket(request.dualAspectPacket);
  if ('DEEPStory' in request || 'DEEPTime' in request || 'DEEPTheory' in request) {
    throw new TypeError('Runa must consume Spiral State, never DEEP datasets directly');
  }
  return true;
}

export function createSuggestion({ text, provenance, proposedAdjustment, confidence = null }) {
  if (!text || typeof text !== 'string') throw new TypeError('suggestion text is required');
  if (!Array.isArray(provenance) || provenance.length === 0) {
    throw new TypeError('adaptive suggestions require provenance');
  }
  return Object.freeze({
    advisory: true,
    automatic: false,
    requiresUserChoice: true,
    text,
    provenance: Object.freeze([...provenance]),
    proposedAdjustment: proposedAdjustment ?? null,
    confidence
  });
}

export function createCompilerReceipt({
  inputFingerprint,
  worldProfileId,
  PREMAQReceiptId,
  spiralReceiptId,
  implementation,
  layerPlan,
  userOverrides = {},
  replaySeed
}) {
  if (!inputFingerprint || !worldProfileId || !spiralReceiptId || !replaySeed) {
    throw new TypeError('compiler receipts require input, world, spiral, and replay identities');
  }
  if (!Array.isArray(layerPlan) || layerPlan.join('|') !== RUNA_LAYER_ORDER.join('|')) {
    throw new TypeError('Runa layers must accumulate in the canonical order');
  }
  return Object.freeze({
    schema: 'runa.harmonic-state-compiler-receipt/v1',
    inputFingerprint,
    worldProfileId,
    PREMAQReceiptId: PREMAQReceiptId ?? null,
    spiralReceiptId,
    implementation,
    layerPlan: Object.freeze([...layerPlan]),
    userOverrides: Object.freeze({ ...userOverrides }),
    replaySeed,
    deterministicReplay: true,
    userControlled: true,
    generatedAt: new Date().toISOString()
  });
}

export function evaluateRunaLivingGate(state = {}) {
  const failures = [];
  if (!state.worldHumMounted) failures.push('MISSING_WORLD_HUM');
  if (!state.semanticCompilerMounted) failures.push('MISSING_SEMANTIC_COMPILER');
  if (!state.PREMAQIntentMappingMounted) failures.push('MISSING_PREMAQ_INTENT_MAPPING');
  if (!state.spiralStatePacketSubscriptionMounted) failures.push('MISSING_SPIRAL_STATE_PACKET_SUBSCRIPTION');
  if (!state.provenanceSuggestionsMounted) failures.push('MISSING_SUGGESTION_PROVENANCE');
  if (!state.deterministicReplayMounted) failures.push('MISSING_DETERMINISTIC_REPLAY');
  if (!state.userControlMounted) failures.push('MISSING_USER_CONTROL');
  if (!state.debugPipelineVisible) failures.push('MISSING_COMPILER_DEBUG_PIPELINE');

  return Object.freeze({
    pass: failures.length === 0,
    gate: failures.length === 0 ? 'LIVING' : 'INNERVATED',
    failures: Object.freeze(failures)
  });
}
