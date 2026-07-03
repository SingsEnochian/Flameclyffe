export const ANIMATION_PRESETS = Object.freeze({
  glowPulse: {
    id: 'animation.glow_pulse',
    label: 'Glow pulse',
    meaning: 'The surface received a deliberate play action. No data claim is made.',
    channels: ['visual'],
    default_duration_ms: 700,
    intensity: 0.32,
    motion: 'pulse',
    quiet_variant: {
      duration_ms: 480,
      intensity: 0.18,
      motion: 'soft_pulse'
    },
    reduced_motion_variant: {
      duration_ms: 450,
      intensity: 0.20,
      motion: 'static_glow'
    },
    receipt_language: 'Glow pulse requested. Visual response emitted. No data claim was made.',
    boundary: 'Glow pulse is an interface cue, not a claim about external truth.'
  },

  leylineSweep: {
    id: 'animation.leyline_sweep',
    label: 'Leyline sweep',
    meaning: 'A route is drawn for orientation and play. It does not imply fate or instruction.',
    channels: ['visual'],
    default_duration_ms: 1200,
    intensity: 0.36,
    motion: 'travel',
    quiet_variant: {
      duration_ms: 900,
      intensity: 0.20,
      motion: 'slow_travel'
    },
    reduced_motion_variant: {
      duration_ms: 600,
      intensity: 0.22,
      motion: 'static_endpoints'
    },
    receipt_language: 'Leyline sweep requested. The path is an interface cue, not a claim about certainty.',
    boundary: 'Leyline sweep does not imply fate, command, or prediction.'
  },

  nullBloom: {
    id: 'animation.null_bloom',
    label: 'Null bloom',
    meaning: 'Nothing clear is here yet. Absence is being held as a valid result.',
    channels: ['visual'],
    default_duration_ms: 900,
    intensity: 0.24,
    motion: 'bloom',
    quiet_variant: {
      duration_ms: 700,
      intensity: 0.14,
      motion: 'candle_glow'
    },
    reduced_motion_variant: {
      duration_ms: 650,
      intensity: 0.16,
      motion: 'static_candle_glow'
    },
    receipt_language: 'Null bloom requested. Nothing clear is here yet. Quiet is a valid result.',
    boundary: 'Null bloom treats absence as a valid interface state, not a system failure.'
  },

  settleWave: {
    id: 'animation.settle_wave',
    label: 'Settle wave',
    meaning: 'The field is intentionally lowering force and returning to centre.',
    channels: ['visual', 'spatial'],
    default_duration_ms: 950,
    intensity: 0.26,
    motion: 'settle_wave',
    quiet_variant: {
      duration_ms: 650,
      intensity: 0.15,
      motion: 'soft_settle'
    },
    reduced_motion_variant: {
      duration_ms: 600,
      intensity: 0.18,
      motion: 'centre_fade'
    },
    receipt_language: 'Settle wave requested. The field is returning to centre.',
    boundary: 'Settle wave lowers interface force. It does not diagnose or decide the user state.'
  },

  dragonStamp: {
    id: 'animation.dragon_stamp',
    label: 'Tiny dragon receipt stamp',
    meaning: 'A receipt exists for the action.',
    channels: ['visual'],
    default_duration_ms: 760,
    intensity: 0.34,
    motion: 'stamp_pop',
    quiet_variant: {
      duration_ms: 520,
      intensity: 0.18,
      motion: 'soft_stamp'
    },
    reduced_motion_variant: {
      duration_ms: 500,
      intensity: 0.20,
      motion: 'static_badge'
    },
    receipt_language: 'Dragon stamp requested. A receipt exists for this action.',
    boundary: 'Dragon stamp celebrates audit visibility. It does not add authority to the result.'
  }
});

export function getAnimationPreset(id) {
  return Object.values(ANIMATION_PRESETS).find(preset => preset.id === id || preset.label === id || preset.key === id) || null;
}

export function resolveAnimationForGates(preset, { quiet = false, reducedMotion = false } = {}) {
  if (!preset) return null;
  if (reducedMotion && preset.reduced_motion_variant) return { ...preset, ...preset.reduced_motion_variant, variant: 'reduced_motion' };
  if (quiet && preset.quiet_variant) return { ...preset, ...preset.quiet_variant, variant: 'quiet' };
  return { ...preset, duration_ms: preset.default_duration_ms, variant: 'default' };
}
