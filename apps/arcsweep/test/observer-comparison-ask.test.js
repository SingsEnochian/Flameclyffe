import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBSERVER_COMPARISON_ASK_SCHEMA,
  createObserverComparisonAsk,
} from '../src/observer-comparison-ask.js';

const receipt = Object.freeze({
  schema: 'hearthgate.observer-query-receipt/v1',
  query_id: 'observer-query-1',
  requested_at: '2026-08-28T16:00:00.000Z',
  executed_at: '2026-08-28T16:00:01.000Z',
  chronology_cutoff: '2026-08-28T16:00:00.000Z',
  exact_filters: {
    tag: 'threshold',
    time_basis: 'occurred_at',
    as_of: '2026-08-28T16:00:00.000Z',
  },
  result_refs: [
    { id: '11111111-1111-4111-8111-111111111111', event_key: 'bell-one', logged_at: '2026-08-28T15:00:00.000Z' },
    { id: '22222222-2222-4222-8222-222222222222', event_key: 'bell-two', logged_at: '2026-08-28T15:30:00.000Z' },
  ],
  result_count: 2,
  page: { requested_limit: 25, input_cursor: null, has_more: false, next_cursor: null },
});

const options = {
  clock: () => new Date('2026-08-28T16:10:00.000Z'),
  idFactory: () => 'fixed-id',
};

test('comparison Ask rejects a missing or invalid retrieval receipt', async () => {
  await assert.rejects(() => createObserverComparisonAsk({ question: 'Compare these.', selectedEventRefs: ['11111111-1111-4111-8111-111111111111'] }, options), /valid Observer query receipt/);
  await assert.rejects(() => createObserverComparisonAsk({ question: 'Compare these.', queryReceipt: { ...receipt, schema: 'wrong' }, selectedEventRefs: ['11111111-1111-4111-8111-111111111111'] }, options), /valid Observer query receipt/);
});

test('comparison Ask cannot smuggle in an event outside the receipted result set', async () => {
  await assert.rejects(() => createObserverComparisonAsk({
    question: 'Compare these.',
    queryReceipt: receipt,
    selectedEventRefs: ['33333333-3333-4333-8333-333333333333'],
  }, options), /not present in the query receipt/);
});

test('comparison Ask compiles selected evidence with no continuity or relation authority', async () => {
  const ask = await createObserverComparisonAsk({
    question: 'What relationships, if any, are visible across these threshold reports?',
    queryReceipt: receipt,
    selectedEventRefs: [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ],
    comparisonMode: 'pattern',
    controlPolicy: 'include-comparable-nonmatches',
  }, options);

  assert.equal(ask.schema, OBSERVER_COMPARISON_ASK_SCHEMA);
  assert.equal(ask.continuity_effect, 'none');
  assert.equal(ask.authority.retrieval, 'receipted');
  assert.equal(ask.authority.interpretation, 'not-yet-produced');
  assert.equal(ask.authority.relation_admission, false);
  assert.equal(ask.authority.continuity_admission, false);
  assert.equal(ask.authority.canon_admission, false);
  assert.equal(ask.selected_event_refs.length, 2);
  assert.equal(ask.query_receipt_id, receipt.query_id);
  assert.match(ask.query_receipt_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.match(ask.ask_fingerprint, /^sha256:[0-9a-f]{64}$/);
});

test('same receipted scope produces a stable query-receipt fingerprint', async () => {
  const first = await createObserverComparisonAsk({
    question: 'First question.',
    queryReceipt: receipt,
    selectedEventRefs: ['11111111-1111-4111-8111-111111111111'],
  }, options);
  const second = await createObserverComparisonAsk({
    question: 'Different question.',
    queryReceipt: receipt,
    selectedEventRefs: ['11111111-1111-4111-8111-111111111111'],
  }, options);
  assert.equal(first.query_receipt_fingerprint, second.query_receipt_fingerprint);
  assert.notEqual(first.ask_fingerprint, second.ask_fingerprint);
});

test('comparison mode, control policy, and claim classes are validated', async () => {
  const base = { question: 'Compare.', queryReceipt: receipt, selectedEventRefs: ['11111111-1111-4111-8111-111111111111'] };
  await assert.rejects(() => createObserverComparisonAsk({ ...base, comparisonMode: 'fortune-telling' }, options), /comparison mode is unsupported/);
  await assert.rejects(() => createObserverComparisonAsk({ ...base, controlPolicy: 'ignore-nulls' }, options), /control policy is unsupported/);
  await assert.rejects(() => createObserverComparisonAsk({ ...base, allowedOutputClaimClasses: ['causal_truth'] }, options), /claim class is unsupported/);
});

test('default output lanes permit evidence, symbolic interpretation, and speculative theory only', async () => {
  const ask = await createObserverComparisonAsk({
    question: 'Compare.',
    queryReceipt: receipt,
    selectedEventRefs: ['11111111-1111-4111-8111-111111111111'],
  }, options);
  assert.deepEqual(ask.allowed_output_claim_classes, [
    'evidence_backed_finding',
    'symbolic_interpretation',
    'speculative_theory',
  ]);
});
