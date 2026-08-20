import { THEORY_GROUNDED_ADVISOR_RECEIPT_SCHEMA } from './theory-grounded-acceptance-advisor.js';
import { buildDeepTimeWindow } from './deep-time-bridge.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const RUNA_TRAJECTORY_SUGGESTION_SCHEMA = 'arcsweep.runa-trajectory-suggestion/v1';
const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_TRAJECTORY: ${message}`);
}

function clamp01(value) { return Math.min(1, Math.max(0, Number(value) || 0)); }
function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }

function trajectoryProjection(records) {
  const first = records[0];
  const last = records.at(-1);
  const delta = Object.fromEntries(AXES.map((axis) => [axis, Number(last.premaqc.state[axis].value) - Number(first.premaqc.state[axis].value)]));
  const latestVelocity = Object.fromEntries(AXES.map((axis) => [axis, Number(last.derivatives?.axis_velocity?.[axis] ?? 0)]));
  const totalMovement = mean(Object.values(delta).map((value) => Math.abs(value)));
  const maxVelocity = Math.max(...Object.values(latestVelocity).map((value) => Math.abs(value)));
  const envelope = maxVelocity > 0.01 ? 'fast' : maxVelocity > 0.001 ? 'moderate' : 'slow';
  return {
    lambda_start: first.lambda,
    lambda_end: last.lambda,
    utc_start: first.time.utc,
    utc_end: last.time.utc,
    delta,
    latest_velocity: latestVelocity,
    total_movement: totalMovement,
    transition_envelope: envelope,
  };
}

export async function createRunaTrajectorySuggestion({
  advisorReceipt,
  deepTimeRecords = [],
  worldId,
  generatedAt,
} = {}) {
  invariant(advisorReceipt?.schema === THEORY_GROUNDED_ADVISOR_RECEIPT_SCHEMA, 'a Theory-Grounded Advisor receipt is required');
  invariant(advisorReceipt.recommendation?.status === 'REVIEW_ACCEPTANCE_GATE', 'Runa suggestion requires a REVIEW_ACCEPTANCE_GATE recommendation');
  invariant(advisorReceipt.recommendation?.human_review_required === true, 'advisor review gate must remain human-controlled');
  invariant(typeof worldId === 'string' && worldId.trim(), 'worldId is required');
  const records = deepTimeRecords.filter((record) => record.world_id === worldId);
  const window = buildDeepTimeWindow(records, { minimumRecords: 3 });
  invariant(window.valid && window.sufficient, 'a sufficient validated DEEPTime window is required');
  const projection = trajectoryProjection(window.records);
  const movement = clamp01(projection.total_movement * 4);

  const core = {
    schema: RUNA_TRAJECTORY_SUGGESTION_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    world_id: worldId,
    source: {
      advisor_receipt_id: advisorReceipt.receipt_id,
      advisor_receipt_fingerprint: advisorReceipt.receipt_fingerprint,
      theory_record_id: advisorReceipt.theory_source.theory_record_id,
      deep_time_record_ids: window.records.map((record) => record.id),
      deep_time_record_fingerprints: window.records.map((record) => record.record_fingerprint),
    },
    trajectory: projection,
    semantic_intent: {
      transition_amount: movement,
      transition_envelope: projection.transition_envelope,
      premaqc_delta: projection.delta,
      premaqc_velocity: projection.latest_velocity,
    },
    subsystem_suggestions: [
      {
        subsystem: 'world-hum',
        action: 'consider-gradual-transition',
        semantic_weight: movement,
        dsp_parameters_assigned: false,
        reason_code: 'deep-time-trajectory',
      },
      {
        subsystem: 'keyboard-harmonics',
        action: 'consider-gradual-transition',
        semantic_weight: movement,
        dsp_parameters_assigned: false,
        reason_code: 'deep-time-trajectory',
      },
      {
        subsystem: 'environmental-soundscape',
        action: 'consider-gradual-transition',
        semantic_weight: movement,
        dsp_parameters_assigned: false,
        reason_code: 'deep-time-trajectory',
      },
    ],
    authority: {
      suggestion_only: true,
      semantic_to_dsp_separation_preserved: true,
      autoplay_forbidden: true,
      sensory_bus_published: false,
      world_tone_changed: false,
      haptic_changed: false,
      human_approval_required_before_render: true,
      feather_stop_required_for_any_future_render: true,
      source_records_mutable: false,
      qualia_inferred: false,
      physical_claim: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    suggestion_id: `arcsweep-runa-${fingerprint.slice(0, 24)}`,
    suggestion_fingerprint: fingerprint,
  });
}
