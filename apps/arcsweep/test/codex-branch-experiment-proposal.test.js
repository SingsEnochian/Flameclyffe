import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import {
  branchExperimentProposalSummary,
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

test('branch experiment proposal is a sealed AI University scenario with no execution permission', () => {
  const wish = proposeCodexBranchExperiment(wishWithBranch(), {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    title: 'Test one uncertainty',
    hypothesis: 'A reversible simulation will reveal whether the route preserves continuity.',
    method: 'Run a synthetic held-state comparison and record receipts only.',
    successSignals: ['continuity preserved', 'receipt produced'],
    questions: ['What remains unresolved?'],
    createdAt: T1,
  });
  const proposal = wish.possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.scenario.sandbox, true);
  assert.equal(proposal.scenario.synthetic, true);
  assert.equal(proposal.scenario.productionEffects, false);
  assert.equal(proposal.executionPermission, false);
  assert.equal(proposal.grantsAuthority, false);
  assert.ok(proposal.scenario.hardBoundaries.includes('proposal does not grant execution permission'));
});

test('returned sandbox evidence attaches to the exact proposal without changing production authority', () => {
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
    questionsOpened: ['question:relationship-effect'],
    receiptRefs: ['receipt://sandbox-one'],
    createdAt: T2,
  });
  const proposal = wish.possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.status, 'observed');
  assert.equal(proposal.results.length, 1);
  assert.equal(proposal.results[0].outcome, 'mixed');
  assert.deepEqual(proposal.results[0].receiptRefs, ['receipt://sandbox-one']);
  assert.equal(proposal.results[0].grantsAuthority, false);
  assert.equal(proposal.results[0].productionEffects, false);
});

test('proposal summary keeps proposal, execution and production authority distinct', () => {
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
  assert.equal(summary.proposals[0].productionEffects, false);
  assert.equal(summary.doctrine.proposalIsNotExecution, true);
  assert.equal(summary.doctrine.resultsDoNotGrantProductionAuthority, true);
});

test('wish store persists proposal and observed result', () => {
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
    hypothesis: 'Persistence works.',
    method: 'Write and reload.',
    createdAt: T1,
  });
  store.recordBranchExperimentResult('wish:store-exp', {
    branchId: 'branch:store',
    proposalId: 'proposal:store',
    resultId: 'result:store',
    outcome: 'worked',
    observation: 'The result survived reload.',
    receiptRefs: ['receipt://store'],
    createdAt: T2,
  });
  const reloaded = createCodexWishStore({ storage }).snapshot();
  const proposal = reloaded.wishes[0].possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.status, 'observed');
  assert.equal(proposal.results[0].outcome, 'worked');
});

test('Wish Grove AI University sidecar can propose and attach evidence but contains no run action', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/wish-grove-ai-university-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-ai-university-sidecar\.js/);
  assert.match(sidecar, /Save sandbox proposal/);
  assert.match(sidecar, /Nothing was executed/);
  assert.match(sidecar, /Attach returned sandbox evidence/);
  assert.doesNotMatch(sidecar, />Run experiment</i);
  assert.doesNotMatch(sidecar, /autoStart\s*:\s*true/);
});
