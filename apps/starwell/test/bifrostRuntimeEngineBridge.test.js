import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildBifrostRuntimeState,
} from '../bifrost/bifrost-runtime-state.js';
import {
  BIFROST_GUARDED_ACTION_IDS,
  buildBifrostRuntimeExecutionPolicy,
  buildBlockedActionReceipt,
} from '../bifrost/bifrost-runtime-engine-bridge.js';

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

function packet({ hearthside = temporalState('hearth-state'), targetside = temporalState('target-state') } = {}) {
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

test('two-shore panel imports the runtime execution bridge', async () => {
  const panel = await read('../bifrost/two-shore-premaq.js');

  assert.match(panel, /bifrost-runtime-engine-bridge\.js/);
  assert.match(panel, /installBifrostRuntimeExecutionBridge/);
  assert.match(panel, /applyBifrostRuntimeExecutionPolicy/);
});

test('runtime policy allows labelled local reference preview without certifying crossing', () => {
  const runtime = buildBifrostRuntimeState(null, { now: '2026-08-04T18:20:00.000Z' });
  const policy = buildBifrostRuntimeExecutionPolicy(runtime);

  assert.equal(policy.local_reference, true);
  assert.equal(policy.certified, false);
  assert.equal(policy.crossing_ready, false);
  assert.equal(policy.blocks_execution, false);
  assert.deepEqual(policy.blocked_actions, []);
  assert.deepEqual(policy.allowed_actions, BIFROST_GUARDED_ACTION_IDS);
});

test('runtime policy certifies a complete temporal two-shore packet', () => {
  const runtime = buildBifrostRuntimeState(packet(), { now: '2026-08-04T18:20:00.000Z' });
  const policy = buildBifrostRuntimeExecutionPolicy(runtime);

  assert.equal(policy.local_reference, false);
  assert.equal(policy.certified, true);
  assert.equal(policy.crossing_ready, true);
  assert.equal(policy.blocks_execution, false);
  assert.deepEqual(policy.blocked_actions, []);
  assert.ok(policy.allowed_actions.includes('run-window'));
  assert.ok(policy.allowed_actions.includes('export-receipts'));
});

test('runtime policy blocks execution and legacy export when a shore is missing', () => {
  const runtime = buildBifrostRuntimeState(packet({ targetside: undefined }), {
    now: '2026-08-04T18:20:00.000Z',
  });
  const policy = buildBifrostRuntimeExecutionPolicy(runtime);

  assert.equal(policy.bridge_status, 'SHORE_STATE_INCOMPLETE');
  assert.equal(policy.certified, false);
  assert.equal(policy.blocks_execution, true);
  assert.deepEqual(policy.allowed_actions, []);
  assert.deepEqual(policy.blocked_actions, BIFROST_GUARDED_ACTION_IDS);
});

test('blocked action receipt records the failed engine-control attempt', () => {
  const runtime = buildBifrostRuntimeState(packet({
    hearthside: temporalState('hearth-state', 'hearth-fp'),
    targetside: temporalState('target-state', 'target-fp'),
  }), { now: '2026-08-04T18:20:00.000Z' });

  const receipt = buildBlockedActionReceipt(runtime, 'run-window');

  assert.equal(receipt.schema, 'bifrost.blocked-action-receipt/v0.1');
  assert.equal(receipt.attempted_action, 'run-window');
  assert.equal(receipt.bridge_status, 'HIDDEN_STATE_DIVERGENCE');
  assert.equal(receipt.blocks_execution, true);
  assert.equal(receipt.execution_policy.blocks_execution, true);
  assert.equal(receipt.authority.canon_write_performed, false);
  assert.equal(receipt.authority.tone_approval_performed, false);
  assert.equal(receipt.authority.physical_device_test_performed, false);
});
