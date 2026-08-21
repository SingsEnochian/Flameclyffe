export const CANON_INTELLIGENCE_PROPOSAL_SCHEMA = 'arcsweep.canon-intelligence-proposal/v1';
export const CANON_INTELLIGENCE_EVIDENCE_SCHEMA = 'arcsweep.canon-intelligence-evidence/v1';
export const CANON_INTELLIGENCE_PROMOTION_SCHEMA = 'arcsweep.canon-intelligence-promotion/v1';
export const CANON_INTELLIGENCE_COMPARISONS = Object.freeze(['agree', 'extend', 'conflict', 'unknown']);
export const CANON_INTELLIGENCE_REVIEW_STATES = Object.freeze(['pending', 'accepted', 'rejected', 'revised', 'held', 'needs-more-evidence']);

const text = (value) => String(value ?? '').trim();
const clone = (value) => value == null ? value : structuredClone(value);
const slug = (value) => text(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const boundedConfidence = (value) => value == null ? null : Math.max(0, Math.min(1, Number(value)));
const nowIso = () => new Date().toISOString();

export function normaliseCanonEvidence(input = {}) {
  const sourceId = text(input.source_id || input.sourceId);
  if (!sourceId) throw new Error('CANON_INTELLIGENCE: evidence requires source_id');
  const worldId = text(input.world_id || input.worldId) || null;
  return Object.freeze({
    schema: CANON_INTELLIGENCE_EVIDENCE_SCHEMA,
    evidence_id: text(input.evidence_id || input.evidenceId) || `evidence:${slug(worldId || 'unscoped')}:${slug(sourceId)}:${slug(input.locator || input.title || 'root')}`,
    source_id: sourceId,
    source_kind: text(input.source_kind || input.sourceKind) || 'source',
    source_title: text(input.source_title || input.sourceTitle || input.title) || null,
    source_url: text(input.source_url || input.sourceUrl) || null,
    locator: text(input.locator) || null,
    world_id: worldId,
    entity_hint: text(input.entity_hint || input.entityHint) || null,
    field_hint: text(input.field_hint || input.fieldHint) || null,
    value: clone(input.value ?? null),
    excerpt: text(input.excerpt) || null,
    authority: text(input.authority) || 'unknown',
    confidence: boundedConfidence(input.confidence),
    observed_at: input.observed_at || input.observedAt || nowIso(),
    provenance: Array.isArray(input.provenance) ? clone(input.provenance) : [],
    canon_status: 'evidence-only',
  });
}

export function resolveCanonEntity(evidence, entities = []) {
  const hint = text(evidence?.entity_hint).toLowerCase();
  if (!hint) return { status: 'unknown', entity: null, candidates: [] };
  const candidates = entities.filter((entity) => {
    const tokens = [entity.id, entity.name, ...(entity.aliases || [])].map((item) => text(item).toLowerCase()).filter(Boolean);
    return tokens.includes(hint) || tokens.some((token) => slug(token) === slug(hint));
  });
  if (candidates.length === 1) return { status: 'resolved', entity: clone(candidates[0]), candidates: clone(candidates) };
  if (candidates.length > 1) return { status: 'ambiguous', entity: null, candidates: clone(candidates) };
  return { status: 'unknown', entity: null, candidates: [] };
}

export function resolveCanonField(evidence, entity = null, fieldRegistry = []) {
  const hint = text(evidence?.field_hint).toLowerCase();
  if (!hint) return { status: 'unknown', field: null, candidates: [] };
  const candidates = fieldRegistry.filter((field) => {
    if (field.entity_types?.length && entity?.type && !field.entity_types.includes(entity.type)) return false;
    const tokens = [field.key, field.label, ...(field.aliases || [])].map((item) => text(item).toLowerCase()).filter(Boolean);
    return tokens.includes(hint) || tokens.some((token) => slug(token) === slug(hint));
  });
  if (candidates.length === 1) return { status: 'resolved', field: clone(candidates[0]), candidates: clone(candidates) };
  if (candidates.length > 1) return { status: 'ambiguous', field: null, candidates: clone(candidates) };
  return { status: 'unknown', field: null, candidates: [] };
}

function normalisedComparable(value) {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ').toLowerCase();
  return JSON.stringify(value ?? null);
}

export function compareCanonValue(existingValue, proposedValue) {
  if (existingValue == null || existingValue === '') return { relation: 'extend', reason: 'target field is empty' };
  if (proposedValue == null || proposedValue === '') return { relation: 'unknown', reason: 'evidence carries no proposed value' };
  if (normalisedComparable(existingValue) === normalisedComparable(proposedValue)) return { relation: 'agree', reason: 'normalised values match' };
  if (Array.isArray(existingValue) && Array.isArray(proposedValue)) {
    const existing = new Set(existingValue.map(normalisedComparable));
    const proposed = proposedValue.map(normalisedComparable);
    if ([...existing].every((item) => proposed.includes(item))) return { relation: 'extend', reason: 'proposal preserves existing values and adds material' };
  }
  if (typeof existingValue === 'string' && typeof proposedValue === 'string') {
    const a = normalisedComparable(existingValue); const b = normalisedComparable(proposedValue);
    if (b.includes(a) && b.length > a.length) return { relation: 'extend', reason: 'proposal contains existing text plus additional material' };
  }
  return { relation: 'conflict', reason: 'proposal differs from established field value' };
}

export function createCanonIntelligenceProposal({
  worldId,
  entity,
  field,
  proposedValue,
  existingValue = null,
  evidence = [],
  proposer,
  confidence = null,
  createdAt = nowIso(),
  proposalId = null,
} = {}) {
  const resolvedWorldId = text(worldId);
  const entityId = text(entity?.id || entity);
  const fieldKey = text(field?.key || field);
  const proposerId = text(proposer?.id || proposer);
  if (!resolvedWorldId || !entityId || !fieldKey || !proposerId) throw new Error('CANON_INTELLIGENCE: proposal requires world, entity, field, and proposer');
  const receipts = evidence.map((item) => item?.schema === CANON_INTELLIGENCE_EVIDENCE_SCHEMA ? clone(item) : normaliseCanonEvidence(item));
  const comparison = compareCanonValue(existingValue, proposedValue);
  return Object.freeze({
    schema: CANON_INTELLIGENCE_PROPOSAL_SCHEMA,
    proposal_id: proposalId || `canon-proposal:${slug(resolvedWorldId)}:${slug(entityId)}:${slug(fieldKey)}:${Date.parse(createdAt) || Date.now()}`,
    world_id: resolvedWorldId,
    target: { entity_id: entityId, entity_type: text(entity?.type) || null, field_key: fieldKey },
    existing_value: clone(existingValue),
    proposed_value: clone(proposedValue),
    comparison: comparison.relation,
    comparison_reason: comparison.reason,
    evidence: receipts,
    proposer: { id: proposerId, kind: text(proposer?.kind) || 'model' },
    confidence: boundedConfidence(confidence),
    status: 'pending',
    created_at: createdAt,
    authority: { may_propose: true, may_promote_to_canon: false, steward_review_required: true },
  });
}

export function buildContradictionBundle(proposal) {
  if (proposal?.schema !== CANON_INTELLIGENCE_PROPOSAL_SCHEMA) throw new Error('CANON_INTELLIGENCE: contradiction bundle requires proposal');
  return Object.freeze({
    schema: 'arcsweep.canon-intelligence-contradiction/v1',
    proposal_id: proposal.proposal_id,
    world_id: proposal.world_id,
    target: clone(proposal.target),
    relation: proposal.comparison,
    existing_value: clone(proposal.existing_value),
    proposed_value: clone(proposal.proposed_value),
    evidence_ids: proposal.evidence.map((item) => item.evidence_id),
    requires_review: proposal.comparison === 'conflict' || proposal.comparison === 'unknown',
  });
}

export function proposeMissingCanonFields({ worldId, entity, fieldRegistry = [], evidence = [], proposer = 'canon-intelligence' } = {}) {
  if (!entity?.id) return [];
  return fieldRegistry.flatMap((field) => {
    const existing = entity[field.key];
    if (existing != null && existing !== '' && !(Array.isArray(existing) && existing.length === 0)) return [];
    const matching = evidence.filter((item) => text(item.field_hint).toLowerCase() === text(field.key).toLowerCase() || text(item.field_hint).toLowerCase() === text(field.label).toLowerCase());
    if (!matching.length) return [];
    const best = matching.slice().sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    return [createCanonIntelligenceProposal({ worldId, entity, field, proposedValue: best.value, existingValue: existing, evidence: matching, proposer, confidence: best.confidence })];
  });
}

export function reviewCanonProposal(proposal, { action, steward, note = null, revisedValue, reviewedAt = nowIso() } = {}) {
  if (proposal?.schema !== CANON_INTELLIGENCE_PROPOSAL_SCHEMA) throw new Error('CANON_INTELLIGENCE: review requires proposal');
  const stewardId = text(steward?.id || steward);
  if (!stewardId) throw new Error('CANON_INTELLIGENCE: Steward identity is required');
  const mapping = { accept: 'accepted', reject: 'rejected', revise: 'revised', hold: 'held', 'needs-more-evidence': 'needs-more-evidence' };
  const status = mapping[text(action).toLowerCase()];
  if (!status) throw new Error('CANON_INTELLIGENCE: unknown review action');
  return Object.freeze({
    ...clone(proposal),
    proposed_value: status === 'revised' ? clone(revisedValue) : clone(proposal.proposed_value),
    status,
    review: { steward_id: stewardId, action: text(action).toLowerCase(), note: text(note) || null, reviewed_at: reviewedAt },
  });
}

export function createCanonPromotionReceipt(reviewedProposal, { steward, mutationReceiptId, promotedAt = nowIso() } = {}) {
  if (reviewedProposal?.schema !== CANON_INTELLIGENCE_PROPOSAL_SCHEMA || reviewedProposal.status !== 'accepted') {
    throw new Error('CANON_INTELLIGENCE: only an accepted proposal may be promoted');
  }
  const stewardId = text(steward?.id || steward || reviewedProposal.review?.steward_id);
  if (!stewardId) throw new Error('CANON_INTELLIGENCE: promotion requires Steward identity');
  return Object.freeze({
    schema: CANON_INTELLIGENCE_PROMOTION_SCHEMA,
    promotion_id: `canon-promotion:${slug(reviewedProposal.proposal_id)}:${Date.parse(promotedAt) || Date.now()}`,
    proposal_id: reviewedProposal.proposal_id,
    world_id: reviewedProposal.world_id,
    target: clone(reviewedProposal.target),
    applied_value: clone(reviewedProposal.proposed_value),
    evidence_ids: reviewedProposal.evidence.map((item) => item.evidence_id),
    steward_id: stewardId,
    mutation_receipt_id: text(mutationReceiptId) || null,
    promoted_at: promotedAt,
    authority: 'explicit-steward-promotion',
  });
}

export async function applyCanonPromotion(reviewedProposal, { steward, mutateCanon } = {}) {
  if (typeof mutateCanon !== 'function') throw new Error('CANON_INTELLIGENCE: canon mutator is required');
  if (reviewedProposal?.status !== 'accepted') throw new Error('CANON_INTELLIGENCE: proposal must be accepted before mutation');
  const mutation = await mutateCanon({
    world_id: reviewedProposal.world_id,
    target: clone(reviewedProposal.target),
    value: clone(reviewedProposal.proposed_value),
    proposal_id: reviewedProposal.proposal_id,
  });
  return createCanonPromotionReceipt(reviewedProposal, { steward, mutationReceiptId: mutation?.receipt_id || mutation?.id || null });
}
