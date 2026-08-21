import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCanonIntelligenceProposal,
  createCanonPromotionReceipt,
  reviewCanonProposal,
} from '../src/canon-intelligence-core.js';
import {
  CANON_WORLDSEED_SEED_RECEIPT_SCHEMA,
  WORLDSEED_CANON_PROPOSAL_RECEIPT_SCHEMA,
  proposeWorldseedDiscoveryToCanon,
  seedWorldFromPromotedCanon,
} from '../src/canon-worldseed-bridge.js';

function makeState() {
  return {
    worlds: [{ id: 'terra-prime', name: 'Terra Prime' }],
    records: { seedhouse: [] },
  };
}

test('accepted promoted canon roots a receipted Worldseed inheritance without losing authority', () => {
  const state = makeState();
  const proposal = createCanonIntelligenceProposal({
    worldId: 'terra-prime',
    entity: { id: 'terra-prime', type: 'world' },
    field: { key: 'continuityLaw' },
    proposedValue: 'Memory survives World transitions with provenance.',
    existingValue: null,
    evidence: [{ source_id: 'canon:test', world_id: 'terra-prime', value: 'Memory survives World transitions with provenance.' }],
    proposer: { id: 'atlas', kind: 'model' },
    createdAt: '2026-08-21T20:00:00.000Z',
  });
  const accepted = reviewCanonProposal(proposal, {
    action: 'accept',
    steward: 'rowan',
    reviewedAt: '2026-08-21T20:01:00.000Z',
  });
  const promotion = createCanonPromotionReceipt(accepted, {
    steward: 'rowan',
    mutationReceiptId: 'canon-mutation:terra-prime:1',
    promotedAt: '2026-08-21T20:02:00.000Z',
  });

  const result = seedWorldFromPromotedCanon(state, {
    reviewedProposal: accepted,
    promotionReceipt: promotion,
    rootedAt: '2026-08-21T20:03:00.000Z',
  });

  assert.equal(result.receipt.schema, CANON_WORLDSEED_SEED_RECEIPT_SCHEMA);
  assert.equal(result.receipt.promotion_id, promotion.promotion_id);
  assert.equal(result.receipt.mutation_receipt_id, 'canon-mutation:terra-prime:1');
  assert.equal(result.seed.rootedFromCanonProposalId, accepted.proposal_id);
  assert.equal(result.seed.mustSurvive, accepted.proposed_value);
  assert.equal(state.records.seedhouse.length, 1);
});

test('Worldseed discovery returns to Canon Intelligence as evidence + proposal only', () => {
  const state = makeState();
  state.records.seedhouse.push({
    id: 'seed:terra-prime:memory',
    worldId: 'terra-prime',
    title: 'Memory persistence observation',
    mustSurvive: 'Observed memory persistence.',
    notes: 'Foundry observation; requires canon review.',
    lineageRefs: 'worldseed:terra-prime:abc123',
  });

  const result = proposeWorldseedDiscoveryToCanon(state, {
    worldId: 'terra-prime',
    seedhouseRecordId: 'seed:terra-prime:memory',
    entity: { id: 'terra-prime', type: 'world' },
    field: { key: 'memoryPolicy' },
    proposedValue: 'Preserve provenance-aware memory across revisions.',
    existingValue: null,
    proposer: { id: 'worldseed-foundry', kind: 'system' },
    confidence: 0.82,
    observedAt: '2026-08-21T20:04:00.000Z',
  });

  assert.equal(result.receipt.schema, WORLDSEED_CANON_PROPOSAL_RECEIPT_SCHEMA);
  assert.equal(result.receipt.canon_mutated, false);
  assert.equal(result.receipt.authority, 'proposal-only');
  assert.equal(result.evidence.canon_status, 'evidence-only');
  assert.equal(result.evidence.source_kind, 'worldseed-discovery');
  assert.equal(result.proposal.status, 'pending');
  assert.equal(result.proposal.authority.may_promote_to_canon, false);
});

test('Worldseed cannot root from an unpromoted Canon Intelligence proposal', () => {
  const state = makeState();
  const proposal = createCanonIntelligenceProposal({
    worldId: 'terra-prime',
    entity: { id: 'terra-prime', type: 'world' },
    field: { key: 'law' },
    proposedValue: 'Not yet canon',
    evidence: [{ source_id: 'canon:test', world_id: 'terra-prime', value: 'Not yet canon' }],
    proposer: 'atlas',
    createdAt: '2026-08-21T20:05:00.000Z',
  });

  assert.throws(() => seedWorldFromPromotedCanon(state, {
    reviewedProposal: proposal,
    promotionReceipt: null,
  }), /accepted Canon Intelligence proposal required/);
  assert.equal(state.records.seedhouse.length, 0);
});
