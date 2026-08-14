import assert from 'node:assert/strict';
import test from 'node:test';

import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { createProvenanceBundle } from '../src/receipt-provenance-graph.js';
import { verifyProvenanceBundle, verifyProvenanceGraph } from '../src/receipt-integrity.js';

async function askReceipt() {
  const core = {
    schema: 'arcsweep.transformation-request/v1',
    schema_version: 1,
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    requested_at: '2026-08-14T10:00:00.000Z',
    request: { description: 'Increase coherence.', status: 'requested-not-observed', domain: 'story-world' },
    target: { axes: ['R'], direction: 'increase', minimum_delta: 0.03 },
    intervention: { type: 'test', strength: 0.35, duration_cycles: 3, control_input: { P: 0, C: 0, R: 0.35, E: 0, M: 0, A: 0, Q: 0 } },
    baseline: { premaqc_id: 'p1', receipt_id: 'pr1', sequence: 1, observed_at: '2026-08-14T09:59:00.000Z', state: { P: .7, C: .7, R: .7, E: .3, M: .7, A: .7, Q: .7 } },
    authority: { requested_by: 'Rowan', consent_recorded: true, request_is_observation: false, request_is_success: false, may_rewrite_premaqc: false, canon_commit: false },
    bounds: { maximum_cycles: 3, stop_conditions: ['Feather'] },
    observability: { axes: ['R'], minimum_delta: 0.03 },
    waking_world: null,
    gate: { gates: { authority: true, consent: true, boundedness: true, observability: true, stop: true, waking_world_grounding: true }, admitted: true },
  };
  const fingerprint = await sha256Hex(core);
  return { ...core, request_id: `arcsweep-request-${fingerprint.slice(0, 24)}`, request_fingerprint: fingerprint };
}

function graphFor(receipt) {
  return {
    schema: 'arcsweep.receipt-provenance-graph/v1',
    world_id: 'terra-aeterna',
    nodes: [{ id: receipt.request_id, kind: 'ask', label: 'Ask', stage: 0, receipt, world_id: 'terra-aeterna', timestamp: receipt.requested_at }],
    edges: [],
    unresolved_edges: [],
    collisions: [],
    summary: { node_count: 1, edge_count: 0, unresolved_edge_count: 0, collision_count: 0, by_kind: { ask: 1 } },
    authority: { derived_view_only: true },
  };
}

test('receipt integrity replays a transformation Ask fingerprint', async () => {
  const receipt = await askReceipt();
  const report = await verifyProvenanceGraph(graphFor(receipt), { generatedAt: '2026-08-14T10:10:00.000Z' });
  assert.equal(report.status, 'PASS');
  assert.equal(report.counts.verified, 1);
  assert.equal(report.counts.mismatch, 0);
});

test('receipt integrity reports payload mutation instead of repairing it', async () => {
  const receipt = await askReceipt();
  receipt.request.description = 'Mutated after receipt.';
  const report = await verifyProvenanceGraph(graphFor(receipt), { generatedAt: '2026-08-14T10:10:00.000Z' });
  assert.equal(report.status, 'FAIL');
  assert.equal(report.counts.mismatch, 1);
  assert.equal(report.authority.mismatch_is_reported_not_repaired, true);
});

test('provenance bundle fingerprint verifies and fails after bundle mutation', async () => {
  const receipt = await askReceipt();
  const graph = graphFor(receipt);
  const bundle = await createProvenanceBundle({ graph, focusId: receipt.request_id, generatedAt: '2026-08-14T10:11:00.000Z' });
  const verified = await verifyProvenanceBundle(bundle);
  assert.equal(verified.matched, true);
  const mutated = structuredClone(bundle);
  mutated.graph.nodes[0].receipt.request.description = 'tampered';
  const failed = await verifyProvenanceBundle(mutated);
  assert.equal(failed.matched, false);
});
