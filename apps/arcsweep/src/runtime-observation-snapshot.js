import { feedbackCycleSource } from './feedback-cycle-queue.js';

export const RUNTIME_OBSERVATION_SNAPSHOT_SCHEMA = 'hearthgate.runtime-observation-snapshot/v1';
export const RUNTIME_OBSERVATION_LIVE_READ_SCHEMA = 'hearthgate.runtime-observation-live-read/v1';

const clone = (value) => value == null ? value : structuredClone(value);

function cyclePayload(value) {
  return value?.payload?.schema === 'arcsweep.feedback-cycle/v1' ? value.payload : value;
}

function reviewPayload(value) {
  if (!value) return null;
  const payload = value.payload && typeof value.payload === 'object' ? value.payload : {};
  return {
    ...payload,
    cycle_id: value.cycle_id || payload.cycle_id,
    world_id: value.world_id || payload.world_id,
    observation_source: value.observation_source || payload.observation_source,
    status: value.decision || value.status || payload.decision || payload.status || payload.action,
    reviewed_at: value.reviewed_at || payload.reviewed_at,
    reviewed_by: value.reviewed_by || payload.reviewed_by,
    review_receipt_id: value.review_receipt_id || payload.review_receipt_id || payload.receipt_id,
  };
}

function deepTimePayload(value) {
  if (!value) return null;
  return value.payload?.dataset_kind === 'deep_time' ? value.payload : value;
}

function evidenceClass(cycle) {
  return feedbackCycleSource(cycle);
}

function reviewState(review) {
  const state = review?.status || 'pending_review';
  return ['accepted', 'archived', 'discarded'].includes(state) ? state : 'pending_review';
}

function continuityStatus(review, deepTime) {
  if (review?.status === 'discarded') return 'discarded';
  if (review?.status === 'archived') return 'archived';
  if (review?.status !== 'accepted') return 'awaiting-review';
  return deepTime ? 'entered-deeptime' : 'accepted-awaiting-deeptime';
}

function validStamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function latestReceipt(cycle, review, deepTime) {
  const candidates = [
    {
      receipt_id: cycle.cycle_id,
      schema: cycle.schema,
      stage: 'observation',
      status: 'receipted',
      created_at: validStamp(cycle.created_at || cycle.premaqc_after?.observed_at),
    },
    review?.review_receipt_id ? {
      receipt_id: review.review_receipt_id,
      schema: review.schema || 'arcsweep.feedback-cycle-queue-receipt/v1',
      stage: 'review',
      status: review.status,
      created_at: validStamp(review.reviewed_at),
    } : null,
    deepTime?.id ? {
      receipt_id: deepTime.id,
      schema: deepTime.schema_version ? `deep_time/${deepTime.schema_version}` : 'deep_time/0.1.0',
      stage: 'deeptime',
      status: 'admitted',
      created_at: validStamp(deepTime.time?.utc),
    } : null,
  ].filter(Boolean);
  return candidates.sort((left, right) => String(left.created_at || '').localeCompare(String(right.created_at || ''))).at(-1) || null;
}

function qualiaFromCycle(cycle, evidence) {
  const direct = cycle.premaqc_after?.qualia || cycle.premaqc_before?.qualia || null;
  if (direct?.schema === 'premaqc.qualia-report/v1') return direct;
  return evidence.map((item) => item?.qualia).find((item) => item?.schema === 'premaqc.qualia-report/v1') || null;
}

export function buildRuntimeObservationSnapshot({ cycle: cycleInput, review: reviewInput = null, deepTimeRecord: deepTimeInput = null, generatedAt = new Date().toISOString() } = {}) {
  const cycleRow = cycleInput;
  const cycle = cyclePayload(cycleInput);
  if (cycle?.schema !== 'arcsweep.feedback-cycle/v1' || !cycle.cycle_id || !cycle.world?.id) {
    throw new Error('Runtime observation snapshot requires a receipted Arcsweep observation cycle.');
  }
  const review = reviewPayload(reviewInput);
  const deepTime = deepTimePayload(deepTimeInput);
  if (review?.cycle_id && review.cycle_id !== cycle.cycle_id) throw new Error('Runtime observation review must match the observation cycle.');
  if (deepTime?.provenance?.observation_run_id && deepTime.provenance.observation_run_id !== cycle.cycle_id) {
    throw new Error('Runtime DEEPTime record must match the observation cycle.');
  }

  const source = evidenceClass(cycle);
  const state = reviewState(review);
  const evidence = Array.isArray(cycle.evidence) ? cycle.evidence : [];
  const qualia = qualiaFromCycle(cycle, evidence);
  const receipt = latestReceipt(cycle, review, deepTime);
  const sourceHashes = [
    cycle.cycle_fingerprint,
    cycle.math_spine_packet?.packet_fingerprint,
    ...(deepTime?.provenance?.source_receipt_hashes || []),
  ].filter(Boolean);

  return Object.freeze({
    schema: RUNTIME_OBSERVATION_SNAPSHOT_SCHEMA,
    generated_at: generatedAt,
    world: clone(cycle.world),
    observation: Object.freeze({
      cycle_id: cycle.cycle_id,
      source,
      mode: cycle.turn?.mode || null,
      observed_at: cycle.created_at || cycle.premaqc_after?.observed_at || null,
      status: cycleRow?.status || (state === 'pending_review' ? 'pending_review' : state),
      work: cycle.turn?.work || '',
      response_present: Boolean(String(cycle.turn?.response || '').trim()),
      premaqc_before_id: cycle.premaqc_before?.id || null,
      premaqc_after_id: cycle.premaqc_after?.id || null,
      premaqc_after_receipt_id: cycle.premaqc_after?.receipt_id || null,
      voices: clone(cycle.voices || []),
    }),
    review: Object.freeze({
      status: state,
      receipt_id: review?.review_receipt_id || null,
      reviewed_at: review?.reviewed_at || null,
      reviewed_by: review?.reviewed_by || null,
      human_decision_present: Boolean(review?.review_receipt_id && state !== 'pending_review'),
    }),
    evidence: Object.freeze({
      class: source,
      count: evidence.length,
      schemas: Object.freeze([...new Set(evidence.map((item) => item?.schema).filter(Boolean))]),
      sources: Object.freeze([...new Set(evidence.map((item) => item?.source).filter(Boolean))]),
      qualia_present: qualia?.present === true,
      qualia_authority: 'firsthand-only',
      qualia_inferred: false,
      qualia_report_receipt_id: qualia?.report_receipt_id || null,
    }),
    provenance: Object.freeze({
      cycle_fingerprint: cycle.cycle_fingerprint || null,
      math_spine_packet_id: cycle.math_spine_packet?.packet_id || null,
      math_spine_packet_fingerprint: cycle.math_spine_packet?.packet_fingerprint || null,
      deterministic_replay_matched: cycle.replay_receipt?.matched === true,
      replay_fingerprint: cycle.replay_receipt?.replay_fingerprint || null,
      review_receipt_id: review?.review_receipt_id || null,
      deep_time_record_id: deepTime?.id || null,
      deep_time_record_fingerprint: deepTime?.record_fingerprint || null,
      source_receipt_hashes: Object.freeze([...new Set(sourceHashes)]),
    }),
    continuity: Object.freeze({
      status: continuityStatus({ ...review, status: state }, deepTime),
      premaqc_sequence: cycle.premaqc_after?.sequence ?? null,
      deep_time_sequence_id: deepTime?.sequence_id || null,
      deep_time_lambda: deepTime?.lambda ?? null,
      previous_record_id: deepTime?.interval?.previous_record_id || null,
      latest_record_id: deepTime?.id || null,
    }),
    latest_receipt: receipt ? Object.freeze(receipt) : null,
    authority: Object.freeze({
      read_only_snapshot: true,
      shared_field_feedback_contract: true,
      human_review_required_for_deep_time: true,
      qualia_is_subjective: true,
      qualia_inference_allowed: false,
      physical_claim: false,
      canon_commit: false,
    }),
  });
}

export function buildRuntimeObservationLiveRead({ cycles = [], reviews = [], deepTimeRecords = [], worldId = null, generatedAt = new Date().toISOString() } = {}) {
  const reviewByCycle = new Map(reviews.map((item) => [reviewPayload(item)?.cycle_id, item]).filter(([cycleId]) => cycleId));
  const deepByCycle = new Map(deepTimeRecords.map((item) => [deepTimePayload(item)?.provenance?.observation_run_id || item?.cycle_id, item]).filter(([cycleId]) => cycleId));
  const snapshots = cycles
    .filter((item) => !worldId || cyclePayload(item)?.world?.id === worldId || item?.world_id === worldId)
    .map((item) => buildRuntimeObservationSnapshot({
      cycle: item,
      review: reviewByCycle.get(cyclePayload(item)?.cycle_id) || null,
      deepTimeRecord: deepByCycle.get(cyclePayload(item)?.cycle_id) || null,
      generatedAt,
    }))
    .sort((left, right) => String(right.observation.observed_at || '').localeCompare(String(left.observation.observed_at || '')));
  return Object.freeze({
    schema: RUNTIME_OBSERVATION_LIVE_READ_SCHEMA,
    generated_at: generatedAt,
    world_id: worldId,
    snapshots: Object.freeze(snapshots),
    summary: Object.freeze({
      total: snapshots.length,
      pending_review: snapshots.filter((item) => item.review.status === 'pending_review').length,
      accepted: snapshots.filter((item) => item.review.status === 'accepted').length,
      field: snapshots.filter((item) => item.evidence.class === 'field').length,
      in_deep_time: snapshots.filter((item) => item.continuity.status === 'entered-deeptime').length,
    }),
    authority: Object.freeze({
      live_read_only: true,
      canonical_snapshot_schema: RUNTIME_OBSERVATION_SNAPSHOT_SCHEMA,
      surfaces_must_not_reclassify: true,
    }),
  });
}
