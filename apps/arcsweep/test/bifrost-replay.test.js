import assert from 'node:assert/strict';
import test from 'node:test';
import { createStateSnapshot } from '../src/bifrost-crossing-envelope.js';
import { createEndpointInstrument, createTerraAeternaEndpoint } from '../src/bifrost-endpoints.js';
import { runBridgeTest001 } from '../src/bridge-test-001.js';
import {
  compareReplayToEnvelope,
  createControlTrajectory,
  createReturnCrossing,
  replayCrossingEnvelope,
} from '../src/bifrost-replay.js';

const PREMAQC = Object.freeze({ schema: 'premaqc/v1', P: .88, C: .9, R: .86, E: .25, M: .8, A: .91, Q: .84 });
const SPIRAL = Object.freeze({ schema: 'spiral-state/v1', phase: 'release', direction: 'ascending', confidence: .93 });

function primeEndpoint() {
  const snapshot = createStateSnapshot({
    worldIdentity: 'Terra Prime', frameworkLabel: 'Terra Prime', worldRevision: 1,
    stateId: 'prime:bridge001', stateHash: 'sha256:prime:bridge001', effectiveAt: '2026-08-23T04:15:00Z',
    premaqcVersion: PREMAQC.schema, spiralSchemaVersion: SPIRAL.schema, state: { premaqc: PREMAQC, spiral: SPIRAL },
  });
  return createEndpointInstrument({
    worldIdentity: 'Earth Prime', frameworkLabel: 'Terra Prime', shore: 'reference',
    clock: { mode: '1:1', utc: '2026-08-23T04:15:00Z', time_ratio: 1 }, observerFreshness: 'fresh',
    premaqc: PREMAQC, spiral: SPIRAL, worldProfile: { temporal_contract: '1:1' },
    canonContext: { register: 'observed-current-reality' }, receipts: ['prime:receipt:bridge001'], snapshot,
  });
}

function terraAeternaEndpoint() {
  return createTerraAeternaEndpoint({
    worldRevision: 12, stateId: 'ta:bridge001', stateHash: 'sha256:ta:bridge001', effectiveAt: '2026-08-23T04:15:00Z',
    premaqc: PREMAQC, spiral: SPIRAL, receipts: ['ta:receipt:bridge001'],
    canonContext: { world: 'Terra Aeterna', register: 'project-canon' },
    worldProfile: { material_language: ['Stonewood', 'black-diamond sand'] },
  });
}

function outboundEnvelope() {
  return runBridgeTest001({
    sourceEndpoint: primeEndpoint(),
    destinationEndpoint: terraAeternaEndpoint(),
    createdAt: '2026-08-23T04:15:05Z',
  }).envelope;
}

test('Replay reconstructs the sealed Bridge Test 001 crossing exactly', () => {
  const envelope = outboundEnvelope();
  const replay = replayCrossingEnvelope(envelope);
  const comparison = compareReplayToEnvelope(replay, envelope);
  assert.equal(replay.exact, true);
  assert.equal(comparison.matches, true);
  assert.deepEqual(comparison.differences, []);
  assert.equal(replay.reconstructed.translation_profile_id, 'earth-prime-to-terra-aeterna');
});

test('Replay reports later envelope drift instead of rewriting the historical crossing', () => {
  const envelope = outboundEnvelope();
  const replay = replayCrossingEnvelope(envelope);
  const changed = {
    ...envelope,
    translation: { ...envelope.translation, profile_version: 'v2' },
  };
  const comparison = compareReplayToEnvelope(replay, changed);
  assert.equal(comparison.matches, false);
  assert.deepEqual(comparison.differences, ['translation_profile_version']);
});

test('return crossing explicitly travels Terra Aeterna to Earth/Terra Prime', () => {
  const outbound = outboundEnvelope();
  const returned = createReturnCrossing({
    outboundEnvelope: outbound,
    returnStateId: 'prime:return:001',
    returnStateHash: 'sha256:prime:return:001',
    returnedAt: '2026-08-23T04:16:00Z',
    returnedPremaqc: { ...PREMAQC, R: .89 },
    returnedSpiral: { ...SPIRAL, confidence: .95 },
  });
  assert.equal(returned.source.world_identity, 'terra-aeterna');
  assert.equal(returned.destination.world_identity, 'earth_prime');
  assert.equal(returned.lineage.previous_receipt, outbound.lineage.receipt_id);
  assert.equal(returned.destination_response.authority.register, 'DETERMINISTIC_ENGINE');
});

test('control trajectory keeps departure, return, and ordinary Prime baseline distinct', () => {
  const outbound = outboundEnvelope();
  const returned = createReturnCrossing({
    outboundEnvelope: outbound,
    returnStateId: 'prime:return:001',
    returnStateHash: 'sha256:prime:return:001',
    returnedAt: '2026-08-23T04:16:00Z',
    returnedPremaqc: { ...PREMAQC, R: .89 },
    returnedSpiral: SPIRAL,
  });
  const baseline = createStateSnapshot({
    worldIdentity: 'Earth Prime', frameworkLabel: 'Terra Prime', worldRevision: 1,
    stateId: 'prime:baseline:041600', stateHash: 'sha256:prime:baseline:041600', effectiveAt: '2026-08-23T04:16:00Z',
    premaqcVersion: PREMAQC.schema, spiralSchemaVersion: SPIRAL.schema,
    state: { premaqc: { ...PREMAQC, R: .87 }, spiral: SPIRAL },
  });
  const trajectory = createControlTrajectory({ outboundEnvelope: outbound, returnEnvelope: returned, baselinePrimeSnapshot: baseline });
  assert.deepEqual(trajectory.path, ['earth_prime', 'terra-aeterna', 'earth_prime']);
  assert.equal(trajectory.departure.state_id, 'prime:bridge001');
  assert.equal(trajectory.return_state.state_id, 'prime:return:001');
  assert.equal(trajectory.baseline_state.state_id, 'prime:baseline:041600');
  assert.notEqual(trajectory.return_state.state_hash, trajectory.baseline_state.state_hash);
});
