import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Emulate app.asar.unpacked without a repository-level lib directory.
test('Hearthgate packaged Wayglass router boots without repository siblings', () => {
  const host = path.resolve('apps/starwell-server');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hearthgate-package-'));
  try {
    fs.cpSync(path.join(host, 'wayglass'), path.join(temp, 'wayglass'), { recursive: true });
    fs.cpSync(path.join(host, 'wayglass-runtime'), path.join(temp, 'wayglass-runtime'), { recursive: true });
    fs.symlinkSync(path.join(host, 'node_modules'), path.join(temp, 'node_modules'), 'junction');
    const require = createRequire(path.join(temp, 'entry.cjs'));
    assert.equal(typeof require('./wayglass/router.js').createWayglassRouter, 'function');
    assert.ok(fs.existsSync(path.join(host, 'public/wayglass/index.html')));
    const config = JSON.parse(fs.readFileSync(path.join(host, 'package.json')));
    assert.ok(config.build.asarUnpack.includes('wayglass-runtime/**'));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
