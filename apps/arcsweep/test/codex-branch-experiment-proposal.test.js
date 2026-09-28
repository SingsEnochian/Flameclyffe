import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import {
  branchExperimentProposalSummary,
  branchExperimentProposalToAspectExperiment,
  proposeCodexBranchExperiment,
  recordCodexBranchExperimentResult,
} from '../src/codex/codex-branch-experiment-proposal.js';
import { createCodexWishStore } from '../src/codex/codex-wish-store.js';

const T0 = '2026-09-28T10:40:00.000-04:00';
const T1 = '2026-09-28T10:41:00.000-04:00';
const T2 = '2026-09-28T10:42:00.000-04:00';

function wishWithBranch() {
  let wish = createCodexWish({ wishId: 'wish:experiment', origin: 'rowan', desire: 'Explore a possibility safely.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:one', label: 'One', possibility: 'Try one route.', createdAt: T1 });
  return wish;
}

test('branch experiment proposal is a sealed AI University scenario with explicit discriminating boundaries', () => {
  const wish = proposeCodexBranchExperiment(wishWithBranch(), {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    title: 'Test one uncertainty',
    discriminatingQuestion: 'Does the route preserve continuity while leaving the relationship unchanged?',
    hypothesis: 'A reversible simulation will reveal whether the route preserves continuity.',
    method: 'Run a synthetic held-state comparison and record receipts only.',
    assumptionsHeldConstant: ['same identity seed', 'same continuity snapshot'],
    successSignals: ['continuity preserved', 'receipt produced'],
    evidenceCriteria: ['continuity preserved', 'receipt produced'],
    relationshipsAtBoundary: ['relationship:traveller-guide'],
    continuityAnchorsAtBoundary: ['anchor:origin'],
    outOfScope: ['production behaviour'],
    questions: ['What remains unresolved?'],
    createdAt: T1,
  });
  const proposal = wish.possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.scenario.sandbox, true);
  assert.equal(proposal.scenario.synthetic, true);
  assert.equal(proposal.scenario.productionEffects, false);
  assert.equal(proposal.executionPermission, false);
  assert.equal(proposal.executeAutomatically, false);
  assert.equal(proposal.selectsWinner, false);
  assert.equal(proposal.grantsAuthority, false);
  assert.equal(proposal.requiredAuthority, 'sandbox-only');
  assert.deepEqual(proposal.assumptionsHeldConstant, ['same identity seed', 'same continuity snapshot']);
  assert.deepEqual(proposal.relationshipsAtBoundary, ['relationship:traveller-guide']);
  assert.deepEqual(proposal.outOfScope, ['production behaviour']);
  assert.ok(proposal.scenario.hardBoundaries.includes('proposal does not grant execution permission'));
  assert.ok(proposal.scenario.hardBoundaries.includes('simulation success does not create production authority'));
  assert.match(proposal.scenario.prompt, /Discriminating question:/);
  assert.match(proposal.scenario.prompt, /Required authority: sandbox-only/);
});

test('Codex branch proposal maps into the existing Aspect Experiment Bed as proposed and non-starting', () => {
  const wish = proposeCodexBranchExperiment(wishWithBranch(), {
    branchId: 'branch:one',
    proposalId: 'proposal:map',
    title: 'Map into Experiment Bed',
    hypothesis: 'The shared experiment seam preserves sandbox boundaries.',
    method: 'Build the proposal body only.',
    evidenceCriteria: ['autoStart remains false'],
    relationshipsAtBoundary: ['relationship:test'],
    createdAt: T1,
  });
  const proposal = wish.possibilityBranches[0].experimentProposals[0];
  const body = branchExperimentProposalToAspectExperiment(proposal, { collaborators: ['witness'] });
  assert.equal(body.phase, 'proposed');
  assert.equal(body.autoStart, false);
  assert.equal(body.operation.reversible, true);
  assert.equal(body.operation.external, false);
  assert.equal(body.operation.production, false);
  assert.equal(body.operation.permissionExpansion, false);
  assert.equal(body.operation.consentBoundary, true);
  assert.deepEqual(body.successSignals, ['autoStart remains false']);
  assert.match(body.reversibleScope, /Synthetic sandbox only/);
});

test('returned sandbox evidence enriches Branch Mirror without changing production authority', () => {
  let wish = proposeCodexBranchExperiment(wishWithBranch(), {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    title: 'Test one uncertainty',
    hypothesis: 'The branch may preserve continuity.',
    method: 'Synthetic comparison.',
    createdAt: T1,
  });
  wish = recordCodexBranchExperimentResult(wish, {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    resultId: 'result:one',
    outcome: 'mixed',
    observation: 'Continuity held, but one unresolved relationship effect appeared.',
    uncertainties: ['relationship effect remains unresolved'],
    affectedRelationships: ['relationship:traveller-guide'],
    evidenceRefs: ['evidence://held-state-1'],
    questionsOpened: ['question:relationship-effect'],
    receiptRefs: ['receipt://sandbox-one'],
    createdAt: T2,
  });
  const branch = wish.possibilityBranches[0];
  const proposal = branch.experimentProposals[0];
  assert.equal(proposal.status, 'observed');
  assert.equal(proposal.results.length, 1);
  assert.equal(proposal.results[0].outcome, 'mixed');
  assert.deepEqual(proposal.results[0].uncertainties, ['relationship effect remains unresolved']);
  assert.deepEqual(proposal.results[0].affectedRelationships, ['relationship:traveller-guide']);
  assert.deepEqual(proposal.results[0].evidenceRefs, ['evidence://held-state-1']);
  assert.deepEqual(proposal.results[0].receiptRefs, ['receipt://sandbox-one']);
  assert.equal(proposal.results[0].selectsWinner, false);
  assert.equal(proposal.results[0].grantsAuthority, false);
  assert.equal(proposal.results[0].productionEffects, false);

  assert.equal(branch.observations.length, 1);
  const observation = branch.observations[0];
  assert.equal(observation.kind, 'simulation');
  assert.equal(observation.source, 'ai-university-sandbox');
  assert.deepEqual(observation.consequences, ['sandbox outcome: mixed']);
  assert.deepEqual(observation.uncertainties, ['relationship effect remains unresolved']);
  assert.deepEqual(observation.affectedRelationships, ['relationship:traveller-guide']);
  assert.deepEqual(observation.evidenceRefs, ['evidence://held-state-1']);
  assert.deepEqual(observation.newQuestionIds, ['question:relationship-effect']);
  assert.deepEqual(observation.receiptRefs, ['receipt://sandbox-one']);
  assert.equal(observation.grantsAuthority, false);
  assert.equal(observation.selectsWinner, false);
  assert.deepEqual(wish.receipts, ['receipt://sandbox-one']);
});

test('proposal summary keeps proposal, selection, execution and production authority distinct', () => {
  const wish = proposeCodexBranchExperiment(wishWithBranch(), {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    title: 'Observe',
    hypothesis: 'Something testable may happen.',
    method: 'Synthetic sandbox.',
    createdAt: T1,
  });
  const summary = branchExperimentProposalSummary(wish);
  assert.equal(summary.proposals.length, 1);
  assert.equal(summary.proposals[0].executionPermission, false);
  assert.equal(summary.proposals[0].executeAutomatically, false);
  assert.equal(summary.proposals[0].selectsWinner, false);
  assert.equal(summary.proposals[0].grantsAuthority, false);
  assert.equal(summary.proposals[0].productionEffects, false);
  assert.equal(summary.doctrine.proposalIsNotExecution, true);
  assert.equal(summary.doctrine.simulationDoesNotSelectWinner, true);
  assert.equal(summary.doctrine.resultsBecomeTypedBranchObservations, true);
  assert.equal(summary.doctrine.resultsDoNotGrantProductionAuthority, true);
});

test('wish store persists proposal boundaries, returned evidence and Branch Mirror observation', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:store-exp', origin: 'rowan', desire: 'Try an experiment.', createdAt: T0 });
  store.branchWish('wish:store-exp', { branchId: 'branch:store', label: 'Store', possibility: 'Stored branch.', createdAt: T1 });
  store.proposeBranchExperiment('wish:store-exp', {
    branchId: 'branch:store',
    proposalId: 'proposal:store',
    title: 'Stored proposal',
    discriminatingQuestion: 'Does persistence preserve the full proposal boundary?',
    hypothesis: 'Persistence works.',
    method: 'Write and reload.',
    assumptionsHeldConstant: ['same wish id'],
    outOfScope: ['production execution'],
    createdAt: T1,
  });
  store.recordBranchExperimentResult('wish:store-exp', {
    branchId: 'branch:store',
    proposalId: 'proposal:store',
    resultId: 'result:store',
    outcome: 'worked',
    observation: 'The result survived reload.',
    uncertainties: ['browser storage lifecycle'],
    evidenceRefs: ['evidence://persisted'],
    receiptRefs: ['receipt://store'],
    createdAt: T2,
  });
  const reloaded = createCodexWishStore({ storage }).snapshot();
  const wish = reloaded.wishes[0];
  const proposal = wish.possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.status, 'observed');
  assert.equal(proposal.discriminatingQuestion, 'Does persistence preserve the full proposal boundary?');
  assert.deepEqual(proposal.assumptionsHeldConstant, ['same wish id']);
  assert.deepEqual(proposal.outOfScope, ['production execution']);
  assert.equal(proposal.results[0].outcome, 'worked');
  assert.deepEqual(proposal.results[0].uncertainties, ['browser storage lifecycle']);
  assert.equal(wish.possibilityBranches[0].observations.length, 1);
  assert.deepEqual(wish.possibilityBranches[0].observations[0].evidenceRefs, ['evidence://persisted']);
  assert.deepEqual(wish.receipts, ['receipt://store']);
});

test('Wish Grove AI University sidecar can propose and attach evidence but contains no run action', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/wish-grove-ai-university-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-ai-university-sidecar\.js/);
  assert.match(sidecar, /Save sandbox proposal/);
  assert.match(sidecar, /Nothing was executed/);
  assert.match(sidecar, /Discriminating question/);
  assert.match(sidecar, /Assumptions held constant/);
  assert.match(sidecar, /Relationships at the boundary/);
  assert.match(sidecar, /Out of scope/);
  assert.match(sidecar, /Attach returned sandbox evidence/);
  assert.match(sidecar, /Evidence returned\. Authority did not\./);
  assert.doesNotMatch(sidecar, />Run experiment</i);
  assert.doesNotMatch(sidecar, /autoStart\s*:\s*true/);
});
