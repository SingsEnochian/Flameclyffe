import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BIFROST_MAIN_EXPORT_V05_SCHEMA,
  buildBifrostMainExportV05,
} from '../bifrost/bifrost-main-export-v05.js';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

const sourceBindingReceipt = Object.freeze({
  schema: 'bifrost.source-binding-receipt/v0.1',
  selected_side: 'targetside',
  source_kind: 'temporal-state',
  source_state_id: 'target-state',
  source_fingerprint: 'shared-fp',
  certified_source: true,
});

const runtimeState = Object.freeze({
  schema: 'bifrost.runtime-state/v0.1',
  packet_id: 'packet-two-shore',
  shared_state_fingerprint: 'shared-fp',
  active_execution_side: 'targetside',
  bridge: {
    status: 'TWO_SHORE_PREMAQ_VISIBLE',
    crossing_ready: true,
    certified: true,
  },
  hearthside: {
    id: 'hearth-state',
    fingerprint: 'shared-fp',
  },
  targetside: {
    id: 'target-state',
    fingerprint: 'shared-fp',
  },
});

const nativeActionReceipt = Object.freeze({
  schema: 'bifrost.native-action-receipt/v0.2',
  action_id: 'export-receipts',
  selected_execution_side: 'targetside',
  execution_source: {
    selected_side: 'targetside',
    source_kind: 'temporal-state',
    source_state_id: 'target-state',
    source_fingerprint: 'shared-fp',
  },
  source_binding_receipt: sourceBindingReceipt,
});

const gate = Object.freeze({
  allowed: true,
  runtimeState,
  policy: {
    schema: 'bifrost.runtime-execution-policy/v0.1',
    bridge_status: 'TWO_SHORE_PREMAQ_VISIBLE',
    crossing_ready: true,
    certified: true,
    blocked_actions: [],
  },
  receipt: nativeActionReceipt,
});

const session = Object.freeze({
  schema: 'bifrost.current-interface-session/v0.4',
  source_mode: 'active-packet',
  packet_fingerprint: 'packet-fp',
  source_state: { state_id: 'target-state' },
  state: { state_id: 'current-state', spiral: { cycle: 2 } },
  bifrost_runtime: {
    runtime_state: runtimeState,
    execution_source: nativeActionReceipt.execution_source,
    source_binding_receipt: sourceBindingReceipt,
  },
  receipts: [
    {
      cycle: 1,
      receipt_id: 'cycle-receipt-1',
      from_state_id: 'target-state',
      to_state_id: 'released-state-1',
      next_operation: 'compression-of-release',
    },
    {
      cycle: 2,
      receipt_id: 'cycle-receipt-2',
      from_state_id: 'released-state-1',
      to_state_id: 'released-state-2',
      next_operation: 'compression-of-release',
    },
  ],
});

test('Bifrost main export v0.5 carries cycle receipt envelopes inline', () => {
  const payload = buildBifrostMainExportV05({
    session,
    gate,
    exportedAt: '2026-08-22T08:05:00.000Z',
  });

  assert.equal(payload.schema, BIFROST_MAIN_EXPORT_V05_SCHEMA);
  assert.equal(payload.cycle_envelope_count, 2);
  assert.equal(payload.cycle_receipt_envelopes.length, 2);
  assert.equal(payload.cycle_receipt_envelopes[0].schema, 'bifrost.cycle-receipt-envelope/v0.1');
  assert.equal(payload.cycle_receipt_envelopes[0].selected_execution_side, 'targetside');
  assert.equal(payload.cycle_receipt_envelopes[0].source_state_id, 'target-state');
  assert.equal(payload.cycle_receipt_envelopes[0].source_binding_receipt.schema, 'bifrost.source-binding-receipt/v0.1');
  assert.equal(payload.compatibility.replaces_legacy_export_schema, 'bifrost.current-interface-export/v0.4');
});

test('Bifrost main export v0.5 refuses missing session or gate', () => {
  assert.throws(() => buildBifrostMainExportV05({ gate }), /BIFROST_MAIN_EXPORT_SESSION_REQUIRED/);
  assert.throws(() => buildBifrostMainExportV05({ session }), /BIFROST_MAIN_EXPORT_GATE_REQUIRED/);
});

test('runtime bootstrap installs the main export v0.5 cut-over', async () => {
  const bootstrap = await read('../bifrost/bifrost-runtime-bootstrap.js');

  assert.match(bootstrap, /bifrost-main-export-v05\.js/);
  assert.match(bootstrap, /installBifrostMainExportV05/);
  assert.match(bootstrap, /main_export_v05_cutover_installed/);
});
