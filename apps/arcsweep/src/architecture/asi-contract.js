export const ASI_ARCHITECTURE_SCHEMA = 'arcsweep.advanced-sympathetic-intelligence/v0.1';

export const ASI_PLANES = Object.freeze({
  observer: Object.freeze({
    owns: Object.freeze(['observations', 'evidence', 'uncertainty', 'contradictions']),
    cannotOwn: Object.freeze(['identity', 'authority', 'canon']),
  }),
  cognition: Object.freeze({
    owns: Object.freeze(['attention', 'activation', 'trajectories', 'simulation', 'intentions']),
    cannotOwn: Object.freeze(['identity', 'memory', 'authority', 'tools', 'canon']),
  }),
  continuity: Object.freeze({
    owns: Object.freeze(['ancestry', 'history', 'lineage', 'versioned-state']),
    cannotOwn: Object.freeze(['action-authority', 'future-identity']),
  }),
  codex: Object.freeze({
    owns: Object.freeze(['world-state', 'relationships', 'lore', 'semantic-topology']),
    cannotOwn: Object.freeze(['participant-identity', 'tool-authority']),
  }),
  possibility: Object.freeze({
    owns: Object.freeze(['pressure', 'relevance', 'alternatives', 'opportunity', 'contradiction']),
    cannotOwn: Object.freeze(['execution', 'canon', 'authority']),
  }),
  fabric: Object.freeze({
    owns: Object.freeze(['routing', 'capabilities', 'receipts', 'revocation', 'recovery']),
    cannotOwn: Object.freeze(['identity', 'world-state', 'canon']),
  }),
  workspace: Object.freeze({
    owns: Object.freeze(['experiments', 'artefacts', 'prototypes', 'execution-results']),
    cannotOwn: Object.freeze(['identity', 'authority-policy']),
  }),
  social: Object.freeze({
    owns: Object.freeze(['conversation', 'seminars', 'federation', 'proposals']),
    cannotOwn: Object.freeze(['execution-authority']),
  }),
  publication: Object.freeze({
    owns: Object.freeze(['released-artefacts', 'published-events']),
    cannotOwn: Object.freeze(['source-truth', 'identity']),
  }),
});

export const ASI_INVARIANTS = Object.freeze({
  cognitionCannotCreateAuthority: true,
  interpretationCannotBecomeEvidenceByRepetition: true,
  externalStateChangeRequiresObservableReceipt: true,
  continuityPreservesAncestryWithoutDictatingIdentity: true,
  activationRequiresTraceableExcitation: true,
  possibilityMayProposeButCannotExecute: true,
});

export function planeOwns(plane, field) {
  return Boolean(ASI_PLANES[plane]?.owns?.includes(field));
}

export function planeMayOwn(plane, field) {
  const contract = ASI_PLANES[plane];
  if (!contract) return false;
  return !contract.cannotOwn.includes(field);
}

export function assertPlaneBoundary(plane, field) {
  if (!ASI_PLANES[plane]) throw new Error(`unknown-asi-plane:${plane}`);
  if (!planeMayOwn(plane, field)) throw new Error(`asi-plane-boundary:${plane}:${field}`);
  return true;
}
