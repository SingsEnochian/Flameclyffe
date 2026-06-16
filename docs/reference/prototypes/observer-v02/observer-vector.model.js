export const DEFAULT_VECTOR = {
  P: 0.56,
  C: 0.62,
  R: 0.58,
  E: 0.28,
  M: 0.44,
  A: 0.66,
  charge: 0.38,
};

export const OBSERVER_CORE = {
  x: 500,
  y: 390,
  label: 'Observer',
};

export const OBSERVER_CONFIG = {
  bend: 72,
  driftScale: 0.12,
  driftInterval: 700,
  breatheMs: 1600,
  nodeRadius: 34,
  coreRadius: 50,
  labelOffsetY: 58,
  coreLabelOffsetY: 6,
  entropyUnstableThreshold: 0.62,
  lowThreshold: 0.28,
  highThreshold: 0.72,
  flareThreshold: 0.68,
};

export const OBSERVER_METRICS = {
  P: { label: 'Presence', css: '--presence', x: 500, y: 110 },
  C: { label: 'Coherence', css: '--coherence', x: 750, y: 185 },
  R: { label: 'Resonance', css: '--resonance', x: 850, y: 410 },
  E: { label: 'Entropy', css: '--entropy', x: 650, y: 645 },
  M: { label: 'Moon', css: '--moon', x: 350, y: 645 },
  A: { label: 'Attention', css: '--attention', x: 150, y: 410 },
  charge: { label: 'Charge', css: '--charge', x: 250, y: 185 },
};
