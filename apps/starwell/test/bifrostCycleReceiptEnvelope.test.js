import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIFROST_CYCLE_ENVELOPE_SCHEMA,
  assertBifrostCycleEnvelopeLineage,
  buildBifrostCycleReceiptEnvelope,
  buildBifrostCycleReceiptEnvelopes,
} from '../bifrost/bifrost-cycle-receipt-envelope.js';
import { promoteBifrostRuntimeSource } from '../bifrost/bifrost-runtime-source.js';
import { buildBifrostRuntimeExecutionPolicy } from '../bifrost/bifrost-runtime-engine-bridge.js';

const values = Object.freeze({ P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 });

function temporalState(id, fingerprint = 'shared-fp') {
  return {
    state_id: id,
    shared_state_fingerprint: fingerprint,
    probabilities: values,
  };
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

function cycleReceipt(cycle = 1) {
  return {
    receipt_id: `cycle-receipt-${cycle}`,
    cycle,
    from_state_id: cycle === 1 ? 'target-state' : `released-${cycle - 1}`,
    to_state_id: `released-${cycle}`,
    next_operation: 'compression-of-release',
    outward_distance: 0.123 + cycle,
  };
}

test('cycle envelope carries selected source, both shores and runtime policy', () => {
  const runtimeState = promoteBifrostRuntimeSource(packet(), {
    active_execution_side: 'targetside',
    now: '2026-08-22T07:58:00.000Z',
  });
  const executionPolicy = buildBifrostRuntimeExecutionPolicy(runtimeState);
  const envelope = buildBifrostCycleReceiptEnvelope({
    cycleReceipt: cycleReceipt(1),
    runtimeState,
    executionPolicy,
    actionId: 'run-window',
    exportedAt: '2026-08-22T07:59:00.000Z',
  });

  assert.equal(envelope.schema, BIFROST_CYCLE_ENVELOPE_SCHEMA);
  assert.equal(envelope.selected_execution_side, 'targetside');
  assert.equal(envelope.source_state_id, 'target-state');
  assert.equal(envelope.hearthside_state_id, 'hearth-state');
  assert.equal(envelope.targetside_state_id, 'target-state');
  assert.equal(envelope.bridge_status, 'TWO_SHORE_PREMAQ_VISIBLE');
  assert.equal(envelope.crossing_ready, true);
  assert.equal(envelope.certified_source, true);
  assert.equal(envelope.authority.canon_write_performed, false);
  assert.equal(envelope.authority.tone_approval_performed, false);
  assert.equal(envelope.authority.physical_device_test_performed, false);
  assertBifrostCycleEnvelopeLineage(envelope);
});

test('cycle envelope lineage check rejects missing source binding', () => {
  assert.throws(() => assertBifrostCycleEnvelopeLineage({
    schema: BIFROST_CYCLE_ENVELOPE_SCHEMA,
    from_state_id: 'a',
    to_state_id: 'b',
    selected_execution_side: 'targetside',
  }), /BIFROST_CYCLE_ENVELOPE_SOURCE_BINDING_MISSING/);
});

test('cycle envelopes preserve per-cycle release lineage across a window', () => {
  const runtimeState = promoteBifrostRuntimeSource(packet(), {
    active_execution_side: 'targetside',
    now: '2026-08-22T07:58:00.000Z',
  });
  const envelopes = buildBifrostCycleReceiptEnvelopes({
    cycleReceipts: [cycleReceipt(1), cycleReceipt(2), cycleReceipt(3)],
    runtimeState,
    executionPolicy: buildBifrostRuntimeExecutionPolicy(runtimeState),
    actionId: 'run-window',
    exportedAt: '2026-08-22T07:59:00.000Z',
  });

  assert.equal(envelopes.length, 3);
  for (const envelope of envelopes) assertBifrostCycleEnvelopeLineage(envelope);
  assert.equal(envelopes[0].from_state_id, 'target-state');
  assert.equal(envelopes[1].from_state_id, envelopes[0].to_state_id);
  assert.equal(envelopes[2].from_state_id, envelopes[1].to_state_id);
});
