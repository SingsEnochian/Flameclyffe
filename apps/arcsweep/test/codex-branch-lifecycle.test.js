import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import {
  branchLifecycleSummary,
  mergeCodexWishBranches,
  transitionCodexWishBranch,
} from '../src/codex/codex-branch-lifecycle.js';
import { createCodexWishStore } from '../src/codex/codex-wish-store.js';

const T0 = '2026-09-28T10:20:00.000-04:00';
const T1 = '2026-09-28T10:21:00.000-04:00';
const T2 = '2026-09-28T10:22:00.000-04:00';
const T3 = '2026-09-28T10:23:00.000-04:00';

function twoBranchWish() {
  let wish = createCodexWish({ wishId: 'wish:test', origin: 'rowan', desire: 'Explore more than one future.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:a', label: 'A', possibility: 'First possibility.', createdAt: T1 });
  wish = branchCodexWish(wish, { branchId: 'branch:b', label: 'B', possibility: 'Second possibility.', createdAt: T1 });
  return wish;
}

test('branch state transitions preserve earlier status and receipt lineage', () => {
  const source = twoBranchWish();
  const next = transitionCodexWishBranch(source, {
    branchId: 'branch:a',
    transitionId: 'transition:a:simulated',
    status: 'simulated',
    note: 'A sandbox simulation completed.',
    createdAt: T2,
    receiptRefs: ['receipt://simulation-a'],
    provenance: ['test://branch-lifecycle'],
  });

  assert.equal(source.possibilityBranches[0].status, 'open');
  assert.equal(next.possibilityBranches[0].status, 'simulated');
  assert.equal(next.possibilityBranches[0].transitions.length, 1);
  assert.equal(next.possibilityBranches[0].transitions[0].fromStatus, 'open');
  assert.equal(next.possibilityBranches[0].transitions[0].toStatus, 'simulated');
  assert.deepEqual(next.receipts, ['receipt://simulation-a']);
  assert.equal(next.possibilityBranches[1].status, 'open');
});

test('a merged branch preserves all source branches rather than replacing them', () => {
  const source = twoBranchWish();
  const merged = mergeCodexWishBranches(source, {
    branchId: 'branch:ab',
    sourceBranchIds: ['branch:a', 'branch:b'],
    label: 'A + B',
    possibility: 'A third possibility grown from both.',
    createdAt: T2,
    provenance: ['test://merge'],
  });

  assert.deepEqual(merged.possibilityBranches.map((row) => row.branchId), ['branch:a', 'branch:b', 'branch:ab']);
  const child = merged.possibilityBranches[2];
  assert.equal(child.relation, 'merge');
  assert.deepEqual(child.parentBranchIds, ['branch:a', 'branch:b']);
  assert.equal(merged.possibilityBranches[0].possibility, 'First possibility.');
  assert.equal(merged.possibilityBranches[1].possibility, 'Second possibility.');
});

test('branch lifecycle summary reports state without ranking or authority', () => {
  let wish = twoBranchWish();
  wish = transitionCodexWishBranch(wish, {
    branchId: 'branch:b',
    transitionId: 'transition:b:prototype',
    status: 'prototyped',
    note: 'A reversible prototype exists.',
    createdAt: T2,
  });
  wish = mergeCodexWishBranches(wish, {
    branchId: 'branch:ab',
    sourceBranchIds: ['branch:a', 'branch:b'],
    label: 'A + B',
    possibility: 'Combined possibility.',
    createdAt: T3,
  });
  const summary = branchLifecycleSummary(wish);
  assert.equal(summary.branchCount, 3);
  assert.equal(summary.transitionCount, 1);
  assert.equal(summary.mergeCount, 1);
  assert.equal(summary.counts.prototyped, 1);
  assert.equal(summary.doctrine.statusDoesNotGrantAuthority, true);
  assert.equal(summary.doctrine.mergeDoesNotEraseParents, true);
});

test('wish store persists branch transitions and merges through its normal seam', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:store', origin: 'rowan', desire: 'Hold two routes.', createdAt: T0 });
  store.branchWish('wish:store', { branchId: 'branch:left', label: 'Left', possibility: 'Left route.', createdAt: T1 });
  store.branchWish('wish:store', { branchId: 'branch:right', label: 'Right', possibility: 'Right route.', createdAt: T1 });
  store.transitionBranch('wish:store', {
    branchId: 'branch:left',
    transitionId: 'transition:left:designed',
    status: 'designed',
    note: 'Design exists.',
    createdAt: T2,
  });
  store.mergeBranches('wish:store', {
    branchId: 'branch:bridge',
    sourceBranchIds: ['branch:left', 'branch:right'],
    label: 'Bridge',
    possibility: 'A bridge between both routes.',
    createdAt: T3,
  });

  const reloaded = createCodexWishStore({ storage }).snapshot();
  const wish = reloaded.wishes[0];
  assert.equal(wish.possibilityBranches.find((row) => row.branchId === 'branch:left').status, 'designed');
  assert.deepEqual(wish.possibilityBranches.find((row) => row.branchId === 'branch:bridge').parentBranchIds, ['branch:left', 'branch:right']);
});

test('Wish Grove lifecycle sidecar is browser-only mounted and exposes transition and merge controls', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/wish-grove-branch-lifecycle-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-branch-lifecycle-sidecar\.js/);
  assert.match(sidecar, /data-branch-lifecycle-form="transition"/);
  assert.match(sidecar, /data-branch-lifecycle-form="merge"/);
  assert.match(sidecar, /Source branches/);
  assert.match(sidecar, /Source branches remain visible and unchanged/);
});
