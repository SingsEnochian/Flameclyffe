export const CANONICAL_SPINE_SCHEMA = 'flameclyffe.canonical-spine.v0.1';
export const CANON_STATES = Object.freeze(['canonical', 'experimental', 'planned', 'deprecated', 'scrapped', 'external']);
export const IMPLEMENTATION_STATES = Object.freeze(['implemented', 'partial', 'stub', 'blocked', 'not-started', 'planned', 'retired']);
export const VISIBILITY_STATES = Object.freeze(['shared', 'private', 'restricted', 'source-protected']);
export const CONFIDENCE_STATES = Object.freeze(['low', 'medium', 'high']);
export const EDGE_TYPES = Object.freeze([
  'owns', 'contains', 'depends_on', 'implements', 'observes', 'describes_state_of',
  'compiles_state_for', 'routes_to', 'inherits_from', 'supersedes', 'conflicts_with',
  'equivalent_to', 'related_to', 'knows_about', 'restricted_by',
]);

const CANON_SET = new Set(CANON_STATES);
const IMPLEMENTATION_SET = new Set(IMPLEMENTATION_STATES);
const VISIBILITY_SET = new Set(VISIBILITY_STATES);
const CONFIDENCE_SET = new Set(CONFIDENCE_STATES);
const EDGE_SET = new Set(EDGE_TYPES);

export function normaliseCanonicalLabel(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(record, field, path, errors) {
  if (typeof record?.[field] !== 'string' || !record[field].trim()) errors.push(`${path}.${field} must be a non-empty string`);
}

function requireStringArray(record, field, path, errors) {
  if (!Array.isArray(record?.[field]) || record[field].some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push(`${path}.${field} must be an array of non-empty strings`);
  }
}

function allowed(record, field, values, path, errors) {
  if (!values.has(record?.[field])) errors.push(`${path}.${field} has unsupported value ${JSON.stringify(record?.[field])}`);
}

export function detectCanonicalLabelCollisions(graph) {
  const byLabel = new Map();
  for (const node of graph.nodes || []) {
    const key = normaliseCanonicalLabel(node.name);
    if (!key) continue;
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key).push(node);
  }
  const explicitPairs = new Set();
  for (const edge of graph.edges || []) {
    if (!['equivalent_to', 'supersedes', 'conflicts_with'].includes(edge.type)) continue;
    explicitPairs.add([edge.from, edge.to].sort().join('::'));
  }
  return [...byLabel.entries()]
    .filter(([, nodes]) => nodes.length > 1)
    .map(([label, nodes]) => ({
      label,
      nodeIds: nodes.map((node) => node.id),
      unresolvedPairs: nodes.flatMap((node, index) => nodes.slice(index + 1).map((other) => [node.id, other.id]))
        .filter(([a, b]) => !explicitPairs.has([a, b].sort().join('::'))),
    }))
    .filter((collision) => collision.unresolvedPairs.length > 0);
}

export function auditCanonicalSpine(graph) {
  const errors = [];
  const warnings = [];
  if (!isObject(graph)) return { errors: ['root must be an object'], warnings, collisions: [] };
  if (graph.schema !== CANONICAL_SPINE_SCHEMA) errors.push(`schema must equal ${CANONICAL_SPINE_SCHEMA}`);
  requireString(graph, 'updatedAt', 'root', errors);
  requireString(graph, 'architecturalRule', 'root', errors);
  if (!Array.isArray(graph.nodes)) errors.push('root.nodes must be an array');
  if (!Array.isArray(graph.edges)) errors.push('root.edges must be an array');
  if (!Array.isArray(graph.knowledgeBoundaries)) errors.push('root.knowledgeBoundaries must be an array');
  if (!Array.isArray(graph.receipts)) errors.push('root.receipts must be an array');

  const ids = new Set();
  for (const [index, node] of (graph.nodes || []).entries()) {
    const path = `nodes[${index}]`;
    if (!isObject(node)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['id', 'name', 'kind', 'summary', 'owner']) requireString(node, field, path, errors);
    requireStringArray(node, 'sourceRefs', path, errors);
    requireStringArray(node, 'tags', path, errors);
    allowed(node, 'canonStatus', CANON_SET, path, errors);
    allowed(node, 'implementationStatus', IMPLEMENTATION_SET, path, errors);
    allowed(node, 'visibility', VISIBILITY_SET, path, errors);
    if (ids.has(node.id)) errors.push(`${path}.id duplicates ${node.id}`);
    ids.add(node.id);
    if (!node.createdAt) warnings.push(`${path} (${node.id}) has no createdAt`);
    if (!node.updatedAt) warnings.push(`${path} (${node.id}) has no updatedAt`);
  }

  for (const [index, node] of (graph.nodes || []).entries()) {
    if (node.owner && !ids.has(node.owner)) warnings.push(`nodes[${index}] (${node.id}) owner ${node.owner} is not a graph node`);
  }

  const edgeKeys = new Set();
  for (const [index, edge] of (graph.edges || []).entries()) {
    const path = `edges[${index}]`;
    if (!isObject(edge)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['from', 'to', 'type', 'meaning']) requireString(edge, field, path, errors);
    requireStringArray(edge, 'sourceRefs', path, errors);
    if (!EDGE_SET.has(edge.type)) errors.push(`${path}.type has unsupported value ${JSON.stringify(edge.type)}`);
    allowed(edge, 'confidence', CONFIDENCE_SET, path, errors);
    if (edge.from && !ids.has(edge.from)) errors.push(`${path}.from references missing node ${edge.from}`);
    if (edge.to && !ids.has(edge.to)) errors.push(`${path}.to references missing node ${edge.to}`);
    const key = `${edge.from}::${edge.type}::${edge.to}`;
    if (edgeKeys.has(key)) errors.push(`${path} duplicates relationship ${key}`);
    edgeKeys.add(key);
    if (!edge.createdAt) warnings.push(`${path} (${key}) has no createdAt`);
    if (!edge.updatedAt) warnings.push(`${path} (${key}) has no updatedAt`);
  }

  const boundaryIds = new Set();
  for (const [index, boundary] of (graph.knowledgeBoundaries || []).entries()) {
    const path = `knowledgeBoundaries[${index}]`;
    if (!isObject(boundary)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['id', 'holder', 'affectedTopic', 'sourceCategory', 'restrictionReason']) requireString(boundary, field, path, errors);
    if (typeof boundary.actionable !== 'boolean') errors.push(`${path}.actionable must be boolean`);
    allowed(boundary, 'confidence', CONFIDENCE_SET, path, errors);
    if (boundary.visibility) allowed(boundary, 'visibility', VISIBILITY_SET, path, errors);
    if (boundaryIds.has(boundary.id)) errors.push(`${path}.id duplicates ${boundary.id}`);
    boundaryIds.add(boundary.id);
    if ('protectedContent' in boundary || 'content' in boundary || 'secret' in boundary) {
      errors.push(`${path} contains a protected-content field; boundary records describe topology only`);
    }
  }

  const receiptIds = new Set();
  for (const [index, receipt] of (graph.receipts || []).entries()) {
    const path = `receipts[${index}]`;
    if (!isObject(receipt)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['id', 'actor', 'timestamp', 'operation', 'target', 'reason']) requireString(receipt, field, path, errors);
    if (receiptIds.has(receipt.id)) errors.push(`${path}.id duplicates ${receipt.id}`);
    receiptIds.add(receipt.id);
    if (!isObject(receipt.provenance)) errors.push(`${path}.provenance must be an object`);
    if (!isObject(receipt.validationResult)) errors.push(`${path}.validationResult must be an object`);
  }

  const collisions = detectCanonicalLabelCollisions(graph);
  for (const collision of collisions) warnings.push(`unresolved semantic label collision "${collision.label}": ${collision.nodeIds.join(', ')}`);
  return { errors, warnings, collisions };
}

export function indexCanonicalSpine(graph) {
  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const outgoing = new Map();
  const incoming = new Map();
  for (const edge of graph.edges || []) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }
  return { nodes, outgoing, incoming };
}

export function canonicalNode(graph, id) {
  return (graph.nodes || []).find((node) => node.id === id) || null;
}

export function canonicalRelations(graph, id) {
  const index = indexCanonicalSpine(graph);
  return {
    outgoing: index.outgoing.get(id) || [],
    incoming: index.incoming.get(id) || [],
  };
}

export function canonicalKnowledgeBoundaries(graph, topicOrHolder) {
  return (graph.knowledgeBoundaries || []).filter((boundary) =>
    boundary.affectedTopic === topicOrHolder || boundary.holder === topicOrHolder,
  );
}
