import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildModelReplyRuntimeEvent } from '../src/house-runtime-receipt-client.js';

const PROOF = Object.freeze({
  schema: 'arcsweep.model-reply-proof/v2',
  proof_id: 'model-proof:test-ox',
  probed_at: '2026-08-31T05:30:00.000Z',
  voice_id: 'oxalpha',
  voice_name: 'Ox Alpha',
  route: 'oxalpha',
  status: 'live-proven',
  proven: true,
  provider: 'openrouter',
  model: 'z-ai/glm-5.3-flash',
  latency_ms: 123,
  runtime_verified: true,
  reply_excerpt: 'Ox Alpha received the probe.',
});

const WORLD = Object.freeze({
  active_world_id: 'terra-prime',
  context_id: 'runtime-world:terra-prime:test',
  context_fingerprint: 'a'.repeat(64),
  identity_anchor: { world_id: 'terra-prime' },
});

test('attributable Ox Alpha reply becomes a model-reply Runtime Braid event without a fake observation cycle', async () => {
  const event = await buildModelReplyRuntimeEvent({
    proof: PROOF,
    worldContext: WORLD,
    threadId: 'house-room:constellation',
    turnId: 'turn:test-ox',
    sourceReceiptIds: [PROOF.proof_id, WORLD.context_id],
    occurredAt: PROOF.probed_at,
  });
  assert.equal(event.schema, 'hearthgate.runtime-braid-event/v1');
  assert.equal(event.event_type, 'model-reply-receipted');
  assert.equal(event.voice_id, 'oxalpha');
  assert.equal(event.actor_id, 'oxalpha');
  assert.equal(event.provider, 'openrouter');
  assert.equal(event.model, 'z-ai/glm-5.3-flash');
  assert.equal(event.route, 'oxalpha');
  assert.equal(event.world_id, 'terra-prime');
  assert.equal(event.cycle_id, null);
  assert.equal(event.continuity_packet_id, null);
  assert.match(event.packet_fingerprint, /^[0-9a-f]{64}$/);
});

test('model reply Runtime Braid fingerprint is deterministic for identical evidence', async () => {
  const input = { proof: PROOF, worldContext: WORLD, threadId: 'house-room:constellation', turnId: 'turn:test-ox', occurredAt: PROOF.probed_at };
  const a = await buildModelReplyRuntimeEvent(input);
  const b = await buildModelReplyRuntimeEvent(input);
  assert.equal(a.packet_fingerprint, b.packet_fingerprint);
  assert.equal(a.event_id, b.event_id);
});

test('unproven replies cannot enter the Runtime Braid', async () => {
  await assert.rejects(() => buildModelReplyRuntimeEvent({
    proof: { ...PROOF, proven: false },
    worldContext: WORLD,
    threadId: 'house-room:constellation',
    turnId: 'turn:bad',
  }), /Only attributable model replies/);
});

test('database migration preserves observation lineage while admitting typed model replies', async () => {
  const sql = await readFile(new URL('../../../supabase/migrations/202608310001_house_model_runtime_receipts.sql', import.meta.url), 'utf8');
  assert.match(sql, /model-reply-receipted/);
  assert.match(sql, /continuity_packet_id drop not null/);
  assert.match(sql, /cycle_id drop not null/);
  assert.match(sql, /event_type <> 'model-reply-receipted'[\s\S]*continuity_packet_id is not null[\s\S]*cycle_id is not null/);
  assert.match(sql, /house_runtime_append_model_reply/);
  assert.match(sql, /must not fabricate an observation cycle/);
});

test('model reply proof targets canonical Ox Alpha and requires durable readback', async () => {
  const proof = await readFile(new URL('../src/model-reply-proof.js', import.meta.url), 'utf8');
  assert.match(proof, /HOUSE_CHAT_VOICES/);
  assert.match(proof, /voice\.id === 'oxalpha'/);
  assert.match(proof, /persistAndVerifyModelReplyRuntimeEvent/);
  assert.match(proof, /LIVE \+ BRAID VERIFIED/);
  assert.doesNotMatch(proof, /voice_id:\s*'oa'/);
});
