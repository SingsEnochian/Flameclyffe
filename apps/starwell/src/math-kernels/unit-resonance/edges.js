import { nodeDistance, unitDelta } from './distance.js';
import { assertMetricConfig, assertNode, clamp01, isFiniteNumber, normaliseEpsilon } from './validation.js';

export const RESONANCE_EDGE_KIND = Object.freeze({
  unit: 'unit',
  near: 'near',
  far: 'far',
  bridge: 'bridge',
});

export const DEFAULT_EDGE_LIMIT = 512;

function positiveBand(value, fallback) {
  return isFiniteNumber(value) && value > 0 ? value : fallback;
}

export function classifyDistance(distance, config, thresholds = {}) {
  assertMetricConfig(config);

  const epsilon = normaliseEpsilon(config.epsilon);
  const unitBand = config.tolerance;
  const nearBand = Math.max(unitBand, positiveBand(thresholds.nearBand, config.tolerance * 2));
  const bridgeBand = positiveBand(thresholds.bridgeBand, config.unitDistance);
  const delta = unitDelta(distance, config);

  if (delta <= unitBand + epsilon) return RESONANCE_EDGE_KIND.unit;
  if (delta <= nearBand + epsilon) return RESONANCE_EDGE_KIND.near;
  if (distance <= config.unitDistance + bridgeBand + epsilon) return RESONANCE_EDGE_KIND.bridge;
  return RESONANCE_EDGE_KIND.far;
}

export function edgeStrength(distance, config) {
  assertMetricConfig(config);
  const delta = unitDelta(distance, config);

  return clamp01(1 - delta / config.tolerance);
}

export function findResonanceEdges(nodes = [], config, options = {}) {
  assertMetricConfig(config);
  nodes.forEach((node, index) => assertNode(node, index));

  const allowedKinds = new Set(options.kinds || [RESONANCE_EDGE_KIND.unit]);
  const requestedLimit = options.edgeLimit ?? config.edgeLimit ?? DEFAULT_EDGE_LIMIT;
  const edgeLimit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : DEFAULT_EDGE_LIMIT;
  const thresholds = options.thresholds || config.thresholds || {};
  const edges = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const sourceNode = nodes[i];
      const targetNode = nodes[j];
      const distance = nodeDistance(sourceNode, targetNode, config);
      const kind = classifyDistance(distance, config, thresholds);

      if (!allowedKinds.has(kind)) continue;

      edges.push({
        source: sourceNode.id,
        target: targetNode.id,
        distance,
        kind,
        strength: edgeStrength(distance, config),
      });
    }
  }

  return edges
    .sort((left, right) => right.strength - left.strength || left.distance - right.distance)
    .slice(0, edgeLimit);
}

export function findUnitEdges(nodes = [], config, options = {}) {
  return findResonanceEdges(nodes, config, {
    ...options,
    kinds: [RESONANCE_EDGE_KIND.unit],
  });
}

export function buildResonanceGraph(nodes = [], config, options = {}) {
  const edges = findResonanceEdges(nodes, config, options);

  return {
    metricId: config.id,
    dimensions: [...config.dimensions],
    nodes,
    edges,
  };
}
