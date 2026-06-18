export const DEFAULT_NUMERIC_EPSILON = 1e-9;

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function assertMetricConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('A resonance metric config object is required.');
  }

  if (!Array.isArray(config.dimensions) || config.dimensions.length === 0) {
    throw new TypeError('Metric config must provide a non-empty dimensions array.');
  }

  const uniqueDimensions = new Set(config.dimensions);
  if (uniqueDimensions.size !== config.dimensions.length) {
    throw new TypeError('Metric config dimensions must be unique.');
  }

  if (!isFiniteNumber(config.unitDistance) || config.unitDistance <= 0) {
    throw new TypeError('Metric config unitDistance must be a positive finite number.');
  }

  if (!isFiniteNumber(config.tolerance) || config.tolerance < 0) {
    throw new TypeError('Metric config tolerance must be a non-negative finite number.');
  }

  return config;
}

export function assertNode(node, index = 0) {
  if (!node || typeof node !== 'object') {
    throw new TypeError(`Resonance node at index ${index} must be an object.`);
  }

  if (!node.id || typeof node.id !== 'string') {
    throw new TypeError(`Resonance node at index ${index} must have a string id.`);
  }

  if (!Array.isArray(node.vector) && (!node.vector || typeof node.vector !== 'object')) {
    throw new TypeError(`Resonance node ${node.id} must have an array or record vector.`);
  }

  return node;
}

export function readVectorValue(vector, index, dimension, fallback = 0) {
  const value = Array.isArray(vector) ? vector[index] : vector?.[dimension];
  return isFiniteNumber(value) ? value : fallback;
}

export function normaliseWeight(weight) {
  return isFiniteNumber(weight) && weight >= 0 ? weight : 1;
}

export function clamp01(value) {
  if (!isFiniteNumber(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
