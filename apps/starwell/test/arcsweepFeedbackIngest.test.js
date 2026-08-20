import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from '../../../netlify/functions/arcsweep-feedback.mjs';
import { createInitialPremaqc, runFeedbackCycle } from '../../arcsweep/src/feedback-loop.js';

test('server verifies replay before writing Math Spine, feedback receipt, and Runtime Braid event', async () => {
  const cycle = await runFeedbackCycle({ world: { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 }, premaqc: createInitialPremaqc('terra-aeterna'), mode: 'writing', work: 'A new page.', response: 'A response.', voiceIds: ['lioreal'] });
  const writes = [];
  const handler = createHandler({ env: { MATH_SPINE_INGEST_TOKEN: 'secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'role' }, fetchImpl: async (url, options) => { writes.push({ url, row: JSON.parse(options.body) }); return { ok: true, text: async () => '' }; } });
  const response = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer secret' }, body: JSON.stringify(cycle) });
  assert.equal(response.statusCode, 202);
  assert.equal(writes.length, 3);
  assert.match(writes[0].url, /math_spine_packets/);
  assert.match(writes[1].url, /arcsweep_feedback_cycles/);
  assert.match(writes[2].url, /house_runtime_events/);
  assert.equal(writes[1].row.next_sequence, writes[1].row.source_sequence + 1);
  assert.equal(writes[2].row.continuity_packet_id, writes[1].row.continuity_packet_id);
  assert.equal(writes[2].row.event_type, 'observation-receipted');
});
