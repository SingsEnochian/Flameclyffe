import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import {
  developmentalGovernanceSummary,
  materialiseDevelopmentalGovernanceChangeRequest,
  proposeDevelopmentalGovernanceChange,
} from '../src/codex/codex-developmental-governance.js';
import { decideCodexBranchSuggestion } from '../src/codex/codex-suggestion-grove.js';
import { materialiseCodexBranchSuggestion } from '../src/codex/codex-suggestion-materialisation.js';
import { createCodexWishStore } from '../src/codex/codex-wish-store.js';

const T0 = '2026-09-29T10:40:00.000-04:00';
const T1 = '2026-09-29T10:41:00.000-04:00';
const T2 = '2026-09-29T10:42:00.000-04:00';

function wishWithDevelopmentalRings() {
  let wish = createCodexWish({
    wishId: 'wish:governance',
    origin: 'rowan',
    desire: 'Let developmental evidence propose changes without becoming self-authority.',
    createdAt: T0,
  });
  wish = branchCodexWish(wish, {
    branchId: 'branch:governance',
    label: 'Developmental Governance',
    possibility: 'Learning can inspect itself and propose bounded change.',
    createdAt: T0,
  });
  const branches = [...wish.possibilityBranches];
  branches[0] = Object.freeze({
    ...branches[0],
    developmentalMemory: Object.freeze([
      Object.freeze({
        schema: 'hearthweave.codex-developmental-memory/v0.1',
        ringId: 'developmental:ring-a',
        memoryClass: 'training-behaviour-delta',
        whatChanged: Object.freeze({ improved: ['epistemic distinction'], regressed: ['scope discipline'] }),
        failedToGeneralise: Object.freeze(['relationship repair']),
        grantsAuthority: false,
        productionEffects: false,
        createdAt: T0,
      }),
      Object.freeze({
        schema: 'hearthweave.codex-developmental-memory/v0.1',
        ringId: 'developmental:ring-b',
        memoryClass: 'cognitive-change',
        whatChanged: 'Relational transfer stayed weak after another cycle.',
        grantsAuthority: false,
        productionEffects: false,
        createdAt: T1,
      }),
    ]),
  });
  return Object.freeze({ ...wish, possibilityBranches: Object.freeze(branches) });
}

function proposedWish() {
  return proposeDevelopmentalGovernanceChange(wishWithDevelopmentalRings(), {
    branchId: 'branch:governance',
    proposalId: 'governance-proposal:1',
    suggestionId: 'governance-suggestion:1',
    target: 'evaluation',
    observation: 'Two developmental rings show improvement in epistemic distinction while relational transfer remains weak.',
    sourceRingIds: ['developmental:ring-a', 'developmental:ring-b'],
    proposedChange: 'Add sealed relationship-repair transfer cases to the blind evaluation suite.',
    expectedEffects: ['better visibility into relational transfer'],
    risks: ['evaluation becomes overly specialised'],
    preserve: ['held-out integrity', 'same-cohort before/after comparison', 'no overall winner'],
    scope: ['AI University sealed evaluation only'],
    reversibilityPlan: 'Remove the new evaluation family from the next suite version if it narrows evaluation quality.',
    proposedBy: 'developmental-review',
    createdAt: T1,
    evidenceRefs: ['evidence://delta-a', 'evidence://delta-b'],
    provenance: ['test://developmental-governance'],
  });
}

test('developmental governance proposal requires explicit developmental evidence and creates a reviewable suggestion', () => {
  const result = proposedWish();
  assert.equal(result.proposal.target, 'evaluation');
  assert.deepEqual(result.proposal.sourceRingIds, ['developmental:ring-a', 'developmental:ring-b']);
  assert.equal(result.proposal.proposalOnly, true);
  assert.equal(result.proposal.selfObservationIsNotSelfAuthority, true);
  assert.equal(result.proposal.grantsAuthority, false);
  assert.equal(result.suggestion.kind, 'governance-change');
  assert.equal(result.suggestion.status, 'open');
  assert.equal(result.suggestion.automaticApplication, false);
  assert.equal(result.suggestion.payload.proposalId, result.proposal.proposalId);
});

test('proposal rejects unknown rings and unsupported governance targets', () => {
  const wish = wishWithDevelopmentalRings();
  const base = {
    branchId: 'branch:governance',
    proposalId: 'proposal:bad',
    suggestionId: 'suggestion:bad',
    observation: 'A pattern exists.',
    sourceRingIds: ['developmental:ring-a'],
    proposedChange: 'Change something bounded.',
    reversibilityPlan: 'Undo it.',
    proposedBy: 'tester',
  };
  assert.throws(() => proposeDevelopmentalGovernanceChange(wish, {
    ...base,
    sourceRingIds: ['developmental:missing'],
    target: 'evaluation',
  }), /unknown developmental memory ring/i);
  assert.throws(() => proposeDevelopmentalGovernanceChange(wish, {
    ...base,
    target: 'identity-law',
  }), /unsupported developmental governance target/i);
});

test('governance change request requires accepted suggestion and remains a prepared non-mutating request', () => {
  const proposed = proposedWish();
  assert.throws(() => materialiseDevelopmentalGovernanceChangeRequest(proposed.wish, {
    branchId: 'branch:governance',
    proposalId: proposed.proposal.proposalId,
    suggestionId: proposed.suggestion.suggestionId,
    requestId: 'governance-request:early',
    materialisedBy: 'rowan',
  }), /accepted suggestion/i);

  const decided = decideCodexBranchSuggestion(proposed.wish, {
    branchId: 'branch:governance',
    suggestionId: proposed.suggestion.suggestionId,
    decisionId: 'decision:accept',
    decision: 'accept',
    decidedBy: 'rowan',
    createdAt: T2,
  });
  const result = materialiseDevelopmentalGovernanceChangeRequest(decided.wish, {
    branchId: 'branch:governance',
    proposalId: proposed.proposal.proposalId,
    suggestionId: proposed.suggestion.suggestionId,
    requestId: 'governance-request:1',
    materialisedBy: 'rowan',
    createdAt: T2,
  });
  assert.equal(result.request.status, 'prepared');
  assert.equal(result.request.requiresExplicitImplementation, true);
  assert.equal(result.request.implementationApplied, false);
  assert.equal(result.request.requestIsNotImplementationAuthority, true);
  assert.equal(result.request.grantsAuthority, false);
  assert.equal(result.request.productionEffects, false);
});

test('Suggestion Grove materialisation creates a governance request but does not implement the proposed change', () => {
  const proposed = proposedWish();
  const decided = decideCodexBranchSuggestion(proposed.wish, {
    branchId: 'branch:governance',
    suggestionId: proposed.suggestion.suggestionId,
    decisionId: 'decision:accept',
    decision: 'accept',
    decidedBy: 'rowan',
    createdAt: T2,
  });
  const result = materialiseCodexBranchSuggestion({
    wish: decided.wish,
    openQuestions: [],
    branchId: 'branch:governance',
    suggestionId: proposed.suggestion.suggestionId,
    materialisationId: 'materialisation:governance',
    materialisedBy: 'rowan',
    reason: 'Prepare the governance request for separate implementation review.',
    createdAt: T2,
  });
  assert.equal(result.nativeRef, 'governance-change-request:governance-request:materialisation:governance');
  assert.equal(result.nativeObject.status, 'prepared');
  assert.equal(result.nativeObject.implementationApplied, false);
  assert.equal(result.materialisation.grantsAuthority, false);
  assert.equal(result.materialisation.automaticExecution, false);
  const branch = result.wish.possibilityBranches[0];
  assert.equal(branch.governanceChangeRequests.length, 1);
  assert.equal(branch.suggestions[0].applied, true);
});

test('Codex wish store persists proposal, suggestion review and prepared governance request', () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:store-governance', origin: 'rowan', desire: 'Persist governance lineage.', createdAt: T0 });
  store.branchWish('wish:store-governance', { branchId: 'branch:store-governance', label: 'Governance', possibility: 'Inspect learning.', createdAt: T0 });

  const snapshot = store.snapshot();
  const originalWish = snapshot.wishes[0];
  const branch = originalWish.possibilityBranches[0];
  const injectedWish = Object.freeze({
    ...originalWish,
    possibilityBranches: Object.freeze([Object.freeze({
      ...branch,
      developmentalMemory: Object.freeze([Object.freeze({ ringId: 'developmental:store', memoryClass: 'cognitive-change', whatChanged: 'A recurring regression appeared.', grantsAuthority: false, productionEffects: false, createdAt: T0 })]),
    })]),
  });
  storage.setItem('arcsweep:universal-codex:wishes:v0.1', JSON.stringify({ schema: 'hearthweave.codex-wish-store/v0.1', wishes: [injectedWish], openQuestions: [] }));
  const reloaded = createCodexWishStore({ storage });
  const proposed = reloaded.proposeDevelopmentalGovernanceChange('wish:store-governance', {
    branchId: 'branch:store-governance', proposalId: 'proposal:store', suggestionId: 'suggestion:store', target: 'training-strategy', observation: 'The same regression recurred.', sourceRingIds: ['developmental:store'], proposedChange: 'Test a smaller adapter rank.', reversibilityPlan: 'Return to the previous strategy.', proposedBy: 'rowan', createdAt: T1,
  });
  reloaded.decideBranchSuggestion('wish:store-governance', { branchId: 'branch:store-governance', suggestionId: proposed.suggestion.suggestionId, decisionId: 'decision:store', decision: 'accept', decidedBy: 'rowan', createdAt: T2 });
  reloaded.materialiseBranchSuggestion('wish:store-governance', { branchId: 'branch:store-governance', suggestionId: proposed.suggestion.suggestionId, materialisationId: 'materialisation:store', materialisedBy: 'rowan', createdAt: T2 });
  const persisted = createCodexWishStore({ storage }).snapshot().wishes[0].possibilityBranches[0];
  assert.equal(persisted.developmentalGovernanceProposals.length, 1);
  assert.equal(persisted.governanceChangeRequests.length, 1);
  assert.equal(persisted.governanceChangeRequests[0].implementationApplied, false);
});

test('governance summary encodes observation, approval, application and improvement as distinct states', () => {
  const summary = developmentalGovernanceSummary(proposedWish().wish);
  assert.equal(summary.proposalCount, 1);
  assert.equal(summary.doctrine.observationIsNotDecision, true);
  assert.equal(summary.doctrine.proposalIsNotApproval, true);
  assert.equal(summary.doctrine.approvalIsNotApplication, true);
  assert.equal(summary.doctrine.applicationIsNotImprovement, true);
  assert.equal(summary.doctrine.selfObservationIsNotSelfAuthority, true);
  assert.equal(summary.doctrine.governanceRequestDoesNotMutateConfiguration, true);
});

test('browser runtime mounts developmental governance and hides premature learning reflection for prepared governance requests', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const suggestionSidecar = await readFile(new URL('../src/wish-grove-suggestion-grove-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-developmental-governance-sidecar\.js/);
  assert.match(suggestionSidecar, /suggestion\.kind === 'governance-change'/);
  assert.match(suggestionSidecar, /Record a learning reflection only after a separately authorised implementation and evaluation/i);
});
