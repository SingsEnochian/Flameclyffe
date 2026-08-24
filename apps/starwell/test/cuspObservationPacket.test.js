import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCuspObservationPacket,
  createCuspTraceReceipt,
  replayCuspObservationPacket,
} from '../src/math-spine/cusp-observation-packet.js';

const source = Object.freeze({
  schema: 'hearthgate.math-spine-packet/v1',
  packet_id: 'math-spine-test',
  packet_fingerprint: 'a'.repeat(64),
  world_id: 'terra-aeterna',
});

test('cusp observation packet is world-scoped and deterministic', async () => {
  const packet = await createCuspObservationPacket({
    mathSpinePacket: source,
    structure: -1,
    intention: 0,
    orderParameter: 1,
    generatedAt: '2026-08-12T14:40:00.000Z',
  });
  assert.equal(packet.world_id, 'terra-aeterna');
  assert.equal(packet.observation.regime, 'multistable');
  assert.equal(packet.input.control_a, -1);
  assert.equal(packet.input.control_b, 0);
  assert.equal(packet.authority.intention_is_premaqc_agency, false);
  assert.equal(packet.authority.control_b_is_intention, true);
  assert.equal(packet.authority.branch_snap_is_event_candidate_only, true);
  const replay = await replayCuspObservationPacket(packet);
  assert.equal(replay.matched, true);
});

test('domain control semantics survive packet hashing and deterministic replay', async () => {
  const packet = await createCuspObservationPacket({
    mathSpinePacket: source,
    controlA: -0.8,
    controlB: 0.12,
    controlSemantics: {
      a: {
        role: 'envelope-density',
        label: 'Envelope density',
        unit: 'normalised',
        source: 'synthetic-astrophysics-fixture',
        intentional: false,
      },
      b: {
        role: 'accretion-rate',
        label: 'Accretion rate',
        unit: 'normalised',
        source: 'synthetic-astrophysics-fixture',
        intentional: false,
      },
    },
    orderParameter: 0.4,
    generatedAt: '2026-08-14T09:30:00.000Z',
  });

  assert.equal(packet.observation.control_semantics.a.label, 'Envelope density');
  assert.equal(packet.observation.control_semantics.b.label, 'Accretion rate');
  assert.equal(packet.authority.control_b_is_intention, false);
  assert.equal(packet.observation.history.intention_direction, null);
  const replay = await replayCuspObservationPacket(packet);
  assert.equal(replay.matched, true);
  assert.deepEqual(replay.observation.control_semantics, packet.observation.control_semantics);
});

test('trace receipt detects hysteresis only from opposite-sweep branch occupancy', async () => {
  const increasing = await createCuspObservationPacket({
    mathSpinePacket: source,
    structure: -1,
    intention: 0,
    orderParameter: 1,
    previousObservation: { controls: { structure: -1, intention: -0.1 } },
  });
  const decreasing = await createCuspObservationPacket({
    mathSpinePacket: source,
    structure: -1,
    intention: 0,
    orderParameter: -1,
    previousObservation: { controls: { structure: -1, intention: 0.1 } },
  });
  const receipt = await createCuspTraceReceipt([increasing, decreasing]);
  assert.equal(receipt.trace.hysteresis_detected, true);
  assert.equal(receipt.authority.physical_claim, false);
  assert.equal(receipt.authority.controls_are_domain_semantic, true);
});

test('hysteresis traces refuse cross-world packet mixing', async () => {
  const terra = await createCuspObservationPacket({
    mathSpinePacket: source,
    structure: -1,
    intention: 0,
    orderParameter: 1,
  });
  const luna = await createCuspObservationPacket({
    mathSpinePacket: {
      ...source,
      packet_id: 'math-spine-luna',
      packet_fingerprint: 'b'.repeat(64),
      world_id: 'luna',
    },
    structure: -1,
    intention: 0,
    orderParameter: -1,
  });
  await assert.rejects(() => createCuspTraceReceipt([terra, luna]), /world-scoped/i);
});
