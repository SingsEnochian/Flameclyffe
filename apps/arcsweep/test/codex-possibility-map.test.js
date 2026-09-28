import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  branchCodexWish,
  createCodexOpenQuestion,
  createCodexWish,
  createCodexWishLineage,
} from '../src/codex/codex-wish-lineage.js';
import { compareCodexWishBranches } from '../src/codex/codex-branch-comparison.js';
import { buildOpenQuestionsConstellation } from '../src/codex/codex-question-constellation.js';
import { anchorCodexWish } from '../src/codex/codex-wish-anchors.js';
import { createCodexWishStore, CODEX_WISH_STORE_KEY } from '../src/codex/codex-wish-store.js';

function seedWish() {
  let wish = createCodexWish({
    wishId: 'wish:star-road',
    origin: 'test',
    desire: 'Find a road between worlds without flattening either world.',
    whyItMatters: 'Connection should preserve difference.',
    worldOrScope: 'constellation',
    createdAt: '2026-09-28T10:00:00-04:00',
  });
  wish = branchCodexWish(wish, {
    branchId: 'branch:bridge',
    label: 'Build a bridge',
    possibility: 'Create a named bridge with reversible crossings and provenance.',
    createdAt: '2026-09-28T10:01:00-04:00',
  });
  return branchCodexWish(wish, {
    branchId: 'branch:garden',
    label: 'Grow a garden path',
    possibility: 'Grow a shared garden path with memory anchors and voluntary return.',
    createdAt: '2026-09-28T10:02:00-04:00',
  });
}

test('Branch Mirror compares possibility branches without ranking or selecting a winner', () => {
  const comparison = compareCodexWishBranches(seedWish());
  assert.equal(comparison.branches.length, 2);
  assert.equal(comparison.comparisons.length, 1);
  assert.equal(comparison.doctrine.noWinner, true);
  assert.equal(comparison.doctrine.noBranchRanking, true);
  assert.equal(comparison.comparisons[0].doctrine.selectsWinner, false);
  assert.ok(comparison.comparisons[0].sharedTerms.includes('with'));
});

test('Wish anchors add continuity, relationship and memory context without replacing earlier links', () => {
  const first = anchorCodexWish(seedWish(), {
    continuityAnchors: ['origin:star-road'],
    relationshipsTouched: ['Rowan ↔ Codex'],
    memoryRefs: ['memory:first-wish'],
    createdAt: '2026-09-28T10:03:00-04:00',
  });
  const second = anchorCodexWish(first, {
    relationshipsTouched: ['House Commons'],
    memoryRefs: ['memory:return-path'],
    createdAt: '2026-09-28T10:04:00-04:00',
  });
  assert.deepEqual(second.continuityAnchors, ['origin:star-road']);
  assert.deepEqual(second.relationshipsTouched, ['Rowan ↔ Codex', 'House Commons']);
  assert.deepEqual(second.memoryRefs, ['memory:first-wish', 'memory:return-path']);
  assert.equal(second.anchorLinks.length, 2);
});

test('Open Questions constellation is deterministic and connects explicit shared context only', () => {
  const wish = seedWish();
  const q1 = createCodexOpenQuestion({
    questionId: 'question:one',
    question: 'What changes when the bridge becomes familiar?',
    originWishId: wish.wishId,
    evidenceRefs: ['evidence:crossing-1'],
    symbolRefs: ['symbol:bridge'],
    createdAt: '2026-09-28T10:05:00-04:00',
  });
  const q2 = createCodexOpenQuestion({
    questionId: 'question:two',
    question: 'What deserves to remain strange?',
    originWishId: wish.wishId,
    symbolRefs: ['symbol:bridge'],
    createdAt: '2026-09-28T10:06:00-04:00',
  });
  const lineage = createCodexWishLineage({ wishes: [wish], openQuestions: [q1, q2] });
  const a = buildOpenQuestionsConstellation(lineage);
  const b = buildOpenQuestionsConstellation(lineage);
  assert.deepEqual(a, b);
  const relation = a.edges.find((edge) => edge.kind === 'question-question');
  assert.ok(relation);
  assert.ok(relation.reasons.includes('shared-origin-wish'));
  assert.ok(relation.reasons.includes('shared-symbol-reference'));
  assert.equal(a.doctrine.ranksQuestions, false);
  assert.equal(a.doctrine.selectsPriority, false);
});

test('persistent Wish Store exposes anchorWish and reload preserves anchor lineage', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  };
  const store = createCodexWishStore({ storage });
  store.createWish({
    wishId: 'wish:persist',
    origin: 'test',
    desire: 'Remember the relationship that shaped this wish.',
    createdAt: '2026-09-28T10:07:00-04:00',
  });
  store.anchorWish('wish:persist', {
    relationshipsTouched: ['relationship:rowan-codex'],
    memoryRefs: ['memory:why-it-mattered'],
    createdAt: '2026-09-28T10:08:00-04:00',
  });
  assert.ok(map.get(CODEX_WISH_STORE_KEY));
  const reloaded = createCodexWishStore({ storage });
  const wish = reloaded.snapshot().wishes[0];
  assert.deepEqual(wish.relationshipsTouched, ['relationship:rowan-codex']);
  assert.deepEqual(wish.memoryRefs, ['memory:why-it-mattered']);
  assert.equal(wish.anchorLinks.length, 1);
});

test('Wish Grove possibility map is browser-mounted and explicitly non-ranking', async () => {
  const sidecar = await readFile(new URL('../src/wish-grove-possibility-map-sidecar.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(sidecar, /Branch Mirror/);
  assert.match(sidecar, /does not score, rank, or choose a winner/i);
  assert.match(sidecar, /Open Questions Constellation/);
  assert.match(sidecar, /data-wish-anchor-form/);
  assert.match(sidecar, /anchorWish/);
  assert.match(bootstrap, /wish-grove-possibility-map-sidecar\.js/);
});
