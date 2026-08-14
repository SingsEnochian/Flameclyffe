import { DEEP_THEORY_REVIEW_RECEIPT_SCHEMA } from './deep-theory-review.js';
import { buildDeepTimeWindow } from './deep-time-bridge.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const THEORY_GROUNDED_ADVISOR_RECEIPT_SCHEMA = 'arcsweep.theory-grounded-acceptance-advisor/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_THEORY_ADVISOR: ${message}`);
}

function mean(values) {
  const usable = values.filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

function clamp01(value) { return Math.min(1, Math.max(0, Number(value) || 0)); }

function temporalSummary(records) {
  const first = records[0];
  const last = records.at(-1);
  const axes = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
  const deltas = Object.fromEntries(axes.map((axis) => [axis, Number(last.premaqc.state[axis].value) - Number(first.premaqc.state[axis].value)]));
  const quality = mean(records.map((record) => Number(record.quality?.data_quality)));
  const derivativeMagnitudes = records.flatMap((record) => {
    const velocities = record.derivatives?.axis_velocity;
    return velocities ? Object.values(velocities).map((value) => Math.abs(Number(value))).filter(Number.isFinite) : [];
  });
  return {
    record_count: records.length,
    delta: deltas,
    mean_data_quality: quality,
    mean_absolute_velocity: mean(derivativeMagnitudes),
    start_state_hash: first.provenance.accepted_state_hash,
    end_state_hash: last.provenance.accepted_state_hash,
  };
}

function recommendationFor({ acceptedTheory, window, contextDomain, summary, minimumRecords }) {
  if (acceptedTheory.status !== 'accepted') {
    return { status: 'THEORY_NOT_ACCEPTED', rationale: 'The analytical model has not passed the explicit DEEPTheory acceptance gate.' };
  }
  if (contextDomain !== acceptedTheory.domain) {
    return { status: 'DOMAIN_MISMATCH', rationale: `Accepted theory domain ${acceptedTheory.domain} cannot be silently applied to ${contextDomain}.` };
  }
  if (!window.valid) {
    return { status: 'INVALID_TEMPORAL_WINDOW', rationale: window.errors.join(' ') || 'The DEEPTime window failed validation.' };
  }
  if (!window.sufficient) {
    return { status: 'INSUFFICIENT_TEMPORAL_COVERAGE', rationale: `Need at least ${minimumRecords} accepted temporal records; received ${window.records.length}.` };
  }
  const hasLimitationOnly = acceptedTheory.findings.every((finding) => finding.kind === 'limitation');
  if (hasLimitationOnly) {
    return { status: 'OBSERVE_LONGER', rationale: 'The accepted theory contains only limitation findings, so it cannot yet support an acceptance-gate recommendation.' };
  }
  const movement = Math.max(...Object.values(summary.delta).map((value) => Math.abs(value)));
  if (movement < 1e-6) {
    return { status: 'OBSERVE_LONGER', rationale: 'The accepted temporal window contains no measurable PREMAQC displacement.' };
  }
  return { status: 'REVIEW_ACCEPTANCE_GATE', rationale: 'Accepted theory and a sufficient, validated temporal window are both present. Human review may now consider an acceptance gate.' };
}

export async function createTheoryGroundedAcceptanceAdvice({
  theoryReviewReceipt,
  deepTimeRecords = [],
  contextDomain,
  acceptanceMaskId = 'theory-grounded-advisor/manual-review/v1',
  acceptanceMaskVersion = '1',
  minimumRecords = 3,
  generatedAt,
} = {}) {
  invariant(theoryReviewReceipt?.schema === DEEP_THEORY_REVIEW_RECEIPT_SCHEMA, 'an explicit DEEPTheory review receipt is required');
  invariant(typeof contextDomain === 'string' && contextDomain.trim(), 'contextDomain is required');
  invariant(Number.isInteger(minimumRecords) && minimumRecords >= 2, 'minimumRecords must be at least 2');

  const theory = theoryReviewReceipt.reviewed_record;
  const window = buildDeepTimeWindow(deepTimeRecords, { minimumRecords });
  const summary = window.records.length ? temporalSummary(window.records) : null;
  const recommendation = recommendationFor({
    acceptedTheory: theory,
    window,
    contextDomain: contextDomain.trim(),
    summary: summary || { delta: {} },
    minimumRecords,
  });
  const dataQuality = summary?.mean_data_quality;
  const coverageScore = Math.min(1, window.records.length / minimumRecords);
  const confidence = recommendation.status === 'REVIEW_ACCEPTANCE_GATE'
    ? clamp01((dataQuality ?? 0.5) * 0.7 + coverageScore * 0.3)
    : clamp01((dataQuality ?? 0) * coverageScore);

  const core = {
    schema: THEORY_GROUNDED_ADVISOR_RECEIPT_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    context_domain: contextDomain.trim(),
    theory_source: {
      review_receipt_id: theoryReviewReceipt.receipt_id,
      review_receipt_fingerprint: theoryReviewReceipt.receipt_fingerprint,
      theory_record_id: theory.id,
      theory_status: theory.status,
      theory_domain: theory.domain,
      theory_kind: theory.theory_kind,
    },
    deep_time_window: {
      valid: window.valid,
      sufficient: window.sufficient,
      sequence_id: window.sequence_id ?? null,
      sequence_revision: window.sequence_revision ?? null,
      lambda_start: window.lambda_start ?? null,
      lambda_end: window.lambda_end ?? null,
      utc_start: window.utc_start ?? null,
      utc_end: window.utc_end ?? null,
      record_ids: window.records.map((record) => record.id),
      record_fingerprints: window.records.map((record) => record.record_fingerprint),
      errors: window.errors,
    },
    temporal_summary: summary,
    acceptance_mask: {
      id: acceptanceMaskId,
      version: acceptanceMaskVersion,
    },
    recommendation: {
      ...recommendation,
      confidence,
      data_quality: dataQuality ?? null,
      auto_accept: false,
      human_review_required: true,
    },
    authority: {
      advisory_only: true,
      source_records_mutable: false,
      accepts_state_automatically: false,
      overwrites_deep_time: false,
      overwrites_deep_theory: false,
      cross_domain_application_forbidden_without_explicit_mapping: true,
      qualia_inferred: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    receipt_id: `arcsweep-theory-advice-${fingerprint.slice(0, 24)}`,
    receipt_fingerprint: fingerprint,
  });
}
