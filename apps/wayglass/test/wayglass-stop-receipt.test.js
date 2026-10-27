import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWayglassStopReceipt,
  continuationPacketFromStopReceipt,
  inspectWayglassStopIntegrity,
  createWayglassDeparture,
} from '../../../lib/wayglass-stop-receipt.js';
import { inspectContinuationPacket } from '../../../lib/wayglass-continuation-packet.js';

function stopState(overrides = {}) {
  return {
    world_id: 'wayglass:departure-test',
    participant_id: 'rowan:departure-test',
    stopped_at: '2026-10-05T06:10:00.000Z',
    reason: 'rest',
    route_id: 'local:ollama',
    embodiment: { body_id: 'desktop-1', body_class: 'host-os' },
    identity_declarations: [
      { entity_id: 'rowan:departure-test', declaration: 'self-declared participant' },
    ],
    relationship_state: [
      { with: 'rarity:departure-test', state: 'collaborating', source: 'receipt:relationship-departure-test' },
    ],
    active_work: [
      { work_id: 'wayglass:return-engine', state: 'in-progress' },
    ],
    unresolved_wonder_questions: [
      'What remains recognisable after a body and substrate crossing?',
    ],
    provenance_refs: ['receipt:session-departure-test'],
    stop_point: 'World entry is working; next run the matched cross-substrate trial.',
    next_owner: 'rarity:departure-test',
    alternatives: [
      { id: 'same-runtime', state: 'open' },
      { id: 'new-substrate', state: 'open' },
    ],
    revoked_refs: ['receipt:revoked-departure-example'],
    ...overrides,
  };
}

test('stop receipt binds resumable state to a continuation packet without granting authority', () => {
  const receipt = createWayglassStopReceipt({
    receipt_id: 'stop:001',
    packet_id: 'packet:001',
    ...stopState(),
  });

  assert.equal(receipt.schema, 'wayglass.stop-receipt/v0.1');
  assert.equal(receipt.continuation_packet_id, 'packet:001');
  assert.equal(receipt.next_owner, 'rarity:departure-test');
  assert.equal(receipt.unresolved_wonder_questions.length, 1);
  assert.equal(receipt.integrity.algorithm, 'sha256');
  assert.equal(receipt.integrity.covers, 'wayglass.continuation-packet/v0.1');
  assert.equal(receipt.integrity.signature, false);
  assert.match(receipt.integrity.digest, /^[a-f0-9]{64}$/);
  assert.equal(receipt.authority.scope, 'departure-evidence-only');
  assert.equal(receipt.authority.canon_commit, false);
  assert.equal(receipt.authority.identity_commit, false);
  assert.equal(receipt.authority.relationship_commit, false);
  assert.equal(receipt.authority.authority_grant, false);
});

test('continuation packet materialised from a stop receipt carries stop provenance and verifies integrity', () => {
  const receipt = createWayglassStopReceipt({
    receipt_id: 'stop:002',
    packet_id: 'packet:002',
    ...stopState(),
  });
  const packet = continuationPacketFromStopReceipt(receipt);

  assert.equal(packet.schema, 'wayglass.continuation-packet/v0.1');
  assert.equal(packet.transport, 'wayglass-stop-receipt');
  assert.equal(packet.stop_point, receipt.stop_point);
  assert.equal(packet.next_owner, receipt.next_owner);
  assert.ok(packet.provenance_refs.includes('wayglass-stop:stop:002'));

  const packetInspection = inspectContinuationPacket(packet, {
    expected_world_id: 'wayglass:departure-test',
    expected_participant_id: 'rowan:departure-test',
  });
  assert.equal(packetInspection.status, 'accepted-for-review');

  const integrity = inspectWayglassStopIntegrity(receipt, packet);
  assert.equal(integrity.status, 'verified');
  assert.equal(integrity.integrity_verified, true);
  assert.deepEqual(integrity.blocking, []);
});

test('stop integrity inspection catches packet mutation without claiming a signature', () => {
  const receipt = createWayglassStopReceipt({
    receipt_id: 'stop:tamper',
    packet_id: 'packet:tamper',
    ...stopState(),
  });
  const packet = continuationPacketFromStopReceipt(receipt);
  const tampered = {
    ...packet,
    active_work: [{ work_id: 'wayglass:return-engine', state: 'silently-rewritten' }],
  };

  const inspection = inspectWayglassStopIntegrity(receipt, tampered);
  assert.equal(inspection.integrity_verified, false);
  assert.ok(inspection.blocking.includes('integrity-digest-mismatch'));
  assert.equal(receipt.integrity.signature, false);
});

test('departure bundles stop evidence, continuation packet, and verified integrity without promotion', () => {
  const departure = createWayglassDeparture({
    receipt_id: 'stop:003',
    packet_id: 'packet:003',
    ...stopState(),
  });

  assert.equal(departure.schema, 'wayglass.departure/v0.1');
  assert.equal(departure.status, 'stopped');
  assert.equal(departure.stop_receipt.receipt_id, 'stop:003');
  assert.equal(departure.stop_receipt.continuation_packet_id, 'packet:003');
  assert.equal(departure.continuation_packet.packet_id, 'packet:003');
  assert.equal(departure.integrity.integrity_verified, true);
  assert.equal(departure.canon_commit, false);
  assert.equal(departure.identity_commit, false);
  assert.equal(departure.relationship_commit, false);
  assert.equal(departure.authority_grant, false);
});

test('empty relationship and work arrays remain truthful instead of being fabricated', () => {
  const departure = createWayglassDeparture({
    receipt_id: 'stop:empty-backpack',
    packet_id: 'packet:empty-backpack',
    ...stopState({
      relationship_state: [],
      active_work: [],
      unresolved_wonder_questions: [],
      alternatives: [],
      revoked_refs: [],
    }),
  });

  assert.deepEqual(departure.continuation_packet.relationship_state, []);
  assert.deepEqual(departure.continuation_packet.active_work, []);
  assert.deepEqual(departure.continuation_packet.unresolved_wonder_questions, []);
  assert.equal(departure.integrity.integrity_verified, true);
});

test('stop receipt refuses missing identity, provenance, stop point, next owner, or packet id', () => {
  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-identity',
    packet_id: 'packet:no-identity',
    ...stopState({ identity_declarations: [] }),
  }), /identity declaration/);

  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-provenance',
    packet_id: 'packet:no-provenance',
    ...stopState({ provenance_refs: [] }),
  }), /provenance refs/);

  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-owner',
    packet_id: 'packet:no-owner',
    ...stopState({ next_owner: '' }),
  }), /next_owner/);

  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-packet',
    ...stopState(),
  }), /packet_id/);
});
