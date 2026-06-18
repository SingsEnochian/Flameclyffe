export const GALLERY_CANON_DIMENSIONS = Object.freeze([
  'character',
  'world',
  'motif',
  'palette',
  'scene',
  'emotionalKey',
]);

export const galleryCanonMetric = Object.freeze({
  id: 'gallery-canon-unit-resonance',
  dimensions: GALLERY_CANON_DIMENSIONS,
  weights: Object.freeze({
    character: 1.8,
    world: 1.2,
    motif: 1.5,
    palette: 0.7,
    scene: 1,
    emotionalKey: 1.6,
  }),
  unitDistance: 1,
  tolerance: 0.12,
  edgeLimit: 96,
});

export const galleryCanonProjection = Object.freeze({
  id: 'gallery-canon-axis-projection',
  mode: 'axis',
  dimensions: ['character', 'emotionalKey'],
});

export const galleryCanonWindow = Object.freeze({
  requireConsent: true,
  requireVisible: true,
  limit: 64,
});
