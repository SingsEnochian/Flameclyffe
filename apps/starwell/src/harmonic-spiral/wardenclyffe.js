export const WARDENCLYFFE_VERSION = '0.1.0';
export const WARDENCLYFFE_SCHEMA = 'hearthgate/wardenclyffe-layer/v1';
export const SPIRAL_STATE_SCHEMA = 'hearthgate/spiral-state/v1';

// 3·6·9 temporal grammar — GROUND/CALL · WEAVE/RESPONSE · CROSS/RELEASE
export const OSCILLATOR_GRAMMAR = Object.freeze({
  3: Object.freeze({ beat: 3, name: 'GROUND', role: 'call' }),
  6: Object.freeze({ beat: 6, name: 'WEAVE',  role: 'response' }),
  9: Object.freeze({ beat: 9, name: 'CROSS',  role: 'release' }),
});

// Which oscillator is primary in each phase
const PHASE_PRIMARY = Object.freeze({
  compression: 3,   // GROUND/CALL — hold the field, establish presence
  transition:  6,   // WEAVE/RESPONSE — listen and cross
  release:     9,   // CROSS/RELEASE — complete, let through
});

// Direction → rate modifier on oscillator period
const DIRECTION_RATE = Object.freeze({
  ascending: 1.12,   // widening, slight acceleration
  gathering: 0.88,   // deepening, slight deceleration
  stable:    1.00,   // steady state
  pivoting:  0.95,   // approaching crossing
});

export class WardenclyffError extends Error {
  constructor(message, code = 'wardenclyff-error') {
    super(message);
    this.name = 'WardenclyffError';
    this.code = code;
  }
}

function clamp(v, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

function deriveLayerGains(phase, direction, confidence) {
  const primary = PHASE_PRIMARY[phase] ?? 3;
  const others = [3, 6, 9].filter((b) => b !== primary);

  // Primary oscillator leads; secondary and tertiary carry presence at lower weight
  const gains = {
    [primary]:   clamp(0.58 * confidence + 0.18),
    [others[0]]: clamp(0.26 * confidence + 0.09),
    [others[1]]: clamp(0.14 * confidence + 0.04),
  };

  // Pivoting direction builds toward crossing — boost the 9-count
  if (direction === 'pivoting' && primary !== 9) {
    gains[9] = clamp(gains[9] + 0.16);
  }

  return gains;
}

// Gain envelope during degraded mode — all layers minimal, 9-count silenced
const DEGRADED_GAINS = Object.freeze({ 3: 0.14, 6: 0.09, 9: 0.00 });

/**
 * computeWardenclyffeLayers
 *
 * Takes a sealed hearthgate/spiral-state/v1 packet and returns a
 * hearthgate/wardenclyffe-layer/v1 directive describing how the 3·6·9
 * temporal oscillators should be weighted for the current braid state.
 *
 * The directive is consumed by the audio engine and haptic layer.
 * It never reads DEEP datasets directly — it reads the Spiral State only.
 */
export function computeWardenclyffeLayers(harmonicState) {
  if (!harmonicState || typeof harmonicState !== 'object') {
    throw new WardenclyffError(
      'harmonicState must be a hearthgate/spiral-state/v1 packet.',
      'MISSING_STATE',
    );
  }
  if (harmonicState.schema !== SPIRAL_STATE_SCHEMA) {
    throw new WardenclyffError(
      `Expected schema ${SPIRAL_STATE_SCHEMA}, got ${harmonicState.schema}.`,
      'WRONG_SCHEMA',
    );
  }

  const { phase, direction, confidence, spiral_state_id, degraded } = harmonicState;
  const isDegraded = Boolean(degraded?.active);
  const rate = isDegraded ? 1.0 : (DIRECTION_RATE[direction] ?? 1.0);
  const gains = isDegraded ? DEGRADED_GAINS : deriveLayerGains(phase, direction, confidence);
  const primaryBeat = PHASE_PRIMARY[phase] ?? 3;

  const layers = Object.freeze(
    [3, 6, 9].map((beat) =>
      Object.freeze({
        beat,
        name:          OSCILLATOR_GRAMMAR[beat].name,
        role:          OSCILLATOR_GRAMMAR[beat].role,
        gain:          Math.round((gains[beat] ?? 0) * 10000) / 10000,
        rate_modifier: Math.round(rate * 10000) / 10000,
        is_primary:    beat === primaryBeat && !isDegraded,
      }),
    ),
  );

  return Object.freeze({
    schema:              WARDENCLYFFE_SCHEMA,
    wardenclyffe_id:     `ward-${spiral_state_id}`,
    spiral_state_id,
    phase,
    direction,
    confidence:          Math.round(confidence * 10000) / 10000,
    primary_oscillator:  isDegraded ? null : OSCILLATOR_GRAMMAR[primaryBeat].name,
    layers,
    degraded:            isDegraded,
    emitted_at:          new Date().toISOString(),
  });
}

/**
 * wardenclyffeSummary
 *
 * Returns a plain-language summary of the current 3·6·9 state for LLM context
 * or debug display. Safe to call on a degraded packet.
 */
export function wardenclyffeSummary(layerDirective) {
  if (!layerDirective || layerDirective.schema !== WARDENCLYFFE_SCHEMA) {
    throw new WardenclyffError(
      `Expected schema ${WARDENCLYFFE_SCHEMA}.`,
      'WRONG_SCHEMA',
    );
  }
  if (layerDirective.degraded) {
    return 'DEGRADED — 3·6·9 oscillators in minimal hold. CROSS layer silent.';
  }
  const primary = layerDirective.layers.find((l) => l.is_primary);
  const rate = primary?.rate_modifier ?? 1.0;
  const rateLabel = rate > 1.05 ? 'widening' : rate < 0.95 ? 'deepening' : 'steady';
  return `${primary?.name ?? '?'} (${primary?.role ?? '?'}) is primary · ${rateLabel} · confidence ${(layerDirective.confidence * 100).toFixed(0)}%`;
}
