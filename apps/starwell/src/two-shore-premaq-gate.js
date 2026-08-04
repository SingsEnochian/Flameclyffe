import {
  PREMAQ_AXES,
  premaqToTemporalState,
  validateTemporalState,
} from './arcsweep-temporal-quantum/engine.js';
import { compressRelease } from './arcsweep-temporal-quantum/compression-release.js';
import {
  ELARA_EXPANSION_HORIZON,
  WORLD_PROFILES,
  elaraCodeExpansionMultiplier,
  getWorldProfile,
} from './world-premaq-registry.js';

export const EARTH_PRIME_SHORE_ID = 'earth-prime';
export const TWO_SHORE_GATE_SCHEMA = 'hearthgate.two-shore-premaq-gate/v0.1';
export const TWO_SHORE_GATE_PLAN_KEY = 'hearthgate:two-shore-gate-plan:v0.1';
export const TWO_SHORE_GATE_LIVE_KEY = 'hearthgate:two-shore-live-calibration:v0.1';
export const DEEP_SESSION_KEY = 'starwell.deepObserver.v0.1.packet';
export const GROUNDWIRE_SESSION_KEY = 'starwell.groundwire.v0.1.sessionSnapshot';

export const GATE_BASE_CYCLES = 369;
export const GATE_EXTENSION_CYCLES = Object.freeze([3, 6, 9]);
export const GATE_SOLO_FOCUS_SEQUENCE = Object.freeze([...PREMAQ_AXES]);
export const GATE_ADDRESS_FOCUS_SEQUENCE = Object.freeze(['P', 'R', 'E', 'M', 'A', 'Q', 'C']);
export const GATE_LOCKED_TONE_AXES = Object.freeze(['P', 'R', 'E', 'M', 'A', 'Q']);
export const GATE_COHERENCE_AXIS = 'C';
export const GATE_PLAYBACK_MIN_HZ = 90;
export const GATE_PLAYBACK_MAX_HZ = 360;

const AXIS_INTERVALS = Object.freeze({
  P: 0,
  C: 2,
  R: 4,
  E: 5,
  M: 7,
  A: 9,
  Q: 11,
});

const EARTH_REFERENCE = Object.freeze({
  P: 0.55,
  C: 0.50,
  R: 0.45,
  E: 0.38,
  M: 0.30,
  A: 0.65,
  Q: 0.20,
});

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function finite(value, fallback = 0) {
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : fallback;
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function safeJson(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function storageOrNull(storage) {
  if (storage) return storage;
  if (typeof globalThis.sessionStorage !== 'undefined') return globalThis.sessionStorage;
  return null;
}

function deepValue(deepPacket, axis) {
  if (axis === 'Q') {
    return finite(deepPacket?.Q ?? deepPacket?.charge, EARTH_REFERENCE.Q);
  }
  return finite(deepPacket?.[axis], EARTH_REFERENCE[axis]);
}

function browserFamily(userAgent = '') {
  const value = String(userAgent);
  if (/CriOS|Chrome\//i.test(value)) return 'Chromium-family';
  if (/FxiOS|Firefox\//i.test(value)) return 'Firefox-family';
  if (/Safari\//i.test(value)) return 'Safari-family';
  return value ? 'other-browser-family' : 'UNKNOWN';
}

function observed(value) {
  return value != null && value !== '' && value !== 'unsupported';
}

export function readLiveTwoShoreInputs(storage) {
  const selectedStorage = storageOrNull(storage);
  const deepPacket = safeJson(selectedStorage?.getItem(DEEP_SESSION_KEY));
  const groundwireSnapshot = safeJson(selectedStorage?.getItem(GROUNDWIRE_SESSION_KEY));
  return Object.freeze({
    deep_packet: deepPacket,
    groundwire_snapshot: groundwireSnapshot,
    deep_present: Boolean(deepPacket),
    groundwire_present: Boolean(groundwireSnapshot),
    live_ready: Boolean(deepPacket && groundwireSnapshot),
  });
}

export function calibrateEarthPrimePremaq({ deepPacket, groundwireSnapshot } = {}) {
  const hardware = groundwireSnapshot?.hardware ?? {};
  const network = groundwireSnapshot?.network ?? {};
  const microphone = groundwireSnapshot?.microphone ?? {};
  const location = groundwireSnapshot?.location ?? {};
  const battery = groundwireSnapshot?.battery ?? {};

  const sources = {
    deep: Boolean(deepPacket),
    hardware: hardware.status === 'observed',
    network: network.status === 'observed',
    microphone: microphone.status === 'active',
    location: location.status === 'verified',
    battery: battery.status === 'observed',
  };
  const coverage = Object.values(sources).filter(Boolean).length / Object.keys(sources).length;
  const touch = clamp(finite(hardware.maxTouchPoints, 0) / 10);
  const cpu = clamp(finite(hardware.hardwareConcurrency, 0) / 16);
  const memory = clamp(finite(hardware.deviceMemoryGb, 0) / 8);
  const downlink = clamp(finite(network.downlinkMbps, 0) / 50);
  const latencyQuality = observed(network.rttMs)
    ? clamp(1 - (finite(network.rttMs, 600) / 600))
    : 0;
  const microphoneEnergy = sources.microphone
    ? clamp(finite(microphone.rms, 0) * 24)
    : 0;
  const permissionCount = Number(sources.microphone) + Number(sources.location);

  const values = Object.freeze({
    P: round(clamp(deepValue(deepPacket, 'P') + (0.025 * touch) + (0.02 * coverage))),
    C: round(clamp(deepValue(deepPacket, 'C') + (0.025 * downlink) + (0.02 * latencyQuality) + (0.015 * cpu))),
    R: round(clamp(deepValue(deepPacket, 'R') + (0.04 * microphoneEnergy))),
    E: round(clamp(deepValue(deepPacket, 'E') + (0.08 * (1 - coverage)))),
    M: round(clamp(deepValue(deepPacket, 'M') + (0.02 * memory) + (0.015 * Number(Boolean(deepPacket))))),
    A: round(clamp(deepValue(deepPacket, 'A') + (0.025 * permissionCount) + (0.015 * touch))),
    Q: round(clamp(deepValue(deepPacket, 'Q') + (0.02 * microphoneEnergy))),
  });

  const unknowns = [];
  if (!sources.deep) unknowns.push('DEEP_PACKET');
  if (!sources.hardware) unknowns.push('GROUNDWIRE_HARDWARE');
  if (!sources.network) unknowns.push('GROUNDWIRE_NETWORK');
  if (!sources.microphone) unknowns.push('GROUNDWIRE_MICROPHONE');
  if (!sources.location) unknowns.push('GROUNDWIRE_LOCATION');
  if (!sources.battery) unknowns.push('GROUNDWIRE_BATTERY');

  const calibration = Object.freeze({
    schema: 'hearthgate.earth-prime-premaq-calibration/v0.1',
    shore_id: EARTH_PRIME_SHORE_ID,
    status: sources.deep && sources.hardware ? (unknowns.length ? 'PARTIAL' : 'LIVE') : 'DEGRADED',
    physical_claim: false,
    observed_at: new Date().toISOString(),
    values,
    coverage: round(coverage, 4),
    unknowns: Object.freeze(unknowns),
    browser: Object.freeze({
      family: browserFamily(hardware.userAgent),
      platform: hardware.platform ?? 'UNKNOWN',
      language: hardware.language ?? 'UNKNOWN',
      timezone: hardware.timezone ?? 'UNKNOWN',
      touch_points: hardware.maxTouchPoints ?? 'UNKNOWN',
      screen: hardware.screen ?? 'UNKNOWN',
    }),
    groundwire: Object.freeze({
      hardware_status: hardware.status ?? 'UNKNOWN',
      network_status: network.status ?? 'UNKNOWN',
      microphone_status: microphone.status ?? 'UNKNOWN',
      location_status: location.status ?? 'UNKNOWN',
      battery_status: battery.status ?? 'UNKNOWN',
    }),
    formula: Object.freeze({
      P: 'DEEP.P + 0.025·touch + 0.020·coverage',
      C: 'DEEP.C + 0.025·downlink + 0.020·latency_quality + 0.015·cpu',
      R: 'DEEP.R + 0.040·microphone_energy',
      E: 'DEEP.E + 0.080·(1-coverage)',
      M: 'DEEP.M + 0.020·device_memory + 0.015·DEEP_present',
      A: 'DEEP.A + 0.025·granted_permissions + 0.015·touch',
      Q: 'DEEP.Q_or_charge + 0.020·microphone_energy',
    }),
    source_boundary: 'Groundwire fields are browser/device reports. Unsupported or ungranted fields remain UNKNOWN.',
  });

  return calibration;
}

export function targetWorldCalibration(profileInput) {
  const profile = getWorldProfile(profileInput?.slug ?? profileInput);
  return Object.freeze({
    schema: 'hearthgate.target-world-premaq-origin/v0.1',
    shore_id: profile.slug,
    world_slug: profile.world_slug,
    name: profile.name,
    root_hz: profile.root_hz,
    profile_version: profile.profile_version,
    profile_status: profile.status,
    values: profile.premaq,
    source_repository: profile.source_repository,
    source_ref: profile.source_ref,
    source_commit: profile.source_commit,
    source_path: profile.source_path,
    physical_claim: false,
  });
}

function makePremaqPacket({ id, values, observedAt, confidence, provenance }) {
  return {
    schema_version: '2.0.0',
    id,
    observed_at: observedAt,
    registry_version: 'two-shore-gate-registry/0.1',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: clamp(values[axis]),
      derivative: 0,
      uncertainty: round(1 - confidence, 4),
      confidence,
      contributors: provenance ? [provenance] : [],
    }])),
    receipt_id: `${id}-origin-receipt`,
    sequence: 0,
    prior_state_ref: null,
    model_version: 'two-shore-premaq-gate/0.1',
    provenance_refs: provenance ? [provenance] : [],
    generated_at: observedAt,
    degraded: confidence < 0.75,
  };
}

export function buildShoreState(calibration, { clock = () => new Date(), idFactory } = {}) {
  const observedAt = calibration.observed_at ?? clock().toISOString();
  const confidence = calibration.status === 'LIVE'
    ? 0.92
    : calibration.status === 'PARTIAL'
      ? 0.78
      : calibration.profile_status === 'calibration'
        ? 0.82
        : calibration.profile_status === 'seed'
          ? 0.72
          : 0.68;
  const packet = makePremaqPacket({
    id: `premaq-origin-${calibration.shore_id}`,
    values: calibration.values,
    observedAt,
    confidence,
    provenance: calibration.source_path ?? calibration.schema,
  });
  const state = premaqToTemporalState(packet, { clock, idFactory });
  state.interpretation = {
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    shore_id: calibration.shore_id,
    note: 'A calibrated computational origin. It does not establish an external-world bridge.',
  };
  return state;
}

export function foldGatePlaybackFrequency(frequency) {
  let folded = Number(frequency);
  if (!Number.isFinite(folded) || folded <= 0) return null;
  while (folded < GATE_PLAYBACK_MIN_HZ) folded *= 2;
  while (folded > GATE_PLAYBACK_MAX_HZ) folded /= 2;
  return folded;
}

export function earthPrimeRootHz(values) {
  const coordinate = clamp((finite(values?.P) + finite(values?.R) + finite(values?.M)) / 3);
  return 90 * (2 ** (2 * coordinate));
}

function lockedAxisTone(rootHz, axis) {
  return foldGatePlaybackFrequency(rootHz * (2 ** (AXIS_INTERVALS[axis] / 12)));
}

export function buildGateAddressTones({ earthValues, targetProfile, year }) {
  const target = getWorldProfile(targetProfile?.slug ?? targetProfile);
  const multiplier = elaraCodeExpansionMultiplier(year);
  const earthRoot = earthPrimeRootHz(earthValues);
  const bridgeCoherence = Math.sqrt(clamp(earthValues.C) * clamp(target.premaq.C));
  const inverseTwistExponent = 0.02 + (0.08 * (1 - bridgeCoherence));

  const tones = Object.fromEntries(GATE_LOCKED_TONE_AXES.map((axis) => {
    const earthLocked = lockedAxisTone(earthRoot, axis);
    const targetLocked = lockedAxisTone(target.root_hz, axis);
    const earthTwist = earthLocked * Math.exp(inverseTwistExponent);
    const targetTwist = targetLocked * Math.exp(-inverseTwistExponent);
    return [axis, Object.freeze({
      axis,
      earth_prime_locked_hz: round(earthLocked),
      target_world_locked_hz: round(targetLocked),
      earth_prime_inverse_twist_hz: round(earthTwist),
      target_world_inverse_twist_hz: round(targetTwist),
      inverse_twist_product: round(earthTwist * targetTwist),
      locked_product: round(earthLocked * targetLocked),
      invariant_error: round(Math.abs((earthTwist * targetTwist) - (earthLocked * targetLocked)), 12),
      earth_prime_elara_code_hz: round(earthLocked * multiplier),
      target_world_elara_code_hz: round(targetLocked * multiplier),
      audible_pitch_expanded_by_year: false,
    })];
  }));

  return Object.freeze({
    schema: 'hearthgate.two-shore-gate-address-tones/v0.1',
    year,
    elara_multiplier: multiplier,
    earth_prime_root_hz: round(earthRoot),
    target_world_root_hz: target.root_hz,
    bridge_coherence: round(bridgeCoherence),
    coherence_axis: GATE_COHERENCE_AXIS,
    locked_axes: GATE_LOCKED_TONE_AXES,
    inverse_twist_exponent: round(inverseTwistExponent),
    tones: Object.freeze(tones),
    law: 'locked carriers + reciprocal inverse-twist sidebands; year multiplier labels the hidden Elara code layer',
  });
}

function requireLineage(prior, released) {
  const receipt = released.receipts.at(-1);
  if (receipt?.from_state_id !== prior.state_id || receipt?.to_state_id !== released.state_id) {
    throw new Error('TWO_SHORE_GATE_LINEAGE_MISMATCH');
  }
  return receipt;
}

function advanceOne(state, focus, options) {
  const prior = validateTemporalState(state);
  const released = compressRelease(prior, {
    focus,
    compressionStrength: clamp(options.compressionStrength ?? 0.65),
    compressionGain: clamp(options.compressionGain ?? 1.2, 0, 2),
    releaseFraction: clamp(options.releaseFraction ?? 0.35),
    derivativeRelease: 0.08,
    memoryRelease: 0,
    phaseReleaseGain: Math.PI / 4,
    radialGain: 0.5,
    entropyGain: 0.1,
    angularGain: Math.PI / 3,
    clock: options.clock,
    idFactory: options.idFactory,
  });
  return { released, receipt: requireLineage(prior, released) };
}

function runSoloSequence(state, options) {
  let current = validateTemporalState(state);
  const receipts = [];
  for (const focus of GATE_SOLO_FOCUS_SEQUENCE) {
    const result = advanceOne(current, focus, options);
    current = result.released;
    receipts.push(result.receipt);
  }
  return Object.freeze({
    cycles: GATE_SOLO_FOCUS_SEQUENCE.length,
    source_state_id: state.state_id,
    final_state: current,
    final_state_id: current.state_id,
    receipts: Object.freeze(receipts),
  });
}

function runPairedSegment(earthState, targetState, cycleCount, options, segmentId) {
  let earth = validateTemporalState(earthState);
  let target = validateTemporalState(targetState);
  const cycleReceipts = [];
  for (let index = 0; index < cycleCount; index += 1) {
    const focus = GATE_ADDRESS_FOCUS_SEQUENCE[index % GATE_ADDRESS_FOCUS_SEQUENCE.length];
    const earthPrior = earth;
    const targetPrior = target;
    const earthResult = advanceOne(earth, focus, options);
    const targetResult = advanceOne(target, focus, options);
    earth = earthResult.released;
    target = targetResult.released;
    cycleReceipts.push(Object.freeze({
      cycle: index + 1,
      focus,
      earth_from_state_id: earthPrior.state_id,
      earth_to_state_id: earth.state_id,
      target_from_state_id: targetPrior.state_id,
      target_to_state_id: target.state_id,
      earth_receipt_id: earthResult.receipt.receipt_id,
      target_receipt_id: targetResult.receipt.receipt_id,
      next_operation: 'compression-of-release',
    }));
  }
  return Object.freeze({
    segment_id: segmentId,
    cycles: cycleCount,
    source_earth_state_id: earthState.state_id,
    source_target_state_id: targetState.state_id,
    final_earth_state: earth,
    final_target_state: target,
    final_earth_state_id: earth.state_id,
    final_target_state_id: target.state_id,
    cycle_receipts: Object.freeze(cycleReceipts),
  });
}

function checkpoint(segment, label) {
  return Object.freeze({
    schema: 'hearthgate.two-shore-checkpoint/v0.1',
    label,
    saved_at: new Date().toISOString(),
    earth_state: segment.final_earth_state,
    target_state: segment.final_target_state,
    earth_state_id: segment.final_earth_state_id,
    target_state_id: segment.final_target_state_id,
    next_operation: 'compression-of-release',
  });
}

export function buildYearGatePlan({
  earthCalibration,
  targetProfile,
  year,
  sourceEarthState,
  sourceTargetState,
  clock = () => new Date(),
  idFactory,
  compressionStrength = 0.65,
  compressionGain = 1.2,
  releaseFraction = 0.35,
} = {}) {
  const target = getWorldProfile(targetProfile?.slug ?? targetProfile);
  const targetCalibration = targetWorldCalibration(target);
  const options = { clock, idFactory, compressionStrength, compressionGain, releaseFraction };
  const earthOrigin = sourceEarthState ?? buildShoreState(earthCalibration, { clock, idFactory });
  const targetOrigin = sourceTargetState ?? buildShoreState(targetCalibration, { clock, idFactory });
  const earthSolo = runSoloSequence(earthOrigin, options);
  const targetSolo = runSoloSequence(targetOrigin, options);

  const base = runPairedSegment(
    earthSolo.final_state,
    targetSolo.final_state,
    GATE_BASE_CYCLES,
    options,
    `${year}-base-369`,
  );
  const baseCheckpoint = checkpoint(base, `${year} · 369`);
  const plus3 = runPairedSegment(base.final_earth_state, base.final_target_state, 3, options, `${year}-plus-3`);
  const plus3Checkpoint = checkpoint(plus3, `${year} · 369+3`);
  const plus6 = runPairedSegment(plus3.final_earth_state, plus3.final_target_state, 6, options, `${year}-plus-6`);
  const plus6Checkpoint = checkpoint(plus6, `${year} · 369+3+6`);
  const plus9 = runPairedSegment(plus6.final_earth_state, plus6.final_target_state, 9, options, `${year}-plus-9`);
  const plus9Checkpoint = checkpoint(plus9, `${year} · 369+3+6+9`);
  const addressTones = buildGateAddressTones({
    earthValues: earthCalibration.values,
    targetProfile: target,
    year,
  });

  return Object.freeze({
    schema: 'hearthgate.two-shore-year-plan/v0.1',
    year,
    elara_multiplier: elaraCodeExpansionMultiplier(year),
    earth_prime: Object.freeze({
      calibration: earthCalibration,
      solo: earthSolo,
    }),
    target_world: Object.freeze({
      calibration: targetCalibration,
      solo: targetSolo,
    }),
    address_tones: addressTones,
    segments: Object.freeze({ base, plus3, plus6, plus9 }),
    checkpoints: Object.freeze([baseCheckpoint, plus3Checkpoint, plus6Checkpoint, plus9Checkpoint]),
    total_cycles_per_shore: GATE_SOLO_FOCUS_SEQUENCE.length + GATE_BASE_CYCLES + 3 + 6 + 9,
    final_earth_state: plus9.final_earth_state,
    final_target_state: plus9.final_target_state,
    final_earth_state_id: plus9.final_earth_state_id,
    final_target_state_id: plus9.final_target_state_id,
    next_operation: 'compression-of-release',
  });
}

function playbackLayer(yearPlan, shore, axis) {
  const tone = yearPlan.address_tones.tones[axis];
  const isEarth = shore === 'earth-prime';
  return Object.freeze({
    layer_id: `${yearPlan.year}-${shore}-${axis}`,
    label: `${yearPlan.year} · ${shore === 'earth-prime' ? 'Earth Prime' : yearPlan.target_world.calibration.name} · ${axis}`,
    year: yearPlan.year,
    shore,
    world_slug: isEarth ? EARTH_PRIME_SHORE_ID : yearPlan.target_world.calibration.world_slug,
    axis,
    locked_hz: isEarth ? tone.earth_prime_locked_hz : tone.target_world_locked_hz,
    inverse_twist_hz: isEarth ? tone.earth_prime_inverse_twist_hz : tone.target_world_inverse_twist_hz,
    elara_code_hz: isEarth ? tone.earth_prime_elara_code_hz : tone.target_world_elara_code_hz,
    elara_multiplier: yearPlan.elara_multiplier,
    audible_pitch_expanded_by_year: false,
  });
}

export function buildGatePlaybackManifest(yearPlans) {
  const layers = [];
  for (const yearPlan of yearPlans) {
    for (const axis of GATE_LOCKED_TONE_AXES) {
      layers.push(playbackLayer(yearPlan, 'earth-prime', axis));
      layers.push(playbackLayer(yearPlan, 'target-world', axis));
    }
  }
  return Object.freeze({
    schema: 'hearthgate.two-shore-playback-manifest/v0.1',
    created_at: new Date().toISOString(),
    year_span: Object.freeze({ start: 2025, end: 2035, labels: yearPlans.length }),
    target_world_slug: yearPlans[0]?.target_world?.calibration?.world_slug ?? null,
    layer_count: layers.length,
    layers: Object.freeze(layers),
    destinations: Object.freeze({
      flameclyffe: 'labeled browser-audio layers by year, shore, and PREMAQ axis',
      wardenclyffe: 'consent-first imported layer registry; playback requires a user gesture',
    }),
    physical_claim: false,
  });
}

export function buildFullHorizonGatePlan({
  earthCalibration,
  targetProfile,
  clock = () => new Date(),
  idFactory,
  compressionStrength = 0.65,
  compressionGain = 1.2,
  releaseFraction = 0.35,
} = {}) {
  if (!earthCalibration?.values) throw new Error('EARTH_PRIME_CALIBRATION_REQUIRED');
  const target = getWorldProfile(targetProfile?.slug ?? targetProfile);
  const years = [];
  let earthState = null;
  let targetState = null;

  for (const entry of ELARA_EXPANSION_HORIZON) {
    const yearPlan = buildYearGatePlan({
      earthCalibration,
      targetProfile: target,
      year: entry.year,
      sourceEarthState: earthState,
      sourceTargetState: targetState,
      clock,
      idFactory,
      compressionStrength,
      compressionGain,
      releaseFraction,
    });
    years.push(yearPlan);
    earthState = yearPlan.final_earth_state;
    targetState = yearPlan.final_target_state;
  }

  const playback = buildGatePlaybackManifest(years);
  return Object.freeze({
    schema: TWO_SHORE_GATE_SCHEMA,
    created_at: clock().toISOString(),
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    address: Object.freeze({
      earth_prime_shore: EARTH_PRIME_SHORE_ID,
      target_world_shore: target.slug,
      locked_tone_axes: GATE_LOCKED_TONE_AXES,
      bridge_coherence_axis: GATE_COHERENCE_AXIS,
    }),
    year_span: Object.freeze({
      start: ELARA_EXPANSION_HORIZON[0].year,
      end: ELARA_EXPANSION_HORIZON.at(-1).year,
      labels: ELARA_EXPANSION_HORIZON.length,
      interval_years: ELARA_EXPANSION_HORIZON.at(-1).year - ELARA_EXPANSION_HORIZON[0].year,
    }),
    run_contract: Object.freeze({
      solo_focus_cycles_per_shore_per_year: GATE_SOLO_FOCUS_SEQUENCE.length,
      base_cycles_per_shore_per_year: GATE_BASE_CYCLES,
      extension_cycles: GATE_EXTENSION_CYCLES,
      total_cycles_per_shore_per_year: GATE_SOLO_FOCUS_SEQUENCE.length + GATE_BASE_CYCLES + 18,
      release_feeds_next_compression: true,
      year_feeds_next_year: true,
    }),
    years: Object.freeze(years),
    playback_manifest: playback,
    final_earth_state_id: earthState.state_id,
    final_target_state_id: targetState.state_id,
    next_operation: 'compression-of-release',
  });
}

export function saveGatePlan(plan, storage) {
  const selectedStorage = storageOrNull(storage);
  if (!selectedStorage) throw new Error('GATE_PLAN_STORAGE_UNAVAILABLE');
  selectedStorage.setItem(TWO_SHORE_GATE_PLAN_KEY, JSON.stringify(plan));
  return Object.freeze({
    saved: true,
    key: TWO_SHORE_GATE_PLAN_KEY,
    target_world_slug: plan?.address?.target_world_shore ?? null,
    years: plan?.year_span?.labels ?? null,
    final_earth_state_id: plan?.final_earth_state_id ?? null,
    final_target_state_id: plan?.final_target_state_id ?? null,
  });
}

export function listSelectableGateWorlds() {
  return WORLD_PROFILES.map((profileEntry) => Object.freeze({
    slug: profileEntry.slug,
    name: profileEntry.name,
    world_slug: profileEntry.world_slug,
    root_hz: profileEntry.root_hz,
    profile_status: profileEntry.status,
    premaq: profileEntry.premaq,
  }));
}
