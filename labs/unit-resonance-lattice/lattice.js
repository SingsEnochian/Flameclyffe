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
          kind: 'resonance',
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
      if (windowConfig.requireVisible && node.meta?.visible === false) return false;
      if (windowConfig.requireConsent && node.meta?.consent === false) return false;
      if (includeIds?.has(node.id)) return true;
      if (includeKinds && !includeKinds.has(node.kind)) return false;
      return true;
    })
    .slice(0, limit);
}

export function buildNodeMap(nodes = []) {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function buildChildrenMap(nodes = []) {
  const children = new Map();
  nodes.forEach((node) => {
    const parentId = node.parentId ?? node.meta?.parentId ?? null;
    if (!parentId) return;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(node);
  });

  children.forEach((siblings) => {
    siblings.sort((left, right) => finiteNumber(left.order ?? left.meta?.order, 0) - finiteNumber(right.order ?? right.meta?.order, 0) || left.id.localeCompare(right.id));
  });

  return children;
}

export function ancestorIds(nodeId, nodes = []) {
  const map = buildNodeMap(nodes);
  const ancestors = [];
  let current = map.get(nodeId);
  const seen = new Set();

  while (current) {
    const parentId = current.parentId ?? current.meta?.parentId ?? null;
    if (!parentId || seen.has(parentId)) break;
    seen.add(parentId);
    ancestors.unshift(parentId);
    current = map.get(parentId);
  }

  return ancestors;
}

export function selectTreeNodes(nodes = [], treeConfig = {}, state = {}) {
  const rootId = treeConfig.rootId ?? nodes[0]?.id;
  const openIds = new Set([rootId, ...(treeConfig.defaultOpenIds ?? []), ...(state.openIds ?? [])].filter(Boolean));
  const focusId = state.focusId ?? treeConfig.defaultFocusId ?? rootId;
  ancestorIds(focusId, nodes).forEach((id) => openIds.add(id));

  const map = buildNodeMap(nodes);
  const children = buildChildrenMap(nodes);
  const visible = [];
  const walk = (id, depth = 0) => {
    const node = map.get(id);
    if (!node) return;
    const childNodes = children.get(id) ?? [];
    visible.push({
      ...node,
      depth,
      childIds: childNodes.map((child) => child.id),
      hasChildren: childNodes.length > 0,
      isOpen: openIds.has(id),
      isFocused: id === focusId,
      isAncestor: ancestorIds(focusId, nodes).includes(id),
    });

    if (!openIds.has(id)) return;
    childNodes.forEach((child) => walk(child.id, depth + 1));
  };

  walk(rootId, 0);
  return visible;
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

export function projectTree(nodes = [], treeConfig = {}) {
  const width = finiteNumber(treeConfig.width, 840);
  const rootY = finiteNumber(treeConfig.rootY, 590);
  const levelGap = finiteNumber(treeConfig.levelGap, 130);
  const paddingX = finiteNumber(treeConfig.paddingX, 80);
  const byDepth = new Map();

  nodes.forEach((node) => {
    const depth = Number.isInteger(node.depth) ? node.depth : 0;
    if (!byDepth.has(depth)) byDepth.set(depth, []);
    byDepth.get(depth).push(node);
  });

  return nodes.map((node) => {
    const depth = Number.isInteger(node.depth) ? node.depth : 0;
    const siblings = byDepth.get(depth) ?? [];
    const index = siblings.findIndex((candidate) => candidate.id === node.id);
    const usableWidth = Math.max(1, width - paddingX * 2);
    const x = siblings.length <= 1 ? width / 2 : paddingX + (usableWidth * (index + 1)) / (siblings.length + 1);
    const y = rootY - depth * levelGap;

    return {
      ...node,
      position: { x, y },
    };
  });
}

export function findBranchEdges(nodes = []) {
  const visibleIds = new Set(nodes.map((node) => node.id));
  const map = buildNodeMap(nodes);

  return nodes
    .map((node) => {
      const parentId = node.parentId ?? node.meta?.parentId ?? null;
      if (!parentId || !visibleIds.has(parentId)) return null;
      const parent = map.get(parentId);
      return {
        source: parentId,
        target: node.id,
        kind: 'branch',
        strength: node.isFocused || node.isAncestor || parent?.isFocused ? 1 : 0.64,
      };
    })
    .filter(Boolean);
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

export function buildLivingTreeGraph(nodes = [], config = {}, state = {}) {
  const windowed = selectWindow(nodes, config.window ?? {});
  const treeNodes = selectTreeNodes(windowed, config.tree ?? {}, state);
  const projected = projectTree(treeNodes, config.tree ?? {});
  const branchEdges = findBranchEdges(projected);
  const resonanceEdges = findUnitEdges(projected, config.metric, config.edges ?? {});

  return {
    nodes: projected,
    branchEdges,
    resonanceEdges,
    edges: [...branchEdges, ...resonanceEdges],
    metric: config.metric,
    tree: config.tree ?? {},
    window: config.window ?? {},
    state,
  };
}
