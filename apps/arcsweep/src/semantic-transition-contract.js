import { normalizeSemanticSource, projectSemanticCapabilities, inspectGlassHalo } from './semantic-source-contract.js';

export const SEMANTIC_TRANSITION_CONTRACT_VERSION = 'arcsweep.semantic-transition/v1';

export function buildSourceConstellation(sources = []) {
  const normalized = sources.map((source) => normalizeSemanticSource(source));
  const nodes = normalized.map((source) => ({
    id: source.source_id,
    provenance: source.provenance,
    authority: source.authority,
    contamination_status: source.contamination_status,
    participant_visibility: source.participant_visibility,
  }));
  const edges = normalized.flatMap((source) => source.admissible_influence.map((capability) => ({
    from: source.source_id,
    to: capability,
    relation: 'may_influence',
  })));
  return Object.freeze({ schema: 'arcsweep.source-constellation/v1', nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
}

export function projectParticipantSceneView({ globalState = {}, participantKnown = {}, sources = [], requestedCapabilities = [] } = {}) {
  const hiddenKeys = Object.keys(globalState).filter((key) => JSON.stringify(globalState[key]) !== JSON.stringify(participantKnown[key]));
  const sourceReceipts = sources.map((source) => {
    const halo = inspectGlassHalo(source.text || '');
    const normalized = normalizeSemanticSource({
      ...source,
      contamination_status: halo.risk === 'low' ? (source.contamination_status || 'clean') : 'quarantined',
      forbidden_influence: [...new Set([...(source.forbidden_influence || []), ...halo.recommended_forbidden_influence])],
    });
    return {
      source: normalized,
      capabilities: projectSemanticCapabilities(normalized, requestedCapabilities),
      glass_halo: halo,
    };
  });
  return Object.freeze({
    schema: 'arcsweep.participant-scene-view/v1',
    participant_visible_state: participantKnown,
    globally_present_but_not_visible: Object.freeze(hiddenKeys),
    locally_predictable: hiddenKeys.length === 0,
    source_receipts: Object.freeze(sourceReceipts),
    rule: 'surprise is perspective-local; coherence belongs to the transition',
  });
}

export function classifyDebtTransition(beforeDebt = [], afterDebt = []) {
  const before = new Map(beforeDebt.map((item) => [item.id, item]));
  const after = new Map(afterDebt.map((item) => [item.id, item]));
  const discharged = [...before.keys()].filter((id) => !after.has(id));
  const created = [...after.keys()].filter((id) => !before.has(id));
  const transformed = [...before.keys()].filter((id) => after.has(id) && JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)));
  const preserved = [...before.keys()].filter((id) => after.has(id) && JSON.stringify(before.get(id)) === JSON.stringify(after.get(id)));
  return Object.freeze({ schema: 'arcsweep.debt-transition/v1', discharged, transformed, preserved, created });
}

export function causalDensity({ initiatingEvents = [], consequentialChanges = [] } = {}) {
  const evidenced = consequentialChanges.filter((change) => change?.evidenced === true && change?.persistent !== false && change?.causal_link !== false);
  const denominator = Math.max(1, initiatingEvents.length);
  return Object.freeze({
    schema: 'arcsweep.causal-density/v1',
    evidenced_changes: evidenced.length,
    independent_initiating_events: initiatingEvents.length,
    density: evidenced.length / denominator,
    excluded_changes: consequentialChanges.length - evidenced.length,
    warning: 'Decorative or unevidenced field changes do not count.',
  });
}

export function compareWitnessRealizations(targetTransition = {}, realizations = []) {
  return Object.freeze({
    schema: 'arcsweep.witness-swap/v1',
    target_transition: targetTransition,
    realizations: Object.freeze(realizations.map((item, index) => ({
      id: item.id || `witness-${index + 1}`,
      witness: item.witness || 'unknown',
      prose: String(item.prose || ''),
      preserves_target: item.preserves_target !== false,
      particulars_authority: item.particulars_authority || 'witness-local',
    }))),
    rule: 'The transition is fixed; lived particulars may differ within authority.',
  });
}

export function evaluateBranchGarden(candidates = []) {
  const evaluated = candidates.map((candidate, index) => {
    const vector = candidate.vector || {};
    const hardReject = candidate.agency_legal === false || candidate.continuity_legal === false || candidate.semantic_inflation === true;
    return {
      id: candidate.id || `branch-${index + 1}`,
      admissible: !hardReject,
      agency_legal: candidate.agency_legal !== false,
      continuity_legal: candidate.continuity_legal !== false,
      semantic_inflation: candidate.semantic_inflation === true,
      vector,
      novelty: candidate.novelty || 'bounded',
      scalar_utility: null,
    };
  });
  return Object.freeze({ schema: 'arcsweep.branch-garden/v1', candidates: Object.freeze(evaluated), vector_primary: true, novelty_is_proposal_operator: true });
}
