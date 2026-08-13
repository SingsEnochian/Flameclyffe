import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCorridorRegistration,
  createDestinationRegistration,
  createEmptyReactionRegistryStore,
} from '../src/react-ion-registry.js';
import { conductReactionTestFlight } from '../src/react-ion-test-flight.js';

async function destination({ id, name, worldId, worldName, address, rootHz }) {
  return createDestinationRegistration({
    id,
    name,
    aliases: [`${name}.alias`],
    kind: 'world',
    worldId,
    worldName,
    address,
    rootHz,
    phase: 0,
    profileVersion: 'test-flight-v1',
    evidenceClass: 'symbolic',
    sourceRef: `test-flight:${worldId}`,
    state: 'approved',
    updatedAt: '2026-08-13T05:40:00.000Z',
  });
}

async function corridor({ id, from, to, bidirectional = false, vetoes = [], identity = 0.96, continuity = 0.96, agency = 0.96 }) {
  return createCorridorRegistration({
    id,
    from,
    to,
    jacobian: '1,0;0,0.94',
    identity,
    continuity,
    agency,
    floor: 0.8,
    vetoes,
    bidirectional,
    state: 'approved',
    updatedAt: '2026-08-13T05:40:01.000Z',
  });
}

function premaqc() {
  return {
    id: 'premaqc-test-flight-001',
    receipt_id: 'premaqc-receipt-test-flight-001',
    sequence: 1,
    observed_at: '2026-08-13T05:40:02.000Z',
    state: Object.fromEntries(['P', 'C', 'R', 'E', 'M', 'A', 'Q'].map((axis) => [axis, { value: axis === 'E' ? 0.24 : 0.86 }])),
  };
}

test('Test Flight 001 routes around a veto, reaches destination, returns a recorded response, and replays exactly', async () => {
  const waking = await destination({
    id: 'dest-waking',
    name: 'waking.home',
    worldId: 'waking-world',
    worldName: 'Waking World',
    address: '10.20.30.40@174:phi=0',
    rootHz: 174,
  });
  const bridge = await destination({
    id: 'dest-bridge',
    name: 'bridge.starsong',
    worldId: 'starsong',
    worldName: 'Starsong',
    address: '80.90.100.110@528:phi=0',
    rootHz: 528,
  });
  const templehouse = await destination({
    id: 'dest-templehouse',
    name: 'templehouse.hearthweave.terra',
    worldId: 'terra-aeterna',
    worldName: 'Terra Aeterna',
    address: '137.42.219.88@220:phi=0',
    rootHz: 220,
  });

  const directVeto = await corridor({
    id: 'corridor-direct-veto',
    from: 'waking.home',
    to: 'templehouse.hearthweave.terra',
    vetoes: ['test-flight-direct-corridor-held-closed'],
  });
  const wakingToBridge = await corridor({
    id: 'corridor-waking-bridge',
    from: 'waking.home',
    to: 'bridge.starsong',
    bidirectional: true,
  });
  const bridgeToTerra = await corridor({
    id: 'corridor-bridge-terra',
    from: 'bridge.starsong',
    to: 'templehouse.hearthweave.terra',
    bidirectional: true,
  });

  const registryStore = {
    ...createEmptyReactionRegistryStore(),
    destinations: [waking, bridge, templehouse],
    corridors: [directVeto, wakingToBridge, bridgeToTerra],
  };

  const flight = await conductReactionTestFlight({
    registryStore,
    sourceName: 'waking.home',
    targetName: 'templehouse.hearthweave.terra',
    sender: 'Rowan',
    intention: 'Test Flight 001: Templehouse, Hearthweave, Terra Aeterna. Take the admitted route.',
    transformation: 'Exercise the complete React-ion navigation and receipt chain without bypassing a veto.',
    constraints: { preserve: ['identity', 'continuity', 'agency', 'return-path'] },
    consent: { required: true, granted: true, revocable: true, scope: 'Test Flight 001 only' },
    ttl: 8,
    access: { globalAuthorised: true, callerIsOwner: true, explicitTarget: true },
    timeline: {
      askCreatedAt: '2026-08-13T05:41:00.000Z',
      navigationRequestedAt: '2026-08-13T05:41:01.000Z',
      graphCapturedAt: '2026-08-13T05:41:02.000Z',
      transportStartedAt: '2026-08-13T05:41:03.000Z',
      replayedAt: '2026-08-13T05:41:04.000Z',
      helmReceiptAt: '2026-08-13T05:41:05.000Z',
      routeStoryAt: '2026-08-13T05:41:06.000Z',
      responseAt: '2026-08-13T05:41:07.000Z',
      returnStartedAt: '2026-08-13T05:41:08.000Z',
      responseStoryAt: '2026-08-13T05:41:09.000Z',
    },
    deepTime: {
      sequenceId: 'dt-test-flight-001',
      sequenceRevision: 1,
      lambda: 1,
      utc: '2026-08-13T05:41:06.500Z',
      julianDate: 2461265.73688,
      premaqc: premaqc(),
      observationRunId: 'observer-test-flight-001',
      acceptanceMaskId: 'mask-test-flight-001',
      acceptanceMaskVersion: '1',
      dataQuality: 0.97,
    },
    explicitResponse: {
      code: 'ACK',
      responder: 'Templehouse test endpoint',
      message: 'Test Flight 001 packet received. Return channel open.',
      ttl: 8,
    },
  });

  assert.equal(flight.status, 'ROUND_TRIP_COMPLETE');
  assert.equal(flight.access_policy.admitted, true);
  assert.deepEqual(flight.route.path, [
    '0010.0020.0030.0040@174:φ=0',
    '0080.0090.0100.0110@528:φ=0',
    '0137.0042.0219.0088@220:φ=0',
  ]);
  assert.equal(flight.transport.delivered, true);
  assert.equal(flight.transport.final_code, 'ACK');
  assert.equal(flight.transport.hops.length, 2);
  assert.equal(flight.historical_replay.matched, true);
  assert.equal(flight.deep_time.dataset, 'DEEPTime');
  assert.equal(flight.deep_story_route.event_type, 'reaction.route.compiled');
  assert.equal(flight.exchange.response.code, 'ACK');
  assert.equal(flight.exchange.return_receipt.delivered, true);
  assert.deepEqual(flight.exchange.return_receipt.route.path, [
    '0137.0042.0219.0088@220:φ=0',
    '0080.0090.0100.0110@528:φ=0',
    '0010.0020.0030.0040@174:φ=0',
  ]);
  assert.equal(flight.deep_story_response.event_type, 'reaction.response.recorded');
  assert.equal(flight.authority.ack_means_received_not_fulfilled, true);
});
