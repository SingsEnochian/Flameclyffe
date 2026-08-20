import { assertValidDeepTimeRecord, validateDeepTimeWindow, DEEP_TIME_PREMAQC_AXES } from '../../../starwell/deep-observer/deep-time-validator.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { feedbackCycleSource } from './feedback-cycle-queue.js';

export const ARCSWEEP_DEEP_TIME_RECORD_SCHEMA = 'arcsweep.deep-time-feedback-record/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_DEEP_TIME: ${message}`);
}

function julianDate(iso) {
  return Date.parse(iso) / 86400000 + 2440587.5;
}

function stateValues(premaqc) {
  return Object.fromEntries(DEEP_TIME_PREMAQC_AXES.map((axis) => [axis, Number(premaqc.state[axis].value)]));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function intervalSeconds(previous, currentUtc) {
  if (!previous) return null;
  const delta = (Date.parse(currentUtc) - Date.parse(previous.time.utc)) / 1000;
  return Number.isFinite(delta) && delta >= 0 ? delta : null;
}

function axisVelocity(previous, current, seconds) {
  if (!previous || !seconds || seconds <= 0) return null;
  return Object.fromEntries(DEEP_TIME_PREMAQC_AXES.map((axis) => [
    axis,
    (Number(current.state[axis].value) - Number(previous.premaqc.state[axis].value)) / seconds,
  ]));
}

export async function createDeepTimeRecordFromAcceptedFeedback({
  cycle,
  acceptedQueueEntry,
  previousRecord = null,
  sequenceId = null,
  sequenceRevision = 1,
  acceptanceMaskId = 'arcsweep-feedback-human-review/v1',
  generatedAt = null,
} = {}) {
  invariant(cycle?.schema === 'arcsweep.feedback-cycle/v1', 'a receipted observation cycle is required');
  invariant(acceptedQueueEntry?.cycle_id === cycle.cycle_id, 'accepted queue entry must match the observation cycle');
  invariant(acceptedQueueEntry?.status === 'accepted', 'observation cycle must be human-accepted before entering DEEPTime');
  invariant(cycle.premaqc_after?.state, 'observation cycle must carry PREMAQC after-state');
  invariant(cycle.premaqc_after?.receipt_id, 'observation cycle must carry a PREMAQC receipt');
  if (previousRecord) {
    assertValidDeepTimeRecord(previousRecord);
    invariant(previousRecord.world_id === cycle.world.id, 'DEEPTime predecessor must remain in the same world');
  }

  const utc = generatedAt ?? cycle.created_at ?? cycle.premaqc_after.observed_at;
  invariant(!Number.isNaN(Date.parse(utc)), 'observation cycle UTC timestamp is required');
  const observationSource = acceptedQueueEntry.observation_source || feedbackCycleSource(cycle);
  const seq = sequenceId || previousRecord?.sequence_id || `arcsweep:${cycle.world.id}:accepted-observation`;
  const revision = Number(sequenceRevision);
  invariant(Number.isInteger(revision) && revision >= 1, 'sequenceRevision must be a positive integer');
  const lambda = previousRecord ? Number(previousRecord.lambda) + 1 : Number(cycle.premaqc_after.sequence);
  const acceptedStateHash = await sha256Hex(cycle.premaqc_after);
  const evidenceHashes = await Promise.all((cycle.evidence || []).map((item) => sha256Hex(item)));
  const seconds = intervalSeconds(previousRecord, utc);
  const confidenceValues = DEEP_TIME_PREMAQC_AXES.map((axis) => Number(cycle.premaqc_after.state[axis].confidence)).filter(Number.isFinite);
  const dataQuality = mean(confidenceValues);
  const velocity = axisVelocity(previousRecord, cycle.premaqc_after, seconds);

  const core = {
    schema_version: '0.1.0',
    dataset_kind: 'deep_time',
    world_id: cycle.world.id,
    sequence_id: seq,
    sequence_revision: revision,
    lambda,
    time: {
      utc,
      julian_date: julianDate(utc),
      julian_time_scale: 'UTC',
    },
    premaqc: structuredClone(cycle.premaqc_after),
    provenance: {
      observation_run_id: cycle.cycle_id,
      observation_source: observationSource,
      observation_evidence_schemas: (cycle.evidence || []).map((item) => item?.schema).filter(Boolean),
      observation_evidence_hashes: evidenceHashes,
      acceptance_mask_id: acceptanceMaskId,
      acceptance_mask_version: '1',
      review_queue_schema: 'arcsweep.feedback-cycle-queue/v1',
      feedback_review_receipt_id: acceptedQueueEntry.review_receipt_id,
      source_receipt_hashes: [cycle.cycle_fingerprint, cycle.math_spine_packet?.packet_fingerprint, ...evidenceHashes].filter(Boolean),
      accepted_state_hash: acceptedStateHash,
    },
    interval: {
      seconds_from_previous: seconds,
      previous_record_id: previousRecord?.id ?? null,
    },
    derivatives: velocity ? {
      time_basis: 'UTC-seconds',
      interpolation_policy: 'none',
      smoothing_policy: 'none',
      missing_data_policy: 'no-derivative-without-valid-interval',
      axis_velocity: velocity,
      source_coordinates: [previousRecord.id, cycle.premaqc_after.receipt_id],
    } : null,
    quality: {
      data_quality: dataQuality == null ? null : Number(dataQuality.toFixed(6)),
      uncertainty: Object.fromEntries(DEEP_TIME_PREMAQC_AXES.map((axis) => [axis, Number(cycle.premaqc_after.state[axis].uncertainty)])),
      missing: [],
      stale: [],
    },
    authority: {
      append_only: true,
      source_cycle_mutable: false,
      accepted_observation_only: true,
      accepted_feedback_only: true,
      shared_review_queue_required: true,
      field_observation_supported: true,
      qualia_is_premaqc_q: true,
      engineering_data_quality_is_q: false,
      physical_claim: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  const record = {
    ...core,
    id: `deep-time-${fingerprint.slice(0, 24)}`,
    record_fingerprint: fingerprint,
  };
  assertValidDeepTimeRecord(record);
  return Object.freeze(record);
}

export const createDeepTimeRecordFromAcceptedObservation = createDeepTimeRecordFromAcceptedFeedback;

export function buildDeepTimeWindow(records, { minimumRecords = 3 } = {}) {
  invariant(Array.isArray(records), 'records must be an array');
  const sorted = [...records].sort((left, right) => Number(left.lambda) - Number(right.lambda));
  if (!sorted.length) return Object.freeze({ valid: false, sufficient: false, records: [], errors: ['No accepted DEEPTime records are available.'] });
  const validation = validateDeepTimeWindow(sorted);
  return Object.freeze({
    valid: validation.valid,
    sufficient: validation.valid && sorted.length >= minimumRecords,
    minimum_records: minimumRecords,
    records: sorted,
    errors: validation.errors.map(({ path, message }) => `${path}: ${message}`),
    sequence_id: sorted[0]?.sequence_id ?? null,
    sequence_revision: sorted[0]?.sequence_revision ?? null,
    lambda_start: sorted[0]?.lambda ?? null,
    lambda_end: sorted.at(-1)?.lambda ?? null,
    utc_start: sorted[0]?.time?.utc ?? null,
    utc_end: sorted.at(-1)?.time?.utc ?? null,
  });
}
