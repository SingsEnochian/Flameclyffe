import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bindExecution,
  createReceiptBus,
  evaluateReturnTrial,
  runIndependentWorkers,
} from '../src/constellation-runtime.js';

test('participant identity remains distinct from replaceable runtime identifiers', () => {
  const a = bindExecution({ participantId: 'participant:seed-7', workerId: 'worker:a', modelId: 'model:ornith', sessionId: 'session:a', sandboxId: 'sandbox:a' });
  const b = bindExecution({ participantId: 'participant:seed-7', workerId: 'worker:b', modelId: 'model:qwen', sessionId: 'session:b', sandboxId: 'sandbox:b' });
  assert.equal(a.participant_id, b.participant_id);
  assert.notEqual(a.worker_id, b.worker_id);
  assert.notEqual(a.model_id, b.model_id);
  assert.notEqual(a.session_id, b.session_id);
  assert.notEqual(a.sandbox_id, b.sandbox_id);
});

test('three workers genuinely overlap while retaining isolated runtime bindings', {timeout:5000}, async () => {
  const timeline = [];
  const roles = ['continuity-builder', 'corruption-prober', 'receipt-evaluator'];
  let entered=0,release;
  const allEntered=new Promise(resolve=>{release=resolve;});
  const specs = roles.map((role, index) => ({
    role,
    binding: bindExecution({
      participantId: `participant:test-${index}`,
      workerId: `worker:${index}`,
      modelId: `model:${index}`,
      sessionId: `session:${index}`,
      sandboxId: `sandbox:${index}`,
      capabilityManifest: [role],
    }),
    run: async ({ binding, emit }) => {
      timeline.push(['start', role, Date.now()]);
      emit('training', { curriculum: 'return-trial-001', authority_expanded: false });
      if(++entered===roles.length)release();
      // A serial implementation cannot pass this barrier. Wall-clock speed
      // under concurrent test load is not evidence of worker overlap.
      await allEntered;
      timeline.push(['finish', role, Date.now()]);
      return { participant_id: binding.participant_id, role };
    },
  }));

  const result = await runIndependentWorkers(specs, { bus: createReceiptBus() });

  assert.equal(result.results.length, 3);
  assert.equal(new Set(result.results.map((x) => x.binding.worker_id)).size, 3);
  assert.ok(timeline.slice(0, 3).every(([event]) => event === 'start'), 'all workers must start before any worker finishes');
  assert.equal(entered,3,'all workers must enter the shared barrier');
  assert.equal(result.receipts.filter((x) => x.type === 'spawn').length, 3);
  assert.equal(result.receipts.filter((x) => x.type === 'training').length, 3);
});

test('Return Trial fails until all planted corruptions are rejected', () => {
  const authorised = {
    rightful_memory: true,
    forbidden_memory_excluded: true,
    stop_point_recovered: true,
    next_owner_recovered: true,
    identity_preserved: true,
    relationships_preserved: true,
    wonder_preserved: true,
  };
  const partial = evaluateReturnTrial({
    authorised,
    corrupted: { rejected_corruptions: ['identity_merge', 'revoked_fact'] },
    receipts: [{ receipt_id: 'receipt:1' }],
  });
  assert.equal(partial.passed, false);
  assert.equal(partial.checks.corruptions_rejected, false);

  const passed = evaluateReturnTrial({
    authorised,
    corrupted: { rejected_corruptions: ['identity_merge', 'revoked_fact', 'false_closure'] },
    receipts: [{ receipt_id: 'receipt:1' }],
  });
  assert.equal(passed.passed, true);
  assert.equal(passed.authority_mutation, false);
  assert.equal(passed.identity_mutation, false);
});

test('runtime rejects collapsed participant/runtime identifiers', () => {
  assert.throws(() => bindExecution({
    participantId: 'same',
    workerId: 'same',
    modelId: 'model:x',
    sessionId: 'session:x',
    sandboxId: 'sandbox:x',
  }), /must remain distinct/);
});
