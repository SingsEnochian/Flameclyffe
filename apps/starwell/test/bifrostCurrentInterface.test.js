import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('dedicated Bifröst compatibility route retains the current compression-release interface', async () => {
  const [html, main, root, shell, vite, manifestText] = await Promise.all([
    read('../bifrost/index.html'),
    read('../bifrost/main.js'),
    read('../index.html'),
    read('../public/shell/arcsweep-shell.js'),
    read('../vite.config.js'),
    read('../public/modules/bifrost-arcsweep.module.json'),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(html, /Bifröst Arcsweep v0\.4/);
  assert.match(html, /compression of the release/);
  assert.match(html, /Feather Stop/);
  assert.match(html, /Rowan Approval Gate/);
  assert.doesNotMatch(html, /\bcollapse\b/i);

  assert.match(main, /compressRelease/);
  assert.match(main, /readActiveDualAspectPacket/);
  assert.match(main, /next_operation/);
  assert.match(main, /compression-of-release/);
  assert.doesNotMatch(main, /collapseRelease\s*\(/);
  assert.doesNotMatch(main, /action:\s*['"]collapse-release['"]/);

  assert.doesNotMatch(root, /href=['"]\.\/bifrost\//);
  assert.doesNotMatch(shell, /label:\s*['"]Bifröst['"]/);
  assert.match(shell, /livingArcsweepUrl/);
  assert.match(vite, /bifrost:\s*resolve\(REPO_ROOT, 'apps\/starwell\/bifrost\/index\.html'\)/);

  assert.equal(manifest.version, '0.4.0');
  assert.equal(manifest.interfaceRoute, '/starwell/bifrost/');
  assert.equal(manifest.interfaceEntrypoint, 'bifrost/index.html');
  assert.equal(manifest.engine.interface, 'bifrost/main.js');
  assert.equal(manifest.engine.formalism, 'temporal-compression-release-state-machine');
  assert.equal(manifest.engine.physicalClaim, false);
  assert.equal(manifest.authorityContract.collapseExists, false);
  assert.equal(manifest.authorityContract.releaseFeedsNextCompression, true);
  assert.ok(manifest.capabilities.includes('dedicated-bifrost-interface'));
  assert.equal(manifest.installContract.verifyInterfaceRoute, 'bifrost/index.html');
});
