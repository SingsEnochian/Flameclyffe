import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const REACTION_GRAPH_SNAPSHOT_SCHEMA = 'reaction.projection-graph-snapshot/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_GRAPH_SNAPSHOT: ${message}`);
}

function clone(value) {
  return structuredClone(value);
}

function edgeSortKey(edge) {
  return [
    String(edge?.to ?? ''),
    String(edge?.corridor_id ?? ''),
    String(edge?.direction ?? ''),
    String(edge?.blocked ?? false),
    JSON.stringify(edge),
  ].join('|');
}

export async function createProjectionGraphSnapshot({
  graph,
  createdAt = new Date().toISOString(),
  source = 'react-ion-helm',
} = {}) {
  invariant(graph && typeof graph === 'object' && !Array.isArray(graph), 'graph must be an object');
  invariant(!Number.isNaN(Date.parse(createdAt)), 'createdAt must be an ISO-compatible timestamp');
  const nodes = Object.keys(graph).sort().map((from) => {
    const edges = Array.isArray(graph[from]) ? graph[from].map(clone) : [];
    edges.sort((left, right) => edgeSortKey(left).localeCompare(edgeSortKey(right)));
    return Object.freeze({ from, edges: Object.freeze(edges.map((edge) => Object.freeze(edge))) });
  });
  const core = {
    schema: REACTION_GRAPH_SNAPSHOT_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt).toISOString(),
    source: String(source || 'react-ion-helm'),
    node_count: nodes.length,
    edge_count: nodes.reduce((sum, node) => sum + node.edges.length, 0),
    nodes: Object.freeze(nodes),
    authority: Object.freeze({
      snapshot_scope: 'projection-routing-graph',
      replay_basis: 'captured-routing-state',
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    snapshot_id: `reaction-graph-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export function projectionGraphFromSnapshot(snapshot) {
  invariant(snapshot?.schema === REACTION_GRAPH_SNAPSHOT_SCHEMA, 'a React-ion graph snapshot is required');
  invariant(Array.isArray(snapshot.nodes), 'snapshot nodes are required');
  const graph = {};
  for (const node of snapshot.nodes) {
    const from = String(node?.from ?? '').trim();
    invariant(from, 'snapshot node source address is required');
    invariant(Array.isArray(node.edges), `snapshot edges for ${from} must be an array`);
    graph[from] = node.edges.map((edge) => clone(edge));
  }
  return graph;
}
