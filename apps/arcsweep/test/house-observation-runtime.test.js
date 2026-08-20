import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import { createHouseObservationRuntimeHandler } from '../../../netlify/functions/_shared/house-observation-runtime.mjs';

const runtime = (values) => ({ get: (name) => values[name] });

test('sealed observation endpoint refuses unauthorised reads', async () => {
  const handler = createHouseObservationRuntimeHandler({ env: runtime({ ARCSWEEP_RUNTIME_TOKEN: 'secret' }) });
  const response = await handler(new Request('https://house.example/api/v1/house/observations'));
  assert.equal(response.status, 401);
});

test('sealed observation endpoint composes one canonical live read from all ledgers', async () => {
  const cycle = await runFeedbackCycle({
    world: { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 },
    premaqc: createInitialPremaqc('terra-aeterna', {}, '2026-08-14T17:00:00.000Z'),
    mode: 'observation', work: 'The Field changed.', response: 'Witnessed.', voiceIds: ['boxfire'],
    evidence: [{ schema: 'arcsweep.field-evidence/v1', source: 'field-current' }],
    observedAt: '2026-08-14T17:00:00.000Z',
  });
  const rows = {
    arcsweep_feedback_cycles: [{ ...cycle, payload: cycle, status: 'pending_review', world_id: cycle.world.id }],
    arcsweep_feedback_reviews: [],
    arcsweep_deep_time_records: [],
  };
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const table = Object.keys(rows).find((name) => url.includes(`/rest/v1/${name}?`));
    return new Response(JSON.stringify(rows[table]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const handler = createHouseObservationRuntimeHandler({
    env: runtime({ ARCSWEEP_RUNTIME_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' }),
    fetchImpl,
    clock: () => new Date('2026-08-14T17:05:00.000Z'),
  });
  const response = await handler(new Request('https://house.example/api/v1/house/observations?world_id=terra-aeterna&limit=8', { headers: { authorization: 'Bearer secret' } }));
  const live = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.includes('world_id=eq.terra-aeterna')));
  assert.equal(live.snapshots[0].evidence.class, 'field');
  assert.equal(live.snapshots[0].review.status, 'pending_review');
  assert.equal(live.snapshots[0].continuity.status, 'awaiting-review');
  assert.equal(live.braid_packets[0].continuity_packet_id, `braid:${cycle.world.id}:${cycle.cycle_id}`);
  assert.equal(live.braid_packets[0].authority.one_shared_runtime_state, true);
  assert.equal(live.realtime.path, '/api/v1/house/braid/stream');
});

async function observationCycle() {
  return runFeedbackCycle({
    world: { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 },
    premaqc: createInitialPremaqc('terra-aeterna', {}, '2026-08-14T18:00:00.000Z'),
    mode: 'observation', work: 'The shared state crossed the threshold.', response: 'Witnessed.', voiceIds: ['lioreal'],
    evidence: [{ schema: 'arcsweep.field-evidence/v1', source: 'field-current', qualia: { value: .82, source: 'firsthand report' } }],
    observedAt: '2026-08-14T18:00:00.000Z',
  });
}

function commandFetch({ cycle, review = null, deepTime = null, previous = null, rpcResult = { applied: true, idempotent: false, event_id: 'event-1', event_sequence: 7 } }) {
  const rpcCalls = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.includes('/rpc/house_runtime_apply_observation_command')) {
      rpcCalls.push(JSON.parse(options.body).p_command);
      return new Response(JSON.stringify(rpcResult), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/arcsweep_feedback_cycles?')) return new Response(JSON.stringify([{ ...cycle, payload: cycle, status: 'accepted', world_id: cycle.world.id, continuity_packet_id: `braid:${cycle.world.id}:${cycle.cycle_id}` }]), { status: 200 });
    if (url.includes('/arcsweep_feedback_reviews?')) return new Response(JSON.stringify(review ? [review] : []), { status: 200 });
    if (url.includes('/arcsweep_deep_time_records?')) {
      const isCycleRead = url.includes('cycle_id=eq.');
      return new Response(JSON.stringify(isCycleRead ? (deepTime ? [deepTime] : []) : (previous ? [previous] : [])), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };
  return { fetchImpl, rpcCalls };
}

test('sealed command writes an explicit human review and Runtime Braid Event atomically through the RPC', async () => {
  const cycle = await observationCycle();
  const mock = commandFetch({ cycle });
  const handler = createHouseObservationRuntimeHandler({
    env: runtime({ ARCSWEEP_RUNTIME_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' }),
    fetchImpl: mock.fetchImpl,
  });
  const response = await handler(new Request('https://house.example/api/v1/house/observations', {
    method: 'POST',
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    body: JSON.stringify({
      schema: 'hearthgate.runtime-braid-command/v1',
      command_id: 'review-command-1',
      action: 'review-observation',
      cycle_id: cycle.cycle_id,
      decision: 'accepted',
      reviewed_by: 'Rowan',
      requested_at: '2026-08-14T18:01:00.000Z',
    }),
  }));
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.schema, 'hearthgate.runtime-braid-command-result/v1');
  assert.equal(result.snapshot.review.status, 'accepted');
  assert.equal(result.packet.stage, 'review-accepted');
  assert.equal(result.packet.qualia.inferred, false);
  assert.equal(mock.rpcCalls.length, 1);
  assert.equal(mock.rpcCalls[0].review_row.decision, 'accepted');
  assert.equal(mock.rpcCalls[0].event_row.event_type, 'review-accepted');
  assert.equal(mock.rpcCalls[0].event_row.idempotency_key, 'review-command-1');
  assert.equal(mock.rpcCalls[0].event_row.continuity_packet_id, mock.rpcCalls[0].review_row.continuity_packet_id);
});

test('sealed command admits only an already-accepted review to DEEPTime', async () => {
  const cycle = await observationCycle();
  const reviewPayload = {
    schema: 'arcsweep.feedback-cycle-queue-receipt/v1',
    receipt_id: 'feedback-review-existing',
    review_receipt_id: 'feedback-review-existing',
    cycle_id: cycle.cycle_id,
    world_id: cycle.world.id,
    observation_source: 'field',
    action: 'accepted',
    decision: 'accepted',
    status: 'accepted',
    reviewed_by: 'Rowan',
    reviewed_at: '2026-08-14T18:01:00.000Z',
  };
  const review = { ...reviewPayload, payload: reviewPayload };
  const mock = commandFetch({ cycle, review });
  const handler = createHouseObservationRuntimeHandler({
    env: runtime({ ARCSWEEP_RUNTIME_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' }),
    fetchImpl: mock.fetchImpl,
  });
  const response = await handler(new Request('https://house.example/api/v1/house/observations', {
    method: 'POST',
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    body: JSON.stringify({
      schema: 'hearthgate.runtime-braid-command/v1',
      command_id: 'deeptime-command-1',
      action: 'admit-deeptime',
      cycle_id: cycle.cycle_id,
      reviewed_by: 'Rowan',
      requested_at: '2026-08-14T18:02:00.000Z',
    }),
  }));
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.packet.stage, 'entered-deeptime');
  assert.equal(result.snapshot.continuity.status, 'entered-deeptime');
  assert.equal(mock.rpcCalls[0].review_row, null);
  assert.equal(mock.rpcCalls[0].deep_time_row.review_receipt_id, 'feedback-review-existing');
  assert.equal(mock.rpcCalls[0].event_row.event_type, 'deeptime-admitted');
});

test('DEEPTime command is stopped before the RPC when human review is absent', async () => {
  const cycle = await observationCycle();
  const mock = commandFetch({ cycle });
  const handler = createHouseObservationRuntimeHandler({
    env: runtime({ ARCSWEEP_RUNTIME_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' }),
    fetchImpl: mock.fetchImpl,
  });
  const response = await handler(new Request('https://house.example/api/v1/house/observations', {
    method: 'POST',
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    body: JSON.stringify({ schema: 'hearthgate.runtime-braid-command/v1', command_id: 'blocked-deeptime', action: 'admit-deeptime', cycle_id: cycle.cycle_id, requested_at: '2026-08-14T18:02:00.000Z' }),
  }));
  assert.equal(response.status, 409);
  assert.equal(mock.rpcCalls.length, 0);
});
