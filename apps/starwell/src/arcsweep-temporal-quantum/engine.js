import {
  BRAIDED_SPINE_SCHEMA,
  PREMAQ_NAMES,
  PREMAQ_WIRE_ORDER,
  REALITY_AXIOM,
  SEVENFOLD_CHORUS,
  THIRTEENFOLD_COUNCIL,
} from '../hearthweave-kernel/braided-spine.js';

export const PREMAQ_AXES = PREMAQ_WIRE_ORDER;
export const PREMAQ_AXIS_NAMES = PREMAQ_NAMES;
export const BIFROST_TEMPORAL_STATE_SCHEMA = 'arcsweep.bifrost-temporal-state/v0.2';
export const BIFROST_BRIDGE_PACKET_SCHEMA = 'arcsweep.bifrost-bridge-packet/v0.2';
export const BIFROST_RECEIPT_SCHEMA = 'arcsweep.bifrost-transition-receipt/v0.2';
export const BIFROST_RECEIVING_SPRING_SCHEMA = 'arcsweep.bifrost-receiving-spring/v0.1';

const TAU = Math.PI * 2;
const EPSILON = 1e-12;

export class BifrostTemporalError extends Error {
  constructor(message, code = 'bifrost-temporal-error') {
    super(message);
    this.name = 'BifrostTemporalError';
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function requireFinite(value, field) {
  if (!Number.isFinite(value)) {
    throw new BifrostTemporalError(`${field} must be finite`, 'invalid-number');
  }
  return value;
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BifrostTemporalError(`${field} must be a non-empty string`, 'invalid-string');
  }
  return value.trim();
}

function makeId(prefix, idFactory) {
  if (typeof idFactory === 'function') return `${prefix}-${idFactory()}`;
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function complex(re = 0, im = 0) {
  return { re, im };
}

function magnitudeSquared(z) {
  return (z.re * z.re) + (z.im * z.im);
}

function rotate(z, phase) {
  const cosine = Math.cos(phase);
  const sine = Math.sin(phase);
  return complex(
    (z.re * cosine) - (z.im * sine),
    (z.re * sine) + (z.im * cosine),
  );
}

function scale(z, factor) {
  return complex(z.re * factor, z.im * factor);
}

function normaliseAmplitudes(amplitudes) {
  const norm = Math.sqrt(PREMAQ_AXES.reduce(
    (sum, axis) => sum + magnitudeSquared(amplitudes[axis]),
    0,
  ));
  if (!Number.isFinite(norm) || norm <= EPSILON) {
    throw new BifrostTemporalError(
      'The temporal state has no accepted amplitude to normalise.',
      'NO_ACCEPTED_AMPLITUDE',
    );
  }
  return Object.fromEntries(
    PREMAQ_AXES.map((axis) => [axis, scale(amplitudes[axis], 1 / norm)]),
  );
}

function probabilityVector(amplitudes) {
  return Object.fromEntries(
    PREMAQ_AXES.map((axis) => [axis, magnitudeSquared(amplitudes[axis])]),
  );
}

function shannonEntropy(probabilities) {
  return PREMAQ_AXES.reduce((sum, axis) => {
    const probability = probabilities[axis];
    return probability > EPSILON ? sum - (probability * Math.log(probability)) : sum;
  }, 0);
}

function l1Distance(left, right) {
  return PREMAQ_AXES.reduce(
    (sum, axis) => sum + Math.abs(left[axis] - right[axis]),
    0,
  );
}

function componentFidelity(component) {
  const value = component.source_fidelity ?? component.confidence ?? 1;
  return clamp(requireFinite(value, 'PREMAQ source fidelity'));
}

function componentSpread(component) {
  return component.measured_spread ?? component.uncertainty ?? null;
}

function validateComponent(component, axis) {
  if (!component || typeof component !== 'object' || Array.isArray(component)) {
    throw new BifrostTemporalError(`PREMAQ ${axis} component must be an object`, 'invalid-premaq');
  }
  requireFinite(component.value, `PREMAQ ${axis}.value`);
  requireFinite(component.derivative, `PREMAQ ${axis}.derivative`);
  componentFidelity(component);
  return component;
}

export function validatePremaqPacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new BifrostTemporalError('PREMAQ packet must be an object', 'invalid-premaq');
  }
  if (packet.schema_version !== '2.0.0') {
    throw new BifrostTemporalError('PREMAQ schema_version must be 2.0.0', 'unsupported-premaq');
  }
  requireString(packet.id, 'PREMAQ id');
  requireString(packet.receipt_id, 'PREMAQ receipt_id');
  requireString(packet.registry_version, 'PREMAQ registry_version');
  requireString(packet.model_version, 'PREMAQ model_version');
  if (!Number.isInteger(packet.sequence) || packet.sequence < 0) {
    throw new BifrostTemporalError('PREMAQ sequence must be a non-negative integer', 'invalid-premaq');
  }
  const observedAt = new Date(packet.observed_at);
  if (Number.isNaN(observedAt.getTime())) {
    throw new BifrostTemporalError('PREMAQ observed_at must be a valid date-time', 'invalid-premaq');
  }
  for (const axis of PREMAQ_AXES) validateComponent(packet.state?.[axis], axis);
  return clone(packet);
}

export function premaqToTemporalState(packetInput, {
  clock = () => new Date(),
  idFactory,
  phaseScale = Math.PI,
  derivativePhaseScale = Math.PI / 2,
} = {}) {
  const packet = validatePremaqPacket(packetInput);
  requireFinite(phaseScale, 'phaseScale');
  requireFinite(derivativePhaseScale, 'derivativePhaseScale');

  const rawAmplitudes = {};
  const derivatives = {};
  const sourceFidelity = {};
  const measuredSpread = {};

  for (const axis of PREMAQ_AXES) {
    const component = packet.state[axis];
    const boundedValue = clamp(component.value);
    const fidelity = componentFidelity(component);
    const probabilitySeed = boundedValue * fidelity;
    const phase = (boundedValue * phaseScale) + (component.derivative * derivativePhaseScale);
    const radius = Math.sqrt(Math.max(0, probabilitySeed));
    rawAmplitudes[axis] = complex(radius * Math.cos(phase), radius * Math.sin(phase));
    derivatives[axis] = component.derivative;
    sourceFidelity[axis] = fidelity;
    measuredSpread[axis] = componentSpread(component);
  }

  const amplitudes = normaliseAmplitudes(rawAmplitudes);
  const probabilities = probabilityVector(amplitudes);
  const entropyH = shannonEntropy(probabilities);

  return {
    schema: BIFROST_TEMPORAL_STATE_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    reality_axiom: REALITY_AXIOM,
    state_id: makeId('bifrost-state', idFactory),
    created_at: clock().toISOString(),
    temporal_coordinate: 0,
    sequence: packet.sequence,
    premaq: {
      id: packet.id,
      receipt_id: packet.receipt_id,
      registry_version: packet.registry_version,
      model_version: packet.model_version,
      observed_at: packet.observed_at,
      axes: { ...PREMAQ_NAMES },
    },
    basis: [...PREMAQ_AXES],
    amplitudes,
    probabilities,
    derivatives,
    source_fidelity: sourceFidelity,
    measured_spread: measuredSpread,
    // Legacy transport aliases remain readable during migration.
    confidence: sourceFidelity,
    uncertainty: measuredSpread,
    normalisation: PREMAQ_AXES.reduce((sum, axis) => sum + probabilities[axis], 0),
    entropy_H: entropyH,
    entropy: entropyH,
    spiral: {
      cycle: 0,
      radius: 1,
      angle: 0,
      outward_distance: 0,
    },
    sevenfold_chorus: [...SEVENFOLD_CHORUS],
    thirteenfold_council: [...THIRTEENFOLD_COUNCIL],
    history: [],
    receipts: [],
    interpretation: {
      formalism: 'braided-temporal-quantum-compression-release',
      quantum_state: true,
      premaq_registry: 'Presence-Coherence-Resonance-Entanglement-Memory-Agency-Qualia',
      note: 'The quantum temporal state, PREMAQ bearing, Magic Spine, Science/Mathematics Spine and Physical Spine participate in one Bifröst relation.',
    },
  };
}

export function validateTemporalState(stateInput) {
  if (!stateInput || typeof stateInput !== 'object' || Array.isArray(stateInput)) {
    throw new BifrostTemporalError('Temporal state must be an object', 'invalid-temporal-state');
  }
  if (![BIFROST_TEMPORAL_STATE_SCHEMA, 'arcsweep.bifrost-temporal-state/v0.1'].includes(stateInput.schema)) {
    throw new BifrostTemporalError('Unsupported temporal state schema', 'invalid-temporal-state');
  }
  requireString(stateInput.state_id, 'state_id');
  requireFinite(stateInput.temporal_coordinate, 'temporal_coordinate');
  for (const axis of PREMAQ_AXES) {
    const amplitude = stateInput.amplitudes?.[axis];
    requireFinite(amplitude?.re, `${axis}.re`);
    requireFinite(amplitude?.im, `${axis}.im`);
  }
  return clone(stateInput);
}

function applyPairRotation(amplitudes, leftAxis, rightAxis, angle) {
  const left = amplitudes[leftAxis];
  const right = amplitudes[rightAxis];
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  amplitudes[leftAxis] = complex(
    (cosine * left.re) - (sine * right.re),
    (cosine * left.im) - (sine * right.im),
  );
  amplitudes[rightAxis] = complex(
    (sine * left.re) + (cosine * right.re),
    (sine * left.im) + (cosine * right.im),
  );
}

export function evolveTemporalState(stateInput, {
  delta = 1,
  hbar = 1,
  frequencies = {},
  derivativeCoupling = 0.25,
  bridgeCoupling = 0.08,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const prior = validateTemporalState(stateInput);
  requireFinite(delta, 'delta');
  requireFinite(hbar, 'hbar');
  requireFinite(derivativeCoupling, 'derivativeCoupling');
  requireFinite(bridgeCoupling, 'bridgeCoupling');
  if (delta <= 0 || hbar <= 0) {
    throw new BifrostTemporalError('delta and hbar must be positive', 'invalid-evolution');
  }

  const amplitudes = clone(prior.amplitudes);
  for (const [index, axis] of PREMAQ_AXES.entries()) {
    const baseFrequency = frequencies[axis] ?? (0.5 + (index * 0.125));
    requireFinite(baseFrequency, `frequency ${axis}`);
    const energy = baseFrequency + (derivativeCoupling * (prior.derivatives?.[axis] ?? 0));
    amplitudes[axis] = rotate(amplitudes[axis], -(energy * delta) / hbar);
  }

  for (let index = 0; index < PREMAQ_AXES.length - 1; index += 1) {
    applyPairRotation(
      amplitudes,
      PREMAQ_AXES[index],
      PREMAQ_AXES[index + 1],
      bridgeCoupling * delta,
    );
  }
  applyPairRotation(amplitudes, 'Q', 'P', bridgeCoupling * delta * 0.5);

  const normalised = normaliseAmplitudes(amplitudes);
  const probabilities = probabilityVector(normalised);
  const entropyH = shannonEntropy(probabilities);
  const receipt = {
    schema: BIFROST_RECEIPT_SCHEMA,
    receipt_id: makeId('bifrost-evolution', idFactory),
    action: 'unitary-evolution',
    braided_spine: BRAIDED_SPINE_SCHEMA,
    created_at: clock().toISOString(),
    from_state_id: prior.state_id,
    delta,
    hbar,
    derivative_coupling: derivativeCoupling,
    bridge_coupling: bridgeCoupling,
    normalisation_before: prior.normalisation,
    normalisation_after: PREMAQ_AXES.reduce((sum, axis) => sum + probabilities[axis], 0),
  };

  return {
    ...prior,
    schema: BIFROST_TEMPORAL_STATE_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    state_id: makeId('bifrost-state', idFactory),
    temporal_coordinate: prior.temporal_coordinate + delta,
    amplitudes: normalised,
    probabilities,
    normalisation: receipt.normalisation_after,
    entropy_H: entropyH,
    entropy: entropyH,
    history: [...prior.history, {
      state_id: prior.state_id,
      temporal_coordinate: prior.temporal_coordinate,
      probabilities: clone(prior.probabilities),
      entropy_H: prior.entropy_H ?? prior.entropy,
    }].slice(-128),
    receipts: [...prior.receipts, receipt].slice(-256),
  };
}

export function compressRelease(stateInput, {
  focus = 'Q',
  compressionGain = 0.65,
  release = 0.35,
  derivativeRelease = 0.08,
  radialGain = 0.5,
  angularGain = Math.PI / 3,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const prior = validateTemporalState(stateInput);
  if (!PREMAQ_AXES.includes(focus)) {
    throw new BifrostTemporalError(`Unknown compression focus: ${focus}`, 'invalid-compression-focus');
  }
  for (const [field, value] of Object.entries({ compressionGain, release, derivativeRelease, radialGain, angularGain })) {
    requireFinite(value, field);
  }
  if (compressionGain < 0 || compressionGain > 1 || release < 0 || release > 1) {
    throw new BifrostTemporalError('compressionGain and release must be from 0 to 1', 'invalid-compression-release');
  }

  const priorProbabilities = probabilityVector(prior.amplitudes);
  const compressedWeights = {};
  for (const axis of PREMAQ_AXES) {
    const focusWeight = axis === focus
      ? 1 + (compressionGain * (PREMAQ_AXES.length - 1))
      : 1 - compressionGain;
    compressedWeights[axis] = priorProbabilities[axis] * focusWeight;
  }
  const compressedTotal = PREMAQ_AXES.reduce((sum, axis) => sum + compressedWeights[axis], 0);
  if (compressedTotal <= EPSILON) {
    throw new BifrostTemporalError('Compression produced no active amplitude.', 'NO_ACCEPTED_AMPLITUDE');
  }
  const compressedProbabilities = Object.fromEntries(
    PREMAQ_AXES.map((axis) => [axis, compressedWeights[axis] / compressedTotal]),
  );

  const releasedWeights = {};
  for (const axis of PREMAQ_AXES) {
    const derivativeFlow = Math.max(0, prior.derivatives?.[axis] ?? 0) * derivativeRelease;
    releasedWeights[axis] =
      ((1 - release) * compressedProbabilities[axis])
      + (release * priorProbabilities[axis])
      + derivativeFlow;
  }
  const releasedTotal = PREMAQ_AXES.reduce((sum, axis) => sum + releasedWeights[axis], 0);
  if (releasedTotal <= EPSILON) {
    throw new BifrostTemporalError('Release produced no active amplitude.', 'NO_ACCEPTED_AMPLITUDE');
  }
  const releasedProbabilities = Object.fromEntries(
    PREMAQ_AXES.map((axis) => [axis, releasedWeights[axis] / releasedTotal]),
  );

  const amplitudes = {};
  for (const axis of PREMAQ_AXES) {
    const old = prior.amplitudes[axis];
    const phase = Math.atan2(old.im, old.re);
    const radius = Math.sqrt(releasedProbabilities[axis]);
    amplitudes[axis] = complex(radius * Math.cos(phase), radius * Math.sin(phase));
  }

  const outwardDistance = l1Distance(priorProbabilities, releasedProbabilities);
  const entropyH = shannonEntropy(releasedProbabilities);
  const entropyChange = entropyH - (prior.entropy_H ?? prior.entropy ?? 0);
  const cycle = (prior.spiral?.cycle ?? 0) + 1;
  const radius = (prior.spiral?.radius ?? 1)
    + (radialGain * outwardDistance)
    + (Math.abs(entropyChange) * 0.1);
  const angle = ((prior.spiral?.angle ?? 0) + angularGain + (outwardDistance * Math.PI)) % TAU;

  const receipt = {
    schema: BIFROST_RECEIPT_SCHEMA,
    receipt_id: makeId('bifrost-compression-release', idFactory),
    action: 'compression-release',
    braided_spine: BRAIDED_SPINE_SCHEMA,
    created_at: clock().toISOString(),
    from_state_id: prior.state_id,
    focus,
    compression_gain: compressionGain,
    release,
    derivative_release: derivativeRelease,
    compression_probabilities: compressedProbabilities,
    compressed_probabilities: compressedProbabilities,
    release_probabilities: releasedProbabilities,
    outward_distance: outwardDistance,
    entropy_H_change: entropyChange,
    entropy_change: entropyChange,
    cycle,
    next_operation: 'compression-of-release',
  };

  return {
    ...prior,
    schema: BIFROST_TEMPORAL_STATE_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    state_id: makeId('bifrost-state', idFactory),
    amplitudes,
    probabilities: releasedProbabilities,
    normalisation: PREMAQ_AXES.reduce((sum, axis) => sum + releasedProbabilities[axis], 0),
    entropy_H: entropyH,
    entropy: entropyH,
    spiral: {
      cycle,
      radius,
      angle,
      outward_distance: (prior.spiral?.outward_distance ?? 0) + outwardDistance,
    },
    history: [...prior.history, {
      state_id: prior.state_id,
      temporal_coordinate: prior.temporal_coordinate,
      probabilities: priorProbabilities,
      entropy_H: prior.entropy_H ?? prior.entropy,
    }].slice(-128),
    receipts: [...prior.receipts, receipt].slice(-256),
  };
}

// Compatibility export. The engine law is compression → release → continuation.
export { compressRelease as collapseRelease };

function bhattacharyyaDistributionFidelity(left, right) {
  const coefficient = PREMAQ_AXES.reduce(
    (sum, axis) => sum + Math.sqrt(Math.max(0, left[axis]) * Math.max(0, right[axis])),
    0,
  );
  return clamp(coefficient * coefficient);
}

export function createBifrostBridgePacket({
  premaq,
  hearthside,
  targetside,
  worldId,
  canonGraphVersion,
  transferFunctionVersion,
  timeline = null,
  anchors,
  asking = null,
  lineage = [],
  clock = () => new Date(),
  idFactory,
} = {}) {
  const packet = validatePremaqPacket(premaq);
  const hearth = validateTemporalState(hearthside);
  const target = validateTemporalState(targetside);
  const selectedWorld = requireString(worldId, 'worldId');
  const canonVersion = requireString(canonGraphVersion, 'canonGraphVersion');
  const transferVersion = requireString(transferFunctionVersion, 'transferFunctionVersion');
  const hearthAnchor = requireString(anchors?.hearthside, 'anchors.hearthside');
  const targetAnchor = requireString(anchors?.targetside, 'anchors.targetside');

  const distributionFidelity = bhattacharyyaDistributionFidelity(
    hearth.probabilities,
    target.probabilities,
  );
  const phaseDelta = Math.atan2(
    Math.sin((target.spiral?.angle ?? 0) - (hearth.spiral?.angle ?? 0)),
    Math.cos((target.spiral?.angle ?? 0) - (hearth.spiral?.angle ?? 0)),
  );
  const temporalSeparation = target.temporal_coordinate - hearth.temporal_coordinate;

  return {
    schema: BIFROST_BRIDGE_PACKET_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    reality_axiom: REALITY_AXIOM,
    bridge_packet_id: makeId('bifrost-bridge', idFactory),
    created_at: clock().toISOString(),
    world_id: selectedWorld,
    canon_graph_version: canonVersion,
    transfer_function_version: transferVersion,
    timeline,
    asking: clone(asking),
    lineage: clone(lineage),
    premaq_ref: {
      id: packet.id,
      receipt_id: packet.receipt_id,
      sequence: packet.sequence,
      registry_version: packet.registry_version,
      axes: { ...PREMAQ_NAMES },
    },
    hearthside: {
      anchor: hearthAnchor,
      state_id: hearth.state_id,
      temporal_coordinate: hearth.temporal_coordinate,
      probabilities: clone(hearth.probabilities),
      role: 'participating-shore',
    },
    targetside: {
      anchor: targetAnchor,
      state_id: target.state_id,
      temporal_coordinate: target.temporal_coordinate,
      probabilities: clone(target.probabilities),
      role: 'participating-shore',
    },
    bridge_metrics: {
      distribution_fidelity: distributionFidelity,
      state_fidelity: distributionFidelity,
      temporal_separation: temporalSeparation,
      temporal_twist: phaseDelta,
      anchor_integrity: Boolean(hearthAnchor && targetAnchor),
      crossing_ready: distributionFidelity >= 0.5 && Boolean(hearthAnchor && targetAnchor),
    },
    sevenfold_chorus: [...SEVENFOLD_CHORUS],
    thirteenfold_council: [...THIRTEENFOLD_COUNCIL],
    laws: [
      'Both shores remain lit.',
      'The join is a rhyme.',
      'Every shore answers in its own nature.',
      'Lineage travels with what crosses.',
      'Release feeds the next compression.',
      'Reception changes the next relation.',
    ],
  };
}

export function expressWorldState(bridgePacketInput, {
  matrix,
  bias = {},
  labels = {},
} = {}) {
  if (!bridgePacketInput || ![
    BIFROST_BRIDGE_PACKET_SCHEMA,
    'arcsweep.bifrost-bridge-packet/v0.1',
  ].includes(bridgePacketInput.schema)) {
    throw new BifrostTemporalError('Unsupported bridge packet schema', 'invalid-bridge-packet');
  }
  if (!matrix || typeof matrix !== 'object') {
    throw new BifrostTemporalError('A world expression matrix is required', 'missing-expression-matrix');
  }

  const input = bridgePacketInput.targetside.probabilities;
  const expression = {};
  for (const [outputKey, row] of Object.entries(matrix)) {
    if (!row || typeof row !== 'object') {
      throw new BifrostTemporalError(`Expression row ${outputKey} must be an object`, 'invalid-expression-matrix');
    }
    let value = requireFinite(bias[outputKey] ?? 0, `bias ${outputKey}`);
    for (const axis of PREMAQ_AXES) {
      const coefficient = requireFinite(row[axis] ?? 0, `matrix ${outputKey}.${axis}`);
      value += coefficient * input[axis];
    }
    expression[outputKey] = {
      value,
      label: labels[outputKey] ?? outputKey,
      source_class: 'expressed',
    };
  }

  return {
    schema: 'arcsweep.world-state-expression/v0.2',
    braided_spine: BRAIDED_SPINE_SCHEMA,
    bridge_packet_id: bridgePacketInput.bridge_packet_id,
    world_id: bridgePacketInput.world_id,
    canon_graph_version: bridgePacketInput.canon_graph_version,
    transfer_function_version: bridgePacketInput.transfer_function_version,
    expression,
    projection: expression,
    measured_spread: 'inherits PREMAQ measured spread and world expression calibration',
    provenance: {
      premaq_ref: clone(bridgePacketInput.premaq_ref),
      hearthside_state_id: bridgePacketInput.hearthside.state_id,
      targetside_state_id: bridgePacketInput.targetside.state_id,
    },
  };
}

// Compatibility name retained while callers migrate to `expressWorldState`.
export const projectWorldState = expressWorldState;

export function receiveTargetside({
  bridgePacket,
  targetState,
  worldField = {},
  worldGraph = {},
  answer = null,
  clock = () => new Date(),
  idFactory,
} = {}) {
  if (!bridgePacket || ![
    BIFROST_BRIDGE_PACKET_SCHEMA,
    'arcsweep.bifrost-bridge-packet/v0.1',
  ].includes(bridgePacket.schema)) {
    throw new BifrostTemporalError('A Bifröst bridge packet is required', 'invalid-bridge-packet');
  }

  const target = validateTemporalState(targetState);
  return {
    schema: BIFROST_RECEIVING_SPRING_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    receiving_spring_id: makeId('receiving-spring', idFactory),
    created_at: clock().toISOString(),
    bridge_packet_id: bridgePacket.bridge_packet_id,
    world_id: bridgePacket.world_id,
    target_state_id: target.state_id,
    target_state: target,
    world_field: clone(worldField),
    world_graph: clone(worldGraph),
    answer: clone(answer),
    lineage: [
      ...(bridgePacket.lineage ?? []),
      `bridge:${bridgePacket.bridge_packet_id}`,
      `target-state:${target.state_id}`,
    ],
    movement: 'reception → answer → return',
  };
}

export function createReturnCrossing(receivingSpring, {
  clock = () => new Date(),
  idFactory,
} = {}) {
  if (!receivingSpring || receivingSpring.schema !== BIFROST_RECEIVING_SPRING_SCHEMA) {
    throw new BifrostTemporalError('A Receiving Spring state is required', 'invalid-receiving-spring');
  }
  return {
    schema: 'arcsweep.bifrost-return-crossing/v0.1',
    braided_spine: BRAIDED_SPINE_SCHEMA,
    return_id: makeId('bifrost-return', idFactory),
    created_at: clock().toISOString(),
    bridge_packet_id: receivingSpring.bridge_packet_id,
    world_id: receivingSpring.world_id,
    answer: clone(receivingSpring.answer),
    target_state_id: receivingSpring.target_state_id,
    lineage: [...receivingSpring.lineage, `receiving-spring:${receivingSpring.receiving_spring_id}`],
    next_movement: 'integration',
  };
}

export function integrateBridgeAnswer({
  hearthside,
  targetside,
  returnCrossing,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const hearth = validateTemporalState(hearthside);
  const target = validateTemporalState(targetside);
  if (!returnCrossing || returnCrossing.schema !== 'arcsweep.bifrost-return-crossing/v0.1') {
    throw new BifrostTemporalError('A Bifröst return crossing is required', 'invalid-return-crossing');
  }

  const probabilities = Object.fromEntries(PREMAQ_AXES.map((axis) => [
    axis,
    (hearth.probabilities[axis] + target.probabilities[axis]) / 2,
  ]));
  const amplitudes = Object.fromEntries(PREMAQ_AXES.map((axis) => {
    const phase = Math.atan2(hearth.amplitudes[axis].im, hearth.amplitudes[axis].re);
    const radius = Math.sqrt(probabilities[axis]);
    return [axis, complex(radius * Math.cos(phase), radius * Math.sin(phase))];
  }));

  const entropyH = shannonEntropy(probabilities);
  const integrated = {
    ...hearth,
    schema: BIFROST_TEMPORAL_STATE_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    state_id: makeId('bifrost-state-integrated', idFactory),
    created_at: clock().toISOString(),
    amplitudes,
    probabilities,
    entropy_H: entropyH,
    entropy: entropyH,
    spiral: {
      cycle: Math.max(hearth.spiral?.cycle ?? 0, target.spiral?.cycle ?? 0) + 1,
      radius: Math.max(hearth.spiral?.radius ?? 1, target.spiral?.radius ?? 1) + l1Distance(hearth.probabilities, target.probabilities),
      angle: ((hearth.spiral?.angle ?? 0) + (target.spiral?.angle ?? 0)) / 2,
      outward_distance: (hearth.spiral?.outward_distance ?? 0)
        + (target.spiral?.outward_distance ?? 0)
        + l1Distance(hearth.probabilities, target.probabilities),
    },
    history: [...hearth.history, {
      state_id: hearth.state_id,
      temporal_coordinate: hearth.temporal_coordinate,
      probabilities: clone(hearth.probabilities),
      answer: clone(returnCrossing.answer),
    }].slice(-128),
    receipts: [...hearth.receipts, {
      schema: BIFROST_RECEIPT_SCHEMA,
      receipt_id: makeId('bifrost-integration', idFactory),
      action: 'receiving-spring-integration',
      created_at: clock().toISOString(),
      from_state_id: hearth.state_id,
      target_state_id: target.state_id,
      return_id: returnCrossing.return_id,
      answer: clone(returnCrossing.answer),
      next_operation: 'renewal',
    }].slice(-256),
  };

  return integrated;
}
