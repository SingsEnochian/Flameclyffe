import { resolveSupabaseRuntimeConfig } from './supabase-runtime-config.mjs';

export const MODEL_REPLY_RUNTIME_RECEIPT_SCHEMA = 'hearthgate.server-model-reply-receipt/v1';
export const HOUSE_MODEL_REPLY_EVENT_SCHEMA = 'hearthgate.runtime-braid-event/v1';

const text = (value) => String(value ?? '').trim();

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256ServerRuntimeReceipt(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson(value))));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function runtimeReceiptCoordinates(body = {}) {
  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const worldContext = metadata.world_context || body?.world_context || null;
  const worldId = text(
    metadata.world_id
    || worldContext?.active_world_id
    || worldContext?.identity_anchor?.world_id
    || body?.world_id,
  );
  const threadId = text(metadata.commons_thread_id || metadata.thread_id || body?.thread_id || body?.session_id);
  const turnId = text(metadata.commons_turn_id || metadata.turn_id || metadata.request_id || body?.turn_id);
  const sourceReceiptIds = [
    ...(Array.isArray(metadata.source_receipt_ids) ? metadata.source_receipt_ids : []),
    worldContext?.context_id,
  ].map(text).filter(Boolean);
  return Object.freeze({
    worldId: worldId || null,
    threadId: threadId || null,
    turnId: turnId || null,
    sourceReceiptIds: Object.freeze([...new Set(sourceReceiptIds)]),
    worldContextId: text(worldContext?.context_id) || null,
    worldContextFingerprint: text(worldContext?.context_fingerprint) || null,
    surface: text(metadata.surface) || null,
    requestId: text(metadata.request_id) || null,
  });
}

export async function buildServerModelReplyRuntimeEvent({
  contract,
  body,
  result,
  route = null,
  occurredAt = new Date().toISOString(),
} = {}) {
  if (!contract?.id) throw new Error('Runtime receipt requires a canonical Flame contract.');
  const coordinates = runtimeReceiptCoordinates(body);
  if (!coordinates.worldId || !coordinates.threadId || !coordinates.turnId) {
    throw new Error('Runtime receipt requires explicit World, thread, and turn identity.');
  }
  const provider = text(result?.provider);
  const model = text(result?.model);
  const reply = text(result?.message);
  const resolvedRoute = text(route || result?.route || contract.runtime?.route || `/api/v1/flames/${contract.id}/chat`);
  if (!provider || !model || !reply || !resolvedRoute) {
    throw new Error('Runtime receipt requires provider, model, route, and non-empty model speech.');
  }
  const replySha256 = await sha256ServerRuntimeReceipt(reply);
  const proofId = `server-model:${coordinates.turnId}:${contract.id}`;
  const evidence = {
    receipt_schema: MODEL_REPLY_RUNTIME_RECEIPT_SCHEMA,
    flame_contract_schema: contract.schema || null,
    proof_id: proofId,
    world_id: coordinates.worldId,
    world_context_id: coordinates.worldContextId,
    world_context_fingerprint: coordinates.worldContextFingerprint,
    thread_id: coordinates.threadId,
    turn_id: coordinates.turnId,
    voice_id: contract.id,
    formal_name: contract.identity?.formalName || contract.identity?.displayName || contract.id,
    provider,
    model,
    route: resolvedRoute,
    surface: coordinates.surface,
    request_id: coordinates.requestId,
    reply_sha256: replySha256,
    occurred_at: occurredAt,
  };
  const packetFingerprint = await sha256ServerRuntimeReceipt(evidence);
  const eventId = `model-reply:${contract.id}:${packetFingerprint.slice(0, 24)}`;
  return Object.freeze({
    schema: HOUSE_MODEL_REPLY_EVENT_SCHEMA,
    event_id: eventId,
    idempotency_key: eventId,
    continuity_packet_id: null,
    cycle_id: null,
    world_id: coordinates.worldId,
    event_type: 'model-reply-receipted',
    actor_id: contract.id,
    occurred_at: occurredAt,
    packet_id: proofId,
    packet_fingerprint: packetFingerprint,
    source_receipt_ids: coordinates.sourceReceiptIds,
    thread_id: coordinates.threadId,
    turn_id: coordinates.turnId,
    voice_id: contract.id,
    provider,
    model,
    route: resolvedRoute,
    flame_contract_schema: contract.schema || null,
    formal_name: contract.identity?.formalName || contract.identity?.displayName || contract.id,
    world_context_id: coordinates.worldContextId,
    world_context_fingerprint: coordinates.worldContextFingerprint,
    surface: coordinates.surface,
    request_id: coordinates.requestId,
    reply_sha256: replySha256,
    reply_excerpt: reply.slice(0, 280),
    runtime_verified: true,
  });
}

function supabaseHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    'content-type': 'application/json',
    'cache-control': 'no-store',
  };
}

async function responseJson(response) {
  return response.json().catch(() => ({}));
}

export async function appendAndVerifyServerModelReplyRuntimeEvent(event, env, fetchImpl = fetch) {
  const config = resolveSupabaseRuntimeConfig(env);
  if (!config.configured) throw new Error(`Runtime receipt storage unavailable: ${config.missing.join(', ')}`);
  const headers = supabaseHeaders(config.serviceRoleKey);
  const writeResponse = await fetchImpl(`${config.url}/rest/v1/rpc/house_runtime_append_model_reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_event: event }),
  });
  const write = await responseJson(writeResponse);
  if (!writeResponse.ok) throw new Error(write?.message || write?.error || write?.hint || `Runtime receipt write failed (${writeResponse.status}).`);

  const readUrl = `${config.url}/rest/v1/house_runtime_events?select=event_sequence,event_id,event_type,world_id,actor_id,occurred_at,packet_id,packet_fingerprint,source_receipt_ids,thread_id,turn_id,voice_id,provider,model,route,payload,created_at&event_id=eq.${encodeURIComponent(event.event_id)}&limit=1`;
  const readResponse = await fetchImpl(readUrl, { method: 'GET', headers });
  const rows = await responseJson(readResponse);
  if (!readResponse.ok) throw new Error(rows?.message || rows?.error || `Runtime receipt readback failed (${readResponse.status}).`);
  const readback = Array.isArray(rows) ? rows[0] : null;
  const verified = Boolean(readback
    && readback.event_id === event.event_id
    && readback.event_type === 'model-reply-receipted'
    && readback.packet_fingerprint === event.packet_fingerprint
    && readback.voice_id === event.voice_id
    && readback.provider === event.provider
    && readback.model === event.model
    && readback.route === event.route
    && readback.world_id === event.world_id
    && readback.thread_id === event.thread_id
    && readback.turn_id === event.turn_id);
  if (!verified) throw new Error('Runtime receipt readback did not match the server-observed model reply.');
  return Object.freeze({ write, readback, verified });
}

export async function receiptModelReplyAtServerBoundary({
  contract,
  body,
  result,
  env,
  fetchImpl = fetch,
  route = null,
  occurredAt = new Date().toISOString(),
} = {}) {
  try {
    const event = await buildServerModelReplyRuntimeEvent({ contract, body, result, route, occurredAt });
    const persistence = await appendAndVerifyServerModelReplyRuntimeEvent(event, env, fetchImpl);
    return Object.freeze({
      schema: MODEL_REPLY_RUNTIME_RECEIPT_SCHEMA,
      persisted: true,
      readback_verified: persistence.verified === true,
      event_id: event.event_id,
      event_sequence: persistence.readback?.event_sequence ?? persistence.write?.event_sequence ?? null,
      packet_fingerprint: event.packet_fingerprint,
      world_id: event.world_id,
      thread_id: event.thread_id,
      turn_id: event.turn_id,
      voice_id: event.voice_id,
      provider: event.provider,
      model: event.model,
      route: event.route,
    });
  } catch (error) {
    return Object.freeze({
      schema: MODEL_REPLY_RUNTIME_RECEIPT_SCHEMA,
      persisted: false,
      readback_verified: false,
      reason: error?.message || String(error),
    });
  }
}
