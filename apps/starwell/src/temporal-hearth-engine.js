const AXES = ['P','C','R','E','M','A'];

export const TEMPORAL_ENGINE_VERSION = 'hearthgate-temporal-engine.v0.1';

export function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export function normalisePremaq(input = {}) {
  return Object.fromEntries(AXES.map((axis) => [axis, clamp01(input[axis])]));
}

export function createTemporalState({
  house = 'current-reality',
  continuity = 'observational',
  horizon = 'present',
  premaq = {},
  source = {},
  uncertainty = 0,
  observedAt = new Date().toISOString(),
} = {}) {
  return {
    schema: 'hearthgate.temporal-state.v1',
    engine_version: TEMPORAL_ENGINE_VERSION,
    house,
    continuity,
    horizon,
    premaq: normalisePremaq(premaq),
    uncertainty: clamp01(uncertainty),
    source: {
      classification: source.classification || continuity,
      receipt_id: source.receipt_id || null,
      provenance_url: source.provenance_url || null,
    },
    observed_at: observedAt,
  };
}

const TRANSFERS = {
  'current-reality': {
    version: 'current-reality.v1',
    apply: (v) => ({ ...v }),
  },
  'wheel-of-time-canon': {
    version: 'wheel-of-time-canon.v1',
    apply: (v) => ({
      pattern: clamp01((v.P + v.R + v.M) / 3),
      clarity: v.C,
      strain: v.E,
      luminosity: v.A,
    }),
  },
  'taaveren-vaen': {
    version: 'taaveren-vaen.v1',
    apply: (v) => ({
      mending: clamp01((v.P * .35) + (v.R * .35) + (v.M * .30)),
      witness: clamp01((v.C + v.A) / 2),
      turbulence: clamp01((v.E * .7) + ((1 - v.R) * .3)),
      pathing: clamp01((v.P + v.C + v.R) / 3),
    }),
  },
};

export function projectState(state, targetHouse) {
  const transfer = TRANSFERS[targetHouse];
  if (!transfer) throw new Error(`Unknown transfer target: ${targetHouse}`);
  const projected = transfer.apply(normalisePremaq(state.premaq));
  return {
    schema: 'hearthgate.world-projection.v1',
    engine_version: TEMPORAL_ENGINE_VERSION,
    source_state: state,
    target_house: targetHouse,
    transfer_version: transfer.version,
    classification: targetHouse === 'current-reality' ? 'observational' : 'canonical-projective',
    projected,
    created_at: new Date().toISOString(),
  };
}

export function deriveTonePlan(state, targetHouse = state.house) {
  const v = normalisePremaq(state.premaq);
  const root = 96 + (v.P * 30);
  const fifth = root * 1.5;
  const octave = root * 2;
  const pulse = 0.2 + (v.M * 0.5);
  const brightness = 600 + (v.A * 1800);
  return {
    schema: 'hearthgate.tone-plan.v1',
    engine_version: TEMPORAL_ENGINE_VERSION,
    target_house: targetHouse,
    premaq_receipt: state.source.receipt_id,
    frequencies_hz: [root, fifth, octave].map((n) => Number(n.toFixed(3))),
    pulse_hz: Number(pulse.toFixed(3)),
    filter_hz: Number(brightness.toFixed(1)),
    gain: Number((0.018 + (v.C * 0.018)).toFixed(4)),
    waveform: v.E > .65 ? 'triangle' : 'sine',
    classification: 'interpretive-audio-projection',
  };
}

export function createCrossingReceipt({ state, projection, tonePlan, glyphId = null, action = 'activate' }) {
  return {
    schema: 'hearthgate.crossing-receipt.v1',
    receipt_id: crypto.randomUUID(),
    engine_version: TEMPORAL_ENGINE_VERSION,
    action,
    glyph_id: glyphId,
    state,
    projection,
    tone_plan: tonePlan,
    created_at: new Date().toISOString(),
  };
}
