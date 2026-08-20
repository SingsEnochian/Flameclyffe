import assert from 'node:assert/strict';
import test from 'node:test';
import { readWorldseedThreshold, receiptWorldseedThreshold } from '../src/worldseed-threshold.js';

function stateWithCycle({ foldActive = true, foldIndex = 0.91 } = {}) {
  return {
    worlds: [{ id: 'earth', name: 'Earth', kind: 'Birth World' }],
    records: {
      seedhouse: [
        { id: 'threshold-rule', worldId: 'earth', title: 'Age-turning gate', seedType: 'Threshold Rule', status: 'Rooted', mustSurvive: 'Memory and relationship.' },
        { id: 'genome', worldId: 'earth', title: 'Genome', seedType: 'Continuity Genome', status: 'Rooted', valuesCore: 'Memory, craft, relationship.' },
      ],
    },
    feedbackCycles: [{
      cycle_id: 'cycle-9',
      world: { id: 'earth', name: 'Earth' },
      premaqc_before: { sequence: 8 },
      premaqc_after: { sequence: 9 },
      math_spine_packet: {
        packet_id: 'math-9',
        projection: { fold: { active: foldActive }, jacobian: { fold_index: foldIndex } },
      },
      replay_receipt: { matched: true },
    }],
  };
}

test('active fold becomes a branch candidate with a prepared draft, not a created world', () => {
  const state = stateWithCycle();
  const before = structuredClone(state.worlds);
  const proposal = receiptWorldseedThreshold(state, 'earth', '2030-01-01T00:00:00.000Z');
  assert.equal(proposal.status, 'branch-candidate');
  assert.equal(proposal.branchCandidate, true);
  assert.equal(proposal.detector.foldActive, true);
  assert.equal(proposal.detector.foldIndex, 0.91);
  assert.equal(proposal.branchDraft.mode, 'experimental');
  assert.match(proposal.branchDraft.branchPoint, /PREMAQC 8→9/);
  assert.equal(proposal.authority.automaticBranching, false);
  assert.equal(state.worldseedThresholdProposals.length, 1);
  assert.deepEqual(state.worlds, before);
});

test('clear fold records a threshold-clear reading without a branch draft', () => {
  const proposal = readWorldseedThreshold(stateWithCycle({ foldActive: false, foldIndex: 0.12 }), 'earth');
  assert.equal(proposal.status, 'threshold-clear');
  assert.equal(proposal.branchCandidate, false);
  assert.equal(proposal.branchDraft, null);
});

test('missing cycle remains an awaiting-observation proposal', () => {
  const state = stateWithCycle();
  state.feedbackCycles = [];
  const proposal = readWorldseedThreshold(state, 'earth');
  assert.equal(proposal.status, 'awaiting-observation');
  assert.equal(proposal.detector.cycleId, null);
  assert.equal(proposal.thresholdRules.length, 1);
});
