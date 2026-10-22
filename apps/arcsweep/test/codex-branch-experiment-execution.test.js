import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import { proposeCodexBranchExperiment } from '../src/codex/codex-branch-experiment-proposal.js';
import { recordBranchExperimentHandoff } from '../src/codex/codex-branch-experiment-handoff.js';
import {
  createBranchExecutionPermission,
  ingestBranchExperimentReturn,
  runBranchSandboxExperiment,
  validateBranchExecutionPermission,
} from '../src/codex/codex-branch-experiment-execution.js';
import { createCodexBranchReturnStore } from '../src/codex/codex-branch-experiment-return-store.js';

const T0 = '2026-09-28T11:00:00.000-04:00';
const T1 = '2026-09-28T11:01:00.000-04:00';
const T2 = '2026-09-28T11:02:00.000-04:00';
const T3 = '2026-09-28T11:03:00.000-04:00';

function materialisedWish() {
  let wish = createCodexWish({ wishId: 'wish:execute', origin: 'rowan', desire: 'Learn from a sealed sandbox.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:one', label: 'One', possibility: 'A testable branch.', createdAt: T1 });
  wish = proposeCodexBranchExperiment(wish, {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    title: 'Observe continuity',
    hypothesis: 'Continuity remains intact.',
    method: 'Synthetic reversible comparison.',
    createdAt: T1,
  });
  return recordBranchExperimentHandoff(wish, Object.freeze({
    schema: 'hearthweave.codex-branch-experiment-handoff/v0.1',
    wishId: 'wish:execute',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    permissionId: 'handoff-permission:one',
    grantedBy: 'steward-ui',
    aspectId: 'witness',
    collaborators: Object.freeze([]),
    experimentId: 'experiment:one',
    envelopeId: 'envelope:proposal-one',
    traceId: 'trace:one',
    createdAt: T2,
    executionStarted: false,
    productionEffects: false,
    grantsAuthority: false,
    provenance: Object.freeze(['test://handoff']),
  }));
}

function executionPermission() {
  return createBranchExecutionPermission({
    permissionId: 'execution-permission:one',
    wishId: 'wish:execute',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:one',
    handoffEnvelopeId: 'envelope:proposal-one',
    grantedBy: 'steward-ui',
    rounds: 1,
    createdAt: T3,
    provenance: ['test://execution-permission'],
  });
}

test('execution permission is exact, bounded, and excludes production promotion', () => {
  const permission = executionPermission();
  assert.equal(permission.scope, 'run-sealed-sandbox-experiment');
  assert.equal(permission.allowsSandboxExecution, true);
  assert.equal(permission.allowsProductionEffects, false);
  assert.equal(permission.allowsExternalWrites, false);
  assert.equal(permission.allowsAuthorityExpansion, false);
  assert.equal(permission.allowsAutomaticPromotion, false);
  assert.equal(permission.rounds, 1);
  assert.equal(validateBranchExecutionPermission(permission, {
    wishId: 'wish:execute',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:one',
    handoffEnvelopeId: 'envelope:proposal-one',
  }), true);
  assert.equal(validateBranchExecutionPermission(permission, {
    wishId: 'wish:execute',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:other',
    handoffEnvelopeId: 'envelope:proposal-one',
  }), false);
});

test('authorised run returns a typed evidence object without ingesting it into Codex', async () => {
  const calls = [];
  const runtime = {
    async runExperiment(input) {
      calls.push(input);
      return {
        status: 'completed',
        experimentId: 'experiment:one',
        experiment: {
          experimentId: 'experiment:one',
          outcome: 'observed',
          observation: 'Continuity held in the synthetic comparison.',
        },
        outcomeEnvelope: {
          id: 'envelope:outcome-one',
          evidenceRefs: ['evidence://comparison'],
          body: { observation: 'Continuity held in the synthetic comparison.' },
        },
      };
    },
  };
  const returned = await runBranchSandboxExperiment({
    wish: materialisedWish(),
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:one',
    permission: executionPermission(),
    runtime,
    createdAt: T3,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].autoReflect, false);
  assert.equal(calls[0].rounds, 1);
  assert.equal(returned.status, 'completed');
  assert.equal(returned.outcome, 'observed');
  assert.equal(returned.suggestedBranchStatus, 'simulated');
  assert.equal(returned.suggestionOnly, true);
  assert.equal(returned.ingestedIntoCodex, false);
  assert.equal(returned.grantsAuthority, false);
  assert.equal(returned.productionEffects, false);
  assert.equal(returned.automaticPromotion, false);
  assert.deepEqual(returned.evidenceRefs, ['evidence://comparison']);
});

test('Codex ingestion records evidence but does not apply the suggested branch transition', async () => {
  const runtime = {
    async runExperiment() {
      return {
        status: 'completed',
        experiment: { outcome: 'worked', observation: 'The sandbox produced useful evidence.' },
        outcomeEnvelope: { id: 'envelope:outcome-two', evidenceRefs: ['evidence://two'] },
      };
    },
  };
  const source = materialisedWish();
  const returned = await runBranchSandboxExperiment({
    wish: source,
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:one',
    permission: executionPermission(),
    runtime,
    createdAt: T3,
  });
  const ingestion = ingestBranchExperimentReturn(source, returned, { resultId: 'result:ingested', createdAt: T3 });
  const branch = ingestion.wish.possibilityBranches[0];
  assert.equal(branch.status, 'open');
  assert.equal(ingestion.suggestedBranchStatus, 'simulated');
  assert.equal(ingestion.transitionApplied, false);
  assert.equal(ingestion.questionsAutomaticallyCreated, false);
  assert.equal(ingestion.authorityGranted, false);
  assert.equal(branch.experimentProposals[0].results.length, 1);
  assert.ok(branch.observations.some((row) => row.kind === 'simulation'));
});

test('return inbox persists un-ingested evidence and marks ingestion separately', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
  const returns = createCodexBranchReturnStore({ storage });
  const row = {
    schema: 'hearthweave.codex-branch-experiment-return/v0.1',
    returnId: 'return:one',
    wishId: 'wish:execute',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:one',
    status: 'completed',
    observation: 'Evidence returned.',
  };
  returns.append(row);
  assert.equal(returns.pending().length, 1);
  const reloaded = createCodexBranchReturnStore({ storage });
  assert.equal(reloaded.pending().length, 1);
  reloaded.markIngested('return:one', { ingestedAt: T3, codexResultId: 'result:one' });
  assert.equal(reloaded.pending().length, 0);
  assert.equal(reloaded.snapshot().returns[0].codexResultId, 'result:one');
});

test('Wish Grove execution gate separates run permission from Codex ingestion', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/wish-grove-ai-university-execution-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-ai-university-execution-sidecar\.js/);
  assert.match(source, /Authorise one sandbox run/);
  assert.match(source, /Run authorised sandbox experiment/);
  assert.match(source, /Evidence is waiting for separate Codex ingestion/);
  assert.match(source, /Ingest return into Codex/);
  assert.match(source, /Do not automatically change branch state or create canon/);
  assert.doesNotMatch(source, /automaticPromotion\s*:\s*true/);
});
