import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bootstrapUrl = new URL('../src/main-bootstrap.js', import.meta.url);
const coreUrl = new URL('../src/terra-prime-core.js', import.meta.url);
const sidecarUrl = new URL('../src/terra-prime-waking-world-sidecar.js', import.meta.url);

test('normal boot reconciles Terra Prime before main UI hydration', async () => {
  const source = await readFile(bootstrapUrl, 'utf8');
  const terraPrimeImport = source.indexOf("await import('./terra-prime-core.js')");
  const terraPrimeSync = source.indexOf('await synchroniseTerraPrimeWakingWorld()');
  const mainImport = source.indexOf("await import('./main.js')");

  assert.ok(terraPrimeImport >= 0, 'core bootstrap must import the Terra Prime synchroniser');
  assert.ok(terraPrimeSync > terraPrimeImport, 'Terra Prime must be synchronised after its core module loads');
  assert.ok(mainImport > terraPrimeSync, 'Terra Prime must be reconciled before main.js hydrates the world registry');
});

test('Terra Prime synchronisation is pure core infrastructure reused by the recovery sidecar', async () => {
  const core = await readFile(coreUrl, 'utf8');
  const sidecar = await readFile(sidecarUrl, 'utf8');

  assert.match(core, /ensureTerraPrimeWakingWorld/);
  assert.match(core, /saveState/);
  assert.match(core, /recordWorldSnapshot/);
  assert.match(sidecar, /from '\.\/terra-prime-core\.js'/);
  assert.doesNotMatch(sidecar, /from '\.\/storage\.js'/);
  assert.doesNotMatch(sidecar, /from '\.\/waking-world\.js'/);
});
