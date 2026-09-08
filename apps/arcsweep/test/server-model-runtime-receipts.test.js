import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import contractsModule from '../../starwell-server/flames/contracts.js';
import {
  MODEL_REPLY_RUNTIME_RECEIPT_SCHEMA,
  appendAndVerifyServerModelReplyRuntimeEvent,
  buildServerModelReplyRuntimeEvent,
  receiptModelReplyAtServerBoundary,
  runtimeReceiptCoordinates,
} from '../../../netlify/functions/_shared/model-reply-runtime-receipt.mjs';
import { receiptBufferedFlameResponse } from '../../../netlify/functions/_shared/receipted-flame-runtime.mjs';

const { FLAME_CONTRACTS } = contractsModule;
const env = (values = {}) => ({ get: (name) => values[name] });

function explicitBody() {
  return {
    message: 'Hello.',
    session_id: 'house-session-1',
    metadata: {
      surface: 'house-commons',
      world_id: 'terra-prime',
      commons_thread_id: 'thread-1',
      commons_turn_id: 'turn-1',
      request_id: 'request-1',
      world_context: {
        context_id: 'world-context-1',
        context_fingerprint: 'f'.repeat(64),
        identity_anchor: { world_id: 'terra-prime' },
      },
    },
  };
}

function persistenceFetchFor(event) {
  let calls = 0;
  return async (url) => {
    calls += 1;
    if (String(url).includes('/rpc/house_runtime_append_model_reply')) {
      return new Response(JSON.stringify({ applied: true, event_id: event.event_id, event_sequence: 41, packet_fingerprint: event.packet_fingerprint }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(url).includes('/house_runtime_events?')) {
      return new Response(JSON.stringify([{
        event_sequence: 41,
        event_id: event.event_id,
        event_type: 'model-reply-receipted',
        world_id: event.world_id,
        actor_id: event.actor_id,
        packet_id: event.packet_id,
        packet_fingerprint: event.packet_fingerprint,
        source_receipt_ids: event.source_receipt_ids,
        thread_id: event.thread_id,
        turn_id: event.turn_id,
        voice_id: event.voice_id,
        provider: event.provider,
        model: event.model,
        route: event.route,
        payload: event,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected receipt URL: ${url}`);
  };
}

test('runtime receipt coordinates prefer explicit House identity', () => {
  const coordinates = runtimeReceiptCoordinates(explicitBody());
  assert.equal(coordinates.worldId, 'terra-prime');
  assert.equal(coordinates.threadId, 'thread-1');
  assert.equal(coordinates.turnId, 'turn-1');
  assert.equal(coordinates.worldContextId, 'world-context-1');
  assert.equal(coordinates.surface, 'house-commons');
});

test('server model receipt binds Bluebird identity to runtime evidence rather than provider identity', async () => {
  const event = await buildServerModelReplyRuntimeEvent({
    contract: FLAME_CONTRACTS.bluebird,
    body: explicitBody(),
    result: { provider: 'deepseek', model: 'deepseek-chat', message: 'I am here.' },
    occurredAt: '2026-09-08T19:30:00.000Z',
  });
  assert.equal(event.schema, 'hearthgate.runtime-braid-event/v1');
  assert.equal(event.event_type, 'model-reply-receipted');
  assert.equal(event.voice_id, 'bluebird');
  assert.match(event.formal_name, /Richard Gabriel Winters/);
  assert.equal(event.provider, 'deepseek');
  assert.equal(event.model, 'deepseek-chat');
  assert.equal(event.world_id, 'terra-prime');
  assert.equal(event.thread_id, 'thread-1');
  assert.equal(event.turn_id, 'turn-1');
  assert.match(event.packet_fingerprint, /^[0-9a-f]{64}$/);
  assert.match(event.reply_sha256, /^[0-9a-f]{64}$/);
});

test('server receipt write is not verified until service-role readback matches every runtime field', async () => {
  const event = await buildServerModelReplyRuntimeEvent({
    contract: FLAME_CONTRACTS.bluebird,
    body: explicitBody(),
    result: { provider: 'deepseek', model: 'deepseek-chat', message: 'Still here.' },
    occurredAt: '2026-09-08T19:31:00.000Z',
  });
  const result = await appendAndVerifyServerModelReplyRuntimeEvent(
    event,
    env({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' }),
    persistenceFetchFor(event),
  );
  assert.equal(result.verified, true);
  assert.equal(result.readback.event_sequence, 41);
});

test('server boundary returns an explicit not-persisted state instead of inventing a receipt', async () => {
  const result = await receiptModelReplyAtServerBoundary({
    contract: FLAME_CONTRACTS.bluebird,
    body: explicitBody(),
    result: { provider: 'deepseek', model: 'deepseek-chat', message: 'Hello.' },
    env: env(),
  });
  assert.equal(result.schema, MODEL_REPLY_RUNTIME_RECEIPT_SCHEMA);
  assert.equal(result.persisted, false);
  assert.equal(result.readback_verified, false);
  assert.match(result.reason, /service/i);
});

test('buffered Houseglass-style replies are server-receipted before returning to the caller', async () => {
  const body = {
    message: 'ARCSWEEP RELATIONAL TURN · reflection\n\nWorld: Terra Prime (terra-prime)\n\nHouseglass work.',
    session_id: 'arcsweep-terra-prime-7',
  };
  const contract = FLAME_CONTRACTS.bluebird;
  const prebuilt = await buildServerModelReplyRuntimeEvent({
    contract,
    body: {
      ...body,
      metadata: {
        world_id: 'terra-prime',
        thread_id: body.session_id,
        turn_id: body.session_id,
        surface: 'arcsweep-relational-turn',
      },
    },
    result: { flame_id: 'bluebird', provider: 'deepseek', model: 'deepseek-chat', message: 'Houseglass contribution.' },
    occurredAt: '2026-09-08T19:32:00.000Z',
  });
  // The wrapper generates its own timestamp/fingerprint, so the stub learns the
  // event from the RPC body and mirrors that exact event on readback.
  let stored = null;
  const fetchImpl = async (url, options = {}) => {
    if (String(url).includes('/rpc/house_runtime_append_model_reply')) {
      stored = JSON.parse(options.body).p_event;
      return new Response(JSON.stringify({ applied: true, event_id: stored.event_id, event_sequence: 42, packet_fingerprint: stored.packet_fingerprint }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (String(url).includes('/house_runtime_events?')) {
      return new Response(JSON.stringify([{ ...stored, event_sequence: 42, payload: stored }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  assert.ok(prebuilt.event_id);
  const response = await receiptBufferedFlameResponse({
    response: new Response(JSON.stringify({ flame_id: 'bluebird', provider: 'deepseek', model: 'deepseek-chat', message: 'Houseglass contribution.' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    body,
    flameId: 'bluebird',
    env: env({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' }),
    fetchImpl,
  });
  const payload = await response.json();
  assert.equal(payload.runtime_braid.persisted, true);
  assert.equal(payload.runtime_braid.readback_verified, true);
  assert.equal(payload.runtime_braid.voice_id, 'bluebird');
  assert.equal(payload.runtime_braid.world_id, 'terra-prime');
  assert.equal(payload.runtime_braid.thread_id, body.session_id);
  assert.equal(payload.runtime_braid.turn_id, body.session_id);
});

test('Vercel and Netlify Flame gateways both route streaming and buffered completions through the receipt wrapper', async () => {
  const [vercel, netlify] = await Promise.all([
    readFile(new URL('../../../api/v1/flames/[flame_id]/[action].js', import.meta.url), 'utf8'),
    readFile(new URL('../../../netlify/functions/flame-chat.mts', import.meta.url), 'utf8'),
  ]);
  for (const source of [vercel, netlify]) {
    assert.match(source, /createReceiptedFlameChatStreamHandler/);
    assert.match(source, /receiptBufferedFlameResponse/);
  }
});

test('model receipt migration deduplicates legacy browser and server witnesses by House turn + Flame', async () => {
  const sql = await readFile(new URL('../../../supabase/migrations/202609080001_house_model_reply_turn_identity.sql', import.meta.url), 'utf8');
  assert.match(sql, /thread_id = p_event ->> 'thread_id'/);
  assert.match(sql, /turn_id = p_event ->> 'turn_id'/);
  assert.match(sql, /voice_id = p_event ->> 'voice_id'/);
  assert.match(sql, /semantic_turn_match/);
  assert.match(sql, /service_role/);
});
