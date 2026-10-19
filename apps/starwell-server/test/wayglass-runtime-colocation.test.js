'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const names = [
  'wayglass-continuation-packet.cjs',
  'wayglass-departure-store.cjs',
  'wayglass-inheritance-context.cjs',
  'wayglass-kernel.cjs',
  'wayglass-model-observation.cjs',
  'wayglass-reasoning-receipt.cjs',
  'wayglass-return-trial.cjs',
  'wayglass-route-registry.cjs',
  'wayglass-stop-receipt.cjs',
  'wayglass-travelling-inheritance.cjs',
  'wayglass-voyage-messages.cjs',
  'wayglass-voyage-runner.cjs',
  'wayglass-waygate.cjs',
  'wayglass-world-entry.cjs',
];
const canonical = path.resolve(__dirname, '..', 'wayglass-runtime');
const legacy = path.resolve(__dirname, '..', '..', '..', 'lib');

test('one canonical host-owned Wayglass runtime backs all legacy CommonJS imports', () => {
  for (const name of names) {
    assert.equal(fs.existsSync(path.join(canonical, name)), true, name);
    assert.strictEqual(require(path.join(legacy, name)), require(path.join(canonical, name)), name);
  }
});

test('browser staging never copies implementations out of root lib', () => {
  const stage = fs.readFileSync(path.resolve(__dirname, '..', 'wayglass', 'client', 'server-stage.cjs'), 'utf8');
  assert.equal(stage.includes("readdir(path.join(repoRoot, 'lib')"), false);
  assert.equal(stage.includes("copyFile(path.join(repoRoot, 'lib'"), false);
});
