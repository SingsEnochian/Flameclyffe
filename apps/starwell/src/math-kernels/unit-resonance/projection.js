import {
  assertNode,
  isFiniteNumber,
  readDimensionKey,
  readDimensionKeys,
  readVectorValue,
} from './validation.js';

export const PROJECTION_MODE = Object.freeze({
  axis: 'axis',
  manual: 'manual',
  polar: 'polar',
  phase: 'phase',
});

function resolveDimensions(projectionConfig = {}, dimensions = []) {
  const selected = projectionConfig.dimensions || dimensions;
  if (!Array.isArray(selected) || selected.length === 0) {
    return ['x', 'y'];
  }
  return readDimensionKeys(selected);
}

function findDimensionIndex(dimensions, dimension, fallbackIndex) {
  const index = dimensions.indexOf(dimension);
  return index >= 0 ? index : fallbackIndex;
}

function projectAxis(node, projectionConfig, dimensions) {
  const resolved = resolveDimensions(projectionConfig, dimensions);
  const xDimension = resolved[0];
  const yDimension = resolved[1] || resolved[0];
  const metricDimensions = readDimensionKeys(dimensions.length ? dimensions : resolved);
  const xIndex = findDimensionIndex(metricDimensions, xDimension, 0);
  const yIndex = findDimensionIndex(metricDimensions, yDimension, 1);

  return {
    x: readVectorValue(node.vector, xIndex, xDimension),
    y: readVectorValue(node.vector, yIndex, yDimension),
  };
}

function projectManual(node) {
  const position = node.meta?.position || node.position || {};

  return {
    x: isFiniteNumber(position.x) ? position.x : 0,
    y: isFiniteNumber(position.y) ? position.y : 0,
  };
}

function projectPolar(node, projectionConfig, dimensions) {
  const resolved = resolveDimensions(projectionConfig, dimensions);
  const radiusDimension = resolved[0];
  const angleDimension = resolved[1] || resolved[0];
  const metricDimensions = readDimensionKeys(dimensions.length ? dimensions : resolved);
  const radiusIndex = findDimensionIndex(metricDimensions, radiusDimension, 0);
  const angleIndex = findDimensionIndex(metricDimensions, angleDimension, 1);
  const radius = Math.max(0, readVectorValue(node.vector, radiusIndex, radiusDimension));
  const angleTurns = readVectorValue(node.vector, angleIndex, angleDimension);
  const angle = angleTurns * Math.PI * 2;

  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

function projectPhase(node, projectionConfig, dimensions) {
  const resolved = resolveDimensions(projectionConfig, dimensions);
  const phaseDimension = resolved[0];
  const amplitudeDimension = resolved[1] || resolved[0];
  const metricDimensions = readDimensionKeys(dimensions.length ? dimensions : resolved);
  const phaseIndex = findDimensionIndex(metricDimensions, phaseDimension, 0);
  const amplitudeIndex = findDimensionIndex(metricDimensions, amplitudeDimension, 1);
  const phase = readVectorValue(node.vector, phaseIndex, phaseDimension) * Math.PI * 2;
  const amplitude = Math.max(0, readVectorValue(node.vector, amplitudeIndex, amplitudeDimension, 1));

  return {
    x: amplitude * Math.cos(phase),
    y: amplitude * Math.sin(phase),
  };
}

export function projectNode(node, projectionConfig = {}, dimensions = []) {
  assertNode(node);

  switch (projectionConfig.mode) {
    case PROJECTION_MODE.manual:
      return projectManual(node);
    case PROJECTION_MODE.polar:
      return projectPolar(node, projectionConfig, dimensions);
    case PROJECTION_MODE.phase:
      return projectPhase(node, projectionConfig, dimensions);
    case PROJECTION_MODE.axis:
    default:
      return projectAxis(node, projectionConfig, dimensions);
  }
}

export function projectToPlane(nodes = [], projectionConfig = {}, dimensions = []) {
  return nodes.map((node) => ({
    ...node,
    position: projectNode(node, projectionConfig, dimensions),
  }));
}
