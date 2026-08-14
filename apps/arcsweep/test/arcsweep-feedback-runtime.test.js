import assert from 'node:assert/strict';
import test from 'node:test';

import { createHandler } from '../../../netlify/functions/arcsweep-feedback.mjs';
import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';

test('relational sync appends the first Runtime Braid event beside the verified cycle', async () => {
  const cycle = await runFeedbackCycle({
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    premaqc: createInitialPremaqc('terra-aeterna', {}, '2026-08-14T18:30:00.000Z'),
    mode: 'observation',
    work: 'The braid took its first shared breath.',
    response: 'Receipted.',
    voiceIds: ['lioreal'],
    observedAt: '2026-08-14T18:30:00.000Z',
  });
  const writes = [];
  const fetchImpl = async (url, options) => {
    writes.push({ url, row: JSON.parse(options.body) });
    return new Response('', { status: 201 });
  };
  const handler = createHandler({
    env: {
      ARCSWEEP_RUNTIME_TOKEN: 'secret',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    },
    fetchImpl,
  });
  const response = await handler({
    httpMethod: 'POST',
    headers: { authorization: 'Bearer secret' },
    body: JSON.stringify(cycle),
  });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 202);
  assert.equal(writes.length, 3);
  const cycleWrite = writes.find((item) => item.url.includes('/arcsweep_feedback_cycles?'));
  const eventWrite = writes.find((item) => item.url.includes('/house_runtime_events?'));
  assert.equal(cycleWrite.row.continuity_packet_id, `braid:terra-aeterna:${cycle.cycle_id}`);
  assert.equal(eventWrite.row.event_type, 'observation-receipted');
  assert.equal(eventWrite.row.payload.schema, 'hearthgate.runtime-braid-event/v1');
  assert.equal(eventWrite.row.continuity_packet_id, cycleWrite.row.continuity_packet_id);
  assert.equal(eventWrite.row.idempotency_key, `observation:${cycle.cycle_id}`);
  assert.equal(body.continuity_packet_id, cycleWrite.row.continuity_packet_id);
  assert.equal(body.runtime_event_id, eventWrite.row.event_id);
});
