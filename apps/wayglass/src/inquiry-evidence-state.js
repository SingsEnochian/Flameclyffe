/** Read-only epistemic summary of an already authorised Inquiry Loom view.
 * These are event-kind counts, not a model belief or independent fact verifier.
 */
export const INQUIRY_EVIDENCE_SCHEMA = 'wayglass.inquiry-evidence-state/v0.1';
const inferenceKinds = new Set(['interpretation', 'alternative', 'revision']);
const awaitingKinds = new Set(['observation', 'experiment', 'outcome']);

export function buildInquiryEvidenceState(view) {
  if (!view || view.schema !== 'wayglass.inquiry-loom.view/v0.1' || !Array.isArray(view.events)
      || view.stance !== 'open-unresolved') throw new TypeError('An authorised, open inquiry view is required');
  const contributions = view.events.filter(e => e?.kind === 'contributed' && e.data && typeof e.data.claim_kind === 'string');
  const classified = (kinds) => contributions.filter(e => kinds.has(e.data.claim_kind));
  const proposalCount = classified(inferenceKinds).length;
  const awaitingCount = classified(awaitingKinds).length;
  const challengeCount = contributions.filter(e => e.data.claim_kind === 'challenge').length;
  const newQuestionCount = contributions.filter(e => e.data.claim_kind === 'new-question').length;
  const sourcedCount = contributions.filter(e => Array.isArray(e.data.source_refs) && e.data.source_refs.length > 0).length;
  return Object.freeze({
    schema: INQUIRY_EVIDENCE_SCHEMA,
    inquiry_id: view.inquiry_id,
    state: 'unresolved',
    recorded: { event_count: view.events.length, contributed_events: contributions.length },
    interpreted: { proposal_count: proposalCount },
    unresolved: { open_questions: 1 + newQuestionCount, challenges: challengeCount },
    awaiting_verification: { reported_observations_experiments_outcomes: awaitingCount, source_references_claimed: sourcedCount },
    provenance: { source_refs_caller_declared: true, host_event_hash_chain_is_signature: false, signed_return_adoption: false },
    claims: { external_evidence_verified: false, participant_belief_verified: false, canon_promoted: false, autonomous_question_closed: false },
  });
}
