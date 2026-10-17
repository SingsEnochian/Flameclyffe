import { createFieldState } from './wonder-field.js';

export const RESONANCE_ROOM_STATE_SCHEMA = 'arcsweep.resonance-room-state/v0.1';
export const RESONANCE_ROOM_FIELD_SCHEMA = 'arcsweep.resonance-room-field/v0.1';
export const RESONANCE_ROOM_RECEIPT_SCHEMA = 'arcsweep.resonance-room-receipt/v0.1';
export const RESONANCE_ROOM_STORAGE_KEY = 'arcsweep.resonance-room-state/v0.1';
export const RESONANCE_ROOM_RECEIPTS_KEY = 'arcsweep.resonance-room-receipts/v0.1';

export const DEFAULT_RESONANCE_ROOM_STATE = Object.freeze({
  schema: RESONANCE_ROOM_STATE_SCHEMA,
  frequency_hz: 174,
  amplitude: 0.58,
  phase_radians: 0,
  damping: 0.16,
  coupling: 0.48,
  mode_order: 3,
  source_x: 0,
  source_y: 0.12,
});

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clamp(value, low, high, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(low, Math.min(high, number));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 4) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function normaliseResonanceRoomState(input = {}) {
  const seed = { ...DEFAULT_RESONANCE_ROOM_STATE, ...(input || {}) };
  return Object.freeze({
    schema: RESONANCE_ROOM_STATE_SCHEMA,
    frequency_hz: round(clamp(seed.frequency_hz, 55, 880, DEFAULT_RESONANCE_ROOM_STATE.frequency_hz), 2),
    amplitude: round(clamp(seed.amplitude, 0.05, 1, DEFAULT_RESONANCE_ROOM_STATE.amplitude)),
    phase_radians: round(clamp(seed.phase_radians, -Math.PI, Math.PI, DEFAULT_RESONANCE_ROOM_STATE.phase_radians)),
    damping: round(clamp(seed.damping, 0, 0.85, DEFAULT_RESONANCE_ROOM_STATE.damping)),
    coupling: round(clamp(seed.coupling, 0, 1, DEFAULT_RESONANCE_ROOM_STATE.coupling)),
    mode_order: Math.round(clamp(seed.mode_order, 1, 9, DEFAULT_RESONANCE_ROOM_STATE.mode_order)),
    source_x: round(clamp(seed.source_x, -1, 1, DEFAULT_RESONANCE_ROOM_STATE.source_x)),
    source_y: round(clamp(seed.source_y, -0.7, 0.7, DEFAULT_RESONANCE_ROOM_STATE.source_y)),
  });
}

function standingWaveAt(x, state) {
  const phase = (state.mode_order * Math.PI * (x + 1)) / 2 + state.phase_radians;
  const edgeDamping = 1 - state.damping * Math.abs(x);
  const sourceBias = 1 + state.coupling * 0.18 * (1 - Math.min(1, Math.abs(x - state.source_x)));
  return state.amplitude * edgeDamping * sourceBias * Math.sin(phase);
}

export function deriveResonanceRoomField(input = {}, { samples = 96 } = {}) {
  const state = normaliseResonanceRoomState(input);
  const count = Math.max(24, Math.min(240, Math.round(finite(samples, 96))));
  const wave = Object.freeze(Array.from({ length: count }, (_, index) => {
    const x = -1 + (2 * index) / (count - 1);
    return Object.freeze({
      x: round(x),
      y: round(standingWaveAt(x, state)),
      phase: round((state.mode_order * Math.PI * (x + 1)) / 2 + state.phase_radians),
    });
  }));

  const nodes = Object.freeze(Array.from({ length: state.mode_order + 1 }, (_, index) => {
    const x = -1 + (2 * index) / state.mode_order;
    return Object.freeze({ index, x: round(x), kind: 'node' });
  }));
  const antinodes = Object.freeze(Array.from({ length: state.mode_order }, (_, index) => {
    const x = -1 + (2 * index + 1) / state.mode_order;
    return Object.freeze({
      index,
      x: round(x),
      magnitude: round(Math.abs(standingWaveAt(x, state))),
      kind: 'antinode',
    });
  }));

  const frequencyNorm = (state.frequency_hz - 55) / (880 - 55);
  const glass = Object.freeze({
    thickness: round(0.42 + state.amplitude * 1.38 + state.coupling * 0.28),
    ior: round(1.22 + state.coupling * 0.42),
    roughness: round(0.06 + state.damping * 0.34),
    transmission: round(0.72 + state.coupling * 0.26),
    dispersion: round(0.02 + state.coupling * 0.1),
    glow: round(0.18 + state.amplitude * 0.72),
  });

  const somatic = Object.freeze({
    frequency_scale: round(0.9 + frequencyNorm * 0.2),
    duration_scale: round(0.82 + state.damping * 0.42),
    haptic_scale: round(0.72 + state.amplitude * 0.62),
  });

  const generalField = createFieldState({
    medium: 'resonance-chamber',
    dimensions: ['x', 'y', 'z', 'time', 'phase'],
    constraints: [
      'bounded chamber',
      'standing-wave model is simulated, not a measurement of the physical room',
      'somatic output remains opt-in',
    ],
    attractors: antinodes.map((item) => 'antinode:' + item.index + '@' + item.x),
    boundaries: ['x=-1', 'x=+1'],
    couplings: [
      'source↔medium',
      'medium↔glass embodiment',
      'field↔somatic transducer',
      'pointer↔source locus',
    ],
    availableTransformations: [
      'retune frequency',
      'change mode order',
      'shift phase',
      'change damping',
      'change coupling',
      'move source locus',
    ],
    localState: state,
  });

  return Object.freeze({
    schema: RESONANCE_ROOM_FIELD_SCHEMA,
    state,
    field: generalField,
    wave,
    nodes,
    antinodes,
    glass,
    somatic,
    peak_amplitude: round(Math.max(...wave.map((sample) => Math.abs(sample.y)))),
    rule: 'one field state drives geometry, glass embodiment, and optional somatic transduction',
  });
}

export function patchResonanceRoomState(state, patch = {}) {
  return normaliseResonanceRoomState({ ...normaliseResonanceRoomState(state), ...(patch || {}) });
}

export function createResonanceRoomReceipt({
  kind = 'field-tune',
  before = null,
  after,
  source = 'human-ui',
  note = null,
  createdAt = new Date().toISOString(),
} = {}) {
  const next = deriveResonanceRoomField(after || DEFAULT_RESONANCE_ROOM_STATE);
  const prior = before ? normaliseResonanceRoomState(before) : null;
  return Object.freeze({
    schema: RESONANCE_ROOM_RECEIPT_SCHEMA,
    receipt_id: 'resonance:' + kind + ':' + createdAt,
    kind: String(kind || 'field-tune'),
    source: String(source || 'human-ui'),
    created_at: createdAt,
    before: prior,
    after: next.state,
    derived: Object.freeze({
      node_count: next.nodes.length,
      antinode_count: next.antinodes.length,
      peak_amplitude: next.peak_amplitude,
      glass: next.glass,
      somatic: next.somatic,
    }),
    note: note == null ? null : String(note).slice(0, 800),
  });
}
