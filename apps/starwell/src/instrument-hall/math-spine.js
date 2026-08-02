export const INSTRUMENT_MATH_SCHEMA = 'hearthgate.instrument-math-state/v1';
export const COLLAPSE_DEFINITION = Object.freeze({
  name: 'collapse',
  meaning: 'maximum-poised-tension',
  destructive: false,
  information_loss: false,
  both_shores_remain_lit: true,
  release_ready: true,
});

const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
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

export function normalisePremaq(input = {}) {
  const source = input.state && typeof input.state === 'object' ? input.state : input;
  const out = {};
  for (const axis of AXES) {
    const raw = source?.[axis];
    out[axis] = clamp(raw && typeof raw === 'object' ? raw.value : raw, 0, 1);
  }
  if (!Number.isFinite(Number(source?.Q ?? source?.Q?.value))) {
    out.Q = clamp((out.P + out.C + out.R + out.M + out.A + (1 - out.E)) / 6);
  }
  return Object.freeze(out);
}

export function createInstrumentState({
  premaq = {},
  houseId = 'terra-aeterna',
  tension = 0,
  radius = 0,
  cycle = 0,
  history = [],
} = {}) {
  const axes = normalisePremaq(premaq);
  const tensionLimit = clamp(0.38 + axes.C * 0.24 + axes.A * 0.18 + axes.Q * 0.2, 0.45, 1);
  const state = {
    schema: INSTRUMENT_MATH_SCHEMA,
    house_id: String(houseId || 'unregistered-house'),
    phase: 'gather',
    poised: false,
    tension: clamp(tension, 0, tensionLimit),
    tension_limit: tensionLimit,
    radius: Math.max(0, Number(radius) || 0),
    cycle: Math.max(0, Math.trunc(Number(cycle) || 0)),
    premaq: axes,
    shores: Object.freeze({ measured: true, felt: true }),
    history: Object.freeze([...history]),
  };
  return sealState(state);
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
    shores: state.shores,
    history: Object.freeze([...state.history, Object.freeze(event)]),
  });
}

export function applyTension(state, impulse = 0.08, source = 'manual') {
  const amount = Math.max(0, Number(impulse) || 0);
  const tension = Math.min(state.tension_limit, state.tension + amount);
  return nextState(state, {
    phase: tension >= state.tension_limit ? 'collapse' : 'gather',
    poised: tension >= state.tension_limit,
    tension,
  }, {
    kind: 'tension-applied', source, amount, tension,
  });
}

export function collapse(state, source = 'manual-collapse') {
  return nextState(state, {
    phase: 'collapse',
    poised: true,
    tension: state.tension_limit,
  }, {
    kind: 'collapse',
    source,
    definition: COLLAPSE_DEFINITION.meaning,
    tension: state.tension_limit,
    destructive: false,
  });
}

export function release(state, { shape = 'open', source = 'manual-release' } = {}) {
  assertInstrumentState(state);
  const energy = state.tension;
  const memoryCarry = clamp(0.025 + state.premaq.M * 0.075, 0, 0.12);
  const deltaRadius = 0.2 + energy * (0.45 + state.premaq.R * 0.35 + state.premaq.Q * 0.2);
  return nextState(state, {
    phase: 'release',
    poised: false,
    tension: Math.min(state.tension_limit, energy * memoryCarry),
    radius: Number((state.radius + deltaRadius).toFixed(6)),
    cycle: state.cycle + 1,
  }, {
    kind: 'release', source, shape,
    energy: Number(energy.toFixed(6)),
    delta_radius: Number(deltaRadius.toFixed(6)),
    prior_basis_id: state.basis_id,
  });
}

export function standingWavePlan(state, { baseFrequency = 144 } = {}) {
  assertInstrumentState(state);
  const p = state.premaq;
  const tensionRatio = state.tension_limit ? state.tension / state.tension_limit : 0;
  const anchor = baseFrequency * (0.82 + p.P * 0.24);
  const living = anchor * (1.2 + p.R * 0.18);
  const bind = Math.sqrt(anchor * living) * (1 + p.C * 0.08);
  const pulse = 2.5 + p.M * 4.5 + tensionRatio * 2;
  return Object.freeze({
    schema: 'hearthgate.standing-wave-plan/v1',
    basis_id: state.basis_id,
    phase: state.phase,
    tension_ratio: Number(tensionRatio.toFixed(6)),
    frequencies_hz: Object.freeze({
      anchor: Number(anchor.toFixed(3)),
      living: Number(living.toFixed(3)),
      bind: Number(bind.toFixed(3)),
    }),
    pulse_hz: Number(pulse.toFixed(3)),
    gain_ceiling: 0.08,
  });
}

export function assertInstrumentState(state) {
  if (!state || state.schema !== INSTRUMENT_MATH_SCHEMA) throw new Error('HEARTHGATE_INSTRUMENT_STATE_REQUIRED');
  if (state.shores?.measured !== true || state.shores?.felt !== true) throw new Error('HEARTHGATE_BOTH_SHORES_REQUIRED');
  if (state.tension < 0 || state.tension > state.tension_limit) throw new Error('HEARTHGATE_TENSION_OUT_OF_BOUNDS');
  if (state.phase === 'collapse' && !state.poised) throw new Error('HEARTHGATE_COLLAPSE_MUST_BE_POISED');
  return state;
}
