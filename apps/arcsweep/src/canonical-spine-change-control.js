import {
  CANONICAL_SPINE_CHANGE_REQUEST_SCHEMA,
  CANONICAL_SPINE_CHANGE_REVIEW_SCHEMA,
  CANONICAL_SPINE_OPERATIONS,
  CANONICAL_SPINE_REVIEW_DECISIONS,
  applyCanonicalSpineChange,
  canonicaliseCanonicalValue,
  copyCanonicalValue,
} from '../../../lib/canonical-spine-change-core.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { loadCanonicalSpine } from './canonical-spine.js';
import {
  loadState,
  readPersistedStateExtension,
  saveState,
  setStateExtensionSnapshot,
} from './storage.js';

export const CANONICAL_SPINE_CONTROL_SCHEMA = 'arcsweep.canonical-spine-control/v1';
export const CANONICAL_SPINE_CONTROL_KEY = 'canonicalSpineControl';
const MAX_REQUESTS = 128;
const MAX_REVIEWS = 256;
const OPERATIONS = new Set(CANONICAL_SPINE_OPERATIONS);
const REVIEW_DECISIONS = new Set(CANONICAL_SPINE_REVIEW_DECISIONS);

function invariant(condition, message) {
  if (!condition) throw new Error(`CANONICAL_SPINE_CONTROL: ${message}`);
}

export function createEmptyCanonicalSpineControl() {
  return {
    schema: CANONICAL_SPINE_CONTROL_SCHEMA,
    requests: [],
    reviews: [],
    updated_at: null,
  };
}

export function normaliseCanonicalSpineControl(value) {
  const defaults = createEmptyCanonicalSpineControl();
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== CANONICAL_SPINE_CONTROL_SCHEMA) return defaults;
  return {
    ...defaults,
    requests: Array.isArray(value.requests) ? copyCanonicalValue(value.requests).slice(-MAX_REQUESTS) : [],
    reviews: Array.isArray(value.reviews) ? copyCanonicalValue(value.reviews).slice(-MAX_REVIEWS) : [],
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : null,
  };
}

export const previewCanonicalSpineChange = applyCanonicalSpineChange;

export async function createCanonicalSpineChangeRequest({
  graph,
  actor,
  operation,
  target = '',
  payload = {},
  reason,
  createdAt = new Date().toISOString(),
} = {}) {
  invariant(graph && typeof graph === 'object', 'graph is required');
  invariant(typeof actor === 'string' && actor.trim(), 'actor is required');
  invariant(OPERATIONS.has(operation), `unsupported operation ${operation}`);
  invariant(typeof reason === 'string' && reason.trim(), 'reason is required');
  const baseFingerprint = graph._mirror?.sourceFingerprint || null;
  invariant(baseFingerprint, 'runtime graph has no source fingerprint');

  const body = {
    schema: CANONICAL_SPINE_CHANGE_REQUEST_SCHEMA,
    actor,
    created_at: createdAt,
    operation,
    target: target || payload?.id || `${payload?.from || ''}->${payload?.to || ''}`,
    payload: copyCanonicalValue(payload),
    reason,
    base_fingerprint: baseFingerprint,
    status: 'pending-review',
  };
  const requestFingerprint = await sha256Hex(canonicaliseCanonicalValue(body));
  const request = {
    ...body,
    request_id: `spine-change:${requestFingerprint.slice(0, 24)}`,
    request_fingerprint: `sha256:${requestFingerprint}`,
  };
  const preview = applyCanonicalSpineChange(graph, request);
  invariant(preview.valid, `proposed graph is invalid: ${preview.audit.errors.join('; ')}`);
  return { request, preview };
}

export async function createCanonicalSpineChangeReview({
  request,
  reviewer,
  decision,
  notes = '',
  reviewedAt = new Date().toISOString(),
} = {}) {
  invariant(request?.request_id, 'request is required');
  invariant(typeof reviewer === 'string' && reviewer.trim(), 'reviewer is required');
  invariant(REVIEW_DECISIONS.has(decision), `unsupported review decision ${decision}`);
  const body = {
    schema: CANONICAL_SPINE_CHANGE_REVIEW_SCHEMA,
    request_id: request.request_id,
    request_fingerprint: request.request_fingerprint,
    reviewer,
    decision,
    notes: String(notes || ''),
    reviewed_at: reviewedAt,
  };
  const fingerprint = await sha256Hex(canonicaliseCanonicalValue(body));
  return {
    ...body,
    review_id: `spine-review:${fingerprint.slice(0, 24)}`,
    review_fingerprint: `sha256:${fingerprint}`,
  };
}

export async function loadCanonicalSpineControl() {
  const persisted = await readPersistedStateExtension(CANONICAL_SPINE_CONTROL_KEY);
  return normaliseCanonicalSpineControl(persisted);
}

async function persistControl(control, meta = {}) {
  const snapshot = normaliseCanonicalSpineControl(control);
  snapshot.updated_at = new Date().toISOString();
  setStateExtensionSnapshot(CANONICAL_SPINE_CONTROL_KEY, snapshot);
  const state = await loadState();
  state[CANONICAL_SPINE_CONTROL_KEY] = copyCanonicalValue(snapshot);
  await saveState(state, { reason: 'canonical-spine-control-update', ...meta });
  return copyCanonicalValue(snapshot);
}

export async function submitCanonicalSpineChange(input) {
  const graph = input?.graph || await loadCanonicalSpine();
  const { request, preview } = await createCanonicalSpineChangeRequest({ ...input, graph });
  const control = await loadCanonicalSpineControl();
  const requests = control.requests.filter((item) => item.request_id !== request.request_id);
  control.requests = [...requests, request].slice(-MAX_REQUESTS);
  await persistControl(control, {
    operation: request.operation,
    requestId: request.request_id,
    requestFingerprint: request.request_fingerprint,
    baseFingerprint: request.base_fingerprint,
  });
  return { request, preview };
}

export async function reviewCanonicalSpineChange({ requestId, reviewer, decision, notes = '' } = {}) {
  const control = await loadCanonicalSpineControl();
  const request = control.requests.find((item) => item.request_id === requestId);
  invariant(request, `request not found: ${requestId}`);
  const review = await createCanonicalSpineChangeReview({ request, reviewer, decision, notes });
  const reviews = control.reviews.filter((item) => item.review_id !== review.review_id);
  control.reviews = [...reviews, review].slice(-MAX_REVIEWS);
  await persistControl(control, {
    requestId,
    reviewId: review.review_id,
    decision,
  });
  return review;
}
