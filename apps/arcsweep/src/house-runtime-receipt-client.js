import { getKelyranSupabase } from './kelyran-supabase.js';

export const HOUSE_RUNTIME_RECEIPT_EDGE = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/arcsweep-runtime-receipt';
export const HOUSE_MODEL_REPLY_EVENT_SCHEMA = 'hearthgate.runtime-braid-event/v1';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export async function sha256RuntimeReceipt(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson(value))));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function accessToken() {
  const client = await getKelyranSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Steward Supabase session required for Runtime receipt persistence.');
  return token;
}

async function edgeFetch(path = '', options = {}) {
  const token = await accessToken();
  const response = await fetch(`${HOUSE_RUNTIME_RECEIPT_EDGE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.error || `Runtime receipt transport failed (${response.status}).`);
  return body;
}

export async function buildModelReplyRuntimeEvent({
  proof,
  worldContext,
  threadId,
  turnId,
  sourceReceiptIds = [],
  occurredAt = new Date().toISOString(),
} = {}) {
  if (!proof?.proven) throw new Error('Only attributable model replies may enter the Runtime Braid.');
  const worldId = worldContext?.active_world_id || worldContext?.identity_anchor?.world_id;
  if (!worldId) throw new Error('Runtime receipt requires an explicit active World.');
  if (!threadId || !turnId) throw new Error('Runtime receipt requires House thread and turn identity.');

  const evidence = {
    proof_schema: proof.schema,
    proof_id: proof.proof_id,
    world_id: worldId,
    world_context_id: worldContext?.context_id || null,
    world_context_fingerprint: worldContext?.context_fingerprint || null,
    thread_id: threadId,
    turn_id: turnId,
    voice_id: proof.voice_id,
    voice_name: proof.voice_name,
    provider: proof.provider,
    model: proof.model,
    route: proof.route,
    runtime_verified: proof.runtime_verified === true,
    reply_excerpt: proof.reply_excerpt,
    latency_ms: proof.latency_ms,
    occurred_at: occurredAt,
  };
  const packetFingerprint = await sha256RuntimeReceipt(evidence);
  const eventId = `model-reply:${proof.voice_id}:${packetFingerprint.slice(0, 24)}`;
  return Object.freeze({
    schema: HOUSE_MODEL_REPLY_EVENT_SCHEMA,
    event_id: eventId,
    idempotency_key: eventId,
    continuity_packet_id: null,
    cycle_id: null,
    world_id: worldId,
    event_type: 'model-reply-receipted',
    actor_id: proof.voice_id,
    occurred_at: occurredAt,
    packet_id: proof.proof_id,
    packet_fingerprint: packetFingerprint,
    source_receipt_ids: [...new Set(sourceReceiptIds.filter(Boolean))],
    thread_id: threadId,
    turn_id: turnId,
    voice_id: proof.voice_id,
    provider: proof.provider,
    model: proof.model,
    route: proof.route,
    world_context_id: worldContext?.context_id || null,
    world_context_fingerprint: worldContext?.context_fingerprint || null,
    runtime_verified: true,
    latency_ms: proof.latency_ms,
    reply_excerpt: proof.reply_excerpt,
  });
}

export async function appendModelReplyRuntimeEvent(event) {
  return edgeFetch('', { method: 'POST', body: JSON.stringify({ event }) });
}

export async function readModelReplyRuntimeEvent(eventId) {
  const result = await edgeFetch(`?event_id=${encodeURIComponent(eventId)}`, { method: 'GET' });
  return result.events?.[0] || null;
}

export async function persistAndVerifyModelReplyRuntimeEvent(event) {
  const write = await appendModelReplyRuntimeEvent(event);
  const readback = await readModelReplyRuntimeEvent(event.event_id);
  const verified = Boolean(readback
    && readback.event_id === event.event_id
    && readback.packet_fingerprint === event.packet_fingerprint
    && readback.voice_id === event.voice_id
    && readback.provider === event.provider
    && readback.model === event.model
    && readback.route === event.route
    && readback.thread_id === event.thread_id
    && readback.turn_id === event.turn_id);
  if (!verified) throw new Error('Runtime receipt readback did not match the written event.');
  return Object.freeze({ write, readback, verified });
}
