import { createDeepTimeRecordFromAcceptedFeedback } from '../../../apps/arcsweep/src/deep-time-bridge.js';
import {
  RUNTIME_BRAID_COMMAND_RESULT_SCHEMA,
  RUNTIME_BRAID_COMMAND_SCHEMA,
  createRuntimeBraidEvent,
  createRuntimeBraidPacket,
  createRuntimeReviewReceipt,
  runtimeDeepTimeRow,
  runtimeEventRow,
  runtimeReviewRow,
} from '../../../apps/arcsweep/src/runtime-braid-packet.js';
import { buildRuntimeObservationLiveRead, buildRuntimeObservationSnapshot } from '../../../apps/arcsweep/src/runtime-observation-snapshot.js';
import { authoriseHouseRequest } from './house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

class CommandError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'HouseRuntimeCommandError';
    this.status = status;
  }
}

function limitFrom(url) {
  const requested = Number(new URL(url).searchParams.get('limit')) || 100;
  return Math.max(1, Math.min(Math.trunc(requested), 200));
}

function worldFrom(url) {
  const value = new URL(url).searchParams.get('world_id');
  return value ? value.trim().slice(0, 240) : null;
}

function restHeaders(env, extra = {}) {
  return {
    apikey: env.get('SUPABASE_SERVICE_ROLE_KEY'),
    authorization: `Bearer ${env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    accept: 'application/json',
    ...extra,
  };
}

async function readRows(fetchImpl, env, table, { filters = {}, limit = 100, order = 'created_at.desc' } = {}) {
  const params = new URLSearchParams({ select: '*', order, limit: String(limit) });
  for (const [field, value] of Object.entries(filters)) if (value != null && value !== '') params.set(field, `eq.${value}`);
  const response = await fetchImpl(`${env.get('SUPABASE_URL')}/rest/v1/${table}?${params}`, {
    headers: restHeaders(env),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`${table} live read failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${table} live read returned a non-array payload.`);
  return rows;
}

async function applyCommand(fetchImpl, env, command) {
  const response = await fetchImpl(`${env.get('SUPABASE_URL')}/rest/v1/rpc/house_runtime_apply_observation_command`, {
    method: 'POST',
    headers: restHeaders(env, { 'content-type': 'application/json' }),
    body: JSON.stringify({ p_command: command }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.text();
    const status = /already has a different|already bound to a different|wrong human review|requires an accepted/i.test(body) ? 409 : 422;
    throw new CommandError(`House Runtime command was not applied: ${body}`, status);
  }
  return response.json();
}

function cyclePayload(row) {
  return row?.payload?.schema === 'arcsweep.feedback-cycle/v1' ? row.payload : row;
}

function reviewPayload(row) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : row;
  return {
    ...structuredClone(payload),
    cycle_id: row.cycle_id || payload.cycle_id,
    world_id: row.world_id || payload.world_id,
    observation_source: row.observation_source || payload.observation_source,
    status: row.decision || payload.decision || payload.status || payload.action,
    decision: row.decision || payload.decision || payload.status || payload.action,
    reviewed_by: row.reviewed_by || payload.reviewed_by,
    reviewed_at: row.reviewed_at || payload.reviewed_at,
    review_receipt_id: row.review_receipt_id || payload.review_receipt_id || payload.receipt_id,
  };
}

function deepTimePayload(row) {
  return row?.payload?.dataset_kind === 'deep_time' ? row.payload : row;
}

function commandBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CommandError('Runtime Braid command must be a JSON object.', 400);
  if (value.schema !== RUNTIME_BRAID_COMMAND_SCHEMA) throw new CommandError('Unsupported Runtime Braid command schema.', 400);
  if (!['review-observation', 'admit-deeptime'].includes(value.action)) throw new CommandError('Unsupported Runtime Braid command action.', 400);
  if (typeof value.command_id !== 'string' || !value.command_id.trim()) throw new CommandError('Runtime Braid command_id is required.', 400);
  if (typeof value.cycle_id !== 'string' || !value.cycle_id.trim()) throw new CommandError('Runtime Braid cycle_id is required.', 400);
  if (typeof value.requested_at !== 'string' || Number.isNaN(Date.parse(value.requested_at))) throw new CommandError('Runtime Braid requested_at must be an ISO timestamp.', 400);
  return {
    schema: RUNTIME_BRAID_COMMAND_SCHEMA,
    command_id: value.command_id.trim().slice(0, 200),
    action: value.action,
    cycle_id: value.cycle_id.trim().slice(0, 240),
    decision: value.decision,
    reviewed_by: String(value.reviewed_by || 'Rowan').trim().slice(0, 120),
    requested_at: value.requested_at,
  };
}

async function readCycleBundle(fetchImpl, env, cycleId) {
  const [cycles, reviews, deepTimeRecords] = await Promise.all([
    readRows(fetchImpl, env, 'arcsweep_feedback_cycles', { filters: { cycle_id: cycleId }, limit: 1 }),
    readRows(fetchImpl, env, 'arcsweep_feedback_reviews', { filters: { cycle_id: cycleId }, limit: 1, order: 'reviewed_at.desc' }),
    readRows(fetchImpl, env, 'arcsweep_deep_time_records', { filters: { cycle_id: cycleId }, limit: 1, order: 'observed_at.desc' }),
  ]);
  if (!cycles[0]) throw new CommandError('Observation cycle is not present in the relational ledger.', 404);
  return {
    cycleRow: cycles[0],
    cycle: cyclePayload(cycles[0]),
    reviewRow: reviews[0] || null,
    review: reviewPayload(reviews[0]),
    deepTimeRow: deepTimeRecords[0] || null,
    deepTime: deepTimePayload(deepTimeRecords[0]),
  };
}

async function handleReview({ command, bundle, fetchImpl, env }) {
  if (!['accepted', 'archived', 'discarded'].includes(command.decision)) throw new CommandError('Review decision must be accepted, archived, or discarded.', 400);
  if (bundle.review) {
    if (bundle.review.decision !== command.decision) throw new CommandError(`Observation already has a ${bundle.review.decision} human review.`, 409);
    const packet = await createRuntimeBraidPacket({ cycle: bundle.cycle, review: bundle.review, generatedAt: bundle.review.reviewed_at });
    return {
      database: { applied: false, idempotent: true },
      packet,
      snapshot: buildRuntimeObservationSnapshot({ cycle: bundle.cycleRow, review: bundle.reviewRow, deepTimeRecord: bundle.deepTimeRow, generatedAt: command.requested_at }),
    };
  }
  const review = await createRuntimeReviewReceipt({
    cycle: bundle.cycle,
    decision: command.decision,
    reviewedBy: command.reviewed_by,
    reviewedAt: command.requested_at,
    commandId: command.command_id,
  });
  const packet = await createRuntimeBraidPacket({ cycle: bundle.cycle, review, generatedAt: command.requested_at });
  const event = await createRuntimeBraidEvent({
    packet,
    eventType: `review-${command.decision}`,
    idempotencyKey: command.command_id,
    actorId: command.reviewed_by,
    occurredAt: command.requested_at,
  });
  const database = await applyCommand(fetchImpl, env, {
    ...command,
    review_row: runtimeReviewRow(review, packet.continuity_packet_id),
    deep_time_row: null,
    event_row: runtimeEventRow(event),
  });
  return {
    database,
    event,
    packet,
    snapshot: buildRuntimeObservationSnapshot({ cycle: bundle.cycleRow, review, generatedAt: command.requested_at }),
  };
}

async function handleDeepTime({ command, bundle, fetchImpl, env }) {
  if (bundle.deepTime) {
    const packet = await createRuntimeBraidPacket({ cycle: bundle.cycle, review: bundle.review, deepTimeRecord: bundle.deepTime, generatedAt: command.requested_at });
    return {
      database: { applied: false, idempotent: true },
      packet,
      snapshot: buildRuntimeObservationSnapshot({ cycle: bundle.cycleRow, review: bundle.reviewRow, deepTimeRecord: bundle.deepTimeRow, generatedAt: command.requested_at }),
    };
  }
  if (bundle.review?.decision !== 'accepted') throw new CommandError('DEEPTime admission requires an accepted human review.', 409);
  const previousRows = await readRows(fetchImpl, env, 'arcsweep_deep_time_records', {
    filters: { world_id: bundle.cycle.world.id },
    limit: 1,
    order: 'lambda.desc',
  });
  const previousRecord = deepTimePayload(previousRows[0]) || null;
  const record = await createDeepTimeRecordFromAcceptedFeedback({
    cycle: bundle.cycle,
    acceptedQueueEntry: { ...bundle.review, status: 'accepted' },
    previousRecord,
  });
  const packet = await createRuntimeBraidPacket({ cycle: bundle.cycle, review: bundle.review, deepTimeRecord: record, generatedAt: command.requested_at });
  const event = await createRuntimeBraidEvent({
    packet,
    eventType: 'deeptime-admitted',
    idempotencyKey: command.command_id,
    actorId: command.reviewed_by,
    occurredAt: command.requested_at,
  });
  const database = await applyCommand(fetchImpl, env, {
    ...command,
    review_row: null,
    deep_time_row: runtimeDeepTimeRow(record, packet.continuity_packet_id),
    event_row: runtimeEventRow(event),
  });
  return {
    database,
    event,
    packet,
    snapshot: buildRuntimeObservationSnapshot({ cycle: bundle.cycleRow, review: bundle.review, deepTimeRecord: record, generatedAt: command.requested_at }),
  };
}

async function handleLiveRead(request, fetchImpl, env, clock) {
  const worldId = worldFrom(request.url);
  const limit = limitFrom(request.url);
  const filters = worldId ? { world_id: worldId } : {};
  const [cycles, reviews, deepTimeRecords] = await Promise.all([
    readRows(fetchImpl, env, 'arcsweep_feedback_cycles', { filters, limit }),
    readRows(fetchImpl, env, 'arcsweep_feedback_reviews', { filters, limit, order: 'reviewed_at.desc' }),
    readRows(fetchImpl, env, 'arcsweep_deep_time_records', { filters, limit, order: 'observed_at.desc' }),
  ]);
  const generatedAt = clock().toISOString();
  const live = buildRuntimeObservationLiveRead({ cycles, reviews, deepTimeRecords, worldId, generatedAt });
  const reviewByCycle = new Map(reviews.map((row) => [reviewPayload(row)?.cycle_id, row]));
  const deepByCycle = new Map(deepTimeRecords.map((row) => [deepTimePayload(row)?.provenance?.observation_run_id, row]));
  const braidPackets = await Promise.all(cycles.map((row) => {
    const cycle = cyclePayload(row);
    return createRuntimeBraidPacket({
      cycle,
      review: reviewByCycle.get(cycle.cycle_id) || null,
      deepTimeRecord: deepByCycle.get(cycle.cycle_id) || null,
      generatedAt,
    });
  }));
  return json(200, {
    ...live,
    braid_packets: braidPackets,
    realtime: {
      schema: 'hearthgate.runtime-braid-live-link/v1',
      path: '/api/v1/house/braid/stream',
      private: true,
      cursor: null,
    },
  });
}

export function createHouseObservationRuntimeHandler({ env, fetchImpl = fetch, clock = () => new Date() } = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (!env.get('SUPABASE_URL') || !env.get('SUPABASE_SERVICE_ROLE_KEY')) return json(503, { error: 'House observation ledgers are not configured.' });
    try {
      if (request.method === 'GET') return handleLiveRead(request, fetchImpl, env, clock);
      if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
      let body;
      try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
      const command = commandBody(body);
      const bundle = await readCycleBundle(fetchImpl, env, command.cycle_id);
      const result = command.action === 'review-observation'
        ? await handleReview({ command, bundle, fetchImpl, env })
        : await handleDeepTime({ command, bundle, fetchImpl, env });
      return json(result.database.applied === false ? 200 : 201, {
        schema: RUNTIME_BRAID_COMMAND_RESULT_SCHEMA,
        command_id: command.command_id,
        action: command.action,
        applied: result.database.applied !== false,
        idempotent: result.database.idempotent === true,
        event_id: result.event?.event_id || result.database.event_id || null,
        event_sequence: result.database.event_sequence ?? null,
        packet: result.packet,
        snapshot: result.snapshot,
      });
    } catch (error) {
      return json(error.status || 502, { error: error.message || 'House observation broker failed.' });
    }
  };
}
