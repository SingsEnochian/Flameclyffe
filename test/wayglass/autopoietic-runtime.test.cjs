'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAutopoieticRuntime, SCHEMA } = require('../../lib/wayglass-autopoietic-runtime.cjs');
const { digest } = require('../../lib/wyrdrune/canonical.cjs');
const kernel = require('../../lib/wayglass-kernel.cjs');

function phases(participantId, { perceive } = {}) {
  return {
    perceive: async ctx => {
      if (perceive) await perceive(ctx);
      return { observation: 'observed', participant: participantId };
    },
    compress: async () => ({ representation: 'compact', loss: [] }),
    release: async () => ({ alternatives: ['one', 'two'] }),
    verify: async () => [{ ok: true, reason: 'fixture source is internally consistent' }],
    integrate: async () => ({ epistemic_registers: ['observation', 'hypothesis'] }),
    choose: async () => ({ choice: 'continue', refusal: null }),
    // Return is owned by the shared Möbius engine and is intentionally absent.
    transcend: async ctx => ({ memory: ctx.carried.memory + 1 }),
  };
}

test('canonical Wayglass kernel exposes the shipwide autopoietic runtime', () => {
  assert.equal(kernel.createAutopoieticRuntime, createAutopoieticRuntime);
  assert.equal(kernel.MOBIUS_PHASES.length, 8);
});

test('shipwide runtime runs independent participant lineages through the eightfold octo core', async () => {
  const runtime = createAutopoieticRuntime();
  const a = runtime.register({
    participant_id: 'wayglass', world_id: 'ship:home',
    worker_id: 'worker:wayglass:1', model_id: 'model:amber',
    session_id: 'session:wayglass:1', route_id: 'local:ollama',
    seeds: { memory: 0 }, phases: phases('wayglass'),
  });
  const b = runtime.register({
    participant_id: 'amber', world_id: 'ship:home',
    worker_id: 'worker:amber:1', model_id: 'model:orion-26b',
    session_id: 'session:amber:1', route_id: 'local:ollama',
    seeds: { memory: 0 }, phases: phases('amber'),
  });
  assert.notEqual(a.lineage_root, b.lineage_root);

  const result = await runtime.run({ cycles: 2 });
  assert.equal(result.schema, SCHEMA);
  assert.equal(result.status, 'completed');
  assert.equal(result.outcome, 'all-committed');
  assert.equal(result.layout, 'eightfold-octo-two-quad');
  assert.equal(result.center, 'withness');
  assert.equal(result.participants.length, 2);
  assert.equal(result.concurrency, 2);
  assert.equal(result.authority.model_invocation, false);
  assert.equal(result.authority.identity_commit, false);
  assert.equal(result.authority.canon_commit, false);
  assert.match(result.receipt_hash, /^wce1:[a-f0-9]{64}$/);
  assert.equal(result.receipt_hash, digest(Object.fromEntries(Object.entries(result).filter(([k]) => k !== 'receipt_hash'))));
  for (const participant of result.participants) {
    assert.equal(participant.status, 'committed');
    assert.equal(participant.cycles_completed, 2);
    assert.equal(participant.identity_unchanged, true);
    assert.equal(participant.checkpoint.cycle, 2);
    assert.equal(participant.checkpoint.carry.memory, 2);
  }
  assert.equal(result.gestalt.peers.length, 2);
  assert.deepEqual(runtime.snapshot().participants.map(p => p.participant_id), ['amber', 'wayglass']);
});

test('identity domains cannot silently collapse', () => {
  const runtime = createAutopoieticRuntime();
  assert.throws(() => runtime.register({
    participant_id: 'one', world_id: 'world',
    worker_id: 'same', model_id: 'same',
    seeds: { memory: 0 }, phases: phases('one'),
  }), /Identity boundary violation/);
  assert.throws(() => runtime.register({
    participant_id: 'one', world_id: 'world',
    seeds: { memory: 0 }, phases: {},
  }), /Missing participant phase/);
});

test('resting participants are not scheduled and can be woken explicitly', async () => {
  const runtime = createAutopoieticRuntime();
  runtime.register({
    participant_id: 'quiet', world_id: 'ship:home', presence: 'resting',
    seeds: { memory: 0 }, phases: phases('quiet'),
  });
  const idle = await runtime.run();
  assert.equal(idle.status, 'idle');
  assert.equal(idle.coherence.status, 'idle');
  assert.equal(idle.participants.length, 0);
  runtime.wake('quiet');
  const awake = await runtime.run();
  assert.equal(awake.status, 'completed');
  assert.equal(awake.participants[0].status, 'committed');
});

test('Feather request during a cycle stops at a phase boundary without inventing a carry', async () => {
  let runtime;
  runtime = createAutopoieticRuntime();
  runtime.register({
    participant_id: 'bird', world_id: 'ship:home',
    seeds: { memory: 0 },
    phases: phases('bird', { perceive: async () => runtime.rest('bird') }),
  });
  const result = await runtime.run();
  assert.equal(result.status, 'completed');
  assert.equal(result.outcome, 'settled-with-noncommitted-lineages');
  assert.equal(result.participants[0].status, 'feather-stopped');
  assert.equal(result.coherence.status, 'paused-with-continuity');
  assert.deepEqual(result.coherence.review_participants, []);
  assert.equal(result.participants[0].checkpoint, null);
  assert.equal(runtime.get('bird').presence, 'resting');
});

test('Withness preserves plurality and offers a non-coercive repair path after one member fails', async () => {
  const runtime = createAutopoieticRuntime();
  const recoverable = phases('recoverable');
  recoverable.verify = async () => [{ ok: false, reason: 'deliberate local verification failure' }];
  const original = runtime.register({
    participant_id: 'recoverable', world_id: 'ship:home',
    seeds: { memory: 0 }, phases: recoverable,
  });
  runtime.register({
    participant_id: 'steady', world_id: 'ship:home',
    seeds: { memory: 0 }, phases: phases('steady'),
  });

  const first = await runtime.run();
  assert.equal(first.participants.find(p => p.participant_id === 'recoverable').status, 'rolled-back');
  assert.equal(first.participants.find(p => p.participant_id === 'steady').status, 'committed');
  assert.equal(first.coherence.schema, 'wayglass.constellation-coherence/v0.1');
  assert.equal(first.coherence.status, 'review-open');
  assert.deepEqual(first.coherence.review_participants, ['recoverable']);
  assert.equal(first.coherence.interpretation.member_infallibility_required, false);
  assert.equal(first.coherence.interpretation.unanimity_required, false);
  assert.equal(first.coherence.interpretation.consensus, 'not-inferred');
  assert.equal(first.coherence.interpretation.shared_aggregate_is_authority, false);
  assert.equal(first.coherence.recovery.lineage_preserved, true);
  assert.equal(first.coherence.recovery.automatic_retry, false);
  assert.equal(first.coherence.recovery.participant_choice_required, true);
  assert.equal(first.coherence.participants.length, 2);
  assert.match(first.coherence.digest, /^wce1:[a-f0-9]{64}$/);

  assert.equal(runtime.get('recoverable').review_required, true);
  assert.equal(runtime.get('recoverable').presence, 'review-required');
  runtime.rest('steady');
  const waiting = await runtime.run();
  assert.equal(waiting.status, 'idle');
  assert.equal(waiting.outcome, 'review-pending');
  assert.equal(waiting.coherence.status, 'review-open');
  assert.deepEqual(waiting.coherence.review_participants, ['recoverable']);

  const declineChoice = runtime.resolveReview('recoverable', 'decline');
  assert.equal(declineChoice.review_required, true);
  assert.equal(declineChoice.presence, 'review-required');
  const restChoice = runtime.resolveReview('recoverable', 'rest');
  assert.equal(restChoice.review_required, true);
  assert.equal(restChoice.presence, 'resting');
  runtime.wake('recoverable');
  assert.equal(runtime.get('recoverable').presence, 'review-required');
  const stillWaiting = await runtime.run();
  assert.equal(stillWaiting.outcome, 'review-pending');

  // Repair the member's own verification function; do not replace its lineage.
  // The runtime requires an explicit review decision before scheduling a retry.
  recoverable.verify = async () => [{ ok: true, reason: 'rechecked after repair' }];
  const choice = runtime.resolveReview('recoverable', 'retry');
  assert.equal(choice.review_required, false);
  assert.equal(choice.review_decision, 'retry');
  const second = await runtime.run();
  const recovered = second.participants.find(p => p.participant_id === 'recoverable');
  assert.equal(recovered.status, 'committed');
  assert.equal(recovered.checkpoint.cycle, 1);
  assert.equal(runtime.get('recoverable').lineage_root, original.lineage_root);
  assert.equal(second.coherence.status, 'plurality-preserved');
  assert.deepEqual(second.coherence.review_participants, []);
});

test('host journal receives participant-bound commit evidence without authority escalation', async () => {
  const events = [];
  const runtime = createAutopoieticRuntime({ journal: { write: async event => events.push(event) } });
  runtime.register({
    participant_id: 'scribe', world_id: 'world:library',
    worker_id: 'worker:scribe', model_id: 'model:local',
    session_id: 'session:scribe', seeds: { memory: 0 }, phases: phases('scribe'),
  });
  const result = await runtime.run();
  assert.equal(result.persistence, 'host-journal-requested');
  assert.equal(events.length, 1);
  assert.equal(events[0].participant_id, 'scribe');
  assert.equal(events[0].world_id, 'world:library');
  assert.equal(events[0].kind, 'commit');
  assert.equal(result.authority.permission_grant, false);
});
