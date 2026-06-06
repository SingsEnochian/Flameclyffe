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

export function normaliseMoon(value, fallback = DEFAULT_DEEP_STATE.moonIllum) {
  const moon = numberOr(value, fallback);
  return moon <= 1 ? clampNumber(moon, 0, 1) * 100 : clampNumber(moon, 0, 100);
}

export function getBridgeDeep(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.deep ?? payload.DEEP ?? payload.state ?? payload.observer ?? null;
}

export function normaliseDeepState(rawDeep = {}) {
  const merged = { ...DEFAULT_DEEP_STATE, ...rawDeep };
  const skyIsText = typeof merged.sky === 'string';
  const skyLabel = skyIsText ? merged.sky.toLowerCase() : 'numeric';
  const skyClarity = skyIsText
    ? (SKY_CLARITY[skyLabel] ?? SKY_CLARITY.night)
    : clampNumber(numberOr(merged.sky, 0.42), 0, 1);

  return {
    P: clampNumber(numberOr(merged.P, DEFAULT_DEEP_STATE.P), 0, 1),
    C: clampNumber(numberOr(merged.C, DEFAULT_DEEP_STATE.C), 0, 1),
    R: clampNumber(numberOr(merged.R, DEFAULT_DEEP_STATE.R), 0, 1),
    E: clampNumber(numberOr(merged.E, DEFAULT_DEEP_STATE.E), 0, 1),
    M: clampNumber(numberOr(merged.M, DEFAULT_DEEP_STATE.M), 0, 1),
    A: clampNumber(numberOr(merged.A, DEFAULT_DEEP_STATE.A), 0, 1),
    dpdt: numberOr(merged.dpdt, DEFAULT_DEEP_STATE.dpdt),
    moonIllum: normaliseMoon(merged.moonIllum),
    sky: skyLabel,
    skyClarity,
    kp: clampNumber(numberOr(merged.kp, DEFAULT_DEEP_STATE.kp), 0, 9),
    bz: clampNumber(numberOr(merged.bz, DEFAULT_DEEP_STATE.bz), -20, 20),
    charge: clampNumber(numberOr(merged.charge, DEFAULT_DEEP_STATE.charge), 0, 1),
    dphi: numberOr(merged.dphi, DEFAULT_DEEP_STATE.dphi),
  };
}

export function makeDeepSignature(deep) {
  return [deep.P, deep.A, deep.C, deep.R, deep.E, deep.bz, deep.M, deep.moonIllum, deep.kp, deep.charge]
    .map((value) => Number(value).toFixed(3))
    .join('|');
}
