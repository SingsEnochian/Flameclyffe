import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Arcsweep mounts the durable World Registry persistence controller', async () => {
  const manifest = await readFile('apps/arcsweep/src/sidecar-bootstrap.js', 'utf8');
  assert.match(manifest, /world-registry-persistence-sidecar\.js/);
});

test('World Registry persistence controller owns create, save, delete and recovery', async () => {
  const source = await readFile('apps/arcsweep/src/world-registry-persistence-sidecar.js', 'utf8');
  assert.match(source, /world-registry-new-world-atomic-v2/);
  assert.match(source, /world-registry-save-atomic-v2/);
  assert.match(source, /world-registry-delete-atomic-v2/);
  assert.match(source, /world-registry-journal-recovery-v2/);
  assert.match(source, /await verifyWorld/);
});
