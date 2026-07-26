'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const {
  MODES,
  ObserverScoopRuntime,
} = require('./observer-scoop.runtime');

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'observer-scoop-runtime-'));
}

function successResult() {
  return {
    bundle: { failed_count: 0 },
    archive: { error: null },
  };
}

function degradedResult() {
  return {
    bundle: { failed_count: 1 },
    archive: { error: null },
  };
}

test('manual polling remains isolated in MANUAL mode', async () => {
  const dataDir = await tempDir();
  const runtime = new ObserverScoopRuntime({ dataDir, run: async () => successResult() });

  const result = await runtime.runOnce('manual');

  assert.equal(result.runtime.mode, MODES.MANUAL);
  assert.equal(result.runtime.polling, false);
  assert.equal(result.runtime.last_status, 'SUCCESS');
  await fs.rm(dataDir, { recursive: true, force: true });
});

test('interval source faults transition to DEGRADED with a throttled retry', async () => {
  const dataDir = await tempDir();
  const runtime = new ObserverScoopRuntime({
    dataDir,
    intervalMs: 30_000,
    run: async () => degradedResult(),
  });

  await runtime.transition(MODES.INTERVAL, 'test_interval');
  const result = await runtime.runOnce('interval');

  assert.equal(result.runtime.mode, MODES.DEGRADED);
  assert.equal(result.runtime.last_status, 'DEGRADED');
  assert.equal(result.runtime.consecutive_faults, 1);
  assert.ok(result.runtime.next_poll_at);
  await runtime.stop();
  await fs.rm(dataDir, { recursive: true, force: true });
});

test('severe exceptions lock ERROR mode and write a diagnostic receipt', async () => {
  const dataDir = await tempDir();
  const runtime = new ObserverScoopRuntime({
    dataDir,
    run: async () => { throw new Error('severe test failure'); },
  });

  await assert.rejects(() => runtime.runOnce('manual'), /severe test failure/);
  assert.equal(runtime.getState().mode, MODES.ERROR);
  assert.equal(runtime.getState().locked, true);

  const diagnosticDir = path.join(dataDir, 'observer-scoop', 'diagnostics');
  const files = await fs.readdir(diagnosticDir);
  assert.equal(files.length, 1);

  await runtime.resetError();
  assert.equal(runtime.getState().mode, MODES.OFF);
  await fs.rm(dataDir, { recursive: true, force: true });
});
