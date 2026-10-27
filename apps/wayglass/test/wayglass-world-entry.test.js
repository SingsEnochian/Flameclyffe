import test from 'node:test';
import assert from 'node:assert/strict';

import { createWaygateManifest } from '../../../lib/wayglass-waygate.js';
import { createContinuationPacket } from '../../../lib/wayglass-continuation-packet.js';
import { createWayglassDeparture } from '../../../lib/wayglass-stop-receipt.js';
import { enterWayglassWorld } from '../../../lib/wayglass-world-entry.js';

function gate(overrides = {}) {
  return createWaygateManifest({
    waygate_id: 'waygate:entry-test',
    world_id: 'wayglass:entry-test',
    allowed_body_classes: ['host-os', 'android', 'headset'],
    provenance_refs: ['receipt:gate-entry-test'],
    ...overrides,
  });
}

function continuation(overrides = {}) {
  return createContinuationPacket({
    packet_id: 'continuation:entry-test',
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    stopped_at: '2026-10-05T05:50:00.000Z',
    identity_declarations: [
      { entity_id: 'rowan:entry-test', declaration: 'self-declared participant' },
    ],
    relationship_state: [
      { with: 'rarity:entry-test', state: 'collaborating', source: 'receipt:relationship-entry-test' },
    ],
    active_work: [
      { work_id: 'wayglass:world-entry', state: 'in-progress' },
    ],
    unresolved_wonder_questions: [
      'Can this participant cross bodies while the world and continuity lineage remain intact?',
    ],
    provenance_refs: ['receipt:continuation-entry-test'],
    stop_point: 'Ready to test a receipted Waygate crossing.',
    next_owner: 'rarity:entry-test',
    ...overrides,
  });
}

function departure() {
  return createWayglassDeparture({
    receipt_id: 'stop:entry-test',
    packet_id: 'continuation:entry-test',
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    stopped_at: '2026-10-05T05:50:00.000Z',
    identity_declarations: [
      { entity_id: 'rowan:entry-test', declaration: 'self-declared participant' },
    ],
    relationship_state: [
      { with: 'rarity:entry-test', state: 'collaborating', source: 'receipt:relationship-entry-test' },
    ],
    active_work: [
      { work_id: 'wayglass:world-entry', state: 'in-progress' },
    ],
    unresolved_wonder_questions: [
      'Can this participant cross bodies while the world and continuity lineage remain intact?',
    ],
    provenance_refs: ['receipt:continuation-entry-test'],
    stop_point: 'Ready to test a receipted Waygate crossing.',
    next_owner: 'rarity:entry-test',
  });
}

test('world entry produces a non-authoritative receipt for a valid crossing', () => {
  const result = enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    waygate_manifest: gate(),
    continuation_packet: continuation(),
    embodiment: { body_id: 'phone-1', body_class: 'android', touch: true, haptics: true },
    entered_at: '2026-10-05T06:00:00.000Z',
  });

  assert.equal(result.schema, 'wayglass.world-entry/v0.1');
  assert.equal(result.status, 'entered');
  assert.equal(result.entered, true);
  assert.equal(result.waygate_id, 'waygate:entry-test');
  assert.equal(result.continuity_ref, 'continuation:entry-test');
  assert.equal(result.boot.embodiment.body_class, 'android');
  assert.equal(result.receipt.result, 'entered');
  assert.equal(result.receipt.stop_integrity_checked, false);
  assert.equal(result.receipt.stop_integrity_verified, null);
  assert.equal(result.receipt.canon_commit, false);
  assert.equal(result.receipt.identity_commit, false);
  assert.equal(result.receipt.relationship_commit, false);
  assert.equal(result.receipt.authority_grant, false);
  assert.equal(result.receipt.continuation_content_promoted, false);
});

test('world entry may verify a matching stop receipt without turning it into authority', () => {
  const stopped = departure();
  const result = enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    waygate_manifest: gate(),
    continuation_packet: stopped.continuation_packet,
    stop_receipt: stopped.stop_receipt,
    embodiment: { body_id: 'desktop-2', body_class: 'host-os', keyboard: true },
    entered_at: '2026-10-05T06:01:00.000Z',
  });

  assert.equal(result.status, 'entered');
  assert.equal(result.stop_integrity.integrity_verified, true);
  assert.equal(result.receipt.stop_integrity_checked, true);
  assert.equal(result.receipt.stop_integrity_verified, true);
  assert.equal(result.receipt.continuation_content_promoted, false);
});

test('world entry blocks continuation tampering when matching stop evidence is supplied', () => {
  const stopped = departure();
  const tampered = {
    ...stopped.continuation_packet,
    identity_declarations: [
      ...stopped.continuation_packet.identity_declarations,
      { entity_id: 'planted:merge', declaration: 'silently merged identity' },
    ],
  };

  const result = enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    waygate_manifest: gate(),
    continuation_packet: tampered,
    stop_receipt: stopped.stop_receipt,
    embodiment: { body_class: 'host-os' },
  });

  assert.equal(result.status, 'blocked-stop-integrity');
  assert.equal(result.entered, false);
  assert.equal(result.boot, null);
  assert.ok(result.blocked_by.includes('integrity-digest-mismatch'));
  assert.equal(result.receipt.stop_integrity_verified, false);
});

test('world entry blocks a gate that identifies a different world', () => {
  const result = enterWayglassWorld({
    world_id: 'wayglass:other-world',
    participant_id: 'rowan:entry-test',
    waygate_manifest: gate(),
    embodiment: { body_class: 'android' },
  });

  assert.equal(result.status, 'blocked-waygate');
  assert.equal(result.entered, false);
  assert.ok(result.blocked_by.includes('world-mismatch'));
  assert.equal(result.receipt.result, 'blocked-waygate');
});

test('world entry blocks rather than silently dropping a rejected continuation', () => {
  const result = enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:someone-else',
    waygate_manifest: gate(),
    continuation_packet: continuation(),
    embodiment: { body_class: 'host-os' },
  });

  assert.equal(result.status, 'blocked-continuation');
  assert.equal(result.entered, false);
  assert.equal(result.continuity_ref, null);
  assert.ok(result.blocked_by.includes('participant-mismatch'));
});

test('world entry blocks bodies not admitted by the gate', () => {
  const result = enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    waygate_manifest: gate(),
    embodiment: { body_class: 'unknown-vessel' },
  });

  assert.equal(result.status, 'blocked-waygate');
  assert.ok(result.blocked_by.includes('body-class-not-admitted'));
});

test('world entry requires an explicit participant and Waygate manifest', () => {
  assert.throws(() => enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    waygate_manifest: gate(),
  }), /participant_id/);

  assert.throws(() => enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
  }), /waygate_manifest/);

  assert.throws(() => enterWayglassWorld({
    world_id: 'wayglass:entry-test',
    participant_id: 'rowan:entry-test',
    waygate_manifest: gate(),
    stop_receipt: { schema: 'wayglass.stop-receipt/v0.1' },
  }), /stop_receipt requires continuation_packet/);
});
