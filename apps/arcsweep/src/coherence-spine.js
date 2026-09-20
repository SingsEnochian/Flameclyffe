export const COHERENCE_RECEIPT_SCHEMA = 'arcsweep.coherence-work-receipt/v0.1';
export const COHERENCE_PASSPORT_SCHEMA = 'arcsweep.coherence-object-passport/v0.1';

const text = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value : [];

export function passportDiagnostics(passport = {}) {
  const required = [
    'id',
    'canonical_name',
    'namespace',
    'kind',
    'owner_or_steward',
    'purpose',
    'canonical_source',
    'current_status',
    'authority_scope',
    'source_refs',
  ];
  const missing = required.filter((key) => {
    const value = passport[key];
    if (Array.isArray(value)) return value.length === 0;
    return !text(value);
  });
  return Object.freeze({
    schema_ok: passport.schema === COHERENCE_PASSPORT_SCHEMA,
    missing,
    ready: passport.schema === COHERENCE_PASSPORT_SCHEMA && missing.length === 0,
  });
}

export function receiptDiagnostics(receipt = {}) {
  const required = [
    'receipt_id', 'title', 'primary_bucket', 'who', 'what', 'where', 'when', 'why',
    'positives', 'negatives', 'research_findings', 'experience_findings',
    'options_considered', 'decision', 'outcome', 'source_refs', 'adoption_state', 'created_at',
  ];
  const missing = required.filter((key) => {
    const value = receipt[key];
    if (Array.isArray(value)) return value.length === 0 && ['who', 'where', 'source_refs'].includes(key);
    return value == null || (typeof value === 'string' && !text(value));
  });
  return Object.freeze({
    schema_ok: receipt.schema === COHERENCE_RECEIPT_SCHEMA,
    missing,
    ready: receipt.schema === COHERENCE_RECEIPT_SCHEMA && missing.length === 0,
  });
}

function receiptTime(receipt) {
  const when = receipt?.when || {};
  return when.occurred_at || when.recorded_at || receipt?.created_at || '';
}

export function buildTimelineProjection(receipts = [], timelineId) {
  const target = text(timelineId);
  return list(receipts)
    .filter((receipt) => list(receipt?.when?.timeline_refs).includes(target))
    .map((receipt) => ({
      receipt_id: receipt.receipt_id,
      title: receipt.title,
      time: receiptTime(receipt),
      primary_bucket: receipt.primary_bucket,
      adoption_state: receipt.adoption_state,
      source_refs: [...list(receipt.source_refs)],
      claim_ids: list(receipt.claims).map((claim) => claim.claim_id),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function buildClaimLedger(receipts = []) {
  const claims = [];
  for (const receipt of list(receipts)) {
    for (const claim of list(receipt.claims)) {
      claims.push(Object.freeze({
        ...claim,
        receipt_id: receipt.receipt_id,
        recorded_at: receipt?.when?.recorded_at || receipt.created_at || null,
      }));
    }
  }
  return claims;
}

export function claimLineage(receipts = [], claimId) {
  const ledger = buildClaimLedger(receipts);
  const target = text(claimId);
  const direct = ledger.filter((claim) => claim.claim_id === target);
  const superseding = ledger.filter((claim) => list(claim.supersedes).includes(target));
  return Object.freeze({
    claim_id: target,
    direct,
    superseding,
  });
}

export function adoptionSummary(receipts = []) {
  return list(receipts).reduce((acc, receipt) => {
    const state = text(receipt.adoption_state) || 'unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
}

export function coherenceCaseSummary(receipt = {}) {
  return Object.freeze({
    receipt_id: receipt.receipt_id || null,
    title: receipt.title || null,
    primary_bucket: receipt.primary_bucket || null,
    linked_buckets: [...list(receipt.linked_buckets)],
    who: list(receipt.who).map((entry) => entry.participant_id),
    when: receipt.when || null,
    decision: receipt.decision?.chosen_action || null,
    outcome: receipt.outcome?.status || null,
    next_step: receipt.outcome?.next_step || null,
    source_refs: [...list(receipt.source_refs)],
  });
}
