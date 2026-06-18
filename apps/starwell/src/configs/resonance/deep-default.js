export const DEEP_RESONANCE_DIMENSIONS = Object.freeze([
  'pressure',
  'coherence',
  'rhythm',
  'entropy',
  'memory',
  'attention',
]);

export const deepDefaultMetric = Object.freeze({
  id: 'deep-default-unit-resonance',
  dimensions: DEEP_RESONANCE_DIMENSIONS,
  weights: Object.freeze({
    pressure: 1,
    coherence: 1.35,
    rhythm: 1.15,
    entropy: 0.85,
    memory: 1.25,
    attention: 1,
  }),
  scales: Object.freeze({
    pressure: 1,
    coherence: 1,
    rhythm: 1,
    entropy: 1,
    memory: 1,
    attention: 1,
  }),
  unitDistance: 1,
  tolerance: 0.08,
  epsilon: 1e-9,
  edgeLimit: 128,
});

export const deepDefaultProjection = Object.freeze({
  id: 'deep-default-manual-window',
  mode: 'manual',
});

export const deepDefaultWindow = Object.freeze({
  requireConsent: true,
  requireVisible: true,
  limit: 32,
});
