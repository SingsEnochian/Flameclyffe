import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildArcsweepProvenanceGraph,
  connectedProvenanceComponent,
  createProvenanceBundle,
} from '../src/receipt-provenance-graph.js';

const WORLD = 'terra-aeterna';
const REQUEST = 'ask-1';
const CIRCUIT = 'circuit-1';
const FEEDBACK = 'cycle-1';
const FEEDBACK_REVIEW = 'feedback-review-1';
const DEEP_TIME = 'deep-time-1';
const SWEEP = 'sweep-1';
const CANDIDATE = 'candidate-1';
const THEORY_REVIEW = 'theory-review-1';
const ADVISOR = 'advisor-1';
const RUNA = 'runa-1';

function fixture() {
  return {
    worldId: WORLD,
    transformations: {
      version: 1,
      byWorld: {
        [WORLD]: {
          requests: [{
            request_id: REQUEST,
            requested_at: '2026-08-14T10:00:00.000Z',
            world: { id: WORLD },
            request: { description: 'Increase relational coherence.' },
          }],
          circuits: [{
            circuit_id: CIRCUIT,
            created_at: '2026-08-14T10:02:00.000Z',
            world: { id: WORLD },
            request: { request_id: REQUEST },
            feedback: { cycle_id: FEEDBACK },
            cusp: { envelope_id: 'cusp-1' },
            bai: { receipt_id: 'bai-1', topology: { state: 'BRANCH' } },
            measured_response: { response_id: 'response-1', classification: { status: 'continue-observation' } },
          }],
        },
      },
    },
    feedbackCycles: [{
      schema: 'arcsweep.feedback-cycle/v1',
      cycle_id: FEEDBACK,
      cycle_fingerprint: 'f'.repeat(64),
      world: { id: WORLD },
      turn: { mode: 'observation' },
      created_at: '2026-08-14T10:02:00.000Z',
    }],
    feedbackQueue: {
      entries: {
        [FEEDBACK]: {
          cycle_id: FEEDBACK,
          world: { id: WORLD },
          status: 'accepted',
          review_receipt_id: FEEDBACK_REVIEW,
          reviewed_at: '2026-08-14T10:03:00.000Z',
        },
      },
    },
    observatory: {
      deep_time_records: [{
        id: DEEP_TIME,
        world_id: WORLD,
        lambda: 2,
        time: { utc: '2026-08-14T10:04:00.000Z' },
        provenance: { observation_run_id: FEEDBACK, feedback_review_receipt_id: FEEDBACK_REVIEW },
        interval: { previous_record_id: null },
      }],
      sweeps: [{ sweep_id: SWEEP, profile: { name: 'BAI' }, generated_at: '2026-08-14T10:05:00.000Z' }],
      theory_candidates: [{ receipt_id: CANDIDATE, source_sweep_id: SWEEP, record: { title: 'Topology candidate' }, created_at: '2026-08-14T10:06:00.000Z' }],
      theory_reviews: [{ receipt_id: THEORY_REVIEW, source_candidate_receipt_id: CANDIDATE, decision: 'accepted', reviewed_at: '2026-08-14T10:07:00.000Z' }],
      advisor_receipts: [{
        receipt_id: ADVISOR,
        generated_at: '2026-08-14T10:08:00.000Z',
        theory_source: { review_receipt_id: THEORY_REVIEW },
        deep_time_window: { record_ids: [DEEP_TIME] },
        domain_resolution: { mapping_id: null },
        recommendation: { status: 'REVIEW_ACCEPTANCE_GATE' },
      }],
      runa_suggestions: [{
        suggestion_id: RUNA,
        generated_at: '2026-08-14T10:09:00.000Z',
        world_id: WORLD,
        source: { advisor_receipt_id: ADVISOR, deep_time_record_ids: [DEEP_TIME] },
      }],
      domain_mappings: [],
    },
  };
}

test('provenance graph joins Ask, BAI/cusp, accepted Feedback, DEEPTime, Theory, Advisor and Runa by explicit receipt ids', () => {
  const graph = buildArcsweepProvenanceGraph(fixture());
  const ids = new Set(graph.nodes.map((item) => item.id));
  for (const expected of [REQUEST, CIRCUIT, 'cusp-1', 'bai-1', FEEDBACK, FEEDBACK_REVIEW, DEEP_TIME, SWEEP, CANDIDATE, THEORY_REVIEW, ADVISOR, RUNA]) {
    assert.ok(ids.has(expected), `missing node ${expected}`);
  }
  const relations = new Set(graph.edges.map((item) => `${item.from}:${item.relation}:${item.to}`));
  assert.ok(relations.has(`${REQUEST}:closes-through:${CIRCUIT}`));
  assert.ok(relations.has(`${FEEDBACK}:accepted-into-time:${DEEP_TIME}`));
  assert.ok(relations.has(`${THEORY_REVIEW}:grounds:${ADVISOR}`));
  assert.ok(relations.has(`${DEEP_TIME}:grounds-in-time:${ADVISOR}`));
  assert.ok(relations.has(`${ADVISOR}:suggests:${RUNA}`));
});

test('Ask focus returns the whole connected evidence component, including the theory strand that converges at the Advisor', () => {
  const graph = buildArcsweepProvenanceGraph(fixture());
  const focused = connectedProvenanceComponent(graph, REQUEST);
  const ids = new Set(focused.nodes.map((item) => item.id));
  assert.ok(ids.has(SWEEP));
  assert.ok(ids.has(THEORY_REVIEW));
  assert.ok(ids.has(ADVISOR));
  assert.ok(ids.has(RUNA));
});

test('unrelated receipts remain outside an Ask-focused component', () => {
  const input = fixture();
  input.observatory.sweeps.push({ sweep_id: 'orphan-sweep', profile: { name: 'Unrelated' } });
  const graph = buildArcsweepProvenanceGraph(input);
  assert.ok(graph.nodes.some((item) => item.id === 'orphan-sweep'));
  const focused = connectedProvenanceComponent(graph, REQUEST);
  assert.equal(focused.nodes.some((item) => item.id === 'orphan-sweep'), false);
});

test('provenance export is a derived immutable-copy receipt and does not invent authority', async () => {
  const graph = buildArcsweepProvenanceGraph(fixture());
  const bundle = await createProvenanceBundle({ graph, focusId: REQUEST, generatedAt: '2026-08-14T10:10:00.000Z' });
  assert.equal(bundle.schema, 'arcsweep.receipt-provenance-bundle/v1');
  assert.equal(bundle.focus_id, REQUEST);
  assert.equal(bundle.authority.export_is_derived_copy, true);
  assert.equal(bundle.authority.source_receipts_mutable, false);
  assert.equal(bundle.authority.physical_claim, false);
  assert.equal(bundle.bundle_fingerprint.length, 64);
});
