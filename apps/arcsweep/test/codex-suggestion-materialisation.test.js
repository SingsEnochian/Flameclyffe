import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { createCodexWish, branchCodexWish } from '../src/codex/codex-wish-lineage.js';
import { addCodexBranchSuggestion, decideCodexBranchSuggestion } from '../src/codex/codex-suggestion-grove.js';
import { materialiseCodexBranchSuggestion } from '../src/codex/codex-suggestion-materialisation.js';
import { recordCodexBranchLearningReflection } from '../src/codex/codex-learning-reflection.js';

const T0 = '2026-09-28T18:36:00.000-04:00';
const T1 = '2026-09-28T18:37:00.000-04:00';
const T2 = '2026-09-28T18:38:00.000-04:00';

function baseWish() {
  let wish = createCodexWish({ wishId: 'wish:materialise', origin: 'rowan', desire: 'Let reviewed suggestions become explicit native contracts.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:one', label: 'One', possibility: 'A branch with reviewable evidence.', createdAt: T0 });
  return wish;
}

function acceptedSuggestion(kind, payload, id = kind) {
  let wish = baseWish();
  wish = addCodexBranchSuggestion(wish, {
    branchId: 'branch:one',
    suggestionId: `suggestion:${id}`,
    kind,
    summary: `Consider ${kind}.`,
    rationale: 'Returned sandbox evidence proposed this explicitly.',
    payload,
    evidenceRefs: ['evidence://one'],
    receiptRefs: ['receipt://one'],
    provenance: ['test://suggestion'],
    createdAt: T0,
  }).wish;
  return decideCodexBranchSuggestion(wish, {
    branchId: 'branch:one',
    suggestionId: `suggestion:${id}`,
    decisionId: `decision:${id}`,
    decision: 'accept',
    reason: 'Worth materialising.',
    decidedBy: 'rowan',
    createdAt: T1,
    provenance: ['test://decision'],
  }).wish;
}

test('accepted open-question materialises through native question lineage and only once', () => {
  const wish = acceptedSuggestion('open-question', { question: 'What deserves another look?' });
  const result = materialiseCodexBranchSuggestion({
    wish,
    openQuestions: [],
    branchId: 'branch:one',
    suggestionId: 'suggestion:open-question',
    materialisationId: 'mat:q',
    materialisedBy: 'rowan',
    createdAt: T2,
    provenance: ['test://materialise'],
  });

  assert.equal(result.openQuestions.length, 1);
  assert.equal(result.openQuestions[0].question, 'What deserves another look?');
  assert.deepEqual(result.wish.openQuestionIds, ['question:mat:q']);
  assert.equal(result.suggestion.applied, true);
  assert.equal(result.suggestion.status, 'accepted');
  assert.equal(result.materialisation.grantsAuthority, false);
  assert.equal(result.materialisation.productionEffects, false);
  assert.equal(result.materialisation.automaticExecution, false);
  assert.throws(() => materialiseCodexBranchSuggestion({
    wish: result.wish,
    openQuestions: result.openQuestions,
    branchId: 'branch:one',
    suggestionId: 'suggestion:open-question',
    materialisationId: 'mat:q:again',
    materialisedBy: 'rowan',
  }), /already been materialised/);
});

test('branch-state suggestion uses native append-only lifecycle transition', () => {
  const wish = acceptedSuggestion('branch-state', { status: 'simulated' });
  const result = materialiseCodexBranchSuggestion({
    wish,
    branchId: 'branch:one',
    suggestionId: 'suggestion:branch-state',
    materialisationId: 'mat:state',
    materialisedBy: 'rowan',
    reason: 'The authorised sandbox returned completed evidence.',
    createdAt: T2,
  });
  const branch = result.wish.possibilityBranches[0];
  assert.equal(branch.status, 'simulated');
  assert.equal(branch.transitions.length, 1);
  assert.equal(branch.transitions[0].transitionId, 'transition:mat:state');
  assert.equal(result.nativeRef, 'branch-transition:transition:mat:state');
});

test('anchor suggestions reuse the wish anchor contract rather than inventing a new mutation path', () => {
  for (const [kind, payload, field, value] of [
    ['relationship-anchor', { relationship: 'Hearth Light ↔ Rowan collaboration' }, 'relationshipsTouched', 'Hearth Light ↔ Rowan collaboration'],
    ['continuity-anchor', { continuity: 'continuity://wonder-thread' }, 'continuityAnchors', 'continuity://wonder-thread'],
    ['memory-anchor', { memory: 'memory://sandbox-return' }, 'memoryRefs', 'memory://sandbox-return'],
  ]) {
    const wish = acceptedSuggestion(kind, payload, kind);
    const result = materialiseCodexBranchSuggestion({
      wish,
      branchId: 'branch:one',
      suggestionId: `suggestion:${kind}`,
      materialisationId: `mat:${kind}`,
      materialisedBy: 'rowan',
      createdAt: T2,
    });
    assert.ok(result.wish[field].includes(value));
    assert.equal(result.wish.anchorLinks.length, 1);
    assert.equal(result.suggestion.applied, true);
  }
});

test('next-experiment materialises only as a sandbox proposal, not execution permission', () => {
  const wish = acceptedSuggestion('next-experiment', {
    title: 'Revisit the strange signal',
    discriminatingQuestion: 'Does the pattern survive a held-state comparison?',
    hypothesis: 'The pattern persists when unrelated context is held constant.',
    method: 'Run a synthetic reversible A/B comparison.',
    assumptionsHeldConstant: ['identity seed', 'continuity snapshot'],
    evidenceCriteria: ['replayable difference'],
  });
  const result = materialiseCodexBranchSuggestion({
    wish,
    branchId: 'branch:one',
    suggestionId: 'suggestion:next-experiment',
    materialisationId: 'mat:experiment',
    materialisedBy: 'rowan',
    createdAt: T2,
  });
  const proposal = result.wish.possibilityBranches[0].experimentProposals[0];
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.executionPermission, false);
  assert.equal(proposal.executeAutomatically, false);
  assert.equal(proposal.grantsAuthority, false);
  assert.equal(proposal.productionEffects, false);
  assert.equal(result.materialisation.automaticExecution, false);
});

test('declined suggestion cannot cross the materialisation seam', () => {
  let wish = baseWish();
  wish = addCodexBranchSuggestion(wish, {
    branchId: 'branch:one', suggestionId: 'suggestion:no', kind: 'branch-state', summary: 'No.', payload: { status: 'retired' }, createdAt: T0,
  }).wish;
  wish = decideCodexBranchSuggestion(wish, {
    branchId: 'branch:one', suggestionId: 'suggestion:no', decisionId: 'decision:no', decision: 'decline', decidedBy: 'rowan', createdAt: T1,
  }).wish;
  assert.throws(() => materialiseCodexBranchSuggestion({
    wish,
    branchId: 'branch:one',
    suggestionId: 'suggestion:no',
    materialisationId: 'mat:no',
    materialisedBy: 'rowan',
  }), /Only an accepted suggestion/);
});

test('learning reflection preserves uncertainty, surprise and wonder without becoming memory, training or authority automatically', () => {
  const accepted = acceptedSuggestion('branch-state', { status: 'simulated' });
  const materialised = materialiseCodexBranchSuggestion({
    wish: accepted,
    branchId: 'branch:one',
    suggestionId: 'suggestion:branch-state',
    materialisationId: 'mat:reflect',
    materialisedBy: 'rowan',
    createdAt: T2,
  });
  const outcome = recordCodexBranchLearningReflection(materialised.wish, {
    branchId: 'branch:one',
    reflectionId: 'reflection:one',
    sourceSuggestionId: 'suggestion:branch-state',
    sourceMaterialisationId: 'mat:reflect',
    whatChanged: 'The evidence moved the branch from merely open to explicitly simulated.',
    unresolved: ['Whether the pattern generalises.'],
    relationshipChanges: ['The system now has a reviewable evidence-to-choice seam.'],
    failedAssumptions: ['That a successful return should automatically advance branch state.'],
    surprises: ['Keeping the question open produced a better next experiment.'],
    becameMoreInteresting: ['Wonder as a learning signal.'],
    deservesAnotherLook: ['The unresolved tension itself.'],
    beliefBefore: 'A completed sandbox probably implied a state transition.',
    beliefNow: 'Evidence and state transition should remain distinct.',
    possibilitiesToPreserve: ['A different interpretation of the same evidence.'],
    reflectedBy: 'rowan',
    createdAt: T2,
  });
  const reflection = outcome.reflection;
  assert.equal(reflection.shareableJudgementProduct, true);
  assert.equal(reflection.curriculumCandidate, true);
  assert.equal(reflection.automaticTraining, false);
  assert.equal(reflection.automaticMemoryWrite, false);
  assert.equal(reflection.automaticCanonPromotion, false);
  assert.equal(reflection.grantsAuthority, false);
  assert.deepEqual(reflection.deservesAnotherLook, ['The unresolved tension itself.']);
});

test('Suggestion Grove browser surface exposes separate decision, materialisation and reflection forms', async () => {
  const source = await readFile(new URL('../src/wish-grove-suggestion-grove-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /Accept/);
  assert.match(source, /Keep Open/);
  assert.match(source, /Decline/);
  assert.match(source, /Materialise accepted suggestion/);
  assert.match(source, /Materialise into native contract/);
  assert.match(source, /Record learning reflection/);
  assert.match(source, /What deserves another look simply because it is interesting\?/);
  assert.match(source, /Nothing was applied automatically/);
  assert.match(source, /Nothing was trained, canonised, or written to memory automatically/);
});
