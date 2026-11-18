'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCellGarden, PHASES, SCHEMA } = require('../../../lib/wayglass-cell-mitosis.cjs');

test('WTL mitosis makes two distinguishable, bounded daughters with a preserved lineage', async () => {
  const garden = createCellGarden({ maxActive: 4, maxGeneration: 2 });
  const original = garden.snapshot();
  assert.equal(original.schema, SCHEMA);
  assert.equal(original.cells.length, 1);
  const proposal = await garden.propose({ cell_id: 'cell:origin', expected_revision: 0 });
  assert.equal(proposal.status, 'proposed-not-committed');
  assert.deepEqual(proposal.wtl.phase_receipts.map(x => x.phase), PHASES);
  assert.equal(garden.snapshot().cells.length, 1, 'Preview has no committed effects');
  assert.throws(() => garden.commit({
    proposal_id: proposal.proposal_id, expected_revision: 0,
  }), /confirmation/i);
  const { receipt, culture } = garden.commit({
    proposal_id: proposal.proposal_id, expected_revision: 0, owner_confirmed: true,
  });
  assert.equal(receipt.status, 'committed-in-memory');
  assert.equal(receipt.persisted, false);
  assert.equal(receipt.authority_inherited, false);
  assert.equal(culture.revision, 1);
  assert.equal(culture.cells.filter(x => x.status === 'active').length, 2);
  assert.equal(culture.cells.find(x => x.cell_id === 'cell:origin').status, 'divided');
  const daughters = culture.cells.filter(x => x.status === 'active');
  assert.notEqual(daughters[0].cell_id, daughters[1].cell_id);
  assert.equal(daughters[0].parent_id, 'cell:origin');
  assert.equal(daughters[1].parent_id, 'cell:origin');
  assert.equal(daughters[0].lineage_root, daughters[1].lineage_root);
  assert.equal(daughters[0].genome_ref, daughters[1].genome_ref);
  assert.notEqual(daughters[0].twist.orientation, daughters[1].twist.orientation);
  assert.deepEqual(daughters[0].capabilities, []);
  assert.throws(() => garden.commit({
    proposal_id: proposal.proposal_id, expected_revision: 1, owner_confirmed: true,
  }), /stale/i, 'Replayed approval never mints more cells');
});

test('Feather revokes pending division and requires fresh consent after release', async () => {
  const garden = createCellGarden();
  const proposal = await garden.propose({ cell_id: 'cell:origin', expected_revision: 0 });
  assert.equal(garden.feather().status, 'feather-stopped');
  assert.throws(() => garden.commit({
    proposal_id: proposal.proposal_id, expected_revision: 0, owner_confirmed: true,
  }), /Feather/i);
  assert.throws(() => garden.resume({}), /release/i);
  garden.resume({ owner_confirmed: true });
  assert.throws(() => garden.commit({
    proposal_id: proposal.proposal_id, expected_revision: 0, owner_confirmed: true,
  }), /stale/i);
  assert.equal(garden.snapshot().cells.length, 1);
});

test('invalid addresses, stale revisions, bounded population and generations fail closed', async () => {
  const garden = createCellGarden({ maxActive: 2, maxGeneration: 1 });
  await assert.rejects(garden.propose({ cell_id: 'cell:unknown', expected_revision: 0 }), /not active/i);
  await assert.rejects(garden.propose({ cell_id: 'cell:origin', expected_revision: 1 }), /revision/i);
  const first = await garden.propose({ cell_id: 'cell:origin', expected_revision: 0 });
  const done = garden.commit({ proposal_id: first.proposal_id, expected_revision: 0, owner_confirmed: true });
  assert.equal(done.culture.cells.filter(cell => cell.status === 'active').length, 2);
  await assert.rejects(garden.propose({
    cell_id: done.receipt.daughter_ids[0], expected_revision: 1,
  }), /budget/i);
});

test('snapshots cannot change committed cell memory, authority or lineage', async () => {
  const garden = createCellGarden();
  const snapshot = garden.snapshot();
  snapshot.cells[0].capabilities.push('owner-key');
  snapshot.cells[0].twist.orientation = -1;
  assert.deepEqual(garden.snapshot().cells[0].capabilities, []);
  assert.equal(garden.snapshot().cells[0].twist.orientation, 1);
});

test('a mid-flight Feather invalidates the asynchronous WTL proposal', async () => {
  const garden = createCellGarden();
  const pending = garden.propose({ cell_id: 'cell:origin', expected_revision: 0 });
  garden.feather();
  await assert.rejects(pending, /Feather|changed culture/i);
  assert.equal(garden.snapshot().pending, null);
});
