export const RUNA_INTERVENTION_ARC_SCHEMA = 'arcsweep.runa-intervention-arc/v1';

export const RUNA_INTERVENTION_ARC_STATES = Object.freeze([
  'WAITING_SUGGESTION',
  'COMPILE_RENDERER',
  'REVIEW_RENDERER',
  'SELECT_PALETTE',
  'COMPILE_PREVIEW',
  'LAUNCH_PREVIEW',
  'ARM_OBSERVATION',
  'OBSERVE_FEEDBACK',
  'REVIEW_FEEDBACK',
  'RETURN_TO_DEEP_TIME',
  'ASH_READY',
  'STOPPED',
]);

function latest(items, predicate = () => true, timestamp = () => '') {
  return [...(items || [])]
    .filter(predicate)
    .sort((left, right) => String(timestamp(left) || '').localeCompare(String(timestamp(right) || '')))
    .at(-1) || null;
}

function stage(id, label, receipt, status) {
  return Object.freeze({
    id,
    label,
    status,
    receipt_id: receipt?.id
      || receipt?.suggestion_id
      || receipt?.candidate_id
      || receipt?.review_id
      || receipt?.palette_id
      || receipt?.plan_id
      || receipt?.render_id
      || receipt?.arm_id
      || receipt?.link_id
      || receipt?.cycle_id
      || receipt?.review_receipt_id
      || null,
  });
}

export function deriveRunaInterventionArc({
  worldId,
  observatory = {},
  feedbackCycles = [],
  feedbackQueue = null,
} = {}) {
  const suggestion = latest(observatory.runa_suggestions, (item) => item.world_id === worldId, (item) => item.generated_at);
  const candidate = suggestion ? latest(
    observatory.runa_renderer_candidates,
    (item) => item.world_id === worldId && item.source?.suggestion_id === suggestion.suggestion_id,
    (item) => item.generated_at,
  ) : null;
  const rendererReview = candidate ? latest(
    observatory.runa_renderer_reviews,
    (item) => item.source?.world_id === worldId && item.source?.candidate_id === candidate.candidate_id,
    (item) => item.reviewed_at,
  ) : null;
  const palette = rendererReview ? latest(
    observatory.runa_preview_palettes,
    (item) => item.world_id === worldId && item.source?.renderer_review_id === rendererReview.review_id,
    (item) => item.selected_at,
  ) : null;
  const previewPlan = rendererReview ? latest(
    observatory.runa_preview_plans,
    (item) => item.world?.id === worldId && item.source?.renderer_review_id === rendererReview.review_id,
    (item) => item.generated_at,
  ) : null;
  const previewRender = previewPlan ? latest(
    observatory.runa_preview_renders,
    (item) => item.world_id === worldId && item.source?.plan_id === previewPlan.plan_id,
    (item) => item.launched_at,
  ) : null;
  const evidenceArm = previewRender ? latest(
    observatory.runa_preview_evidence_arms,
    (item) => item.world_id === worldId && item.source?.render_id === previewRender.render_id,
    (item) => item.armed_at,
  ) : null;
  const observationLink = evidenceArm ? latest(
    observatory.runa_preview_observation_links,
    (item) => item.world_id === worldId && item.source?.arm_id === evidenceArm.arm_id,
    (item) => item.linked_at,
  ) : null;
  const feedbackCycle = observationLink
    ? (feedbackCycles || []).find((item) => item.cycle_id === observationLink.source?.feedback_cycle_id) || null
    : null;
  const feedbackReview = feedbackCycle ? feedbackQueue?.entries?.[feedbackCycle.cycle_id] || null : null;
  const deepTimeRecord = feedbackCycle ? latest(
    observatory.deep_time_records,
    (item) => item.world_id === worldId && item.provenance?.observation_run_id === feedbackCycle.cycle_id,
    (item) => item.time?.utc,
  ) : null;
  const priorDeepTime = deepTimeRecord ? latest(
    observatory.deep_time_records,
    (item) => item.world_id === worldId && item.id !== deepTimeRecord.id && Number(item.lambda) < Number(deepTimeRecord.lambda),
    (item) => Number(item.lambda),
  ) : null;

  let state = 'WAITING_SUGGESTION';
  let nextAction = 'Create a theory-grounded Runa trajectory suggestion.';
  if (suggestion) {
    state = 'COMPILE_RENDERER';
    nextAction = 'Compile a bounded renderer candidate.';
  }
  if (candidate) {
    state = 'REVIEW_RENDERER';
    nextAction = 'Review the renderer candidate explicitly.';
  }
  if (rendererReview) {
    if (rendererReview.decision === 'approved') {
      state = 'SELECT_PALETTE';
      nextAction = 'Select and receipt the temporary preview palette.';
    } else {
      state = 'STOPPED';
      nextAction = rendererReview.decision === 'adjust'
        ? 'Adjust the renderer design and create a new reviewed candidate.'
        : 'Renderer path stopped by explicit review.';
    }
  }
  if (palette) {
    state = 'COMPILE_PREVIEW';
    nextAction = 'Compile the reviewed bounds and selected palette into a temporary preview plan.';
  }
  if (previewPlan) {
    state = 'LAUNCH_PREVIEW';
    nextAction = 'Launch the preview explicitly, or leave it idle.';
  }
  if (previewRender) {
    state = 'ARM_OBSERVATION';
    nextAction = 'Arm this render as context for the next reviewable Feedback observation.';
  }
  if (evidenceArm) {
    state = 'OBSERVE_FEEDBACK';
    nextAction = 'Run the next reviewable same-world Feedback observation.';
  }
  if (observationLink && feedbackCycle) {
    state = 'REVIEW_FEEDBACK';
    nextAction = 'Review the linked Feedback cycle.';
  }
  if (feedbackReview) {
    if (feedbackReview.status === 'accepted') {
      state = 'RETURN_TO_DEEP_TIME';
      nextAction = 'Admit the accepted observation to DEEPTime.';
    } else if (['archived', 'discarded'].includes(feedbackReview.status)) {
      state = 'STOPPED';
      nextAction = `Feedback path stopped as ${feedbackReview.status}.`;
    }
  }
  if (deepTimeRecord) {
    state = priorDeepTime ? 'ASH_READY' : 'RETURN_TO_DEEP_TIME';
    nextAction = priorDeepTime
      ? 'This accepted transition can contribute to Ash in the next Requested Transformation.'
      : 'DEEPTime is seeded. A later accepted record is required before a trajectory-derived Ash transition exists.';
  }

  const stages = Object.freeze([
    stage('suggestion', 'Runa suggestion', suggestion, suggestion ? 'complete' : 'waiting'),
    stage('renderer-candidate', 'Renderer candidate', candidate, candidate ? 'complete' : suggestion ? 'ready' : 'waiting'),
    stage('renderer-review', 'Renderer review', rendererReview, rendererReview ? rendererReview.decision : candidate ? 'ready' : 'waiting'),
    stage('preview-palette', 'Preview palette', palette, palette ? 'complete' : rendererReview?.decision === 'approved' ? 'ready' : 'waiting'),
    stage('preview-plan', 'Preview plan', previewPlan, previewPlan ? 'complete' : palette ? 'ready' : 'waiting'),
    stage('preview-render', 'Explicit preview', previewRender, previewRender ? (previewRender.runtime?.stopped_early ? 'stopped-early' : 'complete') : previewPlan ? 'ready' : 'waiting'),
    stage('evidence-arm', 'Observation arm', evidenceArm, evidenceArm ? 'complete' : previewRender ? 'ready' : 'waiting'),
    stage('feedback-observation', 'Feedback observation', feedbackCycle, feedbackCycle ? 'complete' : evidenceArm ? 'ready' : 'waiting'),
    stage('feedback-review', 'Feedback review', feedbackReview, feedbackReview?.status || (feedbackCycle ? 'ready' : 'waiting')),
    stage('deep-time', 'DEEPTime', deepTimeRecord, deepTimeRecord ? 'complete' : feedbackReview?.status === 'accepted' ? 'ready' : 'waiting'),
    stage('ash', 'Ash history', priorDeepTime && deepTimeRecord ? deepTimeRecord : null, priorDeepTime && deepTimeRecord ? 'ready' : 'waiting'),
  ]);

  return Object.freeze({
    schema: RUNA_INTERVENTION_ARC_SCHEMA,
    world_id: worldId,
    state,
    next_action: nextAction,
    stages,
    receipts: Object.freeze({
      suggestion,
      candidate,
      renderer_review: rendererReview,
      preview_palette: palette,
      preview_plan: previewPlan,
      preview_render: previewRender,
      evidence_arm: evidenceArm,
      observation_link: observationLink,
      feedback_cycle: feedbackCycle,
      feedback_review: feedbackReview,
      deep_time_record: deepTimeRecord,
      prior_deep_time_record: priorDeepTime,
    }),
    authority: Object.freeze({
      derived_view_only: true,
      source_receipts_mutable: false,
      palette_requires_explicit_selection: true,
      stage_completion_does_not_infer_causation: true,
      feedback_acceptance_required_before_deep_time: true,
      two_temporal_coordinates_required_for_trajectory_ash: true,
      canon_commit: false,
      physical_claim: false,
    }),
  });
}
