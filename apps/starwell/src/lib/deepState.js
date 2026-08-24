export const DEFAULT_DEEP_STATE = {
  P: 0.42,
  C: 0.68,
  R: 0.74,
  E: 0.61,
  M: 0.3,
  A: 0.72,
  dpdt: 0.326,
  moonIllum: 93,
  sky: 'rain',
  kp: 3,
  bz: -5.8,
  charge: 0.94,
  dphi: 0,
};

export const SKY_CLARITY = {
  dawn: 0.58,
  day: 0.82,
  dusk: 0.46,
  night: 0.28,
  rain: 0.38,
  storm: 0.18,
  mist: 0.3,
};

export const SKY_TINTS = {
  dawn: [255, 200, 140],
  day: [220, 235, 255],
  dusk: [255, 160, 100],
  night: [100, 120, 200],
  rain: [100, 180, 220],
  storm: [80, 90, 160],
  mist: [138, 178, 205],
};

export function clampNumber(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function projectNumber(transformations, field, input, fallback, min = null, max = null) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) {
    transformations.push({
      field,
      operation: 'explicit-substitution',
      input: input ?? null,
      output: fallback,
      reason: 'SOURCE_FIELD_MISSING_OR_INVALID',
    });
    return fallback;
  }

  if (typeof input !== 'number') {
    transformations.push({ field, operation: 'numeric-coercion', input, output: parsed });
  }
  if (min == null || max == null || (parsed >= min && parsed <= max)) return parsed;

  const output = clampNumber(parsed, min, max);
  transformations.push({
    field,
    operation: 'bounded-render-projection',
    input: parsed,
    output,
    range: [min, max],
    lossless_source: true,
  });
  return output;
}

export function projectDeepState(rawDeep = {}) {
  const raw = rawDeep && typeof rawDeep === 'object' && !Array.isArray(rawDeep) ? clone(rawDeep) : {};
  const transformations = [];
  const suppliedSky = raw.sky;
  const skyIsSuppliedText = typeof suppliedSky === 'string' && suppliedSky.length > 0;
  const skyIsSuppliedNumber = typeof suppliedSky !== 'string' && Number.isFinite(Number(suppliedSky));
  const skyInput = skyIsSuppliedText || skyIsSuppliedNumber ? suppliedSky : DEFAULT_DEEP_STATE.sky;
  if (!skyIsSuppliedText && !skyIsSuppliedNumber) {
    transformations.push({ field: 'sky', operation: 'explicit-substitution', input: suppliedSky ?? null, output: skyInput, reason: 'SOURCE_FIELD_MISSING_OR_INVALID' });
  }
  const skyIsText = typeof skyInput === 'string';
  const sky = skyIsText ? skyInput.toLowerCase() : 'numeric';
  if (skyIsText && sky !== skyInput) {
    transformations.push({ field: 'sky', operation: 'renderer-label-casefold', input: skyInput, output: sky });
  }
  const skyClarity = skyIsText
    ? (SKY_CLARITY[sky] ?? SKY_CLARITY.night)
    : projectNumber(transformations, 'skyClarity', skyInput, 0.42, 0, 1);

  const moonInput = raw.moonIllum;
  const moonNumeric = projectNumber(transformations, 'moonIllum', moonInput, DEFAULT_DEEP_STATE.moonIllum);
  let moonIllum = moonNumeric;
  if (moonNumeric >= 0 && moonNumeric <= 1) {
    moonIllum = moonNumeric * 100;
    transformations.push({ field: 'moonIllum', operation: 'fraction-to-percent', input: moonNumeric, output: moonIllum });
  } else if (moonNumeric < 0 || moonNumeric > 100) {
    moonIllum = clampNumber(moonNumeric, 0, 100);
    transformations.push({ field: 'moonIllum', operation: 'bounded-render-projection', input: moonNumeric, output: moonIllum, range: [0, 100], lossless_source: true });
  }

  return {
    raw,
    state: {
      P: projectNumber(transformations, 'P', raw.P, DEFAULT_DEEP_STATE.P, 0, 1),
      C: projectNumber(transformations, 'C', raw.C, DEFAULT_DEEP_STATE.C, 0, 1),
      R: projectNumber(transformations, 'R', raw.R, DEFAULT_DEEP_STATE.R, 0, 1),
      E: projectNumber(transformations, 'E', raw.E, DEFAULT_DEEP_STATE.E, 0, 1),
      M: projectNumber(transformations, 'M', raw.M, DEFAULT_DEEP_STATE.M, 0, 1),
      A: projectNumber(transformations, 'A', raw.A, DEFAULT_DEEP_STATE.A, 0, 1),
      dpdt: projectNumber(transformations, 'dpdt', raw.dpdt, DEFAULT_DEEP_STATE.dpdt),
      moonIllum,
      sky,
      skyClarity,
      kp: projectNumber(transformations, 'kp', raw.kp, DEFAULT_DEEP_STATE.kp, 0, 9),
      bz: projectNumber(transformations, 'bz', raw.bz, DEFAULT_DEEP_STATE.bz, -20, 20),
      charge: projectNumber(transformations, 'charge', raw.charge, DEFAULT_DEEP_STATE.charge, 0, 1),
      dphi: projectNumber(transformations, 'dphi', raw.dphi, DEFAULT_DEEP_STATE.dphi),
    },
    transformations,
  };
}

export function normaliseMoon(value, fallback = DEFAULT_DEEP_STATE.moonIllum) {
  const moon = numberOr(value, fallback);
  return moon <= 1 ? clampNumber(moon, 0, 1) * 100 : clampNumber(moon, 0, 100);
}

export function getBridgeDeep(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return payload.deep && typeof payload.deep === 'object' && !Array.isArray(payload.deep)
    ? payload.deep
    : null;
}

export function normaliseDeepState(rawDeep = {}) {
  return projectDeepState(rawDeep).state;
}

export function makeDeepSignature(deep) {
  return [deep.P, deep.A, deep.C, deep.R, deep.E, deep.bz, deep.M, deep.moonIllum, deep.kp, deep.charge]
    .map((value) => Number(value).toFixed(3))
    .join('|');
}
