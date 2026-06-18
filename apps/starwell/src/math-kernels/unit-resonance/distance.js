import {
  assertMetricConfig,
  assertNode,
  normaliseWeight,
  readVectorValue,
} from './validation.js';

export function weightedDistance(a, b, config) {
  assertMetricConfig(config);

  const sum = config.dimensions.reduce((total, dimension, index) => {
    const weight = normaliseWeight(config.weights?.[dimension]);
    const left = readVectorValue(a, index, dimension);
    const right = readVectorValue(b, index, dimension);
    const delta = left - right;

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
  return Math.abs(distance - config.unitDistance);
}

export function isUnitDistance(distance, config) {
  return unitDelta(distance, config) <= config.tolerance;
}
