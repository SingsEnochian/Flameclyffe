import { assertNode, isFiniteNumber, readVectorValue } from './validation.js';

export const PROJECTION_MODE = Object.freeze({
  axis: 'axis',
  manual: 'manual',
  polar: 'polar',
  phase: 'phase',
});

function projectAxis(node, projectionConfig, dimensions) {
  const [xDimension = dimensions[0], yDimension = dimensions[1] || dimensions[0]] = projectionConfig.dimensions || dimensions;
  const xIndex = dimensions.indexOf(xDimension);
  const yIndex = dimensions.indexOf(yDimension);

  return {
    x: readVectorValue(node.vector, xIndex < 0 ? 0 : xIndex, xDimension),
    y: readVectorValue(node.vector, yIndex < 0 ? 1 : yIndex, yDimension),
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
  const [radiusDimension = dimensions[0], angleDimension = dimensions[1] || dimensions[0]] = projectionConfig.dimensions || dimensions;
  const radiusIndex = dimensions.indexOf(radiusDimension);
  const angleIndex = dimensions.indexOf(angleDimension);
  const radius = Math.max(0, readVectorValue(node.vector, radiusIndex < 0 ? 0 : radiusIndex, radiusDimension));
  const angleTurns = readVectorValue(node.vector, angleIndex < 0 ? 1 : angleIndex, angleDimension);
  const angle = angleTurns * Math.PI * 2;

  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

function projectPhase(node, projectionConfig, dimensions) {
  const [phaseDimension = dimensions[0], amplitudeDimension = dimensions[1] || dimensions[0]] = projectionConfig.dimensions || dimensions;
  const phaseIndex = dimensions.indexOf(phaseDimension);
  const amplitudeIndex = dimensions.indexOf(amplitudeDimension);
  const phase = readVectorValue(node.vector, phaseIndex < 0 ? 0 : phaseIndex, phaseDimension) * Math.PI * 2;
  const amplitude = readVectorValue(node.vector, amplitudeIndex < 0 ? 1 : amplitudeIndex, amplitudeDimension, 1) || 1;

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
