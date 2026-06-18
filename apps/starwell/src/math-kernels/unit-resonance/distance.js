import {
  assertMetricConfig,
  assertNode,
  isFiniteNumber,
  normaliseEpsilon,
  normaliseScale,
  normaliseWeight,
  readDimensionKey,
  readDimensionOption,
  readVectorValue,
} from './validation.js';

export function weightedDistance(a, b, config) {
  assertMetricConfig(config);

  const sum = config.dimensions.reduce((total, dimension, index) => {
    const key = readDimensionKey(dimension, index);
    const weight = normaliseWeight(readDimensionOption(dimension, 'weight') ?? config.weights?.[key]);
    const scale = normaliseScale(readDimensionOption(dimension, 'scale') ?? config.scales?.[key]);
    const left = readVectorValue(a, index, key);
    const right = readVectorValue(b, index, key);
    const delta = (left - right) / scale;

    return total + weight * delta * delta;
  }, 0);

  return Math.sqrt(sum);
}

export function nodeDistance(source, target, config) {
  assertNode(source);
  assertNode(target);

  return weightedDistance(source.vector, target.vector, config);
}

export function unitDelta(distance, config) {
  assertMetricConfig(config);

  if (!isFiniteNumber(distance)) {
    throw new TypeError('Distance must be a finite number.');
  }

  return Math.abs(distance - config.unitDistance);
}

export function isUnitDistance(distance, config) {
  return unitDelta(distance, config) <= config.tolerance + normaliseEpsilon(config.epsilon);
}
