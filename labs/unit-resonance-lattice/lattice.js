const DEFAULT_EPSILON = 1e-9;

export function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function dimensionKey(dimension, index = 0) {
  if (typeof dimension === 'string' && dimension.trim()) return dimension;
  if (dimension && typeof dimension === 'object' && typeof dimension.key === 'string' && dimension.key.trim()) {
    return dimension.key;
  }
  throw new TypeError(`Dimension ${index} must be a string or an object with a key.`);
}

export function dimensionKeys(dimensions = []) {
  return dimensions.map((dimension, index) => dimensionKey(dimension, index));
}

export function validateMetric(metric) {
  if (!metric || typeof metric !== 'object') throw new TypeError('A lattice metric is required.');
  if (!Array.isArray(metric.dimensions) || metric.dimensions.length === 0) {
    throw new TypeError('A lattice metric needs at least one dimension.');
  }

  const keys = dimensionKeys(metric.dimensions);
  if (new Set(keys).size !== keys.length) throw new TypeError('Lattice metric dimensions must be unique.');

  for (const key of keys) {
    const weight = metric.weights?.[key] ?? 1;
    const scale = metric.scales?.[key] ?? 1;
    if (!Number.isFinite(weight) || weight < 0) throw new TypeError(`Invalid weight for ${key}.`);
    if (!Number.isFinite(scale) || scale <= 0) throw new TypeError(`Invalid scale for ${key}.`);
  }

  if (!Number.isFinite(metric.unitDistance) || metric.unitDistance <= 0) {
    throw new TypeError('unitDistance must be positive.');
  }
  if (!Number.isFinite(metric.tolerance) || metric.tolerance <= 0) {
    throw new TypeError('tolerance must be positive.');
  }

  return metric;
}

export function vectorValue(vector = {}, key, index = 0, fallback = 0) {
  const value = Array.isArray(vector) ? vector[index] : vector[key];
  return finiteNumber(value, fallback);
}

export function scaledWeightedDistance(leftVector, rightVector, metric) {
  validateMetric(metric);
  let sum = 0;

  metric.dimensions.forEach((dimension, index) => {
    const key = dimensionKey(dimension, index);
    const weight = finiteNumber(metric.weights?.[key], 1);
    const scale = finiteNumber(metric.scales?.[key], 1);
    const delta = (vectorValue(leftVector, key, index) - vectorValue(rightVector, key, index)) / scale;
    sum += weight * delta * delta;
  });

  return Math.sqrt(sum);
}

export function edgeStrength(distance, metric) {
  const delta = Math.abs(distance - metric.unitDistance);
  return clamp(1 - delta / metric.tolerance, 0, 1);
}

export function findUnitEdges(nodes = [], metric, options = {}) {
  validateMetric(metric);
  const tolerance = metric.tolerance + finiteNumber(metric.epsilon, DEFAULT_EPSILON);
  const edgeLimit = Number.isInteger(options.edgeLimit ?? metric.edgeLimit)
    ? options.edgeLimit ?? metric.edgeLimit
    : 96;
  const edges = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const source = nodes[i];
      const target = nodes[j];
      if (!source || !target) continue;

      const distance = scaledWeightedDistance(source.vector, target.vector, metric);
      const delta = Math.abs(distance - metric.unitDistance);

      if (delta <= tolerance) {
        edges.push({
          source: source.id,
          target: target.id,
          distance,
          delta,
          strength: edgeStrength(distance, metric),
          dimensions: explainDistance(source.vector, target.vector, metric),
        });
      }
    }
  }

  return edges
    .sort((a, b) => b.strength - a.strength || a.delta - b.delta || `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`))
    .slice(0, Math.max(0, edgeLimit));
}

export function explainDistance(leftVector, rightVector, metric) {
  return metric.dimensions.map((dimension, index) => {
    const key = dimensionKey(dimension, index);
    const left = vectorValue(leftVector, key, index);
    const right = vectorValue(rightVector, key, index);
    const weight = finiteNumber(metric.weights?.[key], 1);
    const scale = finiteNumber(metric.scales?.[key], 1);
    const scaledDelta = (left - right) / scale;
    return {
      key,
      left,
      right,
      weight,
      scale,
      contribution: weight * scaledDelta * scaledDelta,
    };
  });
}

export function selectWindow(nodes = [], windowConfig = {}) {
  const includeKinds = windowConfig.includeKinds ? new Set(windowConfig.includeKinds) : null;
  const includeIds = windowConfig.includeIds ? new Set(windowConfig.includeIds) : null;
  const excludeIds = windowConfig.excludeIds ? new Set(windowConfig.excludeIds) : null;
  const limit = Number.isInteger(windowConfig.limit) && windowConfig.limit >= 0 ? windowConfig.limit : nodes.length;

  return nodes
    .filter((node) => {
      if (!node || typeof node !== 'object') return false;
      if (excludeIds?.has(node.id)) return false;
      if (includeIds?.has(node.id)) return true;
      if (windowConfig.requireVisible && !node.meta?.visible) return false;
      if (windowConfig.requireConsent && !node.meta?.consent) return false;
      if (includeKinds && !includeKinds.has(node.kind)) return false;
      return true;
    })
    .slice(0, limit);
}

export function projectRadial(nodes = [], projection = {}) {
  const radius = finiteNumber(projection.radius, 260);
  const centre = projection.centre ?? { x: 360, y: 320 };
  const kindOrder = projection.kindOrder ?? [];
  const sorted = [...nodes].sort((left, right) => {
    const leftKind = kindOrder.indexOf(left.kind);
    const rightKind = kindOrder.indexOf(right.kind);
    const leftRank = leftKind < 0 ? kindOrder.length : leftKind;
    const rightRank = rightKind < 0 ? kindOrder.length : rightKind;
    return leftRank - rightRank || left.id.localeCompare(right.id);
  });

  return sorted.map((node, index) => {
    const angle = sorted.length <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (Math.PI * 2 * index) / sorted.length;
    const nodeRadius = radius * finiteNumber(node.meta?.radiusScale, 1);
    return {
      ...node,
      position: {
        x: centre.x + Math.cos(angle) * nodeRadius,
        y: centre.y + Math.sin(angle) * nodeRadius,
      },
    };
  });
}

export function buildLatticeGraph(nodes = [], config = {}) {
  const windowed = selectWindow(nodes, config.window ?? {});
  const projected = projectRadial(windowed, config.projection ?? {});
  const edges = findUnitEdges(projected, config.metric, config.edges ?? {});
  return {
    nodes: projected,
    edges,
    metric: config.metric,
    projection: config.projection ?? {},
    window: config.window ?? {},
  };
}
