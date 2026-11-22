import assert from 'node:assert/strict';
import test from 'node:test';

import {
  branchCodexWish,
  createCodexOpenQuestion,
  createCodexWish,
  createCodexWishLineage,
  linkWishOpenQuestion,
  recordWishTransformation,
  reopenCodexOpenQuestion,
  resolveCodexOpenQuestion,
  revisitCodexOpenQuestion,
  reviseCodexWish,
} from '../src/codex/codex-wish-lineage.js';
import { projectUniversalCodex } from '../src/codex/codex-semantic-projector.js';
import { renderCodexNarrative } from '../src/codex/codex-narrative-renderer.js';

const T0 = '2026-09-28T03:50:00.000-04:00';
const T1 = '2026-09-28T03:51:00.000-04:00';
const T2 = '2026-09-28T03:52:00.000-04:00';
const T3 = '2026-09-28T03:53:00.000-04:00';

test('a Codex wish keeps origin, branches, revisions, transformations and open-question lineage', () => {
  let wish = createCodexWish({
    wishId: 'wish:world-tree-room',
    origin: 'rowan',
    desire: 'Grow a room where possible worlds can be explored.',
    whyItMatters: 'Possibility should be visible without being flattened into one answer.',
    worldOrScope: 'universal-codex',
    continuityAnchors: ['codex://law/do-not-kill-belief'],
    memoryRefs: ['codex://neverending-story/wish-space'],
    createdAt: T0,
    provenance: ['conversation:2026-09-28'],
  });

  wish = branchCodexWish(wish, {
    branchId: 'branch:forest',
    label: 'Living forest room',
    possibility: 'The room presents possible futures as a navigable forest.',
    createdAt: T1,
  });
  wish = branchCodexWish(wish, {
    branchId: 'branch:book',
    label: 'Infinite book room',
    possibility: 'The room presents possible futures as branching pages.',
    createdAt: T1,
  });
  wish = reviseCodexWish(wish, {
    desire: 'Grow a room where possible worlds can be explored and revisited.',
    reason: 'Revisitation is part of Wonder rather than a second feature.',
    createdAt: T2,
  });
  wish = recordWishTransformation(wish, {
    transformationId: 'transform:prototype-1',
    kind: 'designed',
    description: 'A first interface plan was produced.',
    createdAt: T3,
    receiptRefs: ['receipt://prototype-1'],
  });
  wish = linkWishOpenQuestion(wish, 'question:how-should-branches-age');

  assert.equal(wish.origin, 'rowan');
  assert.equal(wish.possibilityBranches.length, 2);
  assert.equal(wish.revisions.length, 1);
  assert.equal(wish.revisions[0].previous.desire, 'Grow a room where possible worlds can be explored.');
  assert.equal(wish.transformations.length, 1);
  assert.deepEqual(wish.receipts, ['receipt://prototype-1']);
  assert.deepEqual(wish.openQuestionIds, ['question:how-should-branches-age']);
  assert.equal(wish.unlimitedPossibility, true);
  assert.equal(wish.preservesOriginLineage, true);
});

test('contradictory wish branches coexist instead of overwriting one another', () => {
  let wish = createCodexWish({ wishId: 'wish:weather', origin: 'rowan', desire: 'Imagine the ideal weather.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:storm', label: 'Storm', possibility: 'A thunderstorm rolls in.', createdAt: T1 });
  wish = branchCodexWish(wish, { branchId: 'branch:sun', label: 'Sun', possibility: 'A clear warm afternoon.', createdAt: T1 });
  assert.deepEqual(wish.possibilityBranches.map((row) => row.branchId), ['branch:storm', 'branch:sun']);
});

test('an open question can be revisited, resolved and reopened without erasing its history', () => {
  let question = createCodexOpenQuestion({
    questionId: 'question:signal',
    question: 'Why does this visual pattern recur at meaningful moments?',
    originRef: 'mythience://observation/visual-crispness',
    whyItMatters: 'The recurrence may be worth tracking.',
    createdAt: T0,
    beliefRefs: ['belief://meaningful-pattern'],
    evidenceRefs: ['observation://instance-1'],
    symbolRefs: ['symbol://threshold-clarity'],
  });
  question = revisitCodexOpenQuestion(question, {
    revisitId: 'revisit:2',
    note: 'The same visual signature appeared again.',
    createdAt: T1,
    evidenceRefs: ['observation://instance-2'],
  });
  question = resolveCodexOpenQuestion(question, {
    resolutionId: 'resolution:working-1',
    statement: 'Current evidence supports a repeatable personal perceptual marker, while explanation remains open.',
    mode: 'tentative',
    confidence: 0.6,
    createdAt: T2,
  });
  question = reopenCodexOpenQuestion(question, {
    revisitId: 'revisit:3',
    reason: 'A later event introduced a new interpretation.',
    createdAt: T3,
  });

  assert.equal(question.status, 'open');
  assert.equal(question.question, 'Why does this visual pattern recur at meaningful moments?');
  assert.equal(question.revisits.length, 2);
  assert.equal(question.resolutions.length, 1);
  assert.ok(question.evidenceRefs.includes('observation://instance-1'));
  assert.ok(question.evidenceRefs.includes('observation://instance-2'));
  assert.equal(question.preserveBelief, true);
  assert.equal(question.revisitWorthwhile, true);
});

test('wish lineage is deterministic and records world-tree edges', () => {
  let wish = createCodexWish({ wishId: 'wish:a', origin: 'rowan', desire: 'Explore A.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:a1', label: 'A1', possibility: 'Try A1.', createdAt: T1 });
  wish = linkWishOpenQuestion(wish, 'question:a');
  const question = createCodexOpenQuestion({ questionId: 'question:a', question: 'What does A reveal?', originWishId: 'wish:a', createdAt: T1 });

  const first = createCodexWishLineage({ wishes: [wish], openQuestions: [question] });
  const second = createCodexWishLineage({ openQuestions: [question], wishes: [wish] });
  assert.deepEqual(first, second);
  assert.equal(first.doctrine.noArtificialScarcityOfImagination, true);
  assert.equal(first.doctrine.realisationDoesNotEraseAlternatives, true);
  assert.ok(first.edges.some((edge) => edge.kind === 'wish-branch' && edge.to === 'branch:a1'));
  assert.ok(first.edges.some((edge) => edge.kind === 'wish-question' && edge.to === 'question:a'));
});

test('Codex projection renders wishes, branches, live questions, revisits and resolutions as distinct manifestations', () => {
  let wish = createCodexWish({ wishId: 'wish:codex', origin: 'rowan', desire: 'Let the Codex hold unlimited wishes.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:one', label: 'One leaf', possibility: 'One possible future.', createdAt: T1 });
  wish = linkWishOpenQuestion(wish, 'question:cost');

  let question = createCodexOpenQuestion({ questionId: 'question:cost', question: 'What changes when possibility is abundant?', originWishId: wish.wishId, createdAt: T1 });
  question = revisitCodexOpenQuestion(question, { revisitId: 'revisit:cost', note: 'Memory pressure becomes more important.', createdAt: T2 });
  question = resolveCodexOpenQuestion(question, { resolutionId: 'resolution:cost', statement: 'Possibility abundance increases the value of lineage.', createdAt: T3 });

  const lineage = createCodexWishLineage({ wishes: [wish], openQuestions: [question] });
  const projection = projectUniversalCodex({ wishLineage: lineage });
  const kinds = new Set(projection.manifestations.map((row) => row.kind));
  for (const kind of ['wish', 'wish-branch', 'open-question', 'question-revisited', 'question-resolved']) assert.ok(kinds.has(kind));

  const resolution = projection.manifestations.find((row) => row.kind === 'question-resolved');
  assert.match(renderCodexNarrative(resolution), /without erasing the question/i);
});
