export const DEFAULT_NUMERIC_EPSILON = 1e-9;

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function readDimensionKey(dimension, index = 0) {
  if (typeof dimension === 'string' && dimension.trim()) {
    return dimension;
  }

  if (dimension && typeof dimension === 'object' && typeof dimension.key === 'string' && dimension.key.trim()) {
    return dimension.key;
  }

  throw new TypeError(`Metric dimension at index ${index} must be a non-empty string or an object with a string key.`);
}

export function readDimensionKeys(dimensions = []) {
  return dimensions.map((dimension, index) => readDimensionKey(dimension, index));
}

export function readDimensionOption(dimension, optionName) {
  return dimension && typeof dimension === 'object' ? dimension[optionName] : undefined;
}

export function normaliseWeight(weight) {
  return isFiniteNumber(weight) && weight >= 0 ? weight : 1;
}

export function normaliseScale(scale) {
  return isFiniteNumber(scale) && scale > 0 ? scale : 1;
}

export function normaliseEpsilon(epsilon) {
  return isFiniteNumber(epsilon) && epsilon >= 0 ? epsilon : DEFAULT_NUMERIC_EPSILON;
}

export function assertMetricConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('A resonance metric config object is required.');
  }

  if (!Array.isArray(config.dimensions) || config.dimensions.length === 0) {
    throw new TypeError('Metric config must provide a non-empty dimensions array.');
  }

  const dimensionKeys = readDimensionKeys(config.dimensions);
  const uniqueDimensions = new Set(dimensionKeys);
  if (uniqueDimensions.size !== dimensionKeys.length) {
    throw new TypeError('Metric config dimensions must be unique by key.');
  }

  for (let index = 0; index < config.dimensions.length; index += 1) {
    const dimension = config.dimensions[index];
    const key = dimensionKeys[index];
    const weight = readDimensionOption(dimension, 'weight') ?? config.weights?.[key];
    const scale = readDimensionOption(dimension, 'scale') ?? config.scales?.[key];

    if (weight !== undefined && (!isFiniteNumber(weight) || weight < 0)) {
      throw new TypeError(`Metric dimension '${key}' must have a non-negative finite weight.`);
    }

    if (scale !== undefined && (!isFiniteNumber(scale) || scale <= 0)) {
      throw new TypeError(`Metric dimension '${key}' must have a positive finite scale.`);
    }
  }

  if (!isFiniteNumber(config.unitDistance) || config.unitDistance <= 0) {
    throw new TypeError('Metric config unitDistance must be a positive finite number.');
  }

  if (!isFiniteNumber(config.tolerance) || config.tolerance <= 0) {
    throw new TypeError('Metric config tolerance must be a positive finite number.');
  }

  if (config.epsilon !== undefined && (!isFiniteNumber(config.epsilon) || config.epsilon < 0)) {
    throw new TypeError('Metric config epsilon must be a non-negative finite number when provided.');
  }

  if (config.edgeLimit !== undefined && (!Number.isInteger(config.edgeLimit) || config.edgeLimit <= 0)) {
    throw new TypeError('Metric config edgeLimit must be a positive integer when provided.');
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
  const key = typeof dimension === 'string' ? dimension : readDimensionKey(dimension, index);
  const value = Array.isArray(vector) ? vector[index] : vector?.[key];
  return isFiniteNumber(value) ? value : fallback;
}

export function clamp01(value) {
  if (!isFiniteNumber(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
