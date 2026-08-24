export const WORLD_LINEAGE_GRAPH_SCHEMA = 'arcsweep.world-lineage-graph/v1';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function buildWorldLineageGraph(worlds = []) {
  const valid = worlds.filter((world) => world?.id).map((world) => ({
    id: world.id,
    name: text(world.name) || world.id,
    parentWorldId: text(world.parentWorldId) || null,
    parentSeedFingerprint: text(world.parentSeedFingerprint),
    worldseedFingerprint: text(world.worldseedFingerprint),
    branchPoint: text(world.branchPoint),
    lineageLabel: text(world.lineageLabel),
    forkReason: text(world.forkReason),
    declaredDescendantWorldIds: unique(Array.isArray(world.descendantWorldIds) ? world.descendantWorldIds : []),
  }));

  const byId = new Map(valid.map((world) => [world.id, world]));
  const childrenByParent = new Map(valid.map((world) => [world.id, []]));
  const danglingParents = [];

  for (const world of valid) {
    if (!world.parentWorldId) continue;
    if (!byId.has(world.parentWorldId)) {
      danglingParents.push({ worldId: world.id, parentWorldId: world.parentWorldId });
      continue;
    }
    childrenByParent.get(world.parentWorldId).push(world.id);
  }

  const nodes = valid.map((world) => {
    const inferredChildren = unique(childrenByParent.get(world.id) || []);
    const declaredChildren = world.declaredDescendantWorldIds;
    return {
      ...world,
      childWorldIds: inferredChildren,
      undeclaredChildWorldIds: inferredChildren.filter((id) => !declaredChildren.includes(id)),
      staleDeclaredChildWorldIds: declaredChildren.filter((id) => !inferredChildren.includes(id)),
    };
  });

  const cycleWorldIds = [];
  for (const world of valid) {
    const seen = new Set();
    let cursor = world;
    while (cursor?.parentWorldId && byId.has(cursor.parentWorldId)) {
      if (seen.has(cursor.id)) {
        cycleWorldIds.push(world.id);
        break;
      }
      seen.add(cursor.id);
      cursor = byId.get(cursor.parentWorldId);
    }
  }

  return {
    schema: WORLD_LINEAGE_GRAPH_SCHEMA,
    version: 1,
    nodes,
    roots: nodes.filter((node) => !node.parentWorldId).map((node) => node.id),
    danglingParents,
    cycleWorldIds: unique(cycleWorldIds),
    healthy: danglingParents.length === 0 && cycleWorldIds.length === 0,
  };
}

export function lineagePath(worlds, worldId) {
  const graph = buildWorldLineageGraph(worlds);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const path = [];
  const seen = new Set();
  let cursor = byId.get(worldId);

  while (cursor) {
    if (seen.has(cursor.id)) throw new Error(`World lineage cycle detected at ${cursor.id}.`);
    seen.add(cursor.id);
    path.unshift(cursor.id);
    cursor = cursor.parentWorldId ? byId.get(cursor.parentWorldId) : null;
  }

  return path;
}
