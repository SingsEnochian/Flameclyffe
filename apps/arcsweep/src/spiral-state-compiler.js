import { SPIRAL_STATE_SCHEMA, validateSpiralState } from '../../starwell/src/runa/harmonic-spiral-contract.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

const SUPPORT_AXES = Object.freeze(['P', 'C', 'R', 'M', 'A', 'Q']);
const HOLD_EPSILON = 0.0025;

function invariant(condition, message) {
  if (!condition) throw new Error(`SPIRAL_STATE_COMPILER: ${message}`);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function values(record) {
  return Object.fromEntries(['P', 'C', 'R', 'E', 'M', 'A', 'Q'].map((axis) => [axis, Number(record?.premaqc?.state?.[axis]?.value)]));
}

function trajectoryDelta(previousRecord, record) {
  if (!previousRecord) return null;
  const before = values(previousRecord);
  const after = values(record);
  const finite = [...SUPPORT_AXES, 'E'].every((axis) => Number.isFinite(before[axis]) && Number.isFinite(after[axis]));
  if (!finite) return null;
  const support = SUPPORT_AXES.reduce((sum, axis) => sum + (after[axis] - before[axis]), 0) / SUPPORT_AXES.length;
  const entanglement = before.E - after.E;
  return (support * 0.8) + (entanglement * 0.2);
}

function directionFromDelta(delta) {
  if (!Number.isFinite(delta)) return 'indeterminate';
  if (Math.abs(delta) <= HOLD_EPSILON) return 'holding';
  return delta > 0 ? 'ascending' : 'descending';
}

function phaseFromRecord(record, previousRecord) {
  if (!previousRecord) return 'receive';
  if (record?.premaqc?.math_spine?.fold_active) return 'compress';
  return 'integrate';
}

export async function compileSpiralStateFromDeepTime({
  record,
  previousRecord = null,
  storyReceipts = [],
  theoryReceipts = [],
} = {}) {
  invariant(record?.dataset_kind === 'deep_time', 'accepted DEEPTime record is required');
  invariant(record?.id && record?.record_fingerprint, 'DEEPTime record identity is required');
  invariant(record?.premaqc?.receipt_id && record?.premaqc?.state, 'DEEPTime PREMAQC receipt is required');
  if (previousRecord) {
    invariant(previousRecord?.dataset_kind === 'deep_time', 'previous record must be DEEPTime');
    invariant(previousRecord.world_id === record.world_id, 'trajectory cannot cross worlds');
  }

  const delta = trajectoryDelta(previousRecord, record);
  const direction = directionFromDelta(delta);
  const confidence = clamp01(record?.quality?.data_quality ?? 0);
  const phase = phaseFromRecord(record, previousRecord);
  const core = {
    schema: SPIRAL_STATE_SCHEMA,
    phase,
    direction,
    confidence,
    suggested_actions: [],
    subsystem_contexts: {
      llm: { mode: 'context-only', authority: 'advisory' },
      audio: { directive: 'hold', automatic: false },
      glyph: { evolution_hint: 'preserve-receipted-state' },
      ui: { attention_level: confidence },
    },
    supporting_receipts: {
      story: [...new Set(storyReceipts.filter(Boolean))],
      time: [record.id],
      theory: [...new Set(theoryReceipts.filter(Boolean))],
    },
    source: {
      world_id: record.world_id,
      deep_time_record_id: record.id,
      deep_time_fingerprint: record.record_fingerprint,
      premaqc_receipt_id: record.premaqc.receipt_id,
      previous_record_id: previousRecord?.id || null,
      trajectory_delta: Number.isFinite(delta) ? Number(delta.toFixed(8)) : null,
    },
    authority: {
      derived_from_accepted_deep_time: true,
      automatic_action: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  validateSpiralState(core);
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    receipt_id: `spiral:${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
