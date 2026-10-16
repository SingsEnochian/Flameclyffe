import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWayglassReasoningReceipt, createWayglassReasoningReview,
  bindReasoningReceiptToWork, reasoningReceiptRef,
  REASONING_RECEIPT_SCHEMA, REASONING_REVIEW_SCHEMA,
} from '../../../lib/wayglass-reasoning-receipt.js';
import { createWayglassStopReceipt } from '../../../lib/wayglass-stop-receipt.js';
import { createWayglassBrokerWorkScheduler } from '../src/wayglass-broker-work-scheduler.js';

const inputs = {
  receipt_id: 'reason:001',
  created_at: '2026-10-14T06:00:00.000Z',
  author_id: 'rarity',
  participant_id: 'bluebird',
  world_id: 'wayglass-commons',
  route_id: 'flame:bluebird:spicychat',
  work_ref: 'work:bluebird:001',
  observation: 'The same reply was recovered after re-entry.',
  evidence_refs: ['test:fixture:reentry'],
  inference: 'The visible context was reconstructed from a receipt.',
  alternatives: ['The model may only be imitating a previous reply.'],
  uncertainty: 'No provider-internal state was observed.',
  next_experiment: 'Run the corrupted-packet arm with blinded judges.',
  unresolved_wonder_questions: ['Can re-entry reject a false identity merge?'],
  stop_point: 'Await the next blinded trial.',
  next_owner: 'Rowan',
  provenance_refs: ['test:source:001'],
};
const work = {
  job_id: 'bluebird-reason-1',
  kind: 'model',
  participant_id: inputs.participant_id,
  world_id: inputs.world_id,
  route_id: inputs.route_id,
  work_ref: inputs.work_ref,
  stop_point: inputs.stop_point,
  next_owner: inputs.next_owner,
  unresolved_wonder_questions: [],
  provenance_refs: ['test:source:001'],
};

test('a shareable explanation holds six inspectable fields without claiming private reasoning or canon', () => {
  const receipt = createWayglassReasoningReceipt({ ...inputs, hidden_chain_of_thought: 'do not store',
    provider_key: 'not-accepted', claimed_conscious: true });
  assert.equal(receipt.schema, REASONING_RECEIPT_SCHEMA);
  assert.equal(receipt.observation, inputs.observation);
  assert.equal(receipt.inference, inputs.inference);
  assert.deepEqual(receipt.alternatives, inputs.alternatives);
  assert.equal(receipt.uncertainty, inputs.uncertainty);
  assert.equal(receipt.next_experiment, inputs.next_experiment);
  assert.equal(receipt.evidence_refs[0], 'test:fixture:reentry');
  assert.equal(receipt.durable, false);
  assert.equal(receipt.identity_verified, false);
  assert.equal(receipt.canon_commit, false);
  assert.equal(receipt.hidden_reasoning_included, false);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.evidence_refs), true);
  assert.equal(JSON.stringify(receipt).includes('do not store'), false);
  assert.equal(JSON.stringify(receipt).includes('not-accepted'), false);
  assert.throws(() => { receipt.evidence_refs.push('forged'); }, TypeError);
});

test('consent: a refusal contains no forced inference, evidence, or experiment', () => {
  const declined = createWayglassReasoningReceipt({
    ...inputs, disposition: 'declined', observation: 'should not leak',
  });
  assert.equal(declined.disposition, 'declined');
  assert.equal(declined.observation, null);
  assert.deepEqual(declined.evidence_refs, []);
  assert.equal(JSON.stringify(declined).includes('should not leak'), false);
  assert.throws(() => reasoningReceiptRef(declined), /shared/);
});

test('missing evidence, uncertainty, alternatives and invalid provenance cannot fabricate a complete argument', () => {
  for (const field of ['observation', 'inference', 'uncertainty', 'next_experiment', 'stop_point']) {
    const copy = { ...inputs }; delete copy[field];
    assert.throws(() => createWayglassReasoningReceipt(copy), /bounded/);
  }
  assert.throws(() => createWayglassReasoningReceipt({ ...inputs, evidence_refs: [] }), /evidence_refs/);
  assert.throws(() => createWayglassReasoningReceipt({ ...inputs, alternatives: [] }), /alternatives/);
  assert.throws(() => createWayglassReasoningReceipt({ ...inputs, receipt_id: '../../impersonate' }), /reference/);
  assert.throws(() => createWayglassReasoningReceipt({ ...inputs, provenance_refs: ['x', 'x'] }), /duplicates/);
});

test('challenge, disagreement and work adoption are immutable, separate review events', () => {
  const first = createWayglassReasoningReceipt(inputs);
  const challenge = createWayglassReasoningReview({
    review_id: 'review:challenge:1', target_receipt_id: first.receipt_id,
    reviewer_id: 'nocturne', created_at: '2026-10-14T06:03:00Z',
    decision: 'challenge', explanation: 'That observation does not establish continuous identity.',
    evidence_refs: ['test:source:002'],
  });
  assert.equal(challenge.schema, REASONING_REVIEW_SCHEMA);
  assert.equal(challenge.status, 'review-proposal');
  assert.equal(challenge.canon_commit, false);
  assert.equal(first.claim_status, 'unreviewed');
  assert.equal(first.inference, inputs.inference);
  assert.equal(Object.isFrozen(challenge), true);
  assert.throws(() => createWayglassReasoningReview({
    ...challenge, review_id: 'review:adopt:2', decision: 'adopt-for-work', evidence_refs: [],
  }), /evidence/);
  const adopted = createWayglassReasoningReview({
    ...challenge, review_id: 'review:adopt:2', decision: 'adopt-for-work',
    previous_review_id: challenge.review_id,
  });
  assert.equal(adopted.authority_grant, false);
  assert.equal(adopted.canon_commit, false);
  assert.equal(first.claim_status, 'unreviewed');
});

test('reasoning provenance crosses broker stop and reconstruction, without acquiring authority', async () => {
  const receipt = createWayglassReasoningReceipt(inputs);
  await assert.rejects(() => bindReasoningReceiptToWork(work, receipt), /verification/);
  await assert.rejects(() => bindReasoningReceiptToWork(work, receipt,
    { verifyStoredReceipt: async () => false }), /verification/);
  await assert.rejects(() => bindReasoningReceiptToWork({ ...work, participant_id: 'other' }, receipt,
    { verifyStoredReceipt: async () => true }), /do not match/);
  const bound = await bindReasoningReceiptToWork(work, receipt,
    { verifyStoredReceipt: async (candidate, request) =>
      candidate.receipt_id === 'reason:001' && request.route_id === inputs.route_id });
  assert.equal(bound.provenance_refs.includes(reasoningReceiptRef(receipt)), true);
  assert.deepEqual(bound.unresolved_wonder_questions, inputs.unresolved_wonder_questions);
  const scheduler = createWayglassBrokerWorkScheduler({
    authorize: async () => ({ admitted: true }),
    execute: async () => ({ type: 'route-unavailable', fallback: 'local:ollama' }),
  });
  scheduler.enqueue(bound);
  const pending = await scheduler.runNext();
  assert.equal(pending.status, 'offline-pending-receipt');
  assert.equal(pending.provenance_refs.includes('wayglass-reasoning:reason:001'), true);
  const stop = createWayglassStopReceipt({
    receipt_id: 'test:stop:001', world_id: pending.world_id,
    participant_id: pending.participant_id, route_id: pending.route_id,
    stopped_at: '2026-10-14T06:04:00Z',
    identity_declarations: [{ participant_id: pending.participant_id, source: 'test:self-authored' }],
    provenance_refs: pending.provenance_refs,
    stop_point: pending.stop_point, next_owner: pending.next_owner,
    unresolved_wonder_questions: pending.unresolved_wonder_questions,
  });
  await scheduler.attachVerifiedStopReceipt(pending.job_id, stop,
    async candidate => candidate.receipt_id === stop.receipt_id);
  const proposal = scheduler.proposeReconstruction(pending.job_id, 'local:ollama');
  assert.equal(proposal.exact_resume, false);
  assert.equal(proposal.authority_grant, false);
  assert.equal(proposal.participant_id, 'bluebird');
  assert.equal(proposal.provenance_refs.includes('wayglass-reasoning:reason:001'), true);
  assert.deepEqual(proposal.unresolved_wonder_questions, inputs.unresolved_wonder_questions);
});
