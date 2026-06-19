export const AR_SOUND_DEFAULTS = {
  enabled: false,
  volume: 0.18,
  toneSet: 'soft',
};

export const AR_SOUND_LIMITS = {
  minVolume: 0,
  maxVolume: 0.5,
  step: 0.01,
};

export const AR_SOUND_EVENTS = {
  select: { frequency: 392, durationMs: 90, gain: 0.55 },
  move: { frequency: 330, durationMs: 55, gain: 0.36 },
  rotate: { frequency: 440, durationMs: 70, gain: 0.34 },
  scale: { frequency: 494, durationMs: 80, gain: 0.34 },
  anchor: { frequency: 294, durationMs: 120, gain: 0.44 },
  pulse: { frequency: 523, durationMs: 180, gain: 0.5 },
  dismiss: { frequency: 247, durationMs: 140, gain: 0.32 },
  reset: { frequency: 349, durationMs: 110, gain: 0.38 },
  donk: { frequency: 196, durationMs: 130, gain: 0.42 },
  ding: { frequency: 587, durationMs: 120, gain: 0.32 },
  hum: { frequency: 220, durationMs: 260, gain: 0.28 },
  chime: { frequency: 784, durationMs: 160, gain: 0.24 },
};

export const AR_SOUND_PATTERNS = {
  seedlingReply: ['donk', 'ding', 'hum', 'chime'],
};
