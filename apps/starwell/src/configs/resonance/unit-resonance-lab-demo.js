import { deepDefaultMetric } from './deep-default.js';

export const unitResonanceLabMetric = Object.freeze({
  ...deepDefaultMetric,
  id: 'unit-resonance-lab-hypercube',
  weights: Object.freeze({
    pressure: 1,
    coherence: 1,
    rhythm: 1,
    entropy: 0,
    memory: 0,
    attention: 0,
  }),
  tolerance: 0.001,
  edgeLimit: 24,
});

export const unitResonanceLabProjection = Object.freeze({
  id: 'unit-resonance-lab-projection',
  mode: 'manual',
});

export const unitResonanceLabView = Object.freeze({
  title: 'Unit Resonance Lattice',
  subtitle: 'Hidden state first. Bounded window second. Projected strands last.',
  svg: Object.freeze({
    viewBox: '0 0 720 520',
    width: 720,
    height: 520,
  }),
});

export const unitResonanceLabNodes = Object.freeze([
  {
    id: 'hearth-root',
    kind: 'room',
    vector: [0, 0, 0, 0, 0, 0],
    meta: Object.freeze({ label: 'Hearth Root', visible: true, consent: true, position: Object.freeze({ x: 130, y: 260 }) }),
  },
  {
    id: 'observer-almanac',
    kind: 'instrument',
    vector: [1, 0, 0, 0, 0, 0],
    meta: Object.freeze({ label: 'Observer Almanac', visible: true, consent: true, position: Object.freeze({ x: 280, y: 130 }) }),
  },
  {
    id: 'writing-room',
    kind: 'room',
    vector: [0, 1, 0, 0, 0, 0],
    meta: Object.freeze({ label: 'Writing Room', visible: true, consent: true, position: Object.freeze({ x: 280, y: 390 }) }),
  },
  {
    id: 'observer-atelier',
    kind: 'gallery',
    vector: [0, 0, 1, 0, 0, 0],
    meta: Object.freeze({ label: 'Observer Atelier', visible: true, consent: true, position: Object.freeze({ x: 360, y: 260 }) }),
  },
  {
    id: 'atlas-hall',
    kind: 'codex',
    vector: [1, 1, 0, 0, 0, 0],
    meta: Object.freeze({ label: 'Atlas Hall', visible: true, consent: true, position: Object.freeze({ x: 460, y: 130 }) }),
  },
  {
    id: 'beacon-network',
    kind: 'signal',
    vector: [1, 0, 1, 0, 0, 0],
    meta: Object.freeze({ label: 'Beacon Network', visible: true, consent: true, position: Object.freeze({ x: 560, y: 260 }) }),
  },
  {
    id: 'grand-library',
    kind: 'codex',
    vector: [0, 1, 1, 0, 0, 0],
    meta: Object.freeze({ label: 'Grand Library', visible: true, consent: true, position: Object.freeze({ x: 460, y: 390 }) }),
  },
  {
    id: 'concordance-lens',
    kind: 'lens',
    vector: [1, 1, 1, 0, 0, 0],
    meta: Object.freeze({ label: 'Concordance Lens', visible: true, consent: true, position: Object.freeze({ x: 620, y: 390 }) }),
  },
]);
