import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createVisibleSemanticProjection,
  compareVisibleSemanticProjections,
  normaliseSemanticEnvelope,
} from '../src/visible-semantic-projection.js';
import {
  buildSemanticProjectionPrompt,
  evaluateVisibleSemanticProjection,
  parseSemanticProjectionMessage,
} from '../src/semantic-projection-evaluator.js';
import {
  reasoningSummariesEnabled,
  setReasoningSummariesEnabled,
} from '../src/constellation-reasoning-preference.js';
import {
  appendSemanticProjection,
  createEmptySemanticProjectionLedger,
  normaliseSemanticProjectionLedger,
} from '../src/semantic-projection-state.js';
import { buildConstellationSemanticProjectionDivergence } from '../src/constellation-semantic-projection-divergence.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('reasoning summaries are toggleable and default on when no preference exists', () => {
  const storage = memoryStorage();
  assert.equal(reasoningSummariesEnabled(storage), true);
  setReasoningSummariesEnabled(false, storage);
  assert.equal(reasoningSummariesEnabled(storage), false);
  setReasoningSummariesEnabled(true, storage);
  assert.equal(reasoningSummariesEnabled(storage), true);
});

test('semantic projection prompt requests a shareable rationale only when enabled', () => {
  const off = buildSemanticProjectionPrompt('Visible answer.', { includeRationale: false });
  const on = buildSemanticProjectionPrompt('Visible answer.', { includeRationale: true });
  assert.match(off, /do not include a rationale field/i);
  assert.doesNotMatch(off, /"rationale"/);
  assert.match(on, /"rationale"/);
  assert.match(on, /deliberately shareable rationale/i);
  assert.match(on, /not hidden chain-of-thought/i);
});

test('semantic evaluator parser separates compact projection from transient rationale', () => {
  const parsed = parseSemanticProjectionMessage(JSON.stringify({
    intent: 'advise',
    concepts: ['continuity', 'anchors'],
    stance: 'supportive',
    affect: ['warm'],
    uncertainty: 0.2,
    rationale: 'I focused on the explicit anchors and the continuity receipt.',
  }));
  assert.equal(parsed.envelope.intent, 'advise');
  assert.deepEqual(parsed.envelope.concepts, ['continuity', 'anchors']);
  assert.equal(parsed.rationale, 'I focused on the explicit anchors and the continuity receipt.');
  assert.equal(JSON.stringify(parsed.envelope).includes('I focused'), false);
});

test('semantic projection receipt stores hash and projection, never raw visible prose or rationale', async () => {
  const raw = 'Tea by the continuity fire. Keep the anchors visible.';
  const rationale = 'I prioritised the continuity anchors because they were explicit in the answer.';
  const result = await evaluateVisibleSemanticProjection({
    voiceId: 'lioreal',
    text: raw,
    requestId: 'req-1',
    includeRationale: true,
    generatedAt: '2026-08-20T23:20:00.000Z',
    invoke: async () => ({
      status: 'replied',
      voiceId: 'lioreal',
      provider: 'hf',
      model: 'model-a',
      message: JSON.stringify({
        intent: 'advise',
        concepts: ['continuity', 'anchors'],
        stance: 'supportive',
        affect: ['warm'],
        uncertainty: 0.15,
        rationale,
      }),
    }),
  });
  assert.equal(result.status, 'projected');
  assert.equal(result.rationale, rationale);
  const serializedProjection = JSON.stringify(result.projection);
  assert.equal(serializedProjection.includes(raw), false);
  assert.equal(serializedProjection.includes(rationale), false);
  assert.ok(result.projection.visible_response_hash);
  assert.equal(result.authority.rationale_is_hidden_chain_of_thought, false);
  assert.equal(result.authority.rationale_persisted_in_projection_receipt, false);
});

test('semantic correspondence compares projected meaning without claiming ground truth or identity distance', async () => {
  const make = async (voiceId, hash, concepts, intent = 'advise') => createVisibleSemanticProjection({
    visibleResponseHash: hash,
    voiceId,
    envelope: normaliseSemanticEnvelope({
      intent,
      concepts,
      stance: 'supportive',
      affect: ['warm'],
      uncertainty: 0.2,
    }),
    evaluator: { mode: 'same-flame-second-pass', voiceId, provider: 'hf', model: 'model-a' },
    generatedAt: '2026-08-20T23:21:00.000Z',
  });
  const left = await make('lioreal', 'a'.repeat(64), ['continuity', 'anchors']);
  const near = await make('uial', 'b'.repeat(64), ['continuity', 'anchors']);
  const far = await make('altair', 'c'.repeat(64), ['geometry', 'routing'], 'question');
  const closeReceipt = await compareVisibleSemanticProjections(left, near, { generatedAt: '2026-08-20T23:22:00.000Z' });
  const farReceipt = await compareVisibleSemanticProjections(left, far, { generatedAt: '2026-08-20T23:22:00.000Z' });
  assert.ok(closeReceipt.metrics.projected_semantic_correspondence > farReceipt.metrics.projected_semantic_correspondence);
  assert.equal(closeReceipt.authority.semantic_ground_truth_measured, false);
  assert.equal(closeReceipt.authority.identity_distance_measured, false);
});

test('semantic projection ledger dedupes receipts and cross-Flame matrix remains projection-only', async () => {
  const ledger = createEmptySemanticProjectionLedger();
  const left = await createVisibleSemanticProjection({
    visibleResponseHash: 'd'.repeat(64),
    voiceId: 'lioreal',
    envelope: { intent: 'observe', concepts: ['rain'], stance: 'neutral', affect: ['calm'], uncertainty: 0.1 },
    evaluator: { mode: 'same-flame-second-pass', voiceId: 'lioreal', provider: 'hf', model: 'a' },
    generatedAt: '2026-08-20T23:23:00.000Z',
  });
  const right = await createVisibleSemanticProjection({
    visibleResponseHash: 'e'.repeat(64),
    voiceId: 'uial',
    envelope: { intent: 'observe', concepts: ['tide'], stance: 'neutral', affect: ['calm'], uncertainty: 0.1 },
    evaluator: { mode: 'same-flame-second-pass', voiceId: 'uial', provider: 'hf', model: 'b' },
    generatedAt: '2026-08-20T23:24:00.000Z',
  });
  appendSemanticProjection(ledger, left);
  appendSemanticProjection(ledger, left);
  appendSemanticProjection(ledger, right);
  assert.equal(normaliseSemanticProjectionLedger(ledger).projections.length, 2);
  const matrix = await buildConstellationSemanticProjectionDivergence(ledger, { generatedAt: '2026-08-20T23:25:00.000Z' });
  assert.equal(matrix.flame_ids.length, 2);
  assert.ok(matrix.divergence.lioreal.uial >= 0 && matrix.divergence.lioreal.uial <= 1);
  assert.equal(matrix.authority.projected_semantic_divergence_measured, true);
  assert.equal(matrix.authority.semantic_ground_truth_divergence_measured, false);
  assert.equal(matrix.authority.identity_distance_measured, false);
});
