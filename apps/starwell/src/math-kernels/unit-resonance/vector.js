import { isFiniteNumber, readDimensionKey } from './validation.js';

export function makeVectorFromRecord(record = {}, dimensions = [], fallback = 0) {
  return dimensions.map((dimension, index) => {
    const key = readDimensionKey(dimension, index);
    const value = record?.[key];
    return isFiniteNumber(value) ? value : fallback;
  });
}

export function vectorToRecord(vector = [], dimensions = []) {
  return dimensions.reduce((record, dimension, index) => {
    const key = readDimensionKey(dimension, index);
    record[key] = isFiniteNumber(vector[index]) ? vector[index] : 0;
    return record;
  }, {});
}

export function mergeVectorRecords(...records) {
  return records.reduce((merged, record) => {
    if (!record || typeof record !== 'object') return merged;

    for (const [key, value] of Object.entries(record)) {
      if (isFiniteNumber(value)) merged[key] = value;
    }

    return merged;
  }, {});
}

export function scaleVector(vector = [], scale = 1) {
  const safeScale = isFiniteNumber(scale) ? scale : 1;
  return vector.map((value) => (isFiniteNumber(value) ? value * safeScale : 0));
}

export function vectorMagnitude(vector = []) {
  const sum = vector.reduce((total, value) => {
    const safeValue = isFiniteNumber(value) ? value : 0;
    return total + safeValue * safeValue;
  }, 0);

  return Math.sqrt(sum);
}
