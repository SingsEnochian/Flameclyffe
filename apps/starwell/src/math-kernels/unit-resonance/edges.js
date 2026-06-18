import { nodeDistance, unitDelta } from './distance.js';
import { assertMetricConfig, assertNode, clamp01 } from './validation.js';

export const RESONANCE_EDGE_KIND = Object.freeze({
  unit: 'unit',
  near: 'near',
  far: 'far',
  bridge: 'bridge',
});

export const DEFAULT_EDGE_LIMIT = 512;

export function classifyDistance(distance, config, thresholds = {}) {
  assertMetricConfig(config);

  const unitBand = config.tolerance;
  const nearBand = thresholds.nearBand ?? config.tolerance * 2;
  const bridgeBand = thresholds.bridgeBand ?? config.unitDistance;
  const delta = unitDelta(distance, config);

  if (delta <= unitBand) return RESONANCE_EDGE_KIND.unit;
  if (delta <= nearBand) return RESONANCE_EDGE_KIND.near;
  if (distance <= config.unitDistance + bridgeBand) return RESONANCE_EDGE_KIND.bridge;
  return RESONANCE_EDGE_KIND.far;
}

export function edgeStrength(distance, config) {
  const spread = config.tolerance > 0 ? config.tolerance : config.unitDistance;
  const delta = unitDelta(distance, config);

  return clamp01(1 - delta / spread);
}

export function findResonanceEdges(nodes = [], config, options = {}) {
  assertMetricConfig(config);
  nodes.forEach(assertNode);

  const allowedKinds = new Set(options.kinds || [RESONANCE_EDGE_KIND.unit]);
  const edgeLimit = options.edgeLimit ?? config.edgeLimit ?? DEFAULT_EDGE_LIMIT;
  const thresholds = options.thresholds || config.thresholds || {};
  const edges = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const distance = nodeDistance(nodes[i], nodes[j], config);
      const kind = classifyDistance(distance, config, thresholds);

      if (!allowedKinds.has(kind)) continue;

      edges.push({
        source: nodes[i].id,
        target: nodes[j].id,
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
