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
});
