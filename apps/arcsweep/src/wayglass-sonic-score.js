/**
 * Wayglass Sonic Score v0.1
 * Local-first, dependency-free and side-effect-free presentation contract.
 * Inspired by Meadow's separation of signed events from delivery,
 * Molequle's deterministic pure core, and Möbius's existing Web Audio renderer.
 *
 * This module NEVER authenticates a participant, verifies a receipt,
 * plays sound, stores secrets, or advances continuity.
 * Its caller must provide a post-validation result from the authoritative kernel.
 */
export const SONIC_SCORE_SCHEMA = 'wayglass.sonic-score/v0.1';
export const OPERATIONAL_STATES = Object.freeze([
  'full', 'degraded', 'read-only', 'offline-preserved', 'validation-failed',
]);
export const AUDIO_STATES = Object.freeze(['enabled', 'silent', 'unavailable', 'error']);

export const SONIC_CUES = Object.freeze({
  full: Object.freeze({ id: 'full', cue_description: 'Two-note resolved phrase', distinguishable_by: 'cadential resolution', mono_safe: true, duration_ms: 550, label: 'design-proposal' }),
  degraded: Object.freeze({ id: 'degraded', cue_description: 'Two-note unresolved phrase', distinguishable_by: 'incomplete cadence', mono_safe: true, duration_ms: 550, label: 'design-proposal' }),
  'read-only': Object.freeze({ id: 'read-only', cue_description: 'One even note', distinguishable_by: 'single sustained event', mono_safe: true, duration_ms: 380, label: 'design-proposal' }),
  'offline-preserved': Object.freeze({ id: 'offline-preserved', cue_description: 'Soft descending phrase', distinguishable_by: 'downward contour', mono_safe: true, duration_ms: 650, label: 'design-proposal' }),
  'validation-failed': Object.freeze({ id: 'validation-failed', cue_description: 'Brief contrasting failure motif', distinguishable_by: 'distinct rhythmic contour', mono_safe: true, duration_ms: 460, label: 'design-proposal' }),
});

/**
 * Only accept a result object supplied by the authoritative validation layer.
 * validated:true is a routing guard, NOT proof; consumers MUST NOT pass
 * model-authored or external untrusted claims directly into this function.
 *
 * Audio status is independent from operational state. Silence is intentional.
 */
export function selectSonicCue(validationResult, audioState = 'silent') {
  if (!AUDIO_STATES.includes(audioState)) throw new TypeError('unknown audio state');
  if (!validationResult || validationResult.source !== 'wayglass-continuity-kernel') {
    return Object.freeze({ kind: 'error', reason: 'untrusted_source', cue: null });
  }
  if (validationResult.validated !== true) {
    return Object.freeze({ kind: 'error', reason: 'unvalidated_state', cue: null });
  }
  const state = validationResult.operational_state;
  if (!OPERATIONAL_STATES.includes(state)) {
    return Object.freeze({ kind: 'error', reason: 'unknown_operational_state', cue: null });
  }
  if (audioState !== 'enabled') {
    return Object.freeze({ kind: audioState, operational_state: state, cue: null });
  }
  return Object.freeze({ kind: 'cue', operational_state: state, cue: SONIC_CUES[state] });
}

/** World ambience is deliberately a separate channel from operational cues. */
export function worldAcousticDescriptor(world) {
  if (!world || typeof world !== 'object' || typeof world.world_id !== 'string' ||
      !world.world_id.trim() || !Array.isArray(world.layers)) {
    throw new TypeError('invalid Worldseed acoustic descriptor');
  }
  return Object.freeze({
    schema: 'wayglass.world-acoustics/v0.1',
    world_id: world.world_id,
    layers: world.layers.map(layer => Object.freeze({
      id: String(layer.id || ''),
      generator: String(layer.generator || ''),
      seed: Number.isSafeInteger(layer.seed) ? layer.seed : 0,
    })),
    render_only: true,
  });
}
