'use strict';

const { isDeepStrictEqual } = require('node:util');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createCellGarden, SCHEMA } = require('../lib/wayglass-cell-mitosis.cjs');
const { createColonyCheckpointStore } = require('../lib/wayglass-colony-checkpoint.cjs');

// Transfer an owner-saved Garden response offline, with both hosts stopped
// from making further Garden changes. Preserve the original receipt statuses.
function importColony(snapshot, dataDirectory) {
  const { schema, memory, status, revision, cells, history, limits, pending, fusion_pending } = snapshot;
  if (schema !== SCHEMA || memory !== 'in-memory-only' ||
      !['ready', 'feather-stopped'].includes(status) ||
      !Array.isArray(cells) || !Array.isArray(history) || revision !== history.length ||
      history.some((receipt, index) => receipt?.revision !== index + 1)) {
    throw new Error('Expected an intact in-memory Cell Garden snapshot.');
  }
  if (pending || fusion_pending) throw new Error('Finish or clear the pending Garden proposal before saving the snapshot.');

  const state = { schema, revision, feathered: status === 'feather-stopped', cells, history };
  const probe = createCellGarden({ store: { load: () => ({ state, sequence: 1 }) } }).snapshot();
  const active = probe.cells.filter(cell => cell.status === 'active').length;
  if (!isDeepStrictEqual(probe.limits, limits) || active > probe.limits.maxActive ||
      probe.signals_sent !== snapshot.signals_sent ||
      cells.some(cell => !Array.isArray(cell.capabilities) || cell.capabilities.length !== 0)) {
    throw new Error('The snapshot does not match this Garden’s lineage and runtime settings.');
  }

  const store = createColonyCheckpointStore(join(dataDirectory, 'cell-garden'));
  const existing = store.load();
  if (existing && !isDeepStrictEqual(existing.state, state)) {
    throw new Error('The destination already holds a different colony checkpoint.');
  }
  const checkpoint = existing?.sequence ?? store.save(state, 0);
  const restored = createCellGarden({ store }).snapshot();
  if (!isDeepStrictEqual(restored, probe)) throw new Error('The saved colony did not match the original snapshot.');
  return { revision, active, receipts: history.length, status, checkpoint, alreadyImported: Boolean(existing) };
}

if (require.main === module) {
  try {
    const [, , snapshotFile, dataDirectory, ...extra] = process.argv;
    if (!snapshotFile || !dataDirectory || extra.length) {
      throw new Error('Usage: node scripts/wayglass-import-colony.cjs <colony-snapshot.json> <target Wayglass data directory>');
    }
    const snapshot = JSON.parse(readFileSync(snapshotFile, 'utf8').replace(/^\uFEFF/, ''));
    console.log(JSON.stringify(importColony(snapshot, dataDirectory)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { importColony };
