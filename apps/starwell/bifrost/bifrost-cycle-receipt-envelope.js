import { buildBifrostSourceBindingReceipt } from './bifrost-runtime-source.js';

export const BIFROST_CYCLE_ENVELOPE_SCHEMA = 'bifrost.cycle-receipt-envelope/v0.1';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function cycleId(receipt) {
  return receipt?.receipt_id ?? `cycle-${receipt?.cycle ?? 'unknown'}`;
}

export function buildBifrostCycleReceiptEnvelope({
  cycleReceipt,
  runtimeState,
  executionPolicy,
  nativeActionReceipt = null,
  sourceBindingReceipt = null,
  actionId = 'run-window',
  envelopeId = null,
  exportedAt = new Date().toISOString(),
  notes = [],
} = {}) {
  if (!cycleReceipt) throw new Error('BIFROST_CYCLE_RECEIPT_REQUIRED');
  if (!runtimeState) throw new Error('BIFROST_RUNTIME_STATE_REQUIRED');

  const binding = sourceBindingReceipt ?? buildBifrostSourceBindingReceipt(runtimeState, {
    actionId,
    exported_at: exportedAt,
    notes: ['cycle-envelope-source-binding', ...notes],
  });
  const selectedSide = binding.selected_side ?? nativeActionReceipt?.selected_execution_side ?? runtimeState.active_execution_side ?? 'targetside';

  return Object.freeze({
    schema: BIFROST_CYCLE_ENVELOPE_SCHEMA,
    envelope_id: envelopeId ?? `bifrost-cycle-envelope-${cycleId(cycleReceipt)}`,
    exported_at: exportedAt,
    action_id: actionId,
    cycle: cycleReceipt.cycle ?? null,
    cycle_receipt_id: cycleReceipt.receipt_id ?? null,
    from_state_id: cycleReceipt.from_state_id ?? null,
    to_state_id: cycleReceipt.to_state_id ?? null,
    next_operation: cycleReceipt.next_operation ?? null,
    selected_execution_side: selectedSide,
    source_kind: binding.source_kind ?? null,
    source_state_id: binding.source_state_id ?? null,
    source_fingerprint: binding.source_fingerprint ?? null,
    bridge_status: runtimeState.bridge?.status ?? executionPolicy?.bridge_status ?? null,
    crossing_ready: runtimeState.bridge?.crossing_ready === true,
    certified_source: binding.certified_source === true,
    packet_id: runtimeState.packet_id ?? null,
    shared_state_fingerprint: runtimeState.shared_state_fingerprint ?? null,
    hearthside_state_id: runtimeState.hearthside?.id ?? null,
    hearthside_fingerprint: runtimeState.hearthside?.fingerprint ?? null,
    targetside_state_id: runtimeState.targetside?.id ?? null,
    targetside_fingerprint: runtimeState.targetside?.fingerprint ?? null,
    cycle_receipt: clone(cycleReceipt),
    source_binding_receipt: clone(binding),
    native_action_receipt: clone(nativeActionReceipt),
    execution_policy: clone(executionPolicy ?? nativeActionReceipt?.execution_policy ?? null),
    authority: {
      canon_write_performed: false,
      tone_approval_performed: false,
      physical_device_test_performed: false,
    },
    notes: Object.freeze([
      'A single compression-release cycle can now prove its Bifröst selected source without relying on the surrounding export bundle.',
      ...notes,
    ]),
  });
}

export function buildBifrostCycleReceiptEnvelopes({
  cycleReceipts = [],
  runtimeState,
  executionPolicy,
  nativeActionReceipt = null,
  sourceBindingReceipt = null,
  actionId = 'run-window',
  exportedAt = new Date().toISOString(),
  notes = [],
} = {}) {
  return Object.freeze(cycleReceipts.map((cycleReceipt, index) => buildBifrostCycleReceiptEnvelope({
    cycleReceipt,
    runtimeState,
    executionPolicy,
    nativeActionReceipt,
    sourceBindingReceipt,
    actionId,
    exportedAt,
    envelopeId: `bifrost-cycle-envelope-${index + 1}-${cycleId(cycleReceipt)}`,
    notes,
  })));
}

export function assertBifrostCycleEnvelopeLineage(envelope) {
  if (envelope?.schema !== BIFROST_CYCLE_ENVELOPE_SCHEMA) {
    throw new Error('BIFROST_CYCLE_ENVELOPE_SCHEMA_MISMATCH');
  }
  if (!envelope.from_state_id || !envelope.to_state_id) {
    throw new Error('BIFROST_CYCLE_ENVELOPE_LINEAGE_MISSING');
  }
  if (!envelope.selected_execution_side) {
    throw new Error('BIFROST_CYCLE_ENVELOPE_SOURCE_SIDE_MISSING');
  }
  if (!envelope.source_binding_receipt) {
    throw new Error('BIFROST_CYCLE_ENVELOPE_SOURCE_BINDING_MISSING');
  }
  if (envelope.source_binding_receipt.selected_side !== envelope.selected_execution_side) {
    throw new Error('BIFROST_CYCLE_ENVELOPE_SOURCE_SIDE_MISMATCH');
  }
  return true;
}
