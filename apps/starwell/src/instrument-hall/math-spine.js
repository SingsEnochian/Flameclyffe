export const INSTRUMENT_MATH_SCHEMA = 'hearthgate.instrument-math-state/v1';
export const OBSERVATION_DATUM_SCHEMA = 'hearthgate.observation-datum/v1';

export const EPISTEMIC_MODES = Object.freeze({
  OBSERVED: 'OBSERVED',
  DERIVED: 'DERIVED',
  CALIBRATED: 'CALIBRATED',
  SYNTHETIC: 'SYNTHETIC',
});

const ACTIVE_MODES = new Set([
  EPISTEMIC_MODES.OBSERVED,
  EPISTEMIC_MODES.DERIVED,
  EPISTEMIC_MODES.CALIBRATED,
]);

export const COMPRESS_DEFINITION = Object.freeze({
  name: 'compress',
  meaning: 'maximum-poised-tension',
  destructive: false,
  information_loss: false,
  both_shores_remain_lit: true,
  release_ready: true,
});

const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('HEARTHGATE_NUMERIC_VALUE_REQUIRED');
  return Math.min(max, Math.max(min, number));
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

function isIsoDate(value) {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function normaliseSource(source = {}, fallback = {}) {
  const merged = { ...fallback, ...source };
  const mode = String(merged.mode || '').toUpperCase();
  if (!Object.values(EPISTEMIC_MODES).includes(mode)) {
    throw new Error('HEARTHGATE_EPISTEMIC_MODE_REQUIRED');
  }
  if (!merged.source_id) throw new Error('HEARTHGATE_SOURCE_ID_REQUIRED');
  if (!isIsoDate(merged.observed_at)) throw new Error('HEARTHGATE_OBSERVED_AT_REQUIRED');
  const confidence = clamp(merged.confidence, 0, 1);
  return Object.freeze({
    mode,
    source_id: String(merged.source_id),
    observed_at: new Date(merged.observed_at).toISOString(),
    confidence,
    receipt_id: merged.receipt_id ? String(merged.receipt_id) : null,
    derivation: merged.derivation ? String(merged.derivation) : null,
  });
}

export function observationDatum(input, {
  label = 'value',
  min = -Infinity,
  max = Infinity,
  source = {},
} = {}) {
  if (!input || typeof input !== 'object' || !Object.hasOwn(input, 'value')) {
    throw new Error(`HEARTHGATE_UNSOURCED_VALUE:${label}`);
  }
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`HEARTHGATE_VALUE_OUT_OF_RANGE:${label}`);
  }
  const provenance = normaliseSource(input.provenance || input, source);
  return Object.freeze({
    schema: OBSERVATION_DATUM_SCHEMA,
    label,
    value,
    provenance,
  });
}

export function isActiveDatum(datum) {
  return Boolean(datum && ACTIVE_MODES.has(datum.provenance?.mode));
}

export function normalisePremaq(input = {}, source = {}) {
  const payload = input.state && typeof input.state === 'object' ? input.state : input;
  const fallback = {
    ...source,
    source_id: source.source_id || input.receipt_id || input.id,
    observed_at: source.observed_at || input.observed_at,
    confidence: source.confidence ?? input.confidence,
    receipt_id: source.receipt_id || input.receipt_id,
  };

  const axes = {};
  for (const axis of AXES) {
    const raw = payload?.[axis];
    if (raw == null) throw new Error(`HEARTHGATE_PREMAQ_AXIS_REQUIRED:${axis}`);
    const datumInput = raw && typeof raw === 'object' && Object.hasOwn(raw, 'value')
      ? raw
      : { value: raw };
    axes[axis] = observationDatum(datumInput, {
      label: `PREMAQ.${axis}`,
      min: 0,
      max: 1,
      source: fallback,
    });
  }

  const active = AXES.every((axis) => isActiveDatum(axes[axis]));
  return Object.freeze({
    axes: Object.freeze(axes),
    active,
    complete: true,
  });
}

function normaliseCalibration(calibration = {}) {
  const source = calibration.provenance || {};
  const tensionLimit = calibration.tension_limit
    ? observationDatum(calibration.tension_limit, {
      label: 'tension_limit', min: 0, max: 1, source,
    })
    : null;
  return Object.freeze({
    tension_limit: tensionLimit,
    active: Boolean(tensionLimit && isActiveDatum(tensionLimit)),
  });
}

function numericAxes(premaqState) {
  return Object.freeze(Object.fromEntries(
    AXES.map((axis) => [axis, premaqState.axes[axis].value]),
  ));
}

export function createInstrumentState({
  premaq,
  observation,
  calibration,
  houseId = 'terra-aeterna',
  tension = 0,
  radius = 0,
  cycle = 0,
  history = [],
} = {}) {
  const premaqState = normalisePremaq(premaq, observation);
  const calibrationState = normaliseCalibration(calibration);
  const active = premaqState.active && calibrationState.active;
  const tensionLimit = calibrationState.tension_limit?.value ?? null;
  const initialTension = tensionLimit == null ? 0 : clamp(tension, 0, tensionLimit);

  return sealState({
    schema: INSTRUMENT_MATH_SCHEMA,
    house_id: String(houseId || 'unregistered-house'),
    phase: active ? 'gather' : 'scaffold',
    active,
    poised: false,
    tension: initialTension,
    tension_limit: tensionLimit,
    radius: Math.max(0, Number(radius) || 0),
    cycle: Math.max(0, Math.trunc(Number(cycle) || 0)),
    premaq: numericAxes(premaqState),
    observation: premaqState,
    calibration: calibrationState,
    shores: Object.freeze({ measured: true, felt: true }),
    history: Object.freeze([...history]),
  });
}

function sealState(state) {
  const basis = canonical({ ...state, basis_id: undefined });
  return Object.freeze({ ...state, basis_id: `imath-${fnv1a64(basis)}` });
}

function nextState(state, patch, event) {
  assertInstrumentState(state);
  return sealState({
    ...state,
    ...patch,
    premaq: state.premaq,
    observation: state.observation,
    calibration: state.calibration,
    shores: state.shores,
    history: Object.freeze([...state.history, Object.freeze(event)]),
  });
}

export function assertActiveInstrumentState(state) {
  assertInstrumentState(state);
  if (!state.active) throw new Error('HEARTHGATE_LIVE_OBSERVATION_REQUIRED');
  if (!Number.isFinite(state.tension_limit)) throw new Error('HEARTHGATE_CALIBRATED_TENSION_LIMIT_REQUIRED');
  return state;
}

export function applyTension(state, impulse) {
  assertActiveInstrumentState(state);
  const datum = observationDatum(impulse, {
    label: 'tension_impulse', min: 0, max: state.tension_limit,
  });
  if (!isActiveDatum(datum)) throw new Error('HEARTHGATE_SYNTHETIC_CANNOT_DRIVE_ACTIVE_STATE');
  const tension = Math.min(state.tension_limit, state.tension + datum.value);
  return nextState(state, {
    phase: tension >= state.tension_limit ? 'compress' : 'gather',
    poised: tension >= state.tension_limit,
    tension,
  }, {
    kind: 'tension-applied',
    datum,
    tension,
  });
}

export function compress(state, source = 'manual-compress') {
  assertActiveInstrumentState(state);
  return nextState(state, {
    phase: 'compress',
    poised: true,
    tension: state.tension_limit,
  }, {
    kind: 'compress',
    source,
    definition: COMPRESS_DEFINITION.meaning,
    tension: state.tension_limit,
    destructive: false,
    information_loss: false,
  });
}

export function release(state, {
  shape = 'open',
  source = 'manual-release',
  delta_radius: deltaRadiusInput,
  residual_tension: residualTensionInput,
} = {}) {
  assertActiveInstrumentState(state);
  const deltaRadius = observationDatum(deltaRadiusInput, {
    label: 'release.delta_radius', min: 0,
  });
  const residualTension = observationDatum(residualTensionInput, {
    label: 'release.residual_tension', min: 0, max: state.tension_limit,
  });
  if (!isActiveDatum(deltaRadius) || !isActiveDatum(residualTension)) {
    throw new Error('HEARTHGATE_SYNTHETIC_CANNOT_DRIVE_ACTIVE_STATE');
  }

  return nextState(state, {
    phase: 'release',
    poised: false,
    tension: residualTension.value,
    radius: Number((state.radius + deltaRadius.value).toFixed(6)),
    cycle: state.cycle + 1,
  }, {
    kind: 'release',
    source,
    shape,
    prior_basis_id: state.basis_id,
    delta_radius: deltaRadius,
    residual_tension: residualTension,
  });
}

export function standingWavePlan(state, calibration = {}) {
  assertActiveInstrumentState(state);
  const source = calibration.provenance || {};
  const frequencies = Object.freeze({
    anchor: observationDatum(calibration.anchor_hz, {
      label: 'tone.anchor_hz', min: 0, source,
    }),
    living: observationDatum(calibration.living_hz, {
      label: 'tone.living_hz', min: 0, source,
    }),
    bind: observationDatum(calibration.bind_hz, {
      label: 'tone.bind_hz', min: 0, source,
    }),
  });
  const pulse = observationDatum(calibration.pulse_hz, {
    label: 'tone.pulse_hz', min: 0, source,
  });
  const gainCeiling = observationDatum(calibration.gain_ceiling, {
    label: 'tone.gain_ceiling', min: 0, max: 1, source,
  });
  const all = [...Object.values(frequencies), pulse, gainCeiling];
  if (!all.every(isActiveDatum)) throw new Error('HEARTHGATE_SYNTHETIC_CANNOT_DRIVE_ACTIVE_STATE');

  return Object.freeze({
    schema: 'hearthgate.standing-wave-plan/v1',
    basis_id: state.basis_id,
    phase: state.phase,
    tension_ratio: state.tension_limit ? Number((state.tension / state.tension_limit).toFixed(6)) : 0,
    frequencies_hz: Object.freeze(Object.fromEntries(
      Object.entries(frequencies).map(([key, datum]) => [key, datum.value]),
    )),
    pulse_hz: pulse.value,
    gain_ceiling: gainCeiling.value,
    provenance: Object.freeze({ frequencies, pulse, gain_ceiling: gainCeiling }),
  });
}

export function supplantWithObservation(state, {
  premaq,
  observation,
  calibration,
} = {}) {
  assertInstrumentState(state);
  const next = createInstrumentState({
    premaq,
    observation,
    calibration,
    houseId: state.house_id,
    tension: 0,
    radius: state.radius,
    cycle: state.cycle,
    history: state.history,
  });
  return sealState({
    ...next,
    history: Object.freeze([
      ...next.history,
      Object.freeze({
        kind: 'scaffolding-supplanted',
        prior_basis_id: state.basis_id,
        next_basis_id: next.basis_id,
        observed_at: observation?.observed_at || null,
      }),
    ]),
  });
}

export function assertInstrumentState(state) {
  if (!state || state.schema !== INSTRUMENT_MATH_SCHEMA) throw new Error('HEARTHGATE_INSTRUMENT_STATE_REQUIRED');
  if (state.shores?.measured !== true || state.shores?.felt !== true) throw new Error('HEARTHGATE_BOTH_SHORES_REQUIRED');
  if (state.tension < 0) throw new Error('HEARTHGATE_TENSION_OUT_OF_BOUNDS');
  if (Number.isFinite(state.tension_limit) && state.tension > state.tension_limit) {
    throw new Error('HEARTHGATE_TENSION_OUT_OF_BOUNDS');
  }
  if (state.phase === 'compress' && !state.poised) throw new Error('HEARTHGATE_COMPRESS_MUST_BE_POISED');
  if (state.active && (!state.observation?.active || !state.calibration?.active)) {
    throw new Error('HEARTHGATE_ACTIVE_STATE_REQUIRES_LIVE_OR_DERIVED_DATA');
  }
  return state;
}
