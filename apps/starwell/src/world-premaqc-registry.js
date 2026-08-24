export * from './world-premaq-registry.js';

export const WORLD_PREMAQC_REGISTRY_SCHEMA = 'hearthgate.world-premaqc-registry/v1';
export const WORLD_PREMAQC_REGISTRY_AUTHORITY = Object.freeze({
  vocabulary: 'PREMAQC',
  dynamic_axes: Object.freeze(['P', 'C', 'R', 'E', 'M', 'A']),
  context_only_axes: Object.freeze(['Q']),
  qualia_is_firsthand_only: true,
  qualia_magnitude_inference_allowed: false,
  qualia_sonified: false,
});
