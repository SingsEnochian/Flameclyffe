import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { RUNA_PREVIEW_EVIDENCE_ARM_SCHEMA } from './runa-preview-render.js';

export const RUNA_PREVIEW_OBSERVATION_LINK_SCHEMA = 'arcsweep.runa-preview-observation-link/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_OBSERVATION_LINK: ${message}`);
}

function timestamp(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function findNextFeedbackCycleForEvidenceArm({ arm, feedbackCycles = [], existingLinks = [] } = {}) {
  invariant(arm?.schema === RUNA_PREVIEW_EVIDENCE_ARM_SCHEMA, 'a Runa preview evidence arm is required');
  const alreadyLinked = new Set((existingLinks || []).map((item) => item.source?.arm_id));
  if (alreadyLinked.has(arm.arm_id)) return null;
  const armedAt = timestamp(arm.armed_at);
  return [...(feedbackCycles || [])]
    .filter((cycle) => cycle?.schema === 'arcsweep.feedback-cycle/v1' && cycle.world?.id === arm.world_id)
    .filter((cycle) => {
      const cycleAt = timestamp(cycle.created_at);
      return armedAt === null || (cycleAt !== null && cycleAt >= armedAt);
    })
    .sort((left, right) => (timestamp(left.created_at) ?? 0) - (timestamp(right.created_at) ?? 0))[0] || null;
}

export async function createRunaPreviewObservationLink({ arm, feedbackCycle, linkedAt } = {}) {
  invariant(arm?.schema === RUNA_PREVIEW_EVIDENCE_ARM_SCHEMA, 'a Runa preview evidence arm is required');
  invariant(feedbackCycle?.schema === 'arcsweep.feedback-cycle/v1', 'a receipted feedback cycle is required');
  invariant(feedbackCycle.world?.id === arm.world_id, 'evidence arm and feedback cycle must share a world');
  const armTime = timestamp(arm.armed_at);
  const cycleTime = timestamp(feedbackCycle.created_at);
  invariant(armTime === null || cycleTime === null || cycleTime >= armTime, 'feedback cycle must not precede evidence arming');

  const core = {
    schema: RUNA_PREVIEW_OBSERVATION_LINK_SCHEMA,
    schema_version: 1,
    linked_at: linkedAt ?? new Date().toISOString(),
    world_id: arm.world_id,
    source: {
      arm_id: arm.arm_id,
      arm_fingerprint: arm.arm_fingerprint,
      render_id: arm.source.render_id,
      render_fingerprint: arm.source.render_fingerprint,
      feedback_cycle_id: feedbackCycle.cycle_id,
      feedback_cycle_fingerprint: feedbackCycle.cycle_fingerprint,
    },
    observation: {
      cycle_created_at: feedbackCycle.created_at,
      mode: feedbackCycle.turn?.mode || null,
      premaqc_before_receipt_id: feedbackCycle.premaqc_before?.receipt_id || null,
      premaqc_after_receipt_id: feedbackCycle.premaqc_after?.receipt_id || null,
      steward_review_required: Boolean(feedbackCycle.authority?.steward_review_required),
    },
    authority: {
      explicit_arm_preceded_cycle: true,
      link_is_context_not_causation_claim: true,
      render_effect_inferred: false,
      response_content_inferred: false,
      feedback_cycle_mutable: false,
      premaqc_mutable: false,
      qualia_inferred: false,
      physical_claim: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    link_id: `arcsweep-runa-observation-${fingerprint.slice(0, 24)}`,
    link_fingerprint: fingerprint,
  });
}
