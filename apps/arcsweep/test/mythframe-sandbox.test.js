import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyseMythframeCollision,
  createMythframePacket,
  createSharedMythframeProposal,
  evaluateMythframeSandboxAction,
  SYNTHETIC_GLASSHOUSE_EXAMPLE,
} from '../src/mythframe-sandbox.js';

function packets() {
  return [
    createMythframePacket(SYNTHETIC_GLASSHOUSE_EXAMPLE.left),
    createMythframePacket(SYNTHETIC_GLASSHOUSE_EXAMPLE.right),
  ];
}

test('same term never becomes equivalence by spelling alone', () => {
  const [left, right] = packets();
  const analysis = analyseMythframeCollision(left, right);
  assert.equal(analysis.lexicalCollisions.length, 1);
  assert.equal(analysis.lexicalCollisions[0].semanticEquivalence, false);
  assert.equal(analysis.invariants.intersectionIsNotIdentity, true);
});

test('explicitly shareable bridge assertions become proposals, not adoption', () => {
  const [left, right] = packets();
  const analysis = analyseMythframeCollision(left, right);
  assert.equal(analysis.sharedBoundaryCandidates.length, 1);
  assert.equal(analysis.sharedBoundaryCandidates[0].adopted, false);
  const proposal = createSharedMythframeProposal({ left, right, analysis, proposalId: 'p1' });
  assert.equal(proposal.status, 'proposal-only');
  assert.equal(proposal.canonMutationAllowed, false);
  assert.equal(proposal.maySelfPromote, false);
  assert.deepEqual(proposal.adopts, []);
  assert.equal(proposal.requiresIndependentSourceAdoption, true);
});

test('sigil geometry can rhyme without gaining semantic authority', () => {
  const [left, right] = packets();
  const analysis = analyseMythframeCollision(left, right);
  assert.equal(analysis.sigilRhymes.length, 1);
  assert.equal(analysis.sigilRhymes[0].semanticEquivalence, false);
  assert.equal(analysis.sigilRhymes[0].status, 'visual-rhyme-only');
});

test('Glasshouse fails closed for canon and mutation actions', () => {
  for (const action of ['canonize', 'mutate_identity', 'merge_architecture', 'promote_to_fact', 'write_canon']) {
    assert.equal(evaluateMythframeSandboxAction(action).allowed, false);
  }
  for (const action of ['inspect', 'compare', 'simulate', 'propose_shared_boundary', 'export_receipt']) {
    assert.equal(evaluateMythframeSandboxAction(action).allowed, true);
  }
});
