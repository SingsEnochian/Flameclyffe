import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  branchCodexWish,
  createCodexOpenQuestion,
  createCodexWish,
  createCodexWishLineage,
  linkWishOpenQuestion,
} from '../src/codex/codex-wish-lineage.js';
import { anchorCodexWish } from '../src/codex/codex-wish-anchors.js';
import { mergeCodexWishBranches } from '../src/codex/codex-branch-lifecycle.js';
import { buildCodexPossibilityTree } from '../src/codex/codex-possibility-tree.js';

const T0 = '2026-09-28T10:30:00.000-04:00';
const T1 = '2026-09-28T10:31:00.000-04:00';

function lineage() {
  let wish = createCodexWish({
    wishId: 'wish:tree',
    origin: 'rowan',
    desire: 'Grow a world tree of possibilities.',
    createdAt: T0,
  });
  wish = branchCodexWish(wish, { branchId: 'branch:a', label: 'A', possibility: 'First leaf.', createdAt: T1 });
  wish = branchCodexWish(wish, { branchId: 'branch:b', label: 'B', possibility: 'Second leaf.', createdAt: T1 });
  wish = mergeCodexWishBranches(wish, {
    branchId: 'branch:ab',
    sourceBranchIds: ['branch:a', 'branch:b'],
    label: 'A+B',
    possibility: 'A third leaf grown from both.',
    createdAt: T1,
  });
  wish = anchorCodexWish(wish, {
    continuityAnchors: ['continuity://origin'],
    relationshipsTouched: ['relationship://circle'],
    memoryRefs: ['memory://first-wish'],
    createdAt: T1,
  });
  wish = linkWishOpenQuestion(wish, 'question:tree');
  const question = createCodexOpenQuestion({
    questionId: 'question:tree',
    question: 'What deserves another look?',
    originWishId: wish.wishId,
    beliefRefs: ['belief://wonder'],
    evidenceRefs: ['evidence://receipt-1'],
    symbolRefs: ['symbol://world-tree'],
    createdAt: T1,
  });
  return createCodexWishLineage({ wishes: [wish], openQuestions: [question] });
}

test('possibility tree includes wishes, branches, questions, anchors and epistemic references', () => {
  const tree = buildCodexPossibilityTree(lineage());
  assert.deepEqual(tree.counts, {
    wishes: 1,
    branches: 3,
    questions: 1,
    anchors: 3,
    references: 3,
  });
  for (const kind of ['wish', 'branch', 'question', 'anchor', 'reference']) {
    assert.ok(tree.nodes.some((node) => node.kind === kind), `missing node kind ${kind}`);
  }
  assert.ok(tree.edges.some((edge) => edge.kind === 'branch-branch' && edge.from === 'branch:branch:a' && edge.to === 'branch:branch:ab'));
  assert.ok(tree.edges.some((edge) => edge.kind === 'wish-relationship-anchor'));
  assert.ok(tree.edges.some((edge) => edge.kind === 'question-symbol-reference'));
});

test('possibility tree layout is deterministic and carries no winner or rank field', () => {
  const first = buildCodexPossibilityTree(lineage());
  const second = buildCodexPossibilityTree(lineage());
  assert.deepEqual(first, second);
  assert.equal(first.doctrine.ranksPossibilities, false);
  assert.equal(first.doctrine.selectsWinner, false);
  assert.equal(first.doctrine.positionsEncodeTypeNotImportance, true);
  assert.doesNotMatch(JSON.stringify(first.nodes), /"rank"|"winner"|"importanceScore"/i);
});

test('world-tree sidecar is browser-only mounted and explains its non-ranking geometry', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/wish-grove-world-tree-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-world-tree-sidecar\.js/);
  assert.match(sidecar, /Yggdrasil view/);
  assert.match(sidecar, /type, not rank/i);
  assert.match(sidecar, /does not infer hidden relationships, score possibilities, or select a preferred future/i);
});
