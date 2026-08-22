import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('main.js imports runtime source promotion instead of direct targetside binding', async () => {
  const main = await read('../bifrost/main.js');

  assert.match(main, /bifrost-runtime-source\.js/);
  assert.match(main, /promoteBifrostRuntimeSource/);
  assert.match(main, /resolveBifrostExecutionSource/);
  assert.match(main, /buildBifrostSourceBindingReceipt/);
  assert.match(main, /ACTIVE_EXECUTION_SIDE = 'targetside'/);
  assert.doesNotMatch(main, /const candidate = packet\?\.temporal\?\.targetside/);
});

test('main.js binds active packets through source receipts and session runtime fields', async () => {
  const main = await read('../bifrost/main.js');

  assert.match(main, /function bindRuntimeSource\(packet/);
  assert.match(main, /stateFromActivePacket targetside shortcut has been replaced/);
  assert.match(main, /window\.__BIFROST_LAST_SOURCE_BINDING_RECEIPT__/);
  assert.match(main, /bifrost_runtime:\s*\{/);
  assert.match(main, /execution_source: executionSource/);
  assert.match(main, /source_binding_receipt: sourceBindingReceipt/);
});

test('main.js export receipts include selected execution side and source binding', async () => {
  const main = await read('../bifrost/main.js');

  assert.match(main, /selected_execution_side: executionSource\?\.selected_side/);
  assert.match(main, /source_state_id: sourceState\?\.state_id/);
  assert.match(main, /source_binding_receipt: sourceBindingReceipt/);
  assert.match(main, /native_action_receipt: gate\.receipt/);
});
