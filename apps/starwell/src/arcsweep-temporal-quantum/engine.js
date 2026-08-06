export const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
export const BIFROST_TEMPORAL_STATE_SCHEMA = 'arcsweep.bifrost-temporal-state/v0.1';
export const BIFROST_BRIDGE_PACKET_SCHEMA = 'arcsweep.bifrost-bridge-packet/v0.1';
export const BIFROST_RECEIPT_SCHEMA = 'arcsweep.bifrost-transition-receipt/v0.1';

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
    const equal = 1 / Math.sqrt(PREMAQ_AXES.length);
    return Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, complex(equal, 0)]));
  }
  return Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, scale(amplitudes[axis], 1 / norm)]));
}

function probabilityVector(amplitudes) {
  return Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, magnitudeSquared(amplitudes[axis])]));
}

function shannonEntropy(probabilities) {
  return PREMAQ_AXES.reduce((sum, axis) => {
    const probability = probabilities[axis];
    return probability > EPSILON ? sum - (probability * Math.log(probability)) : sum;
  }, 0);
}

function l1Distance(left, right) {
  return PREMAQ_AXES.reduce((sum, axis) => sum + Math.abs(left[axis] - right[axis]), 0);
}

function validateComponent(component, axis) {
  if (!component || typeof component !== 'object' || Array.isArray(component)) {
    throw new BifrostTemporalError(`PREMAQ ${axis} component must be an object`, 'invalid-premaq');
  }
  requireFinite(component.value, `PREMAQ ${axis}.value`);
  requireFinite(component.derivative, `PREMAQ ${axis}.derivative`);
  if (component.confidence != null) {
    requireFinite(component.confidence, `PREMAQ ${axis}.confidence`);
    if (component.confidence < 0 || component.confidence > 1) {
      throw new BifrostTemporalError(`PREMAQ ${axis}.confidence must be from 0 to 1`, 'invalid-premaq');
    }
  }
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
  const confidence = {};
  const uncertainty = {};

  for (const axis of PREMAQ_AXES) {
    const component = packet.state[axis];
    const boundedValue = clamp(component.value);
    const confidenceWeight = component.confidence == null ? 1 : clamp(component.confidence);
    const probabilitySeed = Math.max(EPSILON, boundedValue * Math.max(EPSILON, confidenceWeight));
    const phase = (boundedValue * phaseScale) + (component.derivative * derivativePhaseScale);
    rawAmplitudes[axis] = complex(Math.sqrt(probabilitySeed) * Math.cos(phase), Math.sqrt(probabilitySeed) * Math.sin(phase));
    derivatives[axis] = component.derivative;
    confidence[axis] = component.confidence ?? null;
    uncertainty[axis] = component.uncertainty ?? null;
  }

  const amplitudes = normaliseAmplitudes(rawAmplitudes);
  const probabilities = probabilityVector(amplitudes);

  return {
    schema: BIFROST_TEMPORAL_STATE_SCHEMA,
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
    },
    basis: [...PREMAQ_AXES],
    amplitudes,
    probabilities,
    derivatives,
    confidence,
    uncertainty,
    normalisation: PREMAQ_AXES.reduce((sum, axis) => sum + probabilities[axis], 0),
    entropy: shannonEntropy(probabilities),
    spiral: {
      cycle: 0,
      radius: 1,
      angle: 0,
      outward_distance: 0,
    },
    history: [],
    receipts: [],
    interpretation: {
      formalism: 'temporal-quantum-state-machine',
      physical_claim: false,
      note: 'Quantum-mechanical structures are used as a bounded computational formalism; PREMAQ values retain their recorded provenance.',
    },
  };
}

export function validateTemporalState(stateInput) {
  if (!stateInput || typeof stateInput !== 'object' || Array.isArray(stateInput)) {
    throw new BifrostTemporalError('Temporal state must be an object', 'invalid-temporal-state');
  }
  if (stateInput.schema !== BIFROST_TEMPORAL_STATE_SCHEMA) {
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
  const receipt = {
    schema: BIFROST_RECEIPT_SCHEMA,
    receipt_id: makeId('bifrost-evolution', idFactory),
    action: 'unitary-evolution',
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
    state_id: makeId('bifrost-state', idFactory),
    temporal_coordinate: prior.temporal_coordinate + delta,
    amplitudes: normalised,
    probabilities,
    normalisation: receipt.normalisation_after,
    entropy: shannonEntropy(probabilities),
    history: [...prior.history, {
      state_id: prior.state_id,
      temporal_coordinate: prior.temporal_coordinate,
      probabilities: clone(prior.probabilities),
      entropy: prior.entropy,
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
    const focusWeight = axis === focus ? 1 + (compressionGain * (PREMAQ_AXES.length - 1)) : 1 - compressionGain;
    compressedWeights[axis] = Math.max(EPSILON, priorProbabilities[axis] * focusWeight);
  }
  const compressedTotal = PREMAQ_AXES.reduce((sum, axis) => sum + compressedWeights[axis], 0);
  const compressedProbabilities = Object.fromEntries(
    PREMAQ_AXES.map((axis) => [axis, compressedWeights[axis] / compressedTotal]),
  );

  const releasedWeights = {};
  for (const axis of PREMAQ_AXES) {
    const derivativeFlow = Math.max(0, prior.derivatives?.[axis] ?? 0) * derivativeRelease;
    releasedWeights[axis] = Math.max(
      EPSILON,
      ((1 - release) * compressedProbabilities[axis])
        + (release * priorProbabilities[axis])
        + derivativeFlow,
    );
  }
  const releasedTotal = PREMAQ_AXES.reduce((sum, axis) => sum + releasedWeights[axis], 0);
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
  const entropy = shannonEntropy(releasedProbabilities);
  const entropyChange = entropy - prior.entropy;
  const cycle = (prior.spiral?.cycle ?? 0) + 1;
  const radius = (prior.spiral?.radius ?? 1) + (radialGain * outwardDistance) + (Math.abs(entropyChange) * 0.1);
  const angle = ((prior.spiral?.angle ?? 0) + angularGain + (outwardDistance * Math.PI)) % TAU;

  const receipt = {
    schema: BIFROST_RECEIPT_SCHEMA,
    receipt_id: makeId('bifrost-compression-release', idFactory),
    action: 'compression-release',
    created_at: clock().toISOString(),
    from_state_id: prior.state_id,
    focus,
    compression_gain: compressionGain,
    release,
    derivative_release: derivativeRelease,
    compressed_probabilities: compressedProbabilities,
    release_probabilities: releasedProbabilities,
    outward_distance: outwardDistance,
    entropy_change: entropyChange,
    cycle,
  };

  return {
    ...prior,
    state_id: makeId('bifrost-state', idFactory),
    amplitudes,
    probabilities: releasedProbabilities,
    normalisation: PREMAQ_AXES.reduce((sum, axis) => sum + releasedProbabilities[axis], 0),
    entropy,
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
      entropy: prior.entropy,
    }].slice(-128),
    receipts: [...prior.receipts, receipt].slice(-256),
  };
}

export { compressRelease as collapseRelease };

function bhattacharyyaFidelity(left, right) {
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
  clock = () => new Date(),
  idFactory,
} = {}) {
  const packet = validatePremaqPacket(premaq);
  const hearth = validateTemporalState(hearthside);
  const target = validateTemporalState(targetside);
  const selectedWorld = requireString(worldId, 'worldId');
  const canonVersion = requireString(canonGraphVersion, 'canonGraphVersion');
  const transferVersion = requireString(transferFunctionVersion, 'transferFunctionVersion');
  const realityAnchor = requireString(anchors?.hearthside, 'anchors.hearthside');
  const worldAnchor = requireString(anchors?.targetside, 'anchors.targetside');

  const fidelity = bhattacharyyaFidelity(hearth.probabilities, target.probabilities);
  const phaseDelta = Math.atan2(
    Math.sin((target.spiral?.angle ?? 0) - (hearth.spiral?.angle ?? 0)),
    Math.cos((target.spiral?.angle ?? 0) - (hearth.spiral?.angle ?? 0)),
  );
  const temporalSeparation = target.temporal_coordinate - hearth.temporal_coordinate;

  return {
    schema: BIFROST_BRIDGE_PACKET_SCHEMA,
    bridge_packet_id: makeId('bifrost-bridge', idFactory),
    created_at: clock().toISOString(),
    world_id: selectedWorld,
    canon_graph_version: canonVersion,
    transfer_function_version: transferVersion,
    timeline,
    premaq_ref: {
      id: packet.id,
      receipt_id: packet.receipt_id,
      sequence: packet.sequence,
      registry_version: packet.registry_version,
    },
    hearthside: {
      anchor: realityAnchor,
      state_id: hearth.state_id,
      temporal_coordinate: hearth.temporal_coordinate,
      probabilities: clone(hearth.probabilities),
      authority: 'evidence-grounded-observational',
    },
    targetside: {
      anchor: worldAnchor,
      state_id: target.state_id,
      temporal_coordinate: target.temporal_coordinate,
      probabilities: clone(target.probabilities),
      authority: 'canon-grounded-projected',
    },
    bridge_metrics: {
      state_fidelity: fidelity,
      temporal_separation: temporalSeparation,
      temporal_twist: phaseDelta,
      anchor_integrity: Boolean(realityAnchor && worldAnchor),
      crossing_ready: fidelity >= 0.5 && Boolean(realityAnchor && worldAnchor),
    },
    laws: [
      'Hearthside evidence is never overwritten by targetside projection.',
      'Targetside projection remains canon-labelled and receipt-traceable.',
      'A crossing changes bridge history, not the provenance of either shore.',
      'Collapse must be followed by release before a new outward cycle is counted.',
    ],
  };
}

export function projectWorldState(bridgePacketInput, {
  matrix,
  bias = {},
  labels = {},
} = {}) {
  if (!bridgePacketInput || bridgePacketInput.schema !== BIFROST_BRIDGE_PACKET_SCHEMA) {
    throw new BifrostTemporalError('Unsupported bridge packet schema', 'invalid-bridge-packet');
  }
  if (!matrix || typeof matrix !== 'object') {
    throw new BifrostTemporalError('A calibrated transfer matrix is required', 'missing-transfer-matrix');
  }

  const input = bridgePacketInput.targetside.probabilities;
  const projection = {};
  for (const [outputKey, row] of Object.entries(matrix)) {
    if (!row || typeof row !== 'object') {
      throw new BifrostTemporalError(`Transfer row ${outputKey} must be an object`, 'invalid-transfer-matrix');
    }
    let value = requireFinite(bias[outputKey] ?? 0, `bias ${outputKey}`);
    for (const axis of PREMAQ_AXES) {
      const coefficient = requireFinite(row[axis] ?? 0, `matrix ${outputKey}.${axis}`);
      value += coefficient * input[axis];
    }
    projection[outputKey] = {
      value,
      label: labels[outputKey] ?? outputKey,
      source_class: 'projected',
    };
  }

  return {
    schema: 'arcsweep.world-state-projection/v0.1',
    bridge_packet_id: bridgePacketInput.bridge_packet_id,
    world_id: bridgePacketInput.world_id,
    canon_graph_version: bridgePacketInput.canon_graph_version,
    transfer_function_version: bridgePacketInput.transfer_function_version,
    projection,
    uncertainty: 'inherits PREMAQ component uncertainty and transfer calibration uncertainty',
    provenance: {
      premaq_ref: clone(bridgePacketInput.premaq_ref),
      hearthside_state_id: bridgePacketInput.hearthside.state_id,
      targetside_state_id: bridgePacketInput.targetside.state_id,
    },
  };
}
