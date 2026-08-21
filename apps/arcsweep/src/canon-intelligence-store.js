import { CANON_INTELLIGENCE_PROPOSAL_SCHEMA, CANON_INTELLIGENCE_PROMOTION_SCHEMA } from './canon-intelligence-core.js';

export const CANON_INTELLIGENCE_QUEUE_KEY = 'arcsweep.canon-intelligence-queue/v1';
export const CANON_INTELLIGENCE_EVENT = 'arcsweep:canon-intelligence-changed';

const clone = (value) => value == null ? value : structuredClone(value);

export function emptyCanonIntelligenceState() {
  return { schema: 'arcsweep.canon-intelligence-state/v1', proposals: [], promotions: [] };
}

export function normaliseCanonIntelligenceState(input) {
  const state = input?.schema === 'arcsweep.canon-intelligence-state/v1' ? clone(input) : emptyCanonIntelligenceState();
  state.proposals = (state.proposals || []).filter((item) => item?.schema === CANON_INTELLIGENCE_PROPOSAL_SCHEMA);
  state.promotions = (state.promotions || []).filter((item) => item?.schema === CANON_INTELLIGENCE_PROMOTION_SCHEMA);
  return state;
}

export function loadCanonIntelligenceState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(CANON_INTELLIGENCE_QUEUE_KEY);
    return normaliseCanonIntelligenceState(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyCanonIntelligenceState();
  }
}

export function saveCanonIntelligenceState(state, storage = globalThis.localStorage, target = globalThis.document) {
  const next = normaliseCanonIntelligenceState(state);
  storage?.setItem?.(CANON_INTELLIGENCE_QUEUE_KEY, JSON.stringify(next));
  if (target?.dispatchEvent && typeof CustomEvent !== 'undefined') {
    target.dispatchEvent(new CustomEvent(CANON_INTELLIGENCE_EVENT, { detail: clone(next) }));
  }
  return next;
}

export function enqueueCanonProposal(state, proposal) {
  if (proposal?.schema !== CANON_INTELLIGENCE_PROPOSAL_SCHEMA) throw new Error('CANON_INTELLIGENCE: queue requires proposal');
  const current = normaliseCanonIntelligenceState(state);
  const existing = current.proposals.find((item) => item.proposal_id === proposal.proposal_id);
  if (existing) return current;
  return { ...current, proposals: [...current.proposals, clone(proposal)] };
}

export function replaceCanonProposal(state, proposal) {
  if (proposal?.schema !== CANON_INTELLIGENCE_PROPOSAL_SCHEMA) throw new Error('CANON_INTELLIGENCE: replacement requires proposal');
  const current = normaliseCanonIntelligenceState(state);
  let found = false;
  const proposals = current.proposals.map((item) => {
    if (item.proposal_id !== proposal.proposal_id) return item;
    found = true;
    return clone(proposal);
  });
  return { ...current, proposals: found ? proposals : [...proposals, clone(proposal)] };
}

export function appendCanonPromotion(state, receipt) {
  if (receipt?.schema !== CANON_INTELLIGENCE_PROMOTION_SCHEMA) throw new Error('CANON_INTELLIGENCE: promotion receipt required');
  const current = normaliseCanonIntelligenceState(state);
  if (current.promotions.some((item) => item.promotion_id === receipt.promotion_id)) return current;
  return { ...current, promotions: [...current.promotions, clone(receipt)] };
}

export function filterCanonProposals(state, { worldId = null, status = null, entityId = null, comparison = null } = {}) {
  return normaliseCanonIntelligenceState(state).proposals.filter((proposal) => {
    if (worldId && proposal.world_id !== worldId) return false;
    if (status && proposal.status !== status) return false;
    if (entityId && proposal.target?.entity_id !== entityId) return false;
    if (comparison && proposal.comparison !== comparison) return false;
    return true;
  });
}
