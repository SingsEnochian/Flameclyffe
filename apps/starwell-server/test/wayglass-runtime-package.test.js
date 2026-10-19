'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

// Electron packages apps/starwell-server independently of repository-root lib/.
// Keep this list aligned with router.js and its transitive CommonJS dependencies.
const modules = [
  "wayglass-route-registry.cjs",
  "wayglass-kernel.cjs",
  "wayglass-world-entry.cjs",
  "wayglass-stop-receipt.cjs",
  "wayglass-departure-store.cjs",
  "wayglass-model-observation.cjs",
  "wayglass-continuation-packet.cjs",
  "wayglass-waygate.cjs"
];
const packageRoot = path.resolve(__dirname, '..');
const repositoryLib = path.resolve(packageRoot, '../../lib');
const runtime = path.join(packageRoot, 'wayglass-runtime');

test('packaged Wayglass runtime is complete and matches canonical lib sources', () => {
  const router = fs.readFileSync(path.join(packageRoot, 'wayglass/router.js'), 'utf8');
  const imported = [...router.matchAll(/require\(['"]\.\.\/wayglass-runtime\/([^'"]+)['"]\)/g)];
  for (const [, name] of imported) {
    assert.ok(modules.includes(name), 'router imports an unbundled Wayglass runtime module: ' + name);
  }
  for (const name of modules) {
    const source = fs.readFileSync(path.join(repositoryLib, name), 'utf8');
    const bundled = fs.readFileSync(path.join(runtime, name), 'utf8');
    assert.equal(bundled, source, name + ' differs from the reviewed canonical implementation');

    const dependencies = [...bundled.matchAll(/\brequire\(['"]([.][^'"]+)['"]\)/g)];
    for (const [, dependency] of dependencies) {
      const target = path.resolve(runtime, dependency);
      assert.ok(target.startsWith(runtime + path.sep), name + ' escapes the packaged runtime');
      assert.ok(fs.existsSync(target), name + ' imports missing ' + dependency);
    }
  }
});

test('packaged Wayglass runtime loads and retains distinct identities without repository lib/', (t) => {
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-runtime-package-'));
  t.after(() => fs.rmSync(isolated, { recursive: true, force: true }));
  for (const name of modules) fs.copyFileSync(path.join(runtime, name), path.join(isolated, name));

  const smoke = `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    const folder = process.argv[1];
    const load = name => require(path.join(folder, name));
    const registry = load('wayglass-route-registry.cjs');
    assert.equal(registry.resolveWayglassRoute('flame:bluebird:spicychat').participant_id, 'bluebird');
    assert.equal(registry.resolveWayglassRoute('flame:griff:spicychat').participant_id, 'griff-krenshaw');
    const publicRoutes = registry.publicWayglassRoutes();
    assert.ok(publicRoutes.some(route => route.route_id === 'flame:bluebird:spicychat'));
    const boot = load('wayglass-kernel.cjs').bootWayglassKernel({ preferred_route: 'local:ollama' });
    assert.equal(boot.status, 'boot-contract');
    assert.equal(boot.cognition.route_id, 'local:ollama');
    assert.equal(typeof load('wayglass-world-entry.cjs').enterWayglassWorld, 'function');
    assert.equal(typeof load('wayglass-stop-receipt.cjs').createWayglassDeparture, 'function');
    assert.equal(typeof load('wayglass-departure-store.cjs').createDepartureStore, 'function');
    assert.equal(typeof load('wayglass-model-observation.cjs').createModelObservation, 'function');
  `;
  const child = spawnSync(process.execPath, ['-e', smoke, isolated], {
    cwd: isolated,
    encoding: 'utf8',
    timeout: 15000,
    env: { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '' },
  });
  assert.equal(child.status, 0, child.stderr || child.error?.message || 'isolated packaged runtime failed');
});
