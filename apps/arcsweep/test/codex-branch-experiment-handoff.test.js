import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import { proposeCodexBranchExperiment } from '../src/codex/codex-branch-experiment-proposal.js';
import {
  createBranchExperimentPermission,
  materialiseBranchExperimentProposal,
  recordBranchExperimentHandoff,
  validateBranchExperimentPermission,
} from '../src/codex/codex-branch-experiment-handoff.js';

const T0 = '2026-09-28T10:50:00.000-04:00';
const T1 = '2026-09-28T10:51:00.000-04:00';
const T2 = '2026-09-28T10:52:00.000-04:00';

function proposedWish() {
  let wish = createCodexWish({ wishId: 'wish:handoff', origin: 'rowan', desire: 'Test a possibility.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:one', label: 'One', possibility: 'One route.', createdAt: T1 });
  return proposeCodexBranchExperiment(wish, {
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    title: 'Check continuity',
    hypothesis: 'The branch may preserve continuity.',
    method: 'Run a synthetic held-state comparison.',
    successSignals: ['continuity preserved'],
    createdAt: T1,
  });
}

function permission() {
  return createBranchExperimentPermission({
    permissionId: 'permission:one',
    wishId: 'wish:handoff',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    grantedBy: 'steward-ui',
    createdAt: T2,
    constraints: ['materialise only'],
    provenance: ['test://permission'],
  });
}

test('handoff permission is narrow and explicitly excludes execution and production effects', () => {
  const value = permission();
  assert.equal(value.scope, 'materialise-sandbox-proposal');
  assert.equal(value.allowsProposalMaterialisation, true);
  assert.equal(value.allowsExperimentExecution, false);
  assert.equal(value.allowsProductionEffects, false);
  assert.equal(value.allowsExternalWrites, false);
  assert.equal(value.allowsAuthorityExpansion, false);
  assert.equal(validateBranchExperimentPermission(value, {
    wishId: 'wish:handoff', branchId: 'branch:one', proposalId: 'proposal:one',
  }), true);
  assert.equal(validateBranchExperimentPermission(value, {
    wishId: 'wish:handoff', branchId: 'branch:other', proposalId: 'proposal:one',
  }), false);
});

test('materialisation requires matching permission and always proposes with autoStart false', () => {
  const calls = [];
  const runtime = {
    proposeExperiment(input) {
      calls.push(input);
      return {
        id: 'envelope:experiment-one',
        traceId: 'trace:experiment-one',
        createdAt: T2,
        body: { experimentId: 'experiment:one' },
      };
    },
  };
  const handoff = materialiseBranchExperimentProposal({
    wish: proposedWish(),
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    permission: permission(),
    runtime,
    aspectId: 'witness',
    collaborators: ['continuity'],
    createdAt: T2,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].autoStart, false);
  assert.equal(calls[0].operation.production, false);
  assert.equal(calls[0].operation.external, false);
  assert.equal(calls[0].operation.permissionExpansion, false);
  assert.equal(handoff.executionStarted, false);
  assert.equal(handoff.productionEffects, false);
  assert.equal(handoff.grantsAuthority, false);
  assert.equal(handoff.experimentId, 'experiment:one');
});

test('mismatched permission fails before any runtime proposal is published', () => {
  let called = false;
  const runtime = { proposeExperiment() { called = true; return {}; } };
  const wrong = createBranchExperimentPermission({
    permissionId: 'permission:wrong',
    wishId: 'wish:handoff',
    branchId: 'branch:one',
    proposalId: 'proposal:other',
    grantedBy: 'steward-ui',
    createdAt: T2,
  });
  assert.throws(() => materialiseBranchExperimentProposal({
    wish: proposedWish(),
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    permission: wrong,
    runtime,
    aspectId: 'witness',
  }), /matching materialise-sandbox-proposal permission/i);
  assert.equal(called, false);
});

test('recorded handoff preserves proposal lineage and adds the experiment envelope receipt', () => {
  const wish = proposedWish();
  const handoff = Object.freeze({
    schema: 'hearthweave.codex-branch-experiment-handoff/v0.1',
    wishId: 'wish:handoff',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    permissionId: 'permission:one',
    grantedBy: 'steward-ui',
    aspectId: 'witness',
    collaborators: Object.freeze(['continuity']),
    experimentId: 'experiment:one',
    envelopeId: 'envelope:one',
    traceId: 'trace:one',
    createdAt: T2,
    executionStarted: false,
    productionEffects: false,
    grantsAuthority: false,
    provenance: Object.freeze(['permission:permission:one', 'envelope:envelope:one']),
  });
  const next = recordBranchExperimentHandoff(wish, handoff);
  const proposal = next.possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.status, 'materialised');
  assert.equal(proposal.handoffs.length, 1);
  assert.equal(proposal.handoffs[0].executionStarted, false);
  assert.ok(next.receipts.includes('experiment-envelope:envelope:one'));
  assert.equal(wish.possibilityBranches[0].experimentProposals[0].status, 'proposed');
});

test('Wish Grove handoff UI requires explicit authorisation and has no execution button', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/wish-grove-ai-university-handoff-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-ai-university-handoff-sidecar\.js/);
  assert.match(source, /Authorise sandbox handoff/);
  assert.match(source, /required> I authorise materialising this proposal/);
  assert.match(source, /autoStart: false/);
  assert.match(source, /Execution remains unstarted and separately governed/);
  assert.doesNotMatch(source, />Run experiment</i);
  assert.doesNotMatch(source, />Execute experiment</i);
});
