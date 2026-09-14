import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchOntologyReviewQueue,
  normaliseOntologyMetrics,
  ontologyMetricsComplete,
  submitOntologyReview,
} from '../src/os/ontology-runtime.js';
import {
  readLocalLearningLedger,
  recordCognitiveObservation,
} from '../src/os/cognitive-runtime.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

const localLocation = { hostname: 'localhost' };
const hostedLocation = { hostname: 'flameclyffe.vercel.app' };

test('ontology metric vocabulary accepts only bounded five-axis preservation scores', () => {
  const metrics = normaliseOntologyMetrics({
    distinction_retained: 0.9,
    provenance_retained: 0.8,
    relation_fidelity: 0.7,
    uncertainty_preserved: 0.6,
    reversibility: 1,
  });
  assert.equal(ontologyMetricsComplete(metrics), true);
  assert.throws(() => normaliseOntologyMetrics({ distinction_retained: 1.2 }), /between 0 and 1/i);
  assert.equal(ontologyMetricsComplete({ distinction_retained: 0.5 }), false);
});

test('local cognitive observation carries a durable local transformation receipt', async () => {
  const storage = memoryStorage();
  const observed = await recordCognitiveObservation({
    userText: 'Keep the distinction between analogy and identity.',
    assistantText: 'Similarity does not imply identity.',
    sourceTurnId: 'guide:test:ontology',
    worldId: 'terra-aeterna',
    projectId: 'arcsweep',
    roomId: 'observer',
    provenance: { provider: 'local-test', model: 'test-model' },
    storage,
    location: localLocation,
  });
  assert.match(observed.transformation_id, /^local-transformation:/);
  assert.equal(observed.transformation_review_status, 'pending');
  const row = readLocalLearningLedger(storage)[0];
  assert.equal(row.transformation_receipt.operation_type, 'llm_synthesis');
  assert.equal(row.transformation_receipt.loss_assessment_status, 'unassessed');
  assert.deepEqual(row.transformation_receipt.discarded_distinctions, []);
});

test('hosted ontology review queue uses the authenticated cognitive edge lane', async () => {
  let requestBody = null;
  const result = await fetchOntologyReviewQueue({
    limit: 99,
    location: hostedLocation,
    accessTokenProvider: async () => 'steward-token',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      assert.equal(options.headers.authorization, 'Bearer steward-token');
      return new Response(JSON.stringify({
        schema: 'arcsweep.ontology-review/v1',
        records: [{ id: 'transform-1', review_status: 'pending' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(requestBody.mode, 'ontology-review-list');
  assert.equal(requestBody.limit, 24);
  assert.equal(result.records[0].id, 'transform-1');
  assert.equal(result.persistence, 'supabase');
});

test('Steward approval requires all five semantic-preservation metrics', async () => {
  await assert.rejects(
    submitOntologyReview({
      id: 'transform-1',
      verdict: 'approve',
      metrics: { distinction_retained: 1 },
      location: hostedLocation,
      accessTokenProvider: async () => 'steward-token',
    }),
    /all five preservation metrics/i,
  );

  let requestBody = null;
  const result = await submitOntologyReview({
    id: 'transform-1',
    verdict: 'approve',
    metrics: {
      distinction_retained: 1,
      provenance_retained: 0.95,
      relation_fidelity: 0.9,
      uncertainty_preserved: 0.85,
      reversibility: 1,
    },
    note: 'Preserved the distinction between identity and analogy.',
    location: hostedLocation,
    accessTokenProvider: async () => 'steward-token',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        schema: 'arcsweep.ontology-review/v1',
        record: { id: 'transform-1', review_status: 'approved' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(requestBody.mode, 'ontology-review-update');
  assert.equal(requestBody.verdict, 'approve');
  assert.equal(requestBody.metrics.provenance_retained, 0.95);
  assert.match(requestBody.note, /identity and analogy/);
  assert.equal(result.record.review_status, 'approved');
});
