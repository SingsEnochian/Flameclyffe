import { HARD_ASPECTS, HARMONIOUS_ASPECTS } from './aspects.js';

export function normalizeSomatic(input = {}) {
  const somatic = {
    activation: input.activation || 'low',
    fatigue: input.fatigue || 'low',
    pain: input.pain || 'low',
    migraine: Boolean(input.migraine),
    tinnitus: input.tinnitus || 'not_reported',
    body_yes: input.body_yes || null,
    body_no: input.body_no || null,
  };

  return {
    ...somatic,
    capacity_label: deriveCapacityLabel(somatic),
    interface_safety_mode: determineInterfaceSafetyMode(somatic),
  };
}

export function determineInterfaceSafetyMode(somatic) {
  if (somatic.body_no) return 'paused';
  if (somatic.migraine) return 'low_light_silent';
  if (somatic.activation === 'high' && somatic.fatigue === 'high') return 'gentle';
  if (somatic.pain === 'high') return 'gentle';
  return 'standard';
}

export function deriveCapacityLabel(somatic) {
  if (somatic.body_no) return 'body_no';
  if (somatic.migraine) return 'rest_or_silent';
  if (somatic.fatigue === 'high' || somatic.activation === 'high' || somatic.pain === 'high') return 'limited_but_available';
  if (somatic.body_yes) return 'stable';
  return 'available';
}

export function deriveDeepSeed({ barbault, aspects = [], sacred_geometry = {}, somatic = {} }) {
  const P = derivePressure(barbault, aspects, somatic);
  const C = deriveCoherence(aspects, sacred_geometry);
  const R = deriveResonance(barbault, aspects, sacred_geometry);
  const E = deriveEntropy(aspects, somatic);
  const M = deriveMemory(barbault, sacred_geometry);
  const A = deriveAgency(somatic);

  return {
    P,
    C,
    R,
    E,
    M,
    A,
    dp_dt: null,
    field_label: labelDeepField({ P, C, R, E, M, A, sacred_geometry }),
    pacing_recommendation: getPacingRecommendation({ P, E, A, somatic }),
  };
}

function derivePressure(barbault, aspects, somatic) {
  const compression = {
    extreme_compression: 0.92,
    high_compression: 0.82,
    moderate_compression: 0.68,
    distributed: 0.48,
    wide_distribution: 0.38,
  }[barbault.compression_level] ?? 0.5;

  const exactness = aspects.reduce((sum, aspect) => sum + (aspect.weight || 0), 0) / Math.max(aspects.length, 1);
  const bodyLoad = somatic.activation === 'high' || somatic.pain === 'high' ? 0.14 : 0;
  return clamp01(compression * 0.72 + exactness * 0.22 + bodyLoad);
}

function deriveCoherence(aspects, geometry) {
  const harmonious = aspects.filter((aspect) => HARMONIOUS_ASPECTS.has(aspect.aspect_type)).length;
  const hard = aspects.filter((aspect) => HARD_ASPECTS.has(aspect.aspect_type)).length;
  const base = 0.45 + harmonious * 0.09 - hard * 0.04;
  const geometryBonus = geometry.primary_form === 'cradle_vessel' || geometry.primary_form === 'harmonic_triangle' ? 0.12 : 0;
  return clamp01(base + geometryBonus);
}

function deriveResonance(barbault, aspects, geometry) {
  const aspectDensity = Math.min(aspects.length / 8, 1) * 0.28;
  const geometrySignal = geometry.primary_form === 'cradle_vessel' ? 0.28 : 0.12;
  const indexMemory = barbault.compression_level === 'wide_distribution' ? 0.08 : 0.18;
  return clamp01(0.36 + aspectDensity + geometrySignal + indexMemory);
}

function deriveEntropy(aspects, somatic) {
  const hard = aspects.filter((aspect) => HARD_ASPECTS.has(aspect.aspect_type)).length;
  const somaticLoad = [somatic.activation, somatic.fatigue, somatic.pain].filter((level) => level === 'high').length;
  return clamp01(0.22 + hard * 0.08 + somaticLoad * 0.13);
}

function deriveMemory(barbault, geometry) {
  const cycleSignal = barbault.cyclic_index ? 0.34 : 0.18;
  const geometrySignal = geometry.primary_form === 'cradle_vessel' ? 0.28 : 0.12;
  return clamp01(cycleSignal + geometrySignal + 0.22);
}

function deriveAgency(somatic) {
  if (somatic.interface_safety_mode === 'paused') return 0.05;
  if (somatic.interface_safety_mode === 'low_light_silent') return 0.24;
  if (somatic.capacity_label === 'limited_but_available') return 0.52;
  return 0.78;
}

function labelDeepField({ P, C, R, E, A, sacred_geometry }) {
  if (A < 0.2) return 'paused_by_body';
  if (sacred_geometry.primary_form === 'cradle_vessel' && R > 0.6) return 'threshold_vessel';
  if (P > 0.72 && E > 0.55) return 'pressure_weather';
  if (C > 0.66 && R > 0.62) return 'coherent_resonance';
  return 'field_observation';
}

function getPacingRecommendation({ P, E, A, somatic }) {
  if (somatic.interface_safety_mode === 'paused') return 'Stop. Body-no is active. Offer plain pass or rest.';
  if (somatic.interface_safety_mode === 'low_light_silent') return 'Low light, no sound, minimal motion.';
  if (A < 0.55 || E > 0.55 || P > 0.75) return 'Gentle work only. Keep actions small and reversible.';
  return 'Standard read-only exploration is available.';
}

export function clamp01(value) {
  return Number(Math.min(1, Math.max(0, value)).toFixed(3));
}
