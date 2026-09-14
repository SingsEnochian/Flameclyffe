import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExtendedArcsweepProvenanceGraph } from '../src/receipt-provenance-extension.js';

const WORLD = 'terra-aeterna';

function graphWithSpineGovernance() {
  return buildExtendedArcsweepProvenanceGraph({
    worldId: WORLD,
    transformations: { version: 1, byWorld: {} },
    feedbackCycles: [],
    observatory: {},
    canonicalSpineControl: {
      schema: 'arcsweep.canonical-spine-control/v1',
      requests: [{
        request_id: 'spine-change:abc',
        operation: 'add_node',
        target: 'system:new',
        created_at: '2026-09-14T04:10:00-04:00',
      }],
      reviews: [{
        review_id: 'spine-review:def',
        request_id: 'spine-change:abc',
        decision: 'approved',
        reviewed_at: '2026-09-14T04:12:00-04:00',
      }],
    },
    canonicalSpineGraph: {
      receipts: [{
        id: 'receipt:canonical-spine:abc',
        operation: 'add_node',
        target: 'system:new',
        timestamp: '2026-09-14T04:15:00-04:00',
        provenance: {
          requestId: 'spine-change:abc',
          reviewId: 'spine-review:def',
        },
      }],
    },
  });
}

test('Spine proposal, review, and apply receipt share the Observer provenance graph', () => {
  const graph = graphWithSpineGovernance();
  const kinds = new Map(graph.nodes.map((item) => [item.id, item.kind]));
  assert.equal(kinds.get('spine-change:abc'), 'canonical_spine_change_request');
  assert.equal(kinds.get('spine-review:def'), 'canonical_spine_change_review');
  assert.equal(kinds.get('receipt:canonical-spine:abc'), 'canonical_spine_receipt');

  const relations = new Set(graph.edges.map((item) => `${item.from}:${item.relation}:${item.to}`));
  assert.ok(relations.has('spine-change:abc:reviewed-canonical-change-as:spine-review:def'));
  assert.ok(relations.has('spine-change:abc:applied-as-canonical-change:receipt:canonical-spine:abc'));
  assert.ok(relations.has('spine-review:def:authorised-canonical-change:receipt:canonical-spine:abc'));
  assert.equal(graph.authority.canonical_spine_governance_included, true);
});

test('missing Spine request/review joins stay unresolved instead of being fabricated', () => {
  const graph = buildExtendedArcsweepProvenanceGraph({
    worldId: WORLD,
    transformations: { version: 1, byWorld: {} },
    feedbackCycles: [],
    observatory: {},
    canonicalSpineControl: { requests: [], reviews: [] },
    canonicalSpineGraph: {
      receipts: [{
        id: 'receipt:canonical-spine:orphan',
        operation: 'update_node',
        timestamp: '2026-09-14T04:20:00-04:00',
        provenance: { requestId: 'spine-change:missing', reviewId: 'spine-review:missing' },
      }],
    },
  });
  const missing = graph.unresolved_edges.filter((item) => item.to === 'receipt:canonical-spine:orphan');
  assert.equal(missing.length, 2);
  assert.deepEqual(new Set(missing.flatMap((item) => item.missing)), new Set(['spine-change:missing', 'spine-review:missing']));
});
