export function selectResonanceWindow(nodes = [], windowConfig = {}) {
  const includeKinds = windowConfig.includeKinds ? new Set(windowConfig.includeKinds) : null;
  const includeIds = windowConfig.includeIds ? new Set(windowConfig.includeIds) : null;
  const excludeIds = windowConfig.excludeIds ? new Set(windowConfig.excludeIds) : null;
  const limit = windowConfig.limit ?? nodes.length;

  return nodes
    .filter((node) => {
      if (excludeIds?.has(node.id)) return false;
      if (includeIds?.has(node.id)) return true;
      if (includeKinds && !includeKinds.has(node.kind)) return false;
      if (windowConfig.requireVisible && node.meta?.visible === false) return false;
      if (windowConfig.requireConsent && node.meta?.consent === false) return false;
      return true;
    })
    .slice(0, limit);
}

export function makeBoundedGraphInput(nodes = [], config = {}) {
  return selectResonanceWindow(nodes, config.window || {});
}
