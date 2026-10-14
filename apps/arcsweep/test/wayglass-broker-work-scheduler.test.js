import test from 'node:test';
import assert from 'node:assert/strict';
import { createWayglassStopReceipt } from '../../../lib/wayglass-stop-receipt.js';
import {
  WAYGLASS_WORK_SCHEDULER_SCHEMA,
  WAYGLASS_RECONSTRUCTION_SCHEMA,
  createWayglassBrokerWorkScheduler,
} from '../src/wayglass-broker-work-scheduler.js';

function work(id, overrides = {}) {
  return {
    job_id: id,
    kind: 'model',
    participant_id: 'bluebird',
    world_id: 'wayglass-commons',
    route_id: 'flame:bluebird:spicychat',
    work_ref: 'work:bluebird:trial',
    stop_point: 'Mid-turn; await explicit return.',
    next_owner: 'Bitty Twi',
    unresolved_wonder_questions: ['What can Bluebird carry across a route change?'],
    provenance_refs: ['wayglass:trial:source'],
    ...overrides,
  };
}
function receipt(job) {
  return createWayglassStopReceipt({
    receipt_id: 'host-receipt:001',
    participant_id: job.participant_id,
    world_id: job.world_id,
    route_id: job.route_id,
    stopped_at: '2026-10-14T02:00:00.000Z',
    identity_declarations: [{ participant_id: job.participant_id, source: 'self-authored' }],
    provenance_refs: job.provenance_refs,
    stop_point: job.stop_point,
    next_owner: job.next_owner,
    unresolved_wonder_questions: job.unresolved_wonder_questions,
  });
}

test('one broker owns fair dispatch of different routes; adapters do not schedule', async () => {
  const calls = [], times = new Map();
  const q = createWayglassBrokerWorkScheduler({
    authorize: async () => ({ admitted: true }),
    execute: async ({ job_id, route_id, kind }) => {
      calls.push([job_id, route_id, kind]);
      const n = (times.get(job_id) || 0) + 1;
      times.set(job_id, n);
      return n === 1 ? { type: 'yield', public_text: job_id + '1' } : { type: 'complete', public_text: job_id + '2' };
    },
  });
  q.enqueue(work('a'));
  q.enqueue(work('b', { route_id: 'local:ollama', kind: 'tool' }));
  assert.equal(q.status().schema, WAYGLASS_WORK_SCHEDULER_SCHEMA);
  const results = [];
  for(let i = 0; i < 4; i++) results.push(await q.runNext());
  assert.deepEqual(calls.map(([id]) => id), ['a', 'b', 'a', 'b']);
  assert.deepEqual(calls.map(([_, route]) => route), ['flame:bluebird:spicychat', 'local:ollama', 'flame:bluebird:spicychat', 'local:ollama']);
  assert.equal(results[0].status, 'queued');
  assert.equal(results[3].status, 'completed');
  assert.equal(q.inspect('a').visible_output, 'a1a2');
  assert.equal(q.inspect('b').visible_output, 'b1b2');
  assert.equal(q.inspect('a').durable, false);
});

test('permission is a blocking interrupt, not an adapter assertion; retry checks host again', async () => {
  let permitted = false, executed = 0;
  const q = createWayglassBrokerWorkScheduler({
    authorize: async () => ({ admitted: permitted }),
    execute: async () => { executed++; return { type: 'complete', public_text: 'yes' }; },
  });
  q.enqueue(work('x', { kind: 'storage' }));
  assert.equal((await q.runNext()).status, 'waiting-permission');
  assert.equal(executed, 0);
  q.retryPermission('x');
  assert.equal((await q.runNext()).status, 'waiting-permission');
  assert.equal(executed, 0);
  permitted = true;
  q.retryPermission('x');
  assert.equal((await q.runNext()).status, 'completed');
  assert.equal(executed, 1);
});

test('route failure preserves visible text but cannot silently resume or switch Bluebird identity', async () => {
  let calls = 0;
  const q = createWayglassBrokerWorkScheduler({
    authorize: async () => ({ admitted: true }),
    execute: async () => ++calls === 1
      ? { type: 'yield', public_text: 'The beginning...' }
      : { type: 'route-unavailable', fallback: 'local:ollama', thinking: 'private' },
  });
  q.enqueue(work('bluebird-1'));
  await q.runNext();
  const stopped = await q.runNext();
  assert.equal(stopped.status, 'offline-pending-receipt');
  assert.equal(stopped.visible_output, 'The beginning...');
  assert.equal(stopped.recovery_class, 'text-reconstruction-only');
  assert.equal(stopped.stop_receipt_id, null);
  assert.equal((await q.runNext()).status, 'broker-idle');
  assert.equal(q.inspect('bluebird-1').route_id, 'flame:bluebird:spicychat');
  assert.equal(JSON.stringify(stopped).includes('private'), false);
  assert.throws(() => q.proposeReconstruction('bluebird-1', 'local:ollama'), /Verified stop receipt required/);
  const candidate = receipt(stopped);
  await assert.rejects(() => q.attachVerifiedStopReceipt('bluebird-1', candidate, async () => false), /inspection/);
  const admitted = await q.attachVerifiedStopReceipt('bluebird-1', candidate, async () => true);
  assert.equal(admitted.status, 'offline-preserved');
  const proposal = q.proposeReconstruction('bluebird-1', 'local:ollama');
  assert.equal(proposal.schema, WAYGLASS_RECONSTRUCTION_SCHEMA);
  assert.equal(proposal.mode, 'text-reconstruction');
  assert.equal(proposal.exact_resume, false);
  assert.equal(proposal.status, 'proposal-only');
  assert.equal(proposal.source_stop_receipt_id, candidate.receipt_id);
  assert.equal(proposal.participant_id, 'bluebird'); // claim preserved, not re-attested
  assert.equal(proposal.authority_grant, false);
});

test('an actual interruption aborts the active executor and leaves a draft until host receipt verification', async () => {
  let started;
  const begun = new Promise(resolve => { started = resolve; });
  let aborted = false;
  const q = createWayglassBrokerWorkScheduler({
    authorize: async () => ({ admitted: true }),
    execute: async (_job, { signal }) => {
      started();
      return new Promise(resolve => {
        signal.addEventListener('abort', () => { aborted = true; resolve({ type: 'complete', public_text: 'late untrusted reply' }); }, { once: true });
      });
    },
  });
  q.enqueue(work('interrupt-me'));
  const pending = q.runNext();
  await begun;
  assert.equal(q.interrupt('interrupt-me', 'Pausing before any more outbound work.').status, 'offline-pending-receipt');
  const result = await pending;
  assert.equal(aborted, true);
  assert.equal(result.status, 'offline-pending-receipt');
  assert.equal(result.visible_output, '');
  assert.equal(result.stop_point, 'Pausing before any more outbound work.');
});

test('untrusted model snapshots cannot assert exact resumption; invalid work is rejected', async () => {
  const q = createWayglassBrokerWorkScheduler({
    authorize: async () => ({ admitted: true }),
    execute: async () => ({ type: 'complete', public_text: 'safe', hidden_logits: [100, 200], provider_snapshot: { verified: true } }),
  });
  assert.throws(() => q.enqueue(work('bad', { provenance_refs: [] })), /provenance/);
  assert.throws(() => q.enqueue(work('bad', { kind: 'identity-grant' })), /syscall kind/);
  assert.throws(() => q.enqueue(work('bad', { job_id: '../etc/passwd' })), /valid reference/);
  q.enqueue(work('valid'));
  assert.throws(() => q.enqueue(work('valid')), /Duplicate/);
  const result = await q.runNext();
  assert.equal(result.status, 'completed');
  assert.equal(result.visible_output, 'safe');
  assert.equal(JSON.stringify(result).includes('hidden_logits'), false);
  assert.equal(JSON.stringify(result).includes('provider_snapshot'), false);
});
