'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const {
  createBackup,
  createStorePaths,
  listBackups,
  readState,
  restoreBackup,
  writeStateAtomic,
} = require('../desktop/store.cjs');

test('desktop store saves atomically and restores a recovery snapshot', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-store-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const paths = createStorePaths(root);

  await writeStateAtomic(paths, { version: '0.2.0', worlds: [{ id: 'one', name: 'First' }] }, { reason: 'test-first' });
  const first = await readState(paths);
  assert.equal(first.state.worlds[0].name, 'First');
  assert.match(first.sha256, /^[a-f0-9]{64}$/);

  const backup = await createBackup(paths, 'manual-test');
  assert.equal(backup.ok, true);

  await writeStateAtomic(paths, { version: '0.2.0', worlds: [{ id: 'one', name: 'Second' }] }, { reason: 'test-second' });
  const second = await readState(paths);
  assert.equal(second.state.worlds[0].name, 'Second');

  const restored = await restoreBackup(paths, backup.name);
  assert.equal(restored.state.worlds[0].name, 'First');
  const afterRestore = await readState(paths);
  assert.equal(afterRestore.state.worlds[0].name, 'First');
  assert.ok((await listBackups(paths)).length >= 1);
});

test('desktop store reports an empty first run honestly', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-empty-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const result = await readState(createStorePaths(root));
  assert.equal(result.exists, false);
  assert.equal(result.state, null);
});
