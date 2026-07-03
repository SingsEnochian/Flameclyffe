import { ANIMATION_PRESETS, resolveAnimationForGates } from './animation-presets.js';

const clone = value => JSON.parse(JSON.stringify(value));

const visualEffectFromAnimation = (animation, sourceEvent) => ({
  effect_id: animation.id,
  effect: animation.motion,
  source: sourceEvent,
  intensity: animation.intensity,
  duration_ms: animation.duration_ms || animation.default_duration_ms,
  motion: animation.motion,
  plain_language: animation.receipt_language,
  boundary: animation.boundary,
  emitted: true,
  reason: 'allowed'
});

export const PLAY_PRESETS = Object.freeze({
  glowPulse: {
    id: 'play.glow_pulse',
    label: 'Glow pulse',
    result_state: 'play:visual',
    source_event: 'play:glow_pulse',
    animation: ANIMATION_PRESETS.glowPulse,
    consent_required: [],
    accessibility_behaviour: 'Reduced motion changes pulse into static glow. Quiet mode lowers brightness.',
    plain_language: 'Glow pulse requested. Visual response emitted. No data claim was made.',
    boundary: 'Glow pulse is a play cue, not an external truth claim.'
  },

  leylineSweep: {
    id: 'play.leyline_sweep',
    label: 'Leyline sweep',
    result_state: 'play:path',
    source_event: 'play:leyline_sweep',
    animation: ANIMATION_PRESETS.leylineSweep,
    consent_required: [],
    accessibility_behaviour: 'Reduced motion changes travel into endpoint glow. Quiet mode slows and dims the path.',
    plain_language: 'Leyline sweep requested. The path is an interface cue, not a claim about certainty.',
    boundary: 'Leyline sweep does not imply fate, command, or prediction.'
  },

  nullBloom: {
    id: 'play.null_bloom',
    label: 'Null bloom',
    result_state: 'pattern:absent',
    source_event: 'play:null_bloom',
    animation: ANIMATION_PRESETS.nullBloom,
    consent_required: [],
    accessibility_behaviour: 'Reduced motion and quiet mode use a still candle-glow state.',
    plain_language: 'Null bloom requested. Nothing clear is here yet. Quiet is a valid result.',
    boundary: 'Null bloom treats absence as valid, not broken.'
  },

  settleWave: {
    id: 'play.settle_wave',
    label: 'Settle wave',
    result_state: 'response:settled',
    source_event: 'play:settle_wave',
    animation: ANIMATION_PRESETS.settleWave,
    consent_required: [],
    accessibility_behaviour: 'Reduced motion changes wave travel into a centre fade. Quiet mode softens the settle.',
    plain_language: 'Settle wave requested. The field is returning to centre.',
    boundary: 'Settle wave lowers interface force. It does not diagnose or decide the user state.'
  },

  dragonStamp: {
    id: 'play.dragon_stamp',
    label: 'Tiny dragon receipt stamp',
    result_state: 'receipt:emitted',
    source_event: 'play:dragon_stamp',
    animation: ANIMATION_PRESETS.dragonStamp,
    consent_required: [],
    accessibility_behaviour: 'Reduced motion shows a static badge. Quiet mode avoids bounce.',
    plain_language: 'Dragon stamp requested. A receipt exists for this action.',
    boundary: 'Dragon stamp celebrates audit visibility. It does not add authority to the result.'
  },

  testSoftTone: {
    id: 'play.test_soft_tone',
    label: 'Test soft tone',
    result_state: 'play:audio_test',
    source_event: 'play:test_soft_tone',
    animation: ANIMATION_PRESETS.glowPulse,
    consent_required: ['sound'],
    accessibility_behaviour: 'Visual fallback is always present. Quiet mode should block audio unless explicitly re-enabled.',
    plain_language: 'Soft tone requested. Audio emitted only if sound consent was active.',
    boundary: 'Soft tone is an output-driver test, not a signal reading.',
    audio: {
      effect_id: 'audio.test_soft_tone',
      effect: 'soft_tone_test',
      source: 'play:test_soft_tone',
      frequency_hz: 174,
      intensity: 0.10,
      duration_ms: 320,
      plain_language: 'Soft tone requested. Audio emitted only if sound consent was active.',
      boundary: 'Soft tone is a consent-gated audio test.'
    }
  },

  testGentleTap: {
    id: 'play.test_gentle_tap',
    label: 'Test gentle tap',
    result_state: 'play:haptic_test',
    source_event: 'play:test_gentle_tap',
    animation: ANIMATION_PRESETS.glowPulse,
    consent_required: ['haptics'],
    accessibility_behaviour: 'Visual fallback is always present. Quiet mode should block haptics unless explicitly re-enabled.',
    plain_language: 'Gentle tap requested. Haptic output emitted only if haptic consent was active.',
    boundary: 'Gentle tap is an output-driver test, not a signal reading.',
    haptic: {
      effect_id: 'haptic.test_gentle_tap',
      effect: 'gentle_tap_test',
      source: 'play:test_gentle_tap',
      pattern_ms: [18],
      intensity: 0.12,
      duration_ms: 60,
      plain_language: 'Gentle tap requested. Haptic output emitted only if haptic consent was active.',
      boundary: 'Gentle tap is a consent-gated haptic test.'
    }
  }
});

export function getPlayPreset(id) {
  return Object.values(PLAY_PRESETS).find(preset => preset.id === id || preset.label === id || preset.source_event === id) || null;
}

export function createPlayPlan(id, { consent = {}, accessibility = {} } = {}) {
  const preset = getPlayPreset(id);
  if (!preset) throw new Error(`Unknown play preset: ${id}`);

  const quiet = Boolean(consent.quiet || consent.lowStim);
  const reducedMotion = Boolean(accessibility.reducedMotion);
  const animation = resolveAnimationForGates(preset.animation, { quiet, reducedMotion });

  const channels = { visual: [], audio: [], haptic: [], spatial: [], persistence: [] };
  channels.visual.push(visualEffectFromAnimation(animation, preset.source_event));

  if (preset.audio) channels.audio.push(clone(preset.audio));
  if (preset.haptic) channels.haptic.push(clone(preset.haptic));

  return {
    surface_id: 'hearthfire-workbench',
    gate: 'targeted_receipt_allowed',
    result_state: preset.result_state,
    play_preset_id: preset.id,
    source_event: preset.source_event,
    plain_language: preset.plain_language,
    boundary: preset.boundary,
    channels
  };
}
