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
  assert.equal(packet.authority.intention_is_premaqc_agency, false);
  assert.equal(packet.authority.branch_snap_is_event_candidate_only, true);
  const replay = await replayCuspObservationPacket(packet);
  assert.equal(replay.matched, true);
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
});

test('hysteresis traces refuse cross-world packet mixing', async () => {
  const terra = await createCuspObservationPacket({
    mathSpinePacket: source,
    structure: -1,
    intention: 0,
    orderParameter: 1,
  });
  const luna = await createCuspObservationPacket({
    mathSpinePacket: { ...source, packet_id: 'math-spine-luna', packet_fingerprint: 'b'.repeat(64), world_id: 'luna' },
    structure: -1,
    intention: 0,
    orderParameter: -1,
  });
  await assert.rejects(() => createCuspTraceReceipt([terra, luna]), /world-scoped/i);
});
