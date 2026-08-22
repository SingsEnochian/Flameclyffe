import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { enforceBifrostNativeAction } from '../bifrost/bifrost-native-action-guard.js';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

const values = Object.freeze({ P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 });

function temporalState(id, fingerprint = 'shared-fp') {
  return {
    state_id: id,
    shared_state_fingerprint: fingerprint,
    probabilities: values,
  };
}

function packet(options = {}) {
  const hearthside = Object.hasOwn(options, 'hearthside')
    ? options.hearthside
    : temporalState('hearth-state');
  const targetside = Object.hasOwn(options, 'targetside')
    ? options.targetside
    : temporalState('target-state');
  const temporal = {};
  if (hearthside !== undefined) temporal.hearthside = hearthside;
  if (targetside !== undefined) temporal.targetside = targetside;
  return {
    packet_id: 'packet-two-shore',
    packet_fingerprint: 'packet-fp',
    correspondence: { shared_state_fingerprint: 'shared-fp' },
    temporal,
  };
}

test('main engine controls import the native Bifröst action guard', async () => {
  const main = await read('../bifrost/main.js');

  assert.match(main, /bifrost-native-action-guard\.js/);
  assert.match(main, /enforceNativeAction\('run-window'/);
  assert.match(main, /enforceNativeAction\('sound-pair'/);
  assert.match(main, /enforceNativeAction\('export-receipts'/);
  assert.match(main, /bifrost_runtime/);
  assert.match(main, /native_action_receipt/);
});

test('PREMAQ song controls import the native Bifröst action guard', async () => {
  const song = await read('../bifrost/premaq-song.js');

  assert.match(song, /bifrost-native-action-guard\.js/);
  assert.match(song, /enforceSongAction\('play-premaq-song'/);
  assert.match(song, /enforceSongAction\('export-premaq-song'/);
  assert.match(song, /bifrost_native_action_receipt/);
  assert.match(song, /export_native_action_receipt/);
});

test('native action guard allows labelled local reference preview without certification', () => {
  const result = enforceBifrostNativeAction({
    actionId: 'run-window',
    packetReader: () => null,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.policy.local_reference, true);
  assert.equal(result.policy.certified, false);
  assert.equal(result.receipt.schema, 'bifrost.native-action-receipt/v0.2');
  assert.equal(result.receipt.source_kind, 'local-reference');
  assert.equal(result.receipt.execution_allowed, true);
});

test('native action guard blocks incomplete two-shore packets before engine execution', () => {
  const result = enforceBifrostNativeAction({
    actionId: 'run-window',
    packetReader: () => packet({ targetside: undefined }),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.policy.bridge_status, 'SHORE_STATE_INCOMPLETE');
  assert.equal(result.receipt.schema, 'bifrost.native-action-receipt/v0.2');
  assert.equal(result.receipt.action_id, 'run-window');
  assert.equal(result.receipt.execution_allowed, false);
  assert.equal(result.receipt.source_binding_receipt.schema, 'bifrost.source-binding-receipt/v0.1');
});

test('native action guard allows complete temporal two-shore song export', () => {
  const result = enforceBifrostNativeAction({
    actionId: 'export-premaq-song',
    packetReader: () => packet(),
  });

  assert.equal(result.allowed, true);
  assert.equal(result.policy.bridge_status, 'TWO_SHORE_PREMAQ_VISIBLE');
  assert.equal(result.policy.crossing_ready, true);
  assert.equal(result.policy.certified, true);
  assert.equal(result.receipt.action_id, 'export-premaq-song');
  assert.equal(result.receipt.selected_execution_side, 'targetside');
  assert.equal(result.receipt.execution_source.source_state_id, 'target-state');
});
