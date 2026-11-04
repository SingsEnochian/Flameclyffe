// N-011: Story/model output is an untrusted *proposal*, never execution authority.
// The same gate accepts structured suggestions from Hugging Face or other models.
// Actual execution must be admitted independently by the trusted Wayglass host.
export const NARRATIVE_ACTION_CANDIDATE_SCHEMA = 'wayglass.narrative-action-candidate/v1';
const ALLOWED = Object.freeze({
  'math-spine.jacobian-fold': Object.freeze({ datasets: ['graphite-node-01'] }),
});
const small = (v, max = 128) => typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;

export function proposeNarrativeAction({ suggestion, source, worldId = 'wayglass:writing-room' } = {}) {
  // A suggestion may be returned by a Hugging Face narrative interpreter;
  // provenance comes from trusted transport, never model-authored JSON.
  if (!suggestion || typeof suggestion !== 'object' || Array.isArray(suggestion)) return null;
  if (!source || typeof source !== 'object') return null;
  const actionId = small(suggestion.action_id, 80);
  const dataset = small(suggestion.dataset_id, 80);
  const declared = Object.prototype.hasOwnProperty.call(ALLOWED, actionId) ? ALLOWED[actionId] : null;
  if (!declared || !declared.datasets.includes(dataset)) return null;
  const receiptId = small(source.receipt?.wayglass_relay_id || source.receipt?.transport_id, 160);
  const participant = small(source.participant, 80);
  const routeId = small(source.route_id, 160);
  const provider = small(source.provider, 80);
  if (!receiptId || !participant || !routeId || !provider || !small(worldId, 160)) return null;
  if (source.confirmed !== true || source.stopped === true) return null;
  return Object.freeze({
    schema: NARRATIVE_ACTION_CANDIDATE_SCHEMA,
    candidate_id: receiptId + ':' + actionId + ':' + dataset,
    action_id: actionId,
    arguments: Object.freeze({ dataset_id: dataset }),
    origin: Object.freeze({
      transport_receipt_id: receiptId, participant_id: participant,
      route_id: routeId, provider, world_id: worldId,
    }),
    status: 'untrusted-proposal',
    authority: 'none',
    executed: false,
  });
}

export function interpretNarrativeActionProposal({ modelOutput, source, worldId } = {}) {
  // An interpreter (HF model or other route) emits one JSON proposal. No
  // transcript prose, quotes or character dialogue is a tool instruction.
  if (typeof modelOutput !== 'string' || modelOutput.length > 2048) return null;
  let parsed;
  try { parsed = JSON.parse(modelOutput); } catch { return null; }
  return proposeNarrativeAction({ suggestion: parsed, source, worldId });
}

export function dedupeNarrativeProposals(candidates = []) {
  const ids = new Set();
  return candidates.filter(candidate => {
    if (candidate?.schema !== NARRATIVE_ACTION_CANDIDATE_SCHEMA ||
        !candidate.candidate_id || ids.has(candidate.candidate_id)) return false;
    ids.add(candidate.candidate_id);
    return true;
  });
}
