import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import {
  addCodexBranchSuggestion,
  addExperimentReturnSuggestions,
  branchSuggestionSummary,
  decideCodexBranchSuggestion,
  suggestionsFromExperimentReturn,
} from '../src/codex/codex-suggestion-grove.js';

const T0 = '2026-09-28T14:00:00.000-04:00';
const T1 = '2026-09-28T14:01:00.000-04:00';
const T2 = '2026-09-28T14:02:00.000-04:00';

function baseWish() {
  let wish = createCodexWish({
    wishId: 'wish:suggestions',
    origin: 'rowan',
    desire: 'Let evidence suggest without deciding for us.',
    createdAt: T0,
  });
  wish = branchCodexWish(wish, {
    branchId: 'branch:one',
    label: 'One possibility',
    possibility: 'Explore a reversible route.',
    createdAt: T0,
  });
  return wish;
}

function sandboxReturn(overrides = {}) {
  return Object.freeze({
    schema: 'hearthweave.codex-branch-experiment-return/v0.1',
    returnId: 'return:one',
    wishId: 'wish:suggestions',
    branchId: 'branch:one',
    proposalId: 'proposal:one',
    experimentId: 'experiment:one',
    status: 'completed',
    outcome: 'observed',
    observation: 'The sealed sandbox returned useful evidence.',
    suggestedBranchStatus: 'simulated',
    evidenceRefs: ['evidence://one'],
    receiptRefs: ['receipt://one'],
    provenance: ['sandbox://one'],
    createdAt: T1,
    ...overrides,
  });
}

test('structured experiment returns become typed suggestions without applying them', () => {
  const candidates = suggestionsFromExperimentReturn(sandboxReturn({
    questionsOpened: ['What changed in the relationship context?'],
    suggestedRelationshipAnchors: ['relationship://circle'],
  }));
  assert.equal(candidates.length, 3);
  assert.deepEqual(candidates.map((row) => row.kind), ['branch-state', 'open-question', 'relationship-anchor']);

  const result = addExperimentReturnSuggestions(baseWish(), sandboxReturn());
  const branch = result.wish.possibilityBranches[0];
  assert.equal(result.suggestions.length, 1);
  assert.equal(branch.status, 'open');
  assert.equal(branch.suggestions[0].kind, 'branch-state');
  assert.equal(branch.suggestions[0].payload.status, 'simulated');
  assert.equal(branch.suggestions[0].suggestionOnly, true);
  assert.equal(branch.suggestions[0].grantsAuthority, false);
  assert.equal(branch.suggestions[0].productionEffects, false);
  assert.equal(branch.suggestions[0].automaticApplication, false);
  assert.equal(branch.suggestions[0].applied, false);
});

test('Suggestion Grove does not infer hidden suggestions from free-text observations', () => {
  const candidates = suggestionsFromExperimentReturn(sandboxReturn({
    suggestedBranchStatus: null,
    observation: 'This prose says maybe change state, create a question, and contact someone, but provides no structured suggestion fields.',
  }));
  assert.deepEqual(candidates, []);
});

test('accept, decline, and keep-open decisions are append-only and do not apply suggestions', () => {
  let result = addCodexBranchSuggestion(baseWish(), {
    branchId: 'branch:one',
    suggestionId: 'suggestion:one',
    kind: 'branch-state',
    summary: 'Consider recording this branch as simulated.',
    payload: { status: 'simulated' },
    evidenceRefs: ['evidence://one'],
    createdAt: T1,
  });

  let decided = decideCodexBranchSuggestion(result.wish, {
    branchId: 'branch:one',
    suggestionId: 'suggestion:one',
    decisionId: 'decision:accept',
    decision: 'accept',
    reason: 'The evidence supports considering this state.',
    decidedBy: 'rowan',
    createdAt: T2,
  });
  assert.equal(decided.suggestion.status, 'accepted');
  assert.equal(decided.applied, false);
  assert.equal(decided.wish.possibilityBranches[0].status, 'open');
  assert.equal(decided.decision.appliesSuggestion, false);

  decided = decideCodexBranchSuggestion(decided.wish, {
    branchId: 'branch:one',
    suggestionId: 'suggestion:one',
    decisionId: 'decision:keep-open',
    decision: 'keep-open',
    reason: 'Leave room for another result.',
    decidedBy: 'rowan',
    createdAt: T2,
  });
  assert.equal(decided.suggestion.status, 'open');
  assert.equal(decided.suggestion.decisionHistory.length, 2);
  assert.equal(decided.suggestion.decisionHistory[0].decision, 'accept');
  assert.equal(decided.suggestion.decisionHistory[1].decision, 'keep-open');
  assert.deepEqual(decided.suggestion.evidenceRefs, ['evidence://one']);

  decided = decideCodexBranchSuggestion(decided.wish, {
    branchId: 'branch:one',
    suggestionId: 'suggestion:one',
    decisionId: 'decision:decline',
    decision: 'decline',
    reason: 'A later result changed the interpretation.',
    decidedBy: 'rowan',
    createdAt: T2,
  });
  assert.equal(decided.suggestion.status, 'declined');
  assert.equal(decided.suggestion.decisionHistory.length, 3);
  assert.deepEqual(decided.suggestion.evidenceRefs, ['evidence://one']);
});

test('suggestion summary keeps review distinct from authority and application', () => {
  const first = addExperimentReturnSuggestions(baseWish(), sandboxReturn()).wish;
  const summary = branchSuggestionSummary(first);
  assert.equal(summary.counts.total, 1);
  assert.equal(summary.counts.open, 1);
  assert.equal(summary.doctrine.suggestionIsNotDecision, true);
  assert.equal(summary.doctrine.decisionIsNotAuthority, true);
  assert.equal(summary.doctrine.acceptanceDoesNotApplyAutomatically, true);
  assert.equal(summary.doctrine.declineDoesNotEraseSourceEvidence, true);
  assert.equal(summary.doctrine.keepOpenPreservesReviewability, true);
});

test('browser runtime mounts Suggestion Grove with three explicit review choices', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/wish-grove-suggestion-grove-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-suggestion-grove-sidecar\.js/);
  assert.match(source, /Suggestion Grove/);
  assert.match(source, />Accept</);
  assert.match(source, />Keep Open</);
  assert.match(source, />Decline</);
  assert.match(source, /acceptance ≠ application/);
  assert.match(source, /Materialisation is a separate explicit act/);
  assert.match(source, /Nothing was applied automatically/);
});
