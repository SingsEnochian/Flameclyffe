export const SPIRAL_ENGINE_VERSION = '0.1.0';
export const SPIRAL_STATE_SCHEMA = 'hearthgate/spiral-state/v1';
export const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

const DEGRADED_THRESHOLD = 0.4;
const EPSILON = 1e-9;

export class SpiralEngineError extends Error {
  constructor(message, code = 'spiral-engine-error') {
    super(message);
    this.name = 'SpiralEngineError';
    this.code = code;
  }
}

function clamp(v, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

function axisValue(premaq, axis) {
  return premaq.state?.[axis]?.value ?? null;
}

function axisDerivative(premaq, axis) {
  return premaq.state?.[axis]?.derivative ?? 0;
}

function axisConfidence(premaq, axis) {
  return premaq.state?.[axis]?.confidence ?? null;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validatePremaq(premaq) {
  if (!premaq || typeof premaq !== 'object' || Array.isArray(premaq)) {
    throw new SpiralEngineError(
      'PREMAQ input is required and must be an object.',
      'missing-premaq'
    );
  }
  if (!premaq.state || typeof premaq.state !== 'object') {
    throw new SpiralEngineError(
      'PREMAQ must carry a state object with all seven axes.',
      'missing-premaq-state'
    );
  }
  const missing = PREMAQ_AXES.filter((axis) => !(axis in premaq.state));
  if (missing.length > 0) {
    throw new SpiralEngineError(
      `PREMAQ state is missing required axes: ${missing.join(', ')}.`,
      'incomplete-premaq'
    );
  }
}

function validateDeepRefs(deepRefs) {
  if (deepRefs === null || deepRefs === undefined) return;
  if (typeof deepRefs !== 'object' || Array.isArray(deepRefs)) {
    throw new SpiralEngineError(
      'deepRefs must be an object with story, time, and theory arrays.',
      'invalid-deep-refs'
    );
  }
  for (const dataset of ['story', 'time', 'theory']) {
    const refs = deepRefs[dataset];
    if (refs == null) continue;
    if (!Array.isArray(refs)) {
      throw new SpiralEngineError(
        `deepRefs.${dataset} must be an array of receipt ID strings, never a raw record.`,
        'invalid-deep-refs'
      );
    }
    for (const ref of refs) {
      if (typeof ref !== 'string' || ref.length === 0) {
        throw new SpiralEngineError(
          `deepRefs.${dataset} contains a non-string entry. ` +
          'Deep refs must be receipt IDs only — raw dataset records are never admitted into the Spiral Engine.',
          'raw-deep-data-rejected'
        );
      }
    }
  }
}

// ── Deterministic fingerprint ─────────────────────────────────────────────────

function stateFingerprint(premaq, deepRefs) {
  const stateDigest = Object.fromEntries(
    PREMAQ_AXES.map((axis) => [axis, Math.round((axisValue(premaq, axis) ?? 0) * 10000)])
  );
  const refsDigest = {
    s: [...(deepRefs?.story ?? [])].sort(),
    t: [...(deepRefs?.time ?? [])].sort(),
    th: [...(deepRefs?.theory ?? [])].sort(),
  };
  const str = JSON.stringify({ d: stateDigest, r: refsDigest });
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ── Stub synthesis ────────────────────────────────────────────────────────────

function deriveConfidence(premaq) {
  let known = 0;
  let totalConfidence = 0;
  for (const axis of PREMAQ_AXES) {
    const val = axisValue(premaq, axis);
    const conf = axisConfidence(premaq, axis);
    if (val !== null && Number.isFinite(val)) {
      known++;
      totalConfidence += conf !== null ? clamp(conf) : 0.5;
    }
  }
  if (known === 0) return 0;
  return clamp((known / PREMAQ_AXES.length) * (totalConfidence / known));
}

function derivePhase(premaq) {
  const derivNorm = Math.sqrt(
    PREMAQ_AXES.reduce((sum, axis) => sum + axisDerivative(premaq, axis) ** 2, 0) / PREMAQ_AXES.length
  );
  const coherence = clamp(axisValue(premaq, 'C') ?? 0.5);
  const entropy = clamp(axisValue(premaq, 'E') ?? 0.5);
  const signal = clamp(
    clamp(derivNorm * 5) * 0.4 +
    coherence * 0.35 +
    (1 - entropy) * 0.25
  );
  if (signal > 0.65) return 'compression';
  if (signal < 0.35) return 'release';
  return 'transition';
}

function deriveDirection(premaq, desiredState) {
  if (desiredState && typeof desiredState === 'object') {
    let ascending = 0;
    let gathering = 0;
    for (const axis of PREMAQ_AXES) {
      const current = axisValue(premaq, axis) ?? 0.5;
      const desired = typeof desiredState[axis] === 'number' ? desiredState[axis] : current;
      const delta = desired - current;
      if (delta > 0.05) ascending++;
      else if (delta < -0.05) gathering++;
    }
    if (ascending >= 5) return 'ascending';
    if (gathering >= 5) return 'gathering';
    if (Math.abs(axisDerivative(premaq, 'M')) > 0.1) return 'pivoting';
    return 'stable';
  }
  const avgDerivative =
    PREMAQ_AXES.reduce((sum, axis) => sum + axisDerivative(premaq, axis), 0) / PREMAQ_AXES.length;
  if (avgDerivative > 0.02) return 'ascending';
  if (avgDerivative < -0.02) return 'gathering';
  return 'stable';
}

function deriveSuggestedActions(premaq, desiredState, phase, direction) {
  const actions = [];
  const presence = clamp(axisValue(premaq, 'P') ?? 0.5);
  const entropy = clamp(axisValue(premaq, 'E') ?? 0.5);
  const qualia = axisValue(premaq, 'Q');

  if (phase === 'release' && direction === 'ascending') {
    actions.push({
      token: 'deepen_scene',
      weight: clamp(presence * 0.9 + 0.1),
      reason_code: 'release_ascending',
    });
  }
  if (phase === 'compression' && (direction === 'gathering' || direction === 'stable')) {
    actions.push({
      token: 'preserve_tension',
      weight: 0.82,
      reason_code: 'compression_gathering',
    });
  }
  if (entropy > 0.65) {
    actions.push({
      token: 'reduce_noise',
      weight: clamp(entropy),
      reason_code: 'high_entropy',
    });
  }
  if (qualia === null) {
    actions.push({
      token: 'allow_experiential_space',
      weight: 0.7,
      reason_code: 'qualia_unknown',
    });
  }
  if (phase === 'transition') {
    actions.push({
      token: 'observe_pivot',
      weight: 0.75,
      reason_code: 'transition_phase',
    });
  }
  if (actions.length === 0) {
    actions.push({
      token: 'maintain_presence',
      weight: clamp(presence),
      reason_code: 'stable_baseline',
    });
  }
  return actions;
}

function deriveSubsystemContexts(premaq, phase, direction, confidence) {
  const presence = clamp(axisValue(premaq, 'P') ?? 0.5);
  const entropy = clamp(axisValue(premaq, 'E') ?? 0.5);

  const breathNote = {
    compression: 'Hold narrative tension — restraint before expression.',
    release: 'Allow descriptive space before dialogue.',
    transition: 'Observe the pivot before moving.',
  }[phase];

  const audioDirective = {
    ascending: 'widen',
    gathering: 'narrow',
    stable: 'hold',
    pivoting: 'shift',
  }[direction];

  const glyphHint = {
    compression: 'seal_ring',
    release: 'open_path',
    transition: 'await_opening',
  }[phase];

  return {
    llm: {
      breath_note: breathNote,
      character_dynamics: null,
    },
    audio: {
      directive: audioDirective,
      intensity: clamp(presence * (1 - entropy * 0.3)),
    },
    glyph: {
      evolution_hint: glyphHint,
    },
    ui: {
      attention_level: clamp(presence * confidence),
      emphasis_tokens: [],
    },
    haptic: {
      pattern: null,
      intensity: null,
    },
    replay: {
      create_checkpoint: phase === 'transition',
      label: phase === 'transition' ? 'spiral-pivot' : null,
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeSpiralState({
  premaq,
  deepRefs = {},
  desiredState = null,
  worldProfile = null,
  sharedState = null,
} = {}) {
  validatePremaq(premaq);
  validateDeepRefs(deepRefs);

  const confidence = deriveConfidence(premaq);
  const phase = derivePhase(premaq);
  const direction = deriveDirection(premaq, desiredState);
  const suggestedActions = deriveSuggestedActions(premaq, desiredState, phase, direction);
  const subsystemContexts = deriveSubsystemContexts(premaq, phase, direction, confidence);
  const isDegraded = confidence < DEGRADED_THRESHOLD;

  return Object.freeze({
    schema: SPIRAL_STATE_SCHEMA,
    spiral_state_id: `spiral-${stateFingerprint(premaq, deepRefs)}`,
    generated_at: new Date().toISOString(),
    engine_version: SPIRAL_ENGINE_VERSION,
    phase,
    direction,
    confidence,
    suggested_actions: suggestedActions,
    subsystem_contexts: subsystemContexts,
    supporting_receipts: {
      story: [...(deepRefs?.story ?? [])],
      time: [...(deepRefs?.time ?? [])],
      theory: [...(deepRefs?.theory ?? [])],
    },
    source_integrity: {
      references_only: true,
      note: 'Deep refs are receipt IDs only. No raw dataset records enter the Spiral State.',
    },
    degraded: {
      active: isDegraded,
      reasons: isDegraded
        ? [`Confidence ${confidence.toFixed(3)} is below degraded threshold ${DEGRADED_THRESHOLD}.`]
        : [],
    },
  });
}

export function installSpiralState(packet, spiralState) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new SpiralEngineError(
      'DualAspectPacket must be an object.',
      'invalid-packet'
    );
  }
  if (!spiralState || spiralState.schema !== SPIRAL_STATE_SCHEMA) {
    throw new SpiralEngineError(
      `Spiral state must carry schema '${SPIRAL_STATE_SCHEMA}'.`,
      'invalid-spiral-state'
    );
  }
  return { ...packet, harmonic_state: spiralState };
}
