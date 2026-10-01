import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCanonIntelligenceProposal,
  createCanonPromotionReceipt,
  normaliseCanonEvidence,
  reviewCanonProposal,
} from '../src/canon-intelligence-core.js';

function foreignProposal() {
  const evidence = normaliseCanonEvidence({
    source_id: 'lb_foreign_001',
    source_constellation: 'nocturne-twilight',
    source_namespace: 'nocturne-twilight::Example',
    field_hint: 'description',
    value: 'A useful foreign idea',
  });
  return createCanonIntelligenceProposal({
    worldId: 'world-1',
    entity: { id: 'entity-1' },
    field: { key: 'description' },
    proposedValue: 'A locally considered derivative',
    evidence: [evidence],
    proposer: 'canon-intelligence',
  });
}

test('foreign evidence remains evidence-only and is source-labelled', () => {
  const evidence = normaliseCanonEvidence({
    source_id: 'lb_foreign_001',
    source_constellation: 'nocturne-twilight',
    value: 'foreign context',
  });
  assert.equal(evidence.foreign_context, true);
  assert.equal(evidence.canon_status, 'foreign-evidence-only');
  assert.equal(evidence.source_constellation, 'nocturne-twilight');
});

test('foreign-influenced proposal cannot be accepted implicitly', () => {
  const proposal = foreignProposal();
  assert.equal(proposal.sovereignty.foreign_influence, true);
  assert.deepEqual(proposal.sovereignty.foreign_source_constellations, ['nocturne-twilight']);
  assert.throws(
    () => reviewCanonProposal(proposal, { action: 'accept', steward: 'rowan' }),
    /explicit Steward acceptance of foreign influence/i,
  );
});

test('Steward may explicitly accept foreign influence as a local decision', () => {
  const proposal = foreignProposal();
  const reviewed = reviewCanonProposal(proposal, {
    action: 'accept',
    steward: 'rowan',
    acceptForeignInfluence: true,
    note: 'Useful here; adopting locally without asserting subsystem equivalence.',
  });
  assert.equal(reviewed.status, 'accepted');
  assert.equal(reviewed.review.foreign_influence_accepted, true);
  const receipt = createCanonPromotionReceipt(reviewed, { steward: 'rowan' });
  assert.equal(receipt.sovereignty.foreign_influence, true);
});

test('foreign proposal may still be held or rejected without adoption flag', () => {
  const proposal = foreignProposal();
  assert.equal(reviewCanonProposal(proposal, { action: 'hold', steward: 'rowan' }).status, 'held');
  assert.equal(reviewCanonProposal(proposal, { action: 'reject', steward: 'rowan' }).status, 'rejected');
});
