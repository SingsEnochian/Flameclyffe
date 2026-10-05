import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWaygateManifest,
  inspectWaygateManifest,
} from '../../../lib/wayglass-waygate.js';
import {
  createContinuationPacket,
} from '../../../lib/wayglass-continuation-packet.js';
import kernelModule from '../../../lib/wayglass-kernel.cjs';

const { bootWayglassKernel } = kernelModule;

function sampleGate(overrides = {}) {
  return createWaygateManifest({
    waygate_id: 'waygate:test-world',
    world_id: 'wayglass:test-world',
    label: 'Test World Gate',
    allowed_body_classes: ['host-os', 'android', 'headset'],
    provenance_refs: ['receipt:waygate-001'],
    ...overrides,
  });
}

function samplePacket() {
  return createContinuationPacket({
    packet_id: 'wg-return-waygate-001',
    world_id: 'wayglass:test-world',
    participant_id: 'rowan:test-participant',
    stopped_at: '2026-10-05T05:45:00.000Z',
    identity_declarations: [
      { entity_id: 'rowan:test-participant', declaration: 'self-declared participant' },
    ],
    provenance_refs: ['receipt:return-001'],
    stop_point: 'Stopped before Waygate passage.',
    next_owner: 'rarity:test',
  });
}

test('Waygate identifies a world rather than a screen', () => {
  const gate = sampleGate();
  assert.equal(gate.schema, 'wayglass.waygate/v0.1');
  assert.equal(gate.world_id, 'wayglass:test-world');
  assert.equal(gate.semantics.identifies_world_not_screen, true);
  assert.equal(gate.authority.canon_commit, false);
  assert.equal(gate.authority.authority_grant, false);
});

test('Waygate inspection accepts matching world and embodiment without granting authority', () => {
  const inspection = inspectWaygateManifest(sampleGate(), {
    expected_world_id: 'wayglass:test-world',
    body_class: 'android',
  });
  assert.equal(inspection.status, 'passage-available');
  assert.equal(inspection.can_enter_world, true);
  assert.equal(inspection.mutates_canon, false);
  assert.equal(inspection.grants_authority, false);
});

test('Waygate inspection blocks world substitution and unadmitted bodies', () => {
  const wrongWorld = inspectWaygateManifest(sampleGate(), {
    expected_world_id: 'wayglass:other-world',
    body_class: 'android',
  });
  assert.equal(wrongWorld.status, 'blocked');
  assert.ok(wrongWorld.blocking.includes('world-mismatch'));

  const wrongBody = inspectWaygateManifest(sampleGate(), {
    expected_world_id: 'wayglass:test-world',
    body_class: 'unknown-vessel',
  });
  assert.equal(wrongBody.status, 'blocked');
  assert.ok(wrongBody.blocking.includes('body-class-not-admitted'));
});

test('kernel blocks passage when the supplied Waygate does not identify the requested world', () => {
  const boot = bootWayglassKernel({
    world_id: 'wayglass:other-world',
    participant_id: 'rowan:test-participant',
    waygate_manifest: sampleGate(),
    continuation_packet: samplePacket(),
    embodiment: { body_class: 'android' },
  });

  assert.equal(boot.status, 'blocked-waygate');
  assert.equal(boot.world.waygate.can_enter_world, false);
  assert.equal(boot.continuity.continuity_ref, null);
});

test('kernel may preserve continuity across a valid Waygate without making the gate the identity', () => {
  const boot = bootWayglassKernel({
    world_id: 'wayglass:test-world',
    participant_id: 'rowan:test-participant',
    waygate_manifest: sampleGate(),
    continuation_packet: samplePacket(),
    embodiment: { body_class: 'android' },
  });

  assert.equal(boot.status, 'boot-contract');
  assert.equal(boot.world.waygate.status, 'passage-available');
  assert.equal(boot.continuity.continuity_ref, 'wg-return-waygate-001');
  assert.equal(boot.continuity.identity_is_not_body, true);
  assert.notEqual(boot.world.waygate.waygate_id, boot.system_id);
});
