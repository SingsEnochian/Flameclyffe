import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { feedbackCycleSource } from './feedback-cycle-queue.js';

export const RUNTIME_BRAID_PACKET_SCHEMA = 'hearthgate.runtime-braid-packet/v1';
export const RUNTIME_BRAID_EVENT_SCHEMA = 'hearthgate.runtime-braid-event/v1';
export const RUNTIME_BRAID_COMMAND_SCHEMA = 'hearthgate.runtime-braid-command/v1';
export const RUNTIME_BRAID_COMMAND_RESULT_SCHEMA = 'hearthgate.runtime-braid-command-result/v1';

const REVIEW_DECISIONS = new Set(['accepted', 'archived', 'discarded']);
const EVENT_TYPES = new Set([
  'observation-receipted',
  'review-accepted',
  'review-archived',
  'review-discarded',
  'deeptime-admitted',
]);

function invariant(condition, message) {
  if (!condition) throw new Error(`HOUSE_RUNTIME_BRAID: ${message}`);
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cyclePayload(value) {
  return value?.payload?.schema === 'arcsweep.feedback-cycle/v1' ? value.payload : value;
}

function reviewPayload(value) {
  if (!value) return null;
  const payload = value.payload && typeof value.payload === 'object' ? value.payload : value;
  return {
    ...clone(payload),
    cycle_id: value.cycle_id || payload.cycle_id,
    world_id: value.world_id || payload.world_id,
    observation_source: value.observation_source || payload.observation_source,
    decision: value.decision || payload.decision || payload.status || payload.action,
    reviewed_by: value.reviewed_by || payload.reviewed_by,
    reviewed_at: value.reviewed_at || payload.reviewed_at,
    review_receipt_id: value.review_receipt_id || payload.review_receipt_id || payload.receipt_id,
  };
}

function deepTimePayload(value) {
  if (!value) return null;
  return value.payload?.dataset_kind === 'deep_time' ? value.payload : value;
}

function requireStamp(value, field) {
  invariant(typeof value === 'string' && !Number.isNaN(Date.parse(value)), `${field} must be an ISO timestamp`);
  return value;
}

function sourceReceiptIds(cycle, review, deepTime) {
  return [...new Set([
    cycle.cycle_id,
    cycle.cycle_fingerprint,
    cycle.math_spine_packet?.packet_id,
    cycle.math_spine_packet?.packet_fingerprint,
    cycle.replay_receipt?.replay_fingerprint,
    ...(cycle.evidence || []).map((item) => item?.receipt_id || item?.record_id || item?.id),
    review?.review_receipt_id,
    deepTime?.id,
    deepTime?.record_fingerprint,
  ].filter(Boolean))];
}

export function runtimeContinuityPacketId(cycleInput) {
  const cycle = cyclePayload(cycleInput);
  invariant(cycle?.schema === 'arcsweep.feedback-cycle/v1', 'a receipted feedback cycle is required');
  invariant(cycle.cycle_id && cycle.world?.id, 'cycle and world identifiers are required');
  return `braid:${cycle.world.id}:${cycle.cycle_id}`;
}

export async function createRuntimeReviewReceipt({
  cycle: cycleInput,
  decision,
  reviewedBy,
  reviewedAt,
  commandId,
} = {}) {
  const cycle = cyclePayload(cycleInput);
  invariant(cycle?.schema === 'arcsweep.feedback-cycle/v1', 'review requires a receipted feedback cycle');
  invariant(REVIEW_DECISIONS.has(decision), 'review decision must be accepted, archived, or discarded');
  invariant(typeof reviewedBy === 'string' && reviewedBy.trim(), 'reviewedBy is required');
  invariant(typeof commandId === 'string' && commandId.trim(), 'commandId is required');
  requireStamp(reviewedAt, 'reviewedAt');
  const core = {
    schema: 'arcsweep.feedback-cycle-queue-receipt/v1',
    action: decision,
    decision,
    status: decision,
    cycle_id: cycle.cycle_id,
    world_id: cycle.world.id,
    observation_source: feedbackCycleSource(cycle),
    reviewed_at: reviewedAt,
    reviewed_by: reviewedBy.trim().slice(0, 120),
    command_id: commandId.trim().slice(0, 200),
    authority: {
      explicit_human_decision: true,
      automatic_acceptance: false,
      source_cycle_mutable: false,
      canon_commit: false,
    },
  };
  const receiptFingerprint = await sha256Hex(core);
  const receiptId = `feedback-review-${receiptFingerprint.slice(0, 24)}`;
  return deepFreeze({
    ...core,
    receipt_id: receiptId,
    review_receipt_id: receiptId,
    receipt_fingerprint: receiptFingerprint,
  });
}

export async function createRuntimeBraidPacket({
  cycle: cycleInput,
  review: reviewInput = null,
  deepTimeRecord: deepTimeInput = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const cycle = cyclePayload(cycleInput);
  const review = reviewPayload(reviewInput);
  const deepTime = deepTimePayload(deepTimeInput);
  invariant(cycle?.schema === 'arcsweep.feedback-cycle/v1', 'packet requires a receipted feedback cycle');
  invariant(cycle.cycle_id && cycle.world?.id, 'packet requires cycle and world identifiers');
  requireStamp(generatedAt, 'generatedAt');
  if (review) {
    invariant(review.cycle_id === cycle.cycle_id, 'review must belong to the packet cycle');
    invariant(REVIEW_DECISIONS.has(review.decision), 'packet review decision is unsupported');
  }
  if (deepTime) {
    invariant(deepTime.provenance?.observation_run_id === cycle.cycle_id, 'DEEPTime record must belong to the packet cycle');
    invariant(review?.decision === 'accepted', 'DEEPTime packet requires an accepted human review');
    invariant(deepTime.provenance?.feedback_review_receipt_id === review.review_receipt_id, 'DEEPTime record must name the packet review receipt');
  }

  const continuityPacketId = runtimeContinuityPacketId(cycle);
  const stage = deepTime ? 'entered-deeptime' : review ? `review-${review.decision}` : 'awaiting-review';
  const qualiaEvidence = (cycle.evidence || []).filter((item) => item?.qualia?.value !== undefined);
  const core = {
    schema: RUNTIME_BRAID_PACKET_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt,
    continuity_packet_id: continuityPacketId,
    revision: deepTime ? 3 : review ? 2 : 1,
    stage,
    world: clone(cycle.world),
    observation: {
      cycle_id: cycle.cycle_id,
      source: feedbackCycleSource(cycle),
      mode: cycle.turn?.mode || null,
      observed_at: cycle.created_at || cycle.premaqc_after?.observed_at || null,
      work: cycle.turn?.work || '',
      response_present: Boolean(String(cycle.turn?.response || '').trim()),
    },
    active_state: {
      premaqc_id: cycle.premaqc_after?.id || null,
      premaqc_receipt_id: cycle.premaqc_after?.receipt_id || null,
      premaqc_sequence: cycle.premaqc_after?.sequence ?? null,
      premaqc: clone(cycle.premaqc_after?.state || null),
    },
    actors: {
      voices: clone((cycle.voices || []).map((voice) => ({ id: voice.id, name: voice.name, route: voice.route || null }))),
      reviewer: review ? { id: review.reviewed_by, decision: review.decision } : null,
    },
    consent: {
      house_session_required: true,
      human_review_required_for_deep_time: true,
      review_present: Boolean(review),
      review_receipt_id: review?.review_receipt_id || null,
    },
    qualia: {
      present: qualiaEvidence.length > 0,
      authority: 'firsthand-only',
      inferred: false,
      source_evidence_count: qualiaEvidence.length,
    },
    lineage: {
      math_spine_packet_id: cycle.math_spine_packet?.packet_id || null,
      math_spine_packet_fingerprint: cycle.math_spine_packet?.packet_fingerprint || null,
      cycle_fingerprint: cycle.cycle_fingerprint || null,
      deterministic_replay_matched: cycle.replay_receipt?.matched === true,
      replay_fingerprint: cycle.replay_receipt?.replay_fingerprint || null,
      review_receipt_id: review?.review_receipt_id || null,
      deep_time_record_id: deepTime?.id || null,
      deep_time_record_fingerprint: deepTime?.record_fingerprint || null,
      source_receipt_ids: sourceReceiptIds(cycle, review, deepTime),
    },
    authority: {
      one_shared_runtime_state: true,
      append_only_lineage: true,
      unknown_and_open_are_valid: true,
      qualia_inference_allowed: false,
      silent_canon_merge: false,
      physical_claim: false,
      canon_commit: false,
    },
  };
  const packetFingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    packet_id: `runtime-braid-${packetFingerprint.slice(0, 24)}`,
    packet_fingerprint: packetFingerprint,
  });
}

export async function createRuntimeBraidEvent({
  packet,
  eventType,
  idempotencyKey,
  actorId = 'House Runtime',
  occurredAt = new Date().toISOString(),
} = {}) {
  invariant(packet?.schema === RUNTIME_BRAID_PACKET_SCHEMA, 'event requires a Runtime Braid Packet');
  invariant(EVENT_TYPES.has(eventType), 'event type is unsupported');
  invariant(typeof idempotencyKey === 'string' && idempotencyKey.trim(), 'event idempotency key is required');
  requireStamp(occurredAt, 'occurredAt');
  const core = {
    schema: RUNTIME_BRAID_EVENT_SCHEMA,
    schema_version: 1,
    event_type: eventType,
    idempotency_key: idempotencyKey.trim().slice(0, 240),
    occurred_at: occurredAt,
    continuity_packet_id: packet.continuity_packet_id,
    world_id: packet.world.id,
    cycle_id: packet.observation.cycle_id,
    actor_id: String(actorId || 'House Runtime').slice(0, 120),
    packet_id: packet.packet_id,
    packet_fingerprint: packet.packet_fingerprint,
    source_receipt_ids: clone(packet.lineage.source_receipt_ids),
    packet: clone(packet),
    authority: {
      append_only: true,
      event_reclassifies_source: false,
      automatic_acceptance: false,
      canon_commit: false,
    },
  };
  const eventFingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    event_id: `runtime-event-${eventFingerprint.slice(0, 24)}`,
    event_fingerprint: eventFingerprint,
  });
}

export function runtimeReviewRow(review, continuityPacketId) {
  invariant(review?.schema === 'arcsweep.feedback-cycle-queue-receipt/v1', 'review row requires a review receipt');
  return {
    review_receipt_id: review.review_receipt_id,
    cycle_id: review.cycle_id,
    continuity_packet_id: continuityPacketId,
    world_id: review.world_id,
    observation_source: review.observation_source,
    decision: review.decision,
    reviewed_by: review.reviewed_by,
    reviewed_at: review.reviewed_at,
    payload: clone(review),
  };
}

export function runtimeDeepTimeRow(record, continuityPacketId) {
  invariant(record?.dataset_kind === 'deep_time', 'DEEPTime row requires a DEEPTime record');
  return {
    record_id: record.id,
    cycle_id: record.provenance.observation_run_id,
    continuity_packet_id: continuityPacketId,
    review_receipt_id: record.provenance.feedback_review_receipt_id,
    world_id: record.world_id,
    sequence_id: record.sequence_id,
    lambda: record.lambda,
    observed_at: record.time.utc,
    record_fingerprint: record.record_fingerprint,
    payload: clone(record),
  };
}

export function runtimeEventRow(event) {
  invariant(event?.schema === RUNTIME_BRAID_EVENT_SCHEMA, 'event row requires a Runtime Braid Event');
  return {
    event_id: event.event_id,
    idempotency_key: event.idempotency_key,
    continuity_packet_id: event.continuity_packet_id,
    world_id: event.world_id,
    cycle_id: event.cycle_id,
    event_type: event.event_type,
    actor_id: event.actor_id,
    occurred_at: event.occurred_at,
    packet_id: event.packet_id,
    packet_fingerprint: event.packet_fingerprint,
    source_receipt_ids: clone(event.source_receipt_ids),
    payload: clone(event),
  };
}
