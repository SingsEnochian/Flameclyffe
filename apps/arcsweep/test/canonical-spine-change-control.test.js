import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCanonicalSpineChangeRequest,
  createCanonicalSpineChangeReview,
  previewCanonicalSpineChange,
} from '../src/canonical-spine-change-control.js';

function baseGraph() {
  return {
    schema: 'flameclyffe.canonical-spine.v0.1',
    updatedAt: '2026-09-14',
    architecturalRule: 'legibility before capability',
    _mirror: { sourceFingerprint: `sha256:${'a'.repeat(64)}` },
    nodes: [
      {
        id: 'system:root',
        name: 'Root',
        kind: 'system',
        summary: 'Root system.',
        owner: 'system:root',
        canonStatus: 'canonical',
        implementationStatus: 'implemented',
        visibility: 'shared',
        sourceRefs: ['test'],
        createdAt: '2026-09-14',
        updatedAt: '2026-09-14',
        tags: ['test'],
      },
    ],
    edges: [],
    knowledgeBoundaries: [],
    receipts: [],
  };
}

function validNode(id = 'system:new') {
  return {
    id,
    name: 'New System',
    kind: 'system',
    summary: 'Proposed system.',
    owner: id,
    canonStatus: 'experimental',
    implementationStatus: 'not-started',
    visibility: 'shared',
    sourceRefs: ['proposal:test'],
    createdAt: '2026-09-14T04:00:00-04:00',
    updatedAt: '2026-09-14T04:00:00-04:00',
    tags: ['proposal'],
  };
}

test('change preview never mutates the source graph', () => {
  const graph = baseGraph();
  const before = structuredClone(graph);
  const request = {
    schema: 'arcsweep.canonical-spine-change-request/v1',
    actor: 'agent:caretaker',
    operation: 'add_node',
    payload: validNode(),
    reason: 'Preview a valid change without mutating the source graph.',
    base_fingerprint: graph._mirror.sourceFingerprint,
    created_at: '2026-09-14T04:00:00-04:00',
  };
  const preview = previewCanonicalSpineChange(graph, request);
  assert.equal(preview.valid, true);
  assert.equal(preview.graph.nodes.length, 2);
  assert.deepEqual(graph, before);
});

test('change requests are fingerprinted and remain pending review', async () => {
  const { request, preview } = await createCanonicalSpineChangeRequest({
    graph: baseGraph(),
    actor: 'agent:caretaker',
    operation: 'add_node',
    payload: validNode(),
    reason: 'Make a missing subsystem explicit.',
    createdAt: '2026-09-14T04:00:00-04:00',
  });
  assert.equal(request.status, 'pending-review');
  assert.match(request.request_id, /^spine-change:[0-9a-f]{24}$/);
  assert.match(request.request_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(request.base_fingerprint, `sha256:${'a'.repeat(64)}`);
  assert.equal(preview.valid, true);
});

test('invalid edge proposals fail before entering review', async () => {
  await assert.rejects(
    createCanonicalSpineChangeRequest({
      graph: baseGraph(),
      actor: 'agent:caretaker',
      operation: 'add_edge',
      payload: {
        from: 'system:root',
        to: 'system:missing',
        type: 'depends_on',
        meaning: 'Should fail.',
        confidence: 'high',
        sourceRefs: ['test'],
        createdAt: '2026-09-14T04:00:00-04:00',
        updatedAt: '2026-09-14T04:00:00-04:00',
      },
      reason: 'Test a broken endpoint.',
    }),
    /proposed graph is invalid/,
  );
});

test('knowledge-boundary proposals reject protected content', async () => {
  await assert.rejects(
    createCanonicalSpineChangeRequest({
      graph: baseGraph(),
      actor: 'agent:caretaker',
      operation: 'add_knowledge_boundary',
      payload: {
        id: 'boundary:test',
        holder: 'agent:test',
        affectedTopic: 'topic:test',
        sourceCategory: 'source-protected',
        restrictionReason: 'source-protected',
        actionable: false,
        confidence: 'medium',
        content: 'this must never be stored here',
      },
      reason: 'Test topology-only enforcement.',
    }),
    /topology only/,
  );
});

test('reviews are immutable fingerprinted decisions, not mutations', async () => {
  const { request } = await createCanonicalSpineChangeRequest({
    graph: baseGraph(),
    actor: 'agent:caretaker',
    operation: 'add_node',
    payload: validNode(),
    reason: 'Make a missing subsystem explicit.',
    createdAt: '2026-09-14T04:00:00-04:00',
  });
  const review = await createCanonicalSpineChangeReview({
    request,
    reviewer: 'human:steward',
    decision: 'approved',
    notes: 'Semantics and ownership checked.',
    reviewedAt: '2026-09-14T04:05:00-04:00',
  });
  assert.equal(review.request_id, request.request_id);
  assert.equal(review.decision, 'approved');
  assert.match(review.review_id, /^spine-review:[0-9a-f]{24}$/);
  assert.match(review.review_fingerprint, /^sha256:[0-9a-f]{64}$/);
});
