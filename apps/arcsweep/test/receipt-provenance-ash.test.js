import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExtendedArcsweepProvenanceGraph } from '../src/receipt-provenance-extension.js';

const WORLD = 'terra-aeterna';

test('accepted DEEPTime receipts are explicitly joined to the BAI Ash they inform', () => {
  const graph = buildExtendedArcsweepProvenanceGraph({
    worldId: WORLD,
    transformations: {
      version: 1,
      byWorld: {
        [WORLD]: {
          requests: [{ request_id: 'ask-2', world: { id: WORLD }, request: { description: 'Next Ask' } }],
          responses: [],
          circuits: [{
            circuit_id: 'circuit-2',
            world: { id: WORLD },
            request: { request_id: 'ask-2' },
            feedback: { cycle_id: 'cycle-2' },
            bai: {
              receipt_id: 'bai-2',
              ash_source: 'accepted-deep-time',
              ash_source_receipt_ids: ['deep-time-1', 'deep-time-2'],
              topology: { state: 'OPEN' },
            },
          }],
        },
      },
    },
    feedbackCycles: [{ schema: 'arcsweep.feedback-cycle/v1', cycle_id: 'cycle-2', world: { id: WORLD }, turn: { mode: 'observation' } }],
    observatory: {
      deep_time_records: [
        { id: 'deep-time-1', dataset_kind: 'deep_time', world_id: WORLD, lambda: 1, time: { utc: '2026-08-14T15:00:00.000Z' }, provenance: {}, interval: {} },
        { id: 'deep-time-2', dataset_kind: 'deep_time', world_id: WORLD, lambda: 2, time: { utc: '2026-08-14T15:05:00.000Z' }, provenance: {}, interval: { previous_record_id: 'deep-time-1' } },
      ],
    },
  });

  const relations = new Set(graph.edges.map((item) => `${item.from}:${item.relation}:${item.to}`));
  assert.ok(relations.has('deep-time-1:contributes-to-ash:bai-2'));
  assert.ok(relations.has('deep-time-2:contributes-to-ash:bai-2'));
  assert.equal(graph.authority.accepted_deep_time_to_ash_provenance_included, true);
});

test('missing Ash source receipts remain unresolved rather than being invented', () => {
  const graph = buildExtendedArcsweepProvenanceGraph({
    worldId: WORLD,
    transformations: {
      version: 1,
      byWorld: {
        [WORLD]: {
          requests: [{ request_id: 'ask-3', world: { id: WORLD }, request: { description: 'Ask with missing history' } }],
          responses: [],
          circuits: [{
            circuit_id: 'circuit-3',
            world: { id: WORLD },
            request: { request_id: 'ask-3' },
            feedback: { cycle_id: 'cycle-3' },
            bai: {
              receipt_id: 'bai-3',
              ash_source: 'accepted-deep-time',
              ash_source_receipt_ids: ['missing-deep-time'],
              topology: { state: 'OPEN' },
            },
          }],
        },
      },
    },
    feedbackCycles: [{ schema: 'arcsweep.feedback-cycle/v1', cycle_id: 'cycle-3', world: { id: WORLD }, turn: { mode: 'observation' } }],
    observatory: { deep_time_records: [] },
  });

  const unresolved = graph.unresolved_edges.find((item) => item.relation === 'contributes-to-ash');
  assert.equal(unresolved?.from, 'missing-deep-time');
  assert.deepEqual(unresolved?.missing, ['missing-deep-time']);
});
