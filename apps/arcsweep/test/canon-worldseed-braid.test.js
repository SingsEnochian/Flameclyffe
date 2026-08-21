import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normaliseCanonEvidence,
  createCanonIntelligenceProposal,
  reviewCanonProposal,
  applyCanonPromotion,
} from '../src/canon-intelligence-core.js';
import {
  rootPromotedCanonProposalInWorldseed,
  proposeWorldseedDiscoveryToCanon,
} from '../src/canon-worldseed-braid.js';

const baseState = () => ({
  worlds: [{ id: 'terra-prime', name: 'Terra Prime' }],
  scripts: [],
  records: { records: [], seedhouse: [] },
});

test('accepted + promoted Canon Intelligence may root a receipted Worldseed', async () => {
  const evidence = normaliseCanonEvidence({
    source_id: 'canon-source-1',
    world_id: 'terra-prime',
    entity_hint: 'terra-prime',
    field_hint: 'mustSurvive',
    value: 'Continuity must survive.',
  });
  const pending = createCanonIntelligenceProposal({
    worldId: 'terra-prime',
    entity: { id: 'terra-prime', type: 'world' },
    field: { key: 'mustSurvive' },
    proposedValue: 'Continuity must survive.',
    evidence: [evidence],
    proposer: 'atlas',
  });
  const accepted = reviewCanonProposal(pending, { action: 'accept', steward: 'rowan' });
  const promotion = await applyCanonPromotion(accepted, {
    steward: 'rowan',
    mutateCanon: async () => ({ receipt_id: 'mutation:terra-prime:1' }),
  });

  const result = rootPromotedCanonProposalInWorldseed(baseState(), {
    reviewedProposal: accepted,
    promotionReceipt: promotion,
    steward: 'rowan',
    rootedAt: '2026-08-21T19:55:00.000Z',
  });

  assert.equal(result.seed.worldId, 'terra-prime');
  assert.equal(result.seed.status, 'Rooted');
  assert.equal(result.seed.mustSurvive, 'Continuity must survive.');
  assert.equal(result.receipt.promotion_id, promotion.promotion_id);
  assert.equal(result.receipt.mutation_receipt_id, 'mutation:terra-prime:1');
});

test('Worldseed discoveries return to Canon Intelligence as proposal-only and never mutate canon', () => {
  const state = baseState();
  const beforeCanon = structuredClone(state.scripts);
  const result = proposeWorldseedDiscoveryToCanon(state, {
    worldId: 'terra-prime',
    discovery: {
      id: 'discovery:terra-prime:1',
      entity_id: 'terra-prime',
      entity_type: 'world',
      field_key: 'mayChange',
      proposed_value: 'Surface weather patterns may change.',
      source_id: 'worldseed:terra-prime',
      confidence: 0.82,
    },
    proposer: 'worldseed-foundry',
    observedAt: '2026-08-21T19:56:00.000Z',
  });

  assert.equal(result.proposal.status, 'pending');
  assert.equal(result.proposal.authority.may_promote_to_canon, false);
  assert.equal(result.receipt.canon_mutated, false);
  assert.equal(result.receipt.authority, 'proposal-only');
  assert.deepEqual(state.scripts, beforeCanon);
});

test('unpromoted Canon Intelligence proposals cannot seed Worldseed', () => {
  const evidence = normaliseCanonEvidence({ source_id: 'x', world_id: 'terra-prime', value: 'x' });
  const pending = createCanonIntelligenceProposal({
    worldId: 'terra-prime', entity: 'terra-prime', field: 'mustSurvive', proposedValue: 'x', evidence: [evidence], proposer: 'atlas',
  });

  assert.throws(() => rootPromotedCanonProposalInWorldseed(baseState(), {
    reviewedProposal: pending,
    promotionReceipt: null,
    steward: 'rowan',
  }), /accepted proposal/i);
});
