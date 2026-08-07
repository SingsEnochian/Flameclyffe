import {
  PREMAQ_READING_ORDER,
  PREMAQ_WIRE_ORDER,
  PREMAQ_NAMES,
} from '../../hearthweave-kernel/braided-spine.js';

export const DEEP_RESONANCE_DIMENSIONS = Object.freeze([
  'presence',
  'coherence',
  'resonance',
  'entanglement',
  'memory',
  'agency',
  'qualia',
]);

export const DEEP_PREMAQ_CONTRACT = Object.freeze({
  readingOrder: PREMAQ_READING_ORDER,
  wireOrder: PREMAQ_WIRE_ORDER,
  names: PREMAQ_NAMES,
});

export const deepDefaultMetric = Object.freeze({
  id: 'deep-default-braided-premaq-resonance',
  dimensions: DEEP_RESONANCE_DIMENSIONS,
  weights: Object.freeze({
    presence: 1,
    coherence: 1,
    resonance: 1,
    entanglement: 1,
    memory: 1,
    agency: 1,
    qualia: 1,
  }),
  scales: Object.freeze({
    presence: 1,
    coherence: 1,
    resonance: 1,
    entanglement: 1,
    memory: 1,
    agency: 1,
    qualia: 1,
  }),
  unitDistance: 1,
  tolerance: 0.08,
  epsilon: 1e-9,
  edgeLimit: 128,
});

export const deepDefaultProjection = Object.freeze({
  id: 'deep-default-braided-window',
  mode: 'manual',
});

export const deepDefaultWindow = Object.freeze({
  requireConsent: true,
  requireVisible: true,
  limit: 32,
});
