'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createColonyCheckpointStore } = require('../../../lib/wayglass-colony-checkpoint.cjs');
const { createCellGarden, PHASES, SCHEMA } = require('../../../lib/wayglass-cell-mitosis.cjs');
const { importColony } = require('../../../scripts/wayglass-import-colony.cjs');

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

test('an in-memory Garden carries its original cells, exchange and Feather into a cold checkpoint', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'wayglass-colony-import-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const garden = createCellGarden();
  const proposal = await garden.propose({ cell_id: 'cell:origin', expected_revision: 0 });
  assert.throws(() => importColony(garden.snapshot(), directory), /pending/);
  const division = garden.commit({ proposal_id: proposal.proposal_id, expected_revision: 0, owner_confirmed: true });
  const [from_id, to_id] = division.receipt.daughter_ids;
  await garden.specialise({ cell_id: from_id, role: 'resonance', expected_revision: 1, owner_confirmed: true });
  await garden.specialise({ cell_id: to_id, role: 'observation', expected_revision: 2, owner_confirmed: true });
  await garden.exchange({ from_id, to_id, message: 'A return held through Feather', expected_revision: 3,
    owner_confirmed: true, receiver_route_approved: true });
  const original = garden.feather();

  assert.deepEqual(importColony(original, directory), {
    revision: 4, active: 2, receipts: 4, status: 'feather-stopped', checkpoint: 1, alreadyImported: false,
  });
  assert.equal(importColony(original, directory).alreadyImported, true);
  assert.throws(() => importColony({ ...original, status: 'ready' }, directory), /different colony/);
  const store = createColonyCheckpointStore(join(directory, 'cell-garden'));
  const restored = createCellGarden({ store });
  assert.deepEqual(restored.snapshot(), { ...original, memory: 'local-checkpoint', persistence: true });
  assert.equal(restored.snapshot().history.at(-1).status, 'delivered-in-memory');
  restored.resume({ owner_confirmed: true });
  assert.equal(createCellGarden({ store }).snapshot().status, 'ready');
});
