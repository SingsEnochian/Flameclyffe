import { auditCanonicalSpine } from './canonical-spine-core.js';

export const CANONICAL_SPINE_CHANGE_REQUEST_SCHEMA = 'arcsweep.canonical-spine-change-request/v1';
export const CANONICAL_SPINE_CHANGE_REVIEW_SCHEMA = 'arcsweep.canonical-spine-change-review/v1';
export const CANONICAL_SPINE_OPERATIONS = Object.freeze(['add_node', 'update_node', 'retire_node', 'add_edge', 'add_knowledge_boundary']);
export const CANONICAL_SPINE_REVIEW_DECISIONS = Object.freeze(['approved', 'adjust', 'rejected']);

const OPERATIONS = new Set(CANONICAL_SPINE_OPERATIONS);
const DECISIONS = new Set(CANONICAL_SPINE_REVIEW_DECISIONS);

export function copyCanonicalValue(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function canonicaliseCanonicalValue(value) {
  if (Array.isArray(value)) return `[${value.map(canonicaliseCanonicalValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicaliseCanonicalValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(`CANONICAL_SPINE_CHANGE: ${message}`);
}

function nodeIndex(graph, id) {
  return (graph.nodes || []).findIndex((node) => node.id === id);
}

export function assertCanonicalSpineChangeRequestShape(request) {
  invariant(request?.schema === CANONICAL_SPINE_CHANGE_REQUEST_SCHEMA, 'unsupported request schema');
  invariant(OPERATIONS.has(request.operation), `unsupported operation ${request.operation}`);
  invariant(typeof request.actor === 'string' && request.actor.trim(), 'actor is required');
  invariant(typeof request.reason === 'string' && request.reason.trim(), 'reason is required');
  invariant(typeof request.created_at === 'string' && request.created_at.trim(), 'created_at is required');
  invariant(typeof request.base_fingerprint === 'string' && /^sha256:[0-9a-f]{64}$/u.test(request.base_fingerprint), 'valid base_fingerprint is required');
  return true;
}

export function assertCanonicalSpineChangeReviewShape(review) {
  invariant(review?.schema === CANONICAL_SPINE_CHANGE_REVIEW_SCHEMA, 'unsupported review schema');
  invariant(typeof review.request_id === 'string' && review.request_id.trim(), 'review request_id is required');
  invariant(typeof review.request_fingerprint === 'string' && /^sha256:[0-9a-f]{64}$/u.test(review.request_fingerprint), 'valid review request_fingerprint is required');
  invariant(typeof review.reviewer === 'string' && review.reviewer.trim(), 'reviewer is required');
  invariant(DECISIONS.has(review.decision), `unsupported review decision ${review.decision}`);
  invariant(typeof review.reviewed_at === 'string' && review.reviewed_at.trim(), 'reviewed_at is required');
  return true;
}

export function applyCanonicalSpineChange(graphInput, request) {
  assertCanonicalSpineChangeRequestShape(request);
  const graph = copyCanonicalValue(graphInput);
  delete graph._mirror;

  if (request.operation === 'add_node') {
    invariant(request.payload?.id, 'add_node requires payload.id');
    invariant(nodeIndex(graph, request.payload.id) < 0, `node already exists: ${request.payload.id}`);
    graph.nodes.push(copyCanonicalValue(request.payload));
  } else if (request.operation === 'update_node') {
    const index = nodeIndex(graph, request.target);
    invariant(index >= 0, `missing node: ${request.target}`);
    invariant(!request.payload?.id || request.payload.id === request.target, 'node id is immutable');
    graph.nodes[index] = { ...graph.nodes[index], ...copyCanonicalValue(request.payload || {}), id: request.target };
  } else if (request.operation === 'retire_node') {
    const index = nodeIndex(graph, request.target);
    invariant(index >= 0, `missing node: ${request.target}`);
    graph.nodes[index] = {
      ...graph.nodes[index],
      canonStatus: 'deprecated',
      implementationStatus: 'retired',
      updatedAt: request.created_at,
    };
  } else if (request.operation === 'add_edge') {
    invariant(request.payload?.from && request.payload?.to && request.payload?.type, 'add_edge requires from, to, and type');
    graph.edges.push(copyCanonicalValue(request.payload));
  } else if (request.operation === 'add_knowledge_boundary') {
    const payload = request.payload || {};
    invariant(!('content' in payload) && !('protectedContent' in payload) && !('secret' in payload), 'boundary payload may describe topology only');
    graph.knowledgeBoundaries.push(copyCanonicalValue(payload));
  }

  graph.updatedAt = request.created_at;
  const audit = auditCanonicalSpine(graph);
  return { graph, audit, valid: audit.errors.length === 0 };
}

export function assertApprovedCanonicalSpineChange(request, review) {
  assertCanonicalSpineChangeRequestShape(request);
  assertCanonicalSpineChangeReviewShape(review);
  invariant(review.request_id === request.request_id, 'review does not target request id');
  invariant(review.request_fingerprint === request.request_fingerprint, 'review does not target request fingerprint');
  invariant(review.decision === 'approved', `review decision is ${review.decision}, not approved`);
  return true;
}
