import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIFROST_SOURCE_KIND,
  buildBifrostSourceBindingReceipt,
  promoteBifrostRuntimeSource,
  resolveBifrostExecutionSource,
} from '../bifrost/bifrost-runtime-source.js';
import {
  enforceBifrostNativeAction,
} from '../bifrost/bifrost-native-action-guard.js';

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

test('runtime source promotion records targetside as an explicit execution side', () => {
  const runtime = promoteBifrostRuntimeSource(packet(), {
    active_execution_side: 'targetside',
    now: '2026-08-22T07:49:00.000Z',
  });
  const source = resolveBifrostExecutionSource(runtime);

  assert.equal(runtime.active_execution_side, 'targetside');
  assert.equal(source.selected_side, 'targetside');
  assert.equal(source.source_kind, BIFROST_SOURCE_KIND.TEMPORAL_STATE);
  assert.equal(source.source_state_id, 'target-state');
  assert.equal(source.certified, true);
  assert.match(source.reason, /explicit Bifröst execution source/);
});

test('runtime source promotion can select hearthside without rewriting packet truth', () => {
  const runtime = promoteBifrostRuntimeSource(packet(), {
    active_execution_side: 'hearthside',
    now: '2026-08-22T07:49:00.000Z',
  });
  const source = resolveBifrostExecutionSource(runtime);

  assert.equal(runtime.active_execution_side, 'hearthside');
  assert.equal(source.selected_side, 'hearthside');
  assert.equal(source.source_state_id, 'hearth-state');
  assert.equal(runtime.targetside.id, 'target-state');
  assert.equal(runtime.hearthside.id, 'hearth-state');
});

test('source binding receipt includes both shores and the selected execution source', () => {
  const runtime = promoteBifrostRuntimeSource(packet(), {
    active_execution_side: 'targetside',
    now: '2026-08-22T07:49:00.000Z',
  });
  const receipt = buildBifrostSourceBindingReceipt(runtime, {
    actionId: 'run-window',
    exported_at: '2026-08-22T07:50:00.000Z',
  });

  assert.equal(receipt.schema, 'bifrost.source-binding-receipt/v0.1');
  assert.equal(receipt.action_id, 'run-window');
  assert.equal(receipt.selected_side, 'targetside');
  assert.equal(receipt.source_state_id, 'target-state');
  assert.equal(receipt.hearthside_state_id, 'hearth-state');
  assert.equal(receipt.targetside_state_id, 'target-state');
  assert.equal(receipt.certified_source, true);
});

test('native action receipt carries source binding instead of silent targetside assumption', () => {
  const result = enforceBifrostNativeAction({
    actionId: 'run-window',
    packetReader: () => packet(),
    active_execution_side: 'targetside',
  });

  assert.equal(result.allowed, true);
  assert.equal(result.receipt.schema, 'bifrost.native-action-receipt/v0.2');
  assert.equal(result.receipt.selected_execution_side, 'targetside');
  assert.equal(result.receipt.execution_source.source_state_id, 'target-state');
  assert.equal(result.receipt.source_binding_receipt.schema, 'bifrost.source-binding-receipt/v0.1');
});

test('missing selected source blocks even before legacy engine execution', () => {
  const runtime = promoteBifrostRuntimeSource(packet({ targetside: undefined }), {
    active_execution_side: 'targetside',
    now: '2026-08-22T07:49:00.000Z',
  });
  const source = resolveBifrostExecutionSource(runtime);

  assert.equal(source.source_kind, BIFROST_SOURCE_KIND.MISSING);
  assert.equal(source.executable, false);
});
