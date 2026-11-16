'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWyrdruneRevisionLineage, compileTyped } = require('../wayglass-kernel.cjs');
const { PHASES } = require('../wayglass-mobius.cjs');

const principal = { authorized: true, id: 'revision-trial-owner' };
const program = expression => `
mobius scoped {
  perceive {} compress {} release {} verify {}
  integrate {} choose {} return { emit ${expression}; } transcend {}
}`;
const initialSource = program('6');
const candidate = program('2 * 3');
const next = program('7');
const options = { initialSource, participant: principal.id };
const approval = { principal, decision: 'accept', approvalRef: 'owner-review-01' };

test('Wayglass carries verified WTL revisions across both Möbius faces and cold return', async () => {
  const lineage = createWyrdruneRevisionLineage(options);
  const parent = lineage.activeRevision;
  const deferred = await lineage.cycle({ source: candidate, parent, principal });
  assert.equal(deferred.changed, false);
  assert.equal(deferred.face, 'outer');
  assert.equal(deferred.checkpoint.carry.generation, 0);
  assert.deepEqual(deferred.receipts.map(receipt => receipt.phase), PHASES);
  assert.deepEqual(deferred.policyReceipts.map(receipt => receipt.phase), PHASES);

  const accepted = await lineage.cycle({ source: candidate, parent, ...approval });
  assert.equal(accepted.face, 'inner');
  assert.equal(accepted.changed, true);
  assert.equal(accepted.activeRevision, compileTyped(candidate).digest);
  assert.equal(accepted.checkpoint.prev, deferred.checkpointDigest);
  assert.equal(accepted.checkpoint.carry.generation, 1);
  assert.equal(accepted.outputs.release.first.execution, accepted.outputs.release.replay.execution);
  const restored = createWyrdruneRevisionLineage({
    ...options, currentSource: candidate,
    checkpoints: JSON.parse(JSON.stringify([deferred.checkpoint, accepted.checkpoint])),
    expectedHead: accepted.checkpointDigest,
  });
  await assert.rejects(restored.cycle({ source: next, parent, ...approval }), /parent is stale/);
  const evolved = await restored.cycle({
    source: next, parent: restored.activeRevision, expectedOutput: [7], ...approval,
  });
  assert.equal(evolved.changed, true);
  assert.equal(evolved.checkpoint.carry.generation, 2);
  assert.equal(evolved.checkpoint.prev, accepted.checkpointDigest);
  assert.equal(evolved.outputs.compress.expectationSource, 'explicit');
});

test('Verify rollbacks leave active source and checkpoint available for a corrected revision', async () => {
  const lineage = createWyrdruneRevisionLineage(options);
  const parent = lineage.activeRevision;
  const bad = await lineage.cycle({ source: next, parent, ...approval });
  assert.equal(bad.status, 'rolled-back');
  assert.equal(bad.reason[0], 'Candidate did not match expected output');
  assert.equal(lineage.activeRevision, parent);
  assert.equal(lineage.checkpoint, null);
  const effect = 'effect "local" "read";\n' + program('if true then 6 else bridge("local","read")');
  const blocked = await lineage.cycle({ source: effect, parent, ...approval });
  assert.equal(blocked.status, 'rolled-back');
  assert.match(blocked.reason[0], /pure typed programs/);
  assert.equal(lineage.checkpoint, null);
  assert.equal((await lineage.cycle({ source: candidate, parent, ...approval })).changed, true);
});

test('revision authority, overlapping trials, Feather and checkpoint tampering fail closed', async () => {
  const controller = new AbortController();
  const lineage = createWyrdruneRevisionLineage({ ...options, signal: controller.signal });
  const parent = lineage.activeRevision;
  await assert.rejects(lineage.cycle({ source: candidate, parent, principal: { ...principal, id: 'other' } }), /authority/);
  const working = lineage.cycle({ source: candidate, parent, ...approval });
  await assert.rejects(lineage.cycle({ source: candidate, parent, ...approval }), /already in progress/);
  const accepted = await working;
  controller.abort();
  const stopped = await lineage.cycle({ source: next, expectedOutput: [7], parent: lineage.activeRevision, ...approval });
  assert.equal(stopped.status, 'feather-stopped');
  assert.equal(lineage.checkpoint, accepted.checkpoint);
  assert.throws(() => createWyrdruneRevisionLineage({
    ...options, checkpoints: [accepted.checkpoint], expectedHead: accepted.checkpointDigest,
  }), /active source does not match/);
  assert.throws(() => createWyrdruneRevisionLineage({
    ...options, currentSource: candidate, expectedHead: accepted.checkpointDigest,
    checkpoints: [{ ...structuredClone(accepted.checkpoint), receipts: 'altered' }],
  }), /trusted head/);
});
