import { assertValidDeepTheoryRecord } from '../../../starwell/deep-observer/deep-theory-validator.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA } from './deep-theory-bridge.js';

export const DEEP_THEORY_REVIEW_RECEIPT_SCHEMA = 'arcsweep.deep-theory-review-receipt/v1';
const DECISIONS = new Set(['reviewed', 'accepted', 'retired']);

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_THEORY_REVIEW: ${message}`);
}

function nonEmpty(value, field) {
  const text = String(value ?? '').trim();
  invariant(text.length > 0, `${field} is required`);
  return text;
}

function clone(value) {
  return structuredClone(value);
}

export async function reviewDeepTheoryCandidate({
  candidate,
  decision = 'reviewed',
  reviewedBy,
  note = '',
  reviewedAt,
} = {}) {
  invariant(candidate?.schema === ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA, 'a DEEPTheory candidate receipt is required');
  invariant(DECISIONS.has(decision), 'decision must be reviewed, accepted, or retired');
  invariant(candidate.authority?.candidate_only === true, 'source must remain a candidate receipt');

  const actor = nonEmpty(reviewedBy, 'reviewedBy');
  const timestamp = reviewedAt ?? new Date().toISOString();
  const sourceRecord = clone(candidate.record);
  assertValidDeepTheoryRecord(sourceRecord);
  invariant(sourceRecord.status === 'candidate', 'only candidate records may enter this review gate');

  const reviewText = String(note ?? '').trim() || `Human review decision: ${decision}.`;
  const reviewedRecord = {
    ...sourceRecord,
    status: decision,
    review: {
      human_review_required: false,
      reviewed_by: actor,
      reviewed_at: timestamp,
      note: reviewText,
    },
    authority: {
      ...sourceRecord.authority,
      physical_claim: false,
      canon_commit: false,
      domain_semantics_explicit: true,
      cross_domain_numeric_equivalence_assumed: false,
    },
    append_only_revisions: [
      ...(sourceRecord.append_only_revisions || []),
      {
        created_at: timestamp,
        kind: decision === 'retired' ? 'retirement' : 'review_change',
        text: reviewText,
        author_id: actor,
        source_refs: sourceRecord.source_refs.map((source) => source.ref),
      },
    ],
  };
  assertValidDeepTheoryRecord(reviewedRecord);

  const core = {
    schema: DEEP_THEORY_REVIEW_RECEIPT_SCHEMA,
    schema_version: 1,
    source_candidate_receipt_id: candidate.receipt_id,
    source_candidate_record_id: sourceRecord.id,
    source_candidate_fingerprint: candidate.record_fingerprint,
    decision,
    reviewed_by: actor,
    reviewed_at: timestamp,
    note: reviewText,
    reviewed_record: reviewedRecord,
    authority: {
      source_candidate_mutable: false,
      human_review_explicit: true,
      physical_claim: false,
      canon_commit: false,
      acceptance_is_analytical_not_canon: decision === 'accepted',
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    receipt_id: `arcsweep-theory-review-${fingerprint.slice(0, 24)}`,
    receipt_fingerprint: fingerprint,
  });
}
