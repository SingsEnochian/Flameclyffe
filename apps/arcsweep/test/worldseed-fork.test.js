import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from '../src/worlds.js';
import { compileWorldseed } from '../src/worldseed.js';
import { forkWorldFromSeed } from '../src/worldseed-fork.js';

function parentAndSeed() {
  const parent = createWorld('terra-aeterna', '2026-08-18T14:00:00.000Z');
  parent.name = 'Terra Aeterna';
  parent.kind = 'Living World';
  parent.rules = 'Hearth before empire.';
  const seed = compileWorldseed(parent, [
    {
      id: 'constitution',
      worldId: parent.id,
      title: 'Hearth Covenant',
      seedType: 'World Constitution',
      status: 'Canonical',
      mustSurvive: 'Relationship and stewardship remain structural.',
      mayChange: 'Institutions and offices may change.',
      mayBeLost: 'Titles whose purpose has ended.',
      descendantsInherit: 'The hearth covenant.',
      transferableSeed: 'Braided stewardship.',
    },
  ], '2026-08-18T14:01:00.000Z');
  return { parent, seed };
}

test('forks a descendant from a compiled Worldseed without mutating the input parent', () => {
  const { parent, seed } = parentAndSeed();
  const original = structuredClone(parent);
  const fork = forkWorldFromSeed({
    parentWorld: parent,
    seed,
    childId: 'terra-aeterna-restoration',
    childName: 'Terra Aeterna · Restoration',
    branchPoint: 'After the Third City opens the sea gate',
    reason: 'Explore the descendant culture after the threshold.',
    now: '2026-08-18T14:02:00.000Z',
  });

  assert.deepEqual(parent, original);
  assert.equal(fork.child.parentWorldId, parent.id);
  assert.equal(fork.child.parentSeedFingerprint, seed.fingerprint);
  assert.equal(fork.child.branchPoint, 'After the Third City opens the sea gate');
  assert.equal(fork.child.rules, parent.rules);
  assert.equal(fork.child.worldseedFingerprint, '');
  assert.deepEqual(fork.child.descendantWorldIds, []);
  assert.ok(fork.parent.descendantWorldIds.includes(fork.child.id));
});

test('carries inheritance material into the descendant world', () => {
  const { parent, seed } = parentAndSeed();
  const { child, receipt } = forkWorldFromSeed({
    parentWorld: parent,
    seed,
    childId: 'terra-aeterna-branch',
    mode: 'experimental',
    now: '2026-08-18T14:03:00.000Z',
  });

  assert.deepEqual(child.worldseedInheritance.mustSurvive, ['Relationship and stewardship remain structural.']);
  assert.deepEqual(child.worldseedInheritance.mayChange, ['Institutions and offices may change.']);
  assert.deepEqual(child.worldseedInheritance.mayBeLost, ['Titles whose purpose has ended.']);
  assert.deepEqual(child.worldseedInheritance.descendantsInherit, ['The hearth covenant.']);
  assert.deepEqual(child.worldseedInheritance.transferableSeeds, ['Braided stewardship.']);
  assert.equal(receipt.schema, 'arcsweep.worldseed-fork-receipt/v1');
  assert.equal(receipt.mode, 'experimental');
});

test('refuses a seed compiled for a different parent world', () => {
  const { parent, seed } = parentAndSeed();
  assert.throws(() => forkWorldFromSeed({
    parentWorld: { ...parent, id: 'another-world' },
    seed,
    childId: 'child',
  }), /does not belong/i);
});
