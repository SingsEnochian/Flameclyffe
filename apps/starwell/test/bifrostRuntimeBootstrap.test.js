import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Bifröst runtime bootstrap loads before legacy engine handlers', async () => {
  const html = await read('../bifrost/index.html');

  const bootstrapIndex = html.indexOf('./bifrost-runtime-bootstrap.js');
  const mainIndex = html.indexOf('./main.js');
  const panelIndex = html.indexOf('./two-shore-premaq.js');

  assert.notEqual(bootstrapIndex, -1);
  assert.notEqual(mainIndex, -1);
  assert.notEqual(panelIndex, -1);
  assert.ok(bootstrapIndex < mainIndex);
  assert.ok(mainIndex < panelIndex);
});

test('runtime bootstrap installs the execution bridge and publishes receipts', async () => {
  const bootstrap = await read('../bifrost/bifrost-runtime-bootstrap.js');

  assert.match(bootstrap, /installBifrostRuntimeExecutionBridge/);
  assert.match(bootstrap, /applyBifrostRuntimeExecutionPolicy/);
  assert.match(bootstrap, /bifrost\.runtime-bootstrap\/v0\.1/);
  assert.match(bootstrap, /__BIFROST_RUNTIME_STATE__/);
  assert.match(bootstrap, /__BIFROST_RUNTIME_EXECUTION_POLICY__/);
  assert.match(bootstrap, /__BIFROST_RUNTIME_BOOTSTRAP_RECEIPT__/);
  assert.match(bootstrap, /bifrost:runtime-bootstrap/);
});

test('runtime bootstrap keeps blocked action receipts available to review tools', async () => {
  const bootstrap = await read('../bifrost/bifrost-runtime-bootstrap.js');

  assert.match(bootstrap, /__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__/);
  assert.match(bootstrap, /onBlockedAction/);
  assert.match(bootstrap, /guard_installed_before_legacy_handlers/);
  assert.match(bootstrap, /loaded_before_main/);
});
