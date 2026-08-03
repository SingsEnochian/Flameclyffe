import {
  BIFROST_RECEIPT_SCHEMA,
  BifrostTemporalError,
  PREMAQ_AXES,
  evolveTemporalState,
  validateTemporalState,
} from './engine.js';
import {
  analyseWorldJacobian,
  classifyFrequency,
  updateFoldLatch,
} from '../world-tone-fold-approval.js';

const EPSILON = 1e-12;
const MAX_COMPRESSION_GAIN = 8;
const MAX_EXPONENT = 700;

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

function requireUnitInterval(value, field) {
  requireFinite(value, field);
  if (value < 0 || value > 1) {
    throw new BifrostTemporalError(`${field} must lie within 0..1`, 'invalid-unit-interval');
  }
  return value;
}

function makeId(prefix, idFactory) {
  if (typeof idFactory === 'function') return `${prefix}-${idFactory()}`;
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normaliseDistribution(weights, field) {
  const total = PREMAQ_AXES.reduce((sum, axis) => sum + weights[axis], 0);
  if (!Number.isFinite(total) || total <= EPSILON) {
    throw new BifrostTemporalError(`${field} has no positive mass`, 'empty-distribution');
  }
  return Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, weights[axis] / total]));
}

function probabilityVector(amplitudes) {
  return Object.fromEntries(PREMAQ_AXES.map((axis) => [
    axis,
    (amplitudes[axis].re ** 2) + (amplitudes[axis].im ** 2),
  ]));
}

function shannonEntropy(probabilities) {
  return PREMAQ_AXES.reduce((sum, axis) => {
    const probability = probabilities[axis];
    return probability > EPSILON ? sum - probability * Math.log(probability) : sum;
  }, 0);
}

function l1Distance(left, right) {
  return PREMAQ_AXES.reduce((sum, axis) => sum + Math.abs(left[axis] - right[axis]), 0);
}

function derivativeRms(derivatives = {}) {
  const squared = PREMAQ_AXES.reduce((sum, axis) => {
    const value = requireFinite(derivatives[axis] ?? 0, `derivative ${axis}`);
    return sum + value ** 2;
  }, 0);
  return Math.sqrt(squared / PREMAQ_AXES.length);
}

function compressionPotential(compressed, prior) {
  return PREMAQ_AXES.reduce((sum, axis) => {
    const q = compressed[axis];
    const p = prior[axis];
    if (q <= EPSILON) return sum;
    if (p <= EPSILON) {
      throw new BifrostTemporalError(
        `Compression created support outside the prior state at ${axis}`,
        'compression-support-violation',
      );
    }
    return sum + q * Math.log(q / p);
  }, 0);
}

function normalisedWeights(input = {}) {
  const defaults = {
    fold: 0.55,
    derivative: 0.20,
    entropy: 0.15,
    phase: 0.10,
  };
  const weights = Object.fromEntries(Object.keys(defaults).map((key) => {
    const value = input[key] ?? defaults[key];
    requireFinite(value, `temporal weight ${key}`);
    if (value < 0) {
      throw new BifrostTemporalError(`temporal weight ${key} must be nonnegative`, 'invalid-temporal-weight');
    }
    return [key, value];
  }));
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= EPSILON) {
    throw new BifrostTemporalError('Temporal compression weights must contain positive mass', 'empty-temporal-weights');
  }
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / total]));
}

export function temporalCompressionDriver(stateInput, {
  foldIndex,
  foldActive,
  enterThreshold,
  weights = {},
} = {}) {
  const state = validateTemporalState(stateInput);
  requireUnitInterval(foldIndex, 'foldIndex');
  requireUnitInterval(enterThreshold, 'enterThreshold');
  const calibrated = normalisedWeights(weights);
  const foldDepth = enterThreshold < 1
    ? clamp((foldIndex - enterThreshold) / (1 - enterThreshold))
    : Number(foldIndex >= 1);
  const derivative = clamp(derivativeRms(state.derivatives));
  const entropy = clamp(state.entropy / Math.log(PREMAQ_AXES.length));
  const phase = clamp((1 - Math.cos(state.spiral?.angle ?? 0)) / 2);
  const raw = (
    calibrated.fold * foldDepth
    + calibrated.derivative * derivative
    + calibrated.entropy * entropy
    + calibrated.phase * phase
  );
  const strength = foldActive ? clamp(raw) : 0;
  return Object.freeze({
    schema: 'bifrost.temporal-compression-driver/v1',
    fold_active: Boolean(foldActive),
    fold_index: foldIndex,
    fold_depth: foldDepth,
    derivative_rms: derivative,
    normalised_entropy: entropy,
    phase_pressure: phase,
    weights: Object.freeze(calibrated),
    compression_strength: strength,
  });
}

export function compressRelease(stateInput, {
  focus = 'Q',
  compressionStrength = 0.65,
  compressionGain = 1,
  releaseFraction = 0.35,
  derivativeRelease = 0.08,
  memoryRelease = 0,
  memoryFlow = {},
  phaseReleaseGain = Math.PI / 4,
  radialGain = 0.5,
  entropyGain = 0.1,
  angularGain = Math.PI / 3,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const prior = validateTemporalState(stateInput);
  if (!PREMAQ_AXES.includes(focus)) {
    throw new BifrostTemporalError(`Unknown compression focus: ${focus}`, 'invalid-compression-focus');
  }
  requireUnitInterval(compressionStrength, 'compressionStrength');
  requireFinite(compressionGain, 'compressionGain');
  requireUnitInterval(releaseFraction, 'releaseFraction');
  requireFinite(derivativeRelease, 'derivativeRelease');
  requireFinite(memoryRelease, 'memoryRelease');
  requireFinite(phaseReleaseGain, 'phaseReleaseGain');
  requireFinite(radialGain, 'radialGain');
  requireFinite(entropyGain, 'entropyGain');
  requireFinite(angularGain, 'angularGain');
  if (compressionGain < 0 || compressionGain > MAX_COMPRESSION_GAIN) {
    throw new BifrostTemporalError(
      `compressionGain must lie within 0..${MAX_COMPRESSION_GAIN}`,
      'invalid-compression-gain',
    );
  }
  if (derivativeRelease < 0 || memoryRelease < 0 || radialGain < 0 || entropyGain < 0) {
    throw new BifrostTemporalError('Release and spiral gains must be nonnegative', 'invalid-release-gain');
  }

  const priorProbabilities = probabilityVector(prior.amplitudes);
  const compressedWeights = {};
  const exponentScale = compressionStrength * compressionGain;
  for (const axis of PREMAQ_AXES) {
    const concentration = axis === focus ? PREMAQ_AXES.length - 1 : -1;
    const exponent = exponentScale * concentration;
    if (Math.abs(exponent) > MAX_EXPONENT) {
      throw new BifrostTemporalError('Compression exponent exceeds the finite execution range', 'compression-overflow');
    }
    compressedWeights[axis] = priorProbabilities[axis] * Math.exp(exponent);
  }
  const compressedProbabilities = normaliseDistribution(compressedWeights, 'compressed distribution');

  const releasedWeights = {};
  for (const axis of PREMAQ_AXES) {
    const derivativeFlow = Math.max(0, prior.derivatives?.[axis] ?? 0) * derivativeRelease;
    const rememberedFlow = Math.max(0, memoryFlow?.[axis] ?? 0) * memoryRelease;
    releasedWeights[axis] = (
      (1 - releaseFraction) * compressedProbabilities[axis]
      + releaseFraction * priorProbabilities[axis]
      + derivativeFlow
      + rememberedFlow
    );
  }
  const releasedProbabilities = normaliseDistribution(releasedWeights, 'released distribution');

  const amplitudes = {};
  for (const axis of PREMAQ_AXES) {
    const old = prior.amplitudes[axis];
    const priorPhase = Math.atan2(old.im, old.re);
    const phaseAdvance = phaseReleaseGain * (compressedProbabilities[axis] - priorProbabilities[axis]);
    const phase = priorPhase + phaseAdvance;
    const radius = Math.sqrt(releasedProbabilities[axis]);
    amplitudes[axis] = {
      re: radius * Math.cos(phase),
      im: radius * Math.sin(phase),
    };
  }

  const outwardDistance = l1Distance(priorProbabilities, releasedProbabilities);
  const compressedDistance = l1Distance(priorProbabilities, compressedProbabilities);
  const entropy = shannonEntropy(releasedProbabilities);
  const entropyChange = entropy - prior.entropy;
  const potential = compressionPotential(compressedProbabilities, priorProbabilities);
  const cycle = (prior.spiral?.cycle ?? 0) + 1;
  const radius = (
    (prior.spiral?.radius ?? 1)
    + radialGain * outwardDistance
    + entropyGain * Math.abs(entropyChange)
  );
  const angle = (
    (prior.spiral?.angle ?? 0)
    + angularGain
    + outwardDistance * Math.PI
  ) % (Math.PI * 2);
  const nextStateId = makeId('bifrost-state', idFactory);

  const receipt = Object.freeze({
    schema: BIFROST_RECEIPT_SCHEMA,
    receipt_id: makeId('bifrost-compression-release', idFactory),
    action: 'compression-release',
    created_at: clock().toISOString(),
    from_state_id: prior.state_id,
    to_state_id: nextStateId,
    focus,
    compression_strength: compressionStrength,
    compression_gain: compressionGain,
    release_fraction: releaseFraction,
    derivative_release: derivativeRelease,
    memory_release: memoryRelease,
    compression_probabilities: clone(compressedProbabilities),
    release_probabilities: clone(releasedProbabilities),
    compression_distance: compressedDistance,
    outward_distance: outwardDistance,
    compression_potential: potential,
    entropy_change: entropyChange,
    cycle,
    next_operation: 'compression-of-release',
  });

  return {
    ...prior,
    state_id: nextStateId,
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
    compression_release: {
      law: 'compression-release-compression-of-release-infinite-recursion',
      source_state_id: prior.state_id,
      released_state_id: nextStateId,
      focus,
      compression_strength: compressionStrength,
      compression_potential: potential,
      compressed_probabilities: compressedProbabilities,
      released_probabilities: releasedProbabilities,
      next_operation: 'compression-of-release',
    },
    history: [...prior.history, {
      state_id: prior.state_id,
      temporal_coordinate: prior.temporal_coordinate,
      probabilities: priorProbabilities,
      entropy: prior.entropy,
      transition: 'source-of-compression',
    }].slice(-128),
    receipts: [...prior.receipts, receipt].slice(-256),
  };
}

export function mapCompressionReleaseFrequencies(rootHz, strength, excursion) {
  requireFinite(rootHz, 'rootHz');
  requireUnitInterval(strength, 'strength');
  requireFinite(excursion, 'excursion');
  if (rootHz <= 0 || excursion < 0) {
    throw new BifrostTemporalError('rootHz must be positive and excursion nonnegative', 'invalid-tone-calibration');
  }
  const exponent = excursion * strength;
  if (exponent > MAX_EXPONENT) {
    throw new BifrostTemporalError('Tone excursion exceeds the finite execution range', 'tone-overflow');
  }
  const compressionHz = rootHz * Math.exp(exponent);
  const releaseHz = rootHz * Math.exp(-exponent);
  return Object.freeze({
    schema: 'bifrost.world-compression-release-tone-pair/v1',
    root_hz: rootHz,
    compression_strength: strength,
    excursion,
    compression_hz: compressionHz,
    compression_class: classifyFrequency(compressionHz),
    release_hz: releaseHz,
    release_class: classifyFrequency(releaseHz),
    reciprocal_product: compressionHz * releaseHz,
  });
}

export function buildWorldCompressionToneSequence(toneProfile, strength, cycle) {
  if (!toneProfile || typeof toneProfile !== 'object') {
    throw new BifrostTemporalError('A world tone profile is required', 'missing-world-tone-profile');
  }
  const pair = mapCompressionReleaseFrequencies(
    toneProfile.rootHz,
    strength,
    toneProfile.excursion,
  );
  const approved = toneProfile.approvalState === 'approved' && Boolean(toneProfile.approvalReceiptId);
  return Object.freeze({
    schema: 'bifrost.world-compression-release-tone-sequence/v1',
    world_id: toneProfile.worldId,
    tone_layer_id: toneProfile.toneLayerId,
    cycle,
    approval_state: toneProfile.approvalState,
    approval_receipt_id: toneProfile.approvalReceiptId ?? null,
    render_authority: approved ? 'approved' : 'pending-human-calibration',
    source_pair: pair,
    sequence: Object.freeze([
      Object.freeze({ role: 'world-root', frequency_hz: toneProfile.rootHz }),
      Object.freeze({ role: 'compression', frequency_hz: pair.compression_hz, frequency_class: pair.compression_class }),
      Object.freeze({ role: 'release', frequency_hz: pair.release_hz, frequency_class: pair.release_class }),
      Object.freeze({ role: 'next-compression', source: 'released-state', cycle: cycle + 1 }),
    ]),
  });
}

export function advanceWorldCompressionRelease({
  state,
  jacobian,
  worldProfile,
  foldWasActive = false,
  evolution = {},
  clock = () => new Date(),
  idFactory,
} = {}) {
  if (!worldProfile || typeof worldProfile !== 'object') {
    throw new BifrostTemporalError('A world compression profile is required', 'missing-world-profile');
  }
  const evolved = evolveTemporalState(state, { ...evolution, clock, idFactory });
  const audit = analyseWorldJacobian(jacobian);
  const enter = worldProfile.enterThreshold;
  const release = worldProfile.releaseThreshold;
  const foldActive = updateFoldLatch(audit.fold_index, foldWasActive, { enter, release });
  const driver = temporalCompressionDriver(evolved, {
    foldIndex: audit.fold_index,
    foldActive,
    enterThreshold: enter,
    weights: worldProfile.temporalWeights,
  });
  const released = compressRelease(evolved, {
    focus: worldProfile.focusAxis,
    compressionStrength: driver.compression_strength,
    compressionGain: worldProfile.compressionGain,
    releaseFraction: worldProfile.releaseFraction,
    derivativeRelease: worldProfile.derivativeRelease,
    memoryRelease: worldProfile.memoryRelease,
    phaseReleaseGain: worldProfile.phaseReleaseGain,
    radialGain: worldProfile.radialGain,
    entropyGain: worldProfile.entropyGain,
    angularGain: worldProfile.angularGain,
    clock,
    idFactory,
  });
  const toneSequence = buildWorldCompressionToneSequence(
    worldProfile.tone,
    driver.compression_strength,
    released.spiral.cycle,
  );
  return Object.freeze({
    schema: 'bifrost.world-compression-release-transition/v1',
    world_id: worldProfile.worldId,
    prior_state_id: state.state_id,
    evolved_state_id: evolved.state_id,
    released_state_id: released.state_id,
    jacobian: audit,
    fold: Object.freeze({
      was_active: Boolean(foldWasActive),
      active: foldActive,
      enter_threshold: enter,
      release_threshold: release,
    }),
    temporal_driver: driver,
    tone_sequence: toneSequence,
    state: released,
    receipt: released.receipts.at(-1),
  });
}
