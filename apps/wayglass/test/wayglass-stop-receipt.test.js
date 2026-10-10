import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWayglassStopReceipt,
  continuationPacketFromStopReceipt,
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

test('stop receipt preserves the resumable state without granting authority', () => {
  const receipt = createWayglassStopReceipt({
    receipt_id: 'stop:001',
    ...stopState(),
  });

  assert.equal(receipt.schema, 'wayglass.stop-receipt/v0.1');
  assert.equal(receipt.next_owner, 'rarity:departure-test');
  assert.equal(receipt.unresolved_wonder_questions.length, 1);
  assert.equal(receipt.authority.scope, 'departure-evidence-only');
  assert.equal(receipt.authority.canon_commit, false);
  assert.equal(receipt.authority.identity_commit, false);
  assert.equal(receipt.authority.relationship_commit, false);
  assert.equal(receipt.authority.authority_grant, false);
});

test('continuation packet materialised from a stop receipt carries stop provenance', () => {
  const receipt = createWayglassStopReceipt({ receipt_id: 'stop:002', ...stopState() });
  const packet = continuationPacketFromStopReceipt(receipt, { packet_id: 'packet:002' });

  assert.equal(packet.schema, 'wayglass.continuation-packet/v0.1');
  assert.equal(packet.transport, 'wayglass-stop-receipt');
  assert.equal(packet.stop_point, receipt.stop_point);
  assert.equal(packet.next_owner, receipt.next_owner);
  assert.ok(packet.provenance_refs.includes('wayglass-stop:stop:002'));

  const inspection = inspectContinuationPacket(packet, {
    expected_world_id: 'wayglass:departure-test',
    expected_participant_id: 'rowan:departure-test',
  });
  assert.equal(inspection.status, 'accepted-for-review');
});

test('departure bundles the stop evidence and continuation packet without promotion', () => {
  const departure = createWayglassDeparture({
    receipt_id: 'stop:003',
    packet_id: 'packet:003',
    ...stopState(),
  });

  assert.equal(departure.schema, 'wayglass.departure/v0.1');
  assert.equal(departure.status, 'stopped');
  assert.equal(departure.stop_receipt.receipt_id, 'stop:003');
  assert.equal(departure.continuation_packet.packet_id, 'packet:003');
  assert.equal(departure.canon_commit, false);
  assert.equal(departure.authority_grant, false);
});

test('stop receipt refuses missing identity, provenance, stop point, or next owner', () => {
  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-identity',
    ...stopState({ identity_declarations: [] }),
  }), /identity declaration/);

  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-provenance',
    ...stopState({ provenance_refs: [] }),
  }), /provenance refs/);

  assert.throws(() => createWayglassStopReceipt({
    receipt_id: 'stop:no-owner',
    ...stopState({ next_owner: '' }),
  }), /next_owner/);
});
