import {
  CANON_INTELLIGENCE_PROMOTION_SCHEMA,
  CANON_INTELLIGENCE_PROPOSAL_SCHEMA,
  createCanonIntelligenceProposal,
  normaliseCanonEvidence,
} from './canon-intelligence-core.js';

export const CANON_WORLDSEED_SEED_RECEIPT_SCHEMA = 'arcsweep.canon-worldseed-seed-receipt/v1';
export const WORLDSEED_CANON_PROPOSAL_RECEIPT_SCHEMA = 'arcsweep.worldseed-canon-proposal-receipt/v1';

const text = (value) => String(value ?? '').trim();
const clone = (value) => value == null ? value : structuredClone(value);
const slug = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function worldById(state, worldId) {
  return state?.worlds?.find((world) => world.id === worldId) || null;
}

function seedhouseRecordById(state, recordId) {
  return (Array.isArray(state?.records?.seedhouse) ? state.records.seedhouse : [])
    .find((record) => record.id === recordId) || null;
}

function requireMatchingPromotion(reviewedProposal, promotionReceipt) {
  if (reviewedProposal?.schema !== CANON_INTELLIGENCE_PROPOSAL_SCHEMA || reviewedProposal.status !== 'accepted') {
    throw new Error('CANON_WORLDSEED: accepted Canon Intelligence proposal required');
  }
  if (promotionReceipt?.schema !== CANON_INTELLIGENCE_PROMOTION_SCHEMA) {
    throw new Error('CANON_WORLDSEED: canon promotion receipt required');
  }
  if (promotionReceipt.proposal_id !== reviewedProposal.proposal_id || promotionReceipt.world_id !== reviewedProposal.world_id) {
    throw new Error('CANON_WORLDSEED: promotion receipt does not match proposal');
  }
}

export function seedWorldFromPromotedCanon(state, {
  reviewedProposal,
  promotionReceipt,
  seedType = 'Canon Intelligence Promotion',
  title = '',
  mustSurvive = '',
  mayChange = '',
  mayBeLost = '',
  descendantsInherit = '',
  transferableSeed = '',
  rootedAt = new Date().toISOString(),
} = {}) {
  if (!state) throw new Error('CANON_WORLDSEED: Arcsweep state required');
  requireMatchingPromotion(reviewedProposal, promotionReceipt);
  const worldId = reviewedProposal.world_id;
  const world = worldById(state, worldId);
  if (!world) throw new Error(`CANON_WORLDSEED: World ${worldId} is not in the registry`);

  state.records = state.records && typeof state.records === 'object' ? state.records : {};
  state.records.seedhouse = Array.isArray(state.records.seedhouse) ? state.records.seedhouse : [];
  const seedId = `seed:canon-intelligence:${slug(worldId)}:${Date.parse(rootedAt) || Date.now()}`;
  const appliedValue = clone(promotionReceipt.applied_value);
  const sourceRef = `canon-intelligence:${promotionReceipt.promotion_id}`;
  const seed = {
    id: seedId,
    worldId,
    title: text(title) || `${reviewedProposal.target.entity_id} · ${reviewedProposal.target.field_key}`,
    seedType,
    status: 'Rooted',
    mustSurvive: text(mustSurvive) || (typeof appliedValue === 'string' ? appliedValue : JSON.stringify(appliedValue)),
    mayChange: text(mayChange),
    mayBeLost: text(mayBeLost),
    descendantsInherit: text(descendantsInherit),
    transferableSeed: text(transferableSeed),
    lineageRefs: sourceRef,
    sourceRefs: sourceRef,
    notes: `Rooted from explicit Canon Intelligence promotion at ${rootedAt}.`,
    createdAt: rootedAt,
    updatedAt: rootedAt,
    rootedFromCanonProposalId: reviewedProposal.proposal_id,
    rootedFromCanonPromotionId: promotionReceipt.promotion_id,
    canonTarget: clone(reviewedProposal.target),
  };
  state.records.seedhouse.unshift(seed);

  state.canonWorldseedSeedReceipts = Array.isArray(state.canonWorldseedSeedReceipts)
    ? state.canonWorldseedSeedReceipts
    : [];
  const receipt = {
    schema: CANON_WORLDSEED_SEED_RECEIPT_SCHEMA,
    version: 1,
    id: `canon-worldseed:${slug(worldId)}:${Date.parse(rootedAt) || Date.now()}`,
    rooted_at: rootedAt,
    world_id: worldId,
    proposal_id: reviewedProposal.proposal_id,
    promotion_id: promotionReceipt.promotion_id,
    mutation_receipt_id: promotionReceipt.mutation_receipt_id || null,
    seedhouse_record_id: seed.id,
    authority: 'explicit-steward-promotion',
  };
  state.canonWorldseedSeedReceipts.unshift(receipt);
  return { state, seed, receipt };
}

export function proposeWorldseedDiscoveryToCanon(state, {
  worldId,
  seedhouseRecordId,
  entity,
  field,
  proposedValue,
  existingValue = null,
  proposer = { id: 'worldseed-foundry', kind: 'system' },
  confidence = null,
  observedAt = new Date().toISOString(),
  locator = null,
} = {}) {
  if (!state) throw new Error('WORLDSEED_CANON: Arcsweep state required');
  const world = worldById(state, worldId);
  if (!world) throw new Error(`WORLDSEED_CANON: World ${worldId} is not in the registry`);
  const seed = seedhouseRecordById(state, seedhouseRecordId);
  if (!seed || seed.worldId !== worldId) throw new Error(`WORLDSEED_CANON: Seed ${seedhouseRecordId} is not in ${worldId}`);

  const evidence = normaliseCanonEvidence({
    source_id: seed.id,
    source_kind: 'worldseed-discovery',
    source_title: seed.title || 'Worldseed discovery',
    locator: locator || `seedhouse:${seed.id}`,
    world_id: worldId,
    entity_hint: entity?.id || entity,
    field_hint: field?.key || field,
    value: clone(proposedValue),
    excerpt: text(seed.notes) || text(seed.mustSurvive) || null,
    authority: 'worldseed-observation',
    confidence,
    observed_at: observedAt,
    provenance: [
      `worldseed:${seed.id}`,
      ...(text(seed.lineageRefs) ? [seed.lineageRefs] : []),
    ],
  });

  const proposal = createCanonIntelligenceProposal({
    worldId,
    entity,
    field,
    proposedValue: clone(proposedValue),
    existingValue: clone(existingValue),
    evidence: [evidence],
    proposer,
    confidence,
    createdAt: observedAt,
  });

  state.worldseedCanonProposalReceipts = Array.isArray(state.worldseedCanonProposalReceipts)
    ? state.worldseedCanonProposalReceipts
    : [];
  const receipt = {
    schema: WORLDSEED_CANON_PROPOSAL_RECEIPT_SCHEMA,
    version: 1,
    id: `worldseed-canon:${slug(worldId)}:${Date.parse(observedAt) || Date.now()}`,
    observed_at: observedAt,
    world_id: worldId,
    seedhouse_record_id: seed.id,
    proposal_id: proposal.proposal_id,
    evidence_id: evidence.evidence_id,
    canon_mutated: false,
    authority: 'proposal-only',
  };
  state.worldseedCanonProposalReceipts.unshift(receipt);
  return { state, evidence, proposal, receipt };
}
