import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildBifrostCycleEnvelopeExportPayload } from '../bifrost/bifrost-cycle-envelope-export-sidecar.js';
import { promoteBifrostRuntimeSource } from '../bifrost/bifrost-runtime-source.js';
import { buildBifrostRuntimeExecutionPolicy } from '../bifrost/bifrost-runtime-engine-bridge.js';
import { buildNativeActionReceipt } from '../bifrost/bifrost-native-action-guard.js';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

const values = Object.freeze({ P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 });

function temporalState(id, fingerprint = 'shared-fp') {
  return { state_id: id, shared_state_fingerprint: fingerprint, probabilities: values };
}

function packet() {
  return {
    packet_id: 'packet-two-shore',
    packet_fingerprint: 'packet-fp',
    correspondence: { shared_state_fingerprint: 'shared-fp' },
    temporal: {
      hearthside: temporalState('hearth-state'),
      targetside: temporalState('target-state'),
    },
  };
}

function cycleReceipt(index = 1) {
  return {
    receipt_id: `cycle-receipt-${index}`,
    cycle: index,
    from_state_id: index === 1 ? 'target-state' : `released-${index - 1}`,
    to_state_id: `released-${index}`,
    next_operation: 'compression-of-release',
  };
}

test('runtime bootstrap installs the cycle envelope export sidecar', async () => {
  const bootstrap = await read('../bifrost/bifrost-runtime-bootstrap.js');

  assert.match(bootstrap, /bifrost-cycle-envelope-export-sidecar\.js/);
  assert.match(bootstrap, /installBifrostCycleEnvelopeExportSidecar/);
  assert.match(bootstrap, /cycle_envelope_export_sidecar_installed/);
});

test('cycle envelope export payload wraps every cycle receipt with Bifröst source lineage', () => {
  const runtimeState = promoteBifrostRuntimeSource(packet(), { active_execution_side: 'targetside' });
  const executionPolicy = buildBifrostRuntimeExecutionPolicy(runtimeState);
  const nativeActionReceipt = buildNativeActionReceipt(runtimeState, 'export-receipts', {
    policy: executionPolicy,
    active_execution_side: 'targetside',
  });
  const session = {
    state: { spiral: { cycle: 2 } },
    receipts: [cycleReceipt(1), cycleReceipt(2)],
    bifrost_runtime: {
      runtime_state: runtimeState,
      source_binding_receipt: nativeActionReceipt.source_binding_receipt,
    },
  };

  const payload = buildBifrostCycleEnvelopeExportPayload({
    session,
    runtimeState,
    executionPolicy,
    nativeActionReceipt,
    exportedAt: '2026-08-22T08:01:00.000Z',
  });

  assert.equal(payload.schema, 'bifrost.cycle-envelope-export-sidecar/v0.1');
  assert.equal(payload.cycle_envelope_count, 2);
  assert.equal(payload.cycle_receipt_envelopes[0].schema, 'bifrost.cycle-receipt-envelope/v0.1');
  assert.equal(payload.cycle_receipt_envelopes[0].selected_execution_side, 'targetside');
  assert.equal(payload.cycle_receipt_envelopes[0].source_state_id, 'target-state');
  assert.equal(payload.cycle_receipt_envelopes[0].source_binding_receipt.schema, 'bifrost.source-binding-receipt/v0.1');
  assert.equal(payload.authority.canon_write_performed, false);
  assert.equal(payload.authority.tone_approval_performed, false);
  assert.equal(payload.authority.physical_device_test_performed, false);
});
