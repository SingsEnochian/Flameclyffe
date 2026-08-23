import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BIFROST_RUNTIME_STATUS,
  buildBifrostReceiptSidecar,
  buildBifrostRuntimeState,
  bridgeBlocksCertifiedExecution,
} from '../bifrost/bifrost-runtime-state.js';
import { TWO_SHORE_PREMAQC_GATE_CONTRACT } from '../bifrost/two-shore-premaqc.js';
import { TWO_SHORE_PREMAQC_GATE_SCHEMA } from '../src/premaqc-contract.js';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

const values = Object.freeze({ P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0 });

function temporalState(id, fingerprint = 'shared-fp') {
  return {
    state_id: id,
    shared_state_fingerprint: fingerprint,
    probabilities: values,
  };
}

function packet(options = {}) {
  const hearthside = Object.hasOwn(options, 'hearthside') ? options.hearthside : temporalState('hearth-state');
  const targetside = Object.hasOwn(options, 'targetside') ? options.targetside : temporalState('target-state');
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

test('Bifröst route loads the canonical two-shore PREMAQC runtime panel', async () => {
  const [html, panel, runtime] = await Promise.all([
    read('../bifrost/index.html'),
    read('../bifrost/two-shore-premaqc.js'),
    read('../bifrost/bifrost-runtime-state.js'),
  ]);

  assert.match(html, /two-shore-premaqc\.js/);
  assert.match(html, /PREMAQC/);
  assert.match(panel, /TWO_SHORE_PREMAQC_PANEL_SCHEMA/);
  assert.equal(TWO_SHORE_PREMAQC_GATE_SCHEMA, 'hearthgate.two-shore-premaqc-gate/v1');
  assert.equal(TWO_SHORE_PREMAQC_GATE_CONTRACT.schema, TWO_SHORE_PREMAQC_GATE_SCHEMA);
  assert.match(runtime, /TWO_SHORE_PREMAQC_VISIBLE/);
  assert.match(runtime, /bifrost\.two-shore-premaqc-receipt-sidecar\/v1/);
});

test('no packet remains an explicit local-reference preview, not a certified crossing', () => {
  const runtime = buildBifrostRuntimeState(null, { now: '2026-08-04T18:05:00.000Z' });
  assert.equal(runtime.vocabulary, 'PREMAQC');
  assert.equal(runtime.source_mode, 'local-reference');
  assert.equal(runtime.hearthside.status, BIFROST_RUNTIME_STATUS.LOCAL_REFERENCE);
  assert.equal(runtime.targetside.status, BIFROST_RUNTIME_STATUS.LOCAL_REFERENCE);
  assert.equal(runtime.bridge.status, BIFROST_RUNTIME_STATUS.LOCAL_REFERENCE);
  assert.equal(runtime.bridge.crossing_ready, false);
  assert.equal(bridgeBlocksCertifiedExecution(runtime), false);
});

test('complete two-shore temporal packet is crossing-ready', () => {
  const runtime = buildBifrostRuntimeState(packet(), { now: '2026-08-04T18:05:00.000Z' });
  assert.equal(runtime.hearthside.status, BIFROST_RUNTIME_STATUS.TEMPORAL_HEARTHSIDE);
  assert.equal(runtime.targetside.status, BIFROST_RUNTIME_STATUS.TEMPORAL_TARGETSIDE);
  assert.equal(runtime.bridge.status, BIFROST_RUNTIME_STATUS.TWO_SHORE_PREMAQC_VISIBLE);
  assert.equal(runtime.bridge.crossing_ready, true);
  assert.equal(runtime.bridge.certified, true);
  assert.equal(bridgeBlocksCertifiedExecution(runtime), false);
});

test('missing shore fails visibly and blocks execution', () => {
  const runtime = buildBifrostRuntimeState(packet({ targetside: undefined }), { now: '2026-08-04T18:05:00.000Z' });
  assert.equal(runtime.targetside.status, BIFROST_RUNTIME_STATUS.NOT_PROVIDED);
  assert.equal(runtime.bridge.status, BIFROST_RUNTIME_STATUS.SHORE_STATE_INCOMPLETE);
  assert.equal(runtime.bridge.crossing_ready, false);
  assert.equal(bridgeBlocksCertifiedExecution(runtime), true);
});

test('mismatched shore fingerprints fail closed as hidden-state divergence', () => {
  const runtime = buildBifrostRuntimeState(packet({
    hearthside: temporalState('hearth-state', 'hearth-fp'),
    targetside: temporalState('target-state', 'target-fp'),
  }), { now: '2026-08-04T18:05:00.000Z' });
  assert.equal(runtime.bridge.status, BIFROST_RUNTIME_STATUS.HIDDEN_STATE_DIVERGENCE);
  assert.equal(runtime.bridge.crossing_ready, false);
  assert.equal(bridgeBlocksCertifiedExecution(runtime), true);
});

test('two-shore PREMAQC receipt sidecar records both shores and bridge status', () => {
  const runtime = buildBifrostRuntimeState(packet(), { now: '2026-08-04T18:05:00.000Z' });
  const sidecar = buildBifrostReceiptSidecar(runtime, { exported_at: '2026-08-04T18:06:00.000Z', notes: ['test'] });
  assert.equal(sidecar.schema, 'bifrost.two-shore-premaqc-receipt-sidecar/v1');
  assert.equal(sidecar.vocabulary, 'PREMAQC');
  assert.equal(sidecar.packet_id, 'packet-two-shore');
  assert.equal(sidecar.hearthside_state_id, 'hearth-state');
  assert.equal(sidecar.targetside_state_id, 'target-state');
  assert.equal(sidecar.bridge_status, BIFROST_RUNTIME_STATUS.TWO_SHORE_PREMAQC_VISIBLE);
  assert.equal(sidecar.crossing_ready, true);
  assert.equal(sidecar.authority.physical_device_test_performed, false);
  assert.equal(sidecar.authority.qualia_is_firsthand_only, true);
  assert.equal(sidecar.authority.qualia_magnitude_inference_allowed, false);
});
