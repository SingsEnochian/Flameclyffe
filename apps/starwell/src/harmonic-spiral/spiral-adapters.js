export const ADAPTER_VERSION = '0.1.0';
export const SPIRAL_STATE_SCHEMA = 'hearthgate/spiral-state/v1';

const SCHEMAS = Object.freeze({
  llm: 'hearthgate/llm-brief/v1',
  audio: 'hearthgate/audio-directive/v1',
  glyph: 'hearthgate/glyph-directive/v1',
  ui: 'hearthgate/ui-directive/v1',
  haptic: 'hearthgate/haptic-directive/v1',
  replay: 'hearthgate/replay-directive/v1',
});

export class SpiralAdapterError extends Error {
  constructor(message, code = 'spiral-adapter-error') {
    super(message);
    this.name = 'SpiralAdapterError';
    this.code = code;
  }
}

function requireSpiralState(harmonicState) {
  if (!harmonicState || typeof harmonicState !== 'object') {
    throw new SpiralAdapterError('harmonic_state must be an object.', 'MISSING_SPIRAL_STATE');
  }
  if (harmonicState.schema !== SPIRAL_STATE_SCHEMA) {
    throw new SpiralAdapterError(
      `Expected schema ${SPIRAL_STATE_SCHEMA}, got ${harmonicState.schema}.`,
      'WRONG_SCHEMA',
    );
  }
  return harmonicState;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function contextSource(provided) {
  return provided ? 'provided' : 'derived';
}

// --- LLM ---

const BREATH_NOTE_BY_PHASE = Object.freeze({
  compression: 'Hold. Something is building.',
  release: 'Move. What was held is now available.',
  transition: 'Listen. The state is crossing.',
});

const DEGRADED_ACTIONS = Object.freeze([
  Object.freeze({ token: 'observe_pivot', weight: 1.0 }),
  Object.freeze({ token: 'maintain_presence', weight: 1.0 }),
]);

export function adaptForLLM(harmonicState) {
  const s = requireSpiralState(harmonicState);
  const degraded = Boolean(s.degraded?.active);
  const llm = s.subsystem_contexts?.llm;
  const contextAbsent = !llm;

  const breathNote = degraded
    ? 'DEGRADED — state is partial. Hold and observe.'
    : (llm?.breath_note ?? BREATH_NOTE_BY_PHASE[s.phase] ?? 'Observe.');

  const characterDynamics = degraded ? null : (llm?.character_dynamics ?? null);

  const epistemic = `Confidence ${s.confidence.toFixed(3)}. Direction: ${s.direction}.`;

  const suggestedActions = degraded
    ? [...DEGRADED_ACTIONS]
    : (s.suggested_actions ?? [])
        .filter((a) => a.weight >= 0.4)
        .sort((a, b) => b.weight - a.weight)
        .map((a) => Object.freeze({ token: a.token, weight: a.weight }));

  return Object.freeze({
    schema: SCHEMAS.llm,
    spiral_state_id: s.spiral_state_id,
    breath_note: breathNote,
    character_dynamics: characterDynamics,
    epistemic_note: epistemic,
    phase: s.phase,
    direction: s.direction,
    confidence: s.confidence,
    suggested_actions: Object.freeze(suggestedActions),
    degraded,
    context_source: contextAbsent ? 'derived' : contextSource(llm?.breath_note != null),
  });
}

// --- Audio ---

const DIRECTIVE_BY_PHASE = Object.freeze({
  compression: 'sustain',
  release: 'release',
  transition: 'hold',
});

export function adaptForAudio(harmonicState) {
  const s = requireSpiralState(harmonicState);
  const degraded = Boolean(s.degraded?.active);
  const audio = s.subsystem_contexts?.audio;
  const contextAbsent = !audio;

  const rawDirective = audio?.directive ?? DIRECTIVE_BY_PHASE[s.phase] ?? 'hold';
  const directive = degraded ? 'hold' : rawDirective;

  const rawIntensity = clamp(audio?.intensity ?? s.confidence);
  const intensity = degraded ? clamp(rawIntensity, 0, 0.3) : rawIntensity;

  return Object.freeze({
    schema: SCHEMAS.audio,
    spiral_state_id: s.spiral_state_id,
    directive,
    intensity,
    degraded,
    context_source: contextAbsent ? 'derived' : contextSource(audio?.directive != null),
  });
}

// --- Glyph ---

export function adaptForGlyph(harmonicState) {
  const s = requireSpiralState(harmonicState);
  const degraded = Boolean(s.degraded?.active);
  const glyph = s.subsystem_contexts?.glyph;

  const evolutionHint = degraded
    ? 'PAUSE'
    : (glyph?.evolution_hint ?? null);

  return Object.freeze({
    schema: SCHEMAS.glyph,
    spiral_state_id: s.spiral_state_id,
    evolution_hint: evolutionHint,
    phase: s.phase,
    direction: s.direction,
    confidence: s.confidence,
    degraded,
    context_source: contextSource(glyph?.evolution_hint != null && !degraded),
  });
}

// --- UI ---

function deriveAttentionLevel(confidence) {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

export function adaptForUI(harmonicState) {
  const s = requireSpiralState(harmonicState);
  const degraded = Boolean(s.degraded?.active);
  const ui = s.subsystem_contexts?.ui;
  const contextAbsent = !ui;

  const attentionLevel = degraded
    ? 'low'
    : (ui?.attention_level ?? deriveAttentionLevel(s.confidence));

  const emphasisTokens = degraded
    ? Object.freeze(['DEGRADED'])
    : Object.freeze(ui?.emphasis_tokens ?? []);

  return Object.freeze({
    schema: SCHEMAS.ui,
    spiral_state_id: s.spiral_state_id,
    attention_level: attentionLevel,
    emphasis_tokens: emphasisTokens,
    phase: s.phase,
    direction: s.direction,
    confidence: s.confidence,
    degraded,
    context_source: contextAbsent ? 'derived' : contextSource(ui?.attention_level != null),
  });
}

// --- Haptic ---

export function adaptForHaptic(harmonicState) {
  const s = requireSpiralState(harmonicState);
  const degraded = Boolean(s.degraded?.active);
  const haptic = s.subsystem_contexts?.haptic;

  const pattern = haptic?.pattern ?? null;
  const intensity = degraded ? 0 : clamp(haptic?.intensity ?? 0);

  return Object.freeze({
    schema: SCHEMAS.haptic,
    spiral_state_id: s.spiral_state_id,
    pattern,
    intensity,
    degraded,
    context_source: contextSource(haptic?.pattern != null),
  });
}

// --- Replay ---

export function adaptForReplay(harmonicState) {
  const s = requireSpiralState(harmonicState);
  const degraded = Boolean(s.degraded?.active);
  const replay = s.subsystem_contexts?.replay;

  const createCheckpoint = degraded ? true : Boolean(replay?.create_checkpoint ?? false);
  const label = degraded
    ? 'DEGRADED_STATE_CHECKPOINT'
    : (replay?.label ?? null);

  return Object.freeze({
    schema: SCHEMAS.replay,
    spiral_state_id: s.spiral_state_id,
    create_checkpoint: createCheckpoint,
    label,
    degraded,
    context_source: contextSource(replay?.create_checkpoint != null),
  });
}

// --- Convenience: adapt all at once ---

export function adaptAll(harmonicState) {
  return Object.freeze({
    llm: adaptForLLM(harmonicState),
    audio: adaptForAudio(harmonicState),
    glyph: adaptForGlyph(harmonicState),
    ui: adaptForUI(harmonicState),
    haptic: adaptForHaptic(harmonicState),
    replay: adaptForReplay(harmonicState),
  });
}
