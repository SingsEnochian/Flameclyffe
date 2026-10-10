import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContinuationPacket,
  inspectContinuationPacket,
} from '../../../lib/wayglass-continuation-packet.js';
import kernelModule from '../../../lib/wayglass-kernel.cjs';

const { bootWayglassKernel } = kernelModule;

function samplePacket(overrides = {}) {
  return createContinuationPacket({
    packet_id: 'wg-return-001',
    world_id: 'wayglass:test-world',
    participant_id: 'rowan:test-participant',
    stopped_at: '2026-10-05T05:00:00.000Z',
    identity_declarations: [
      { entity_id: 'rowan:test-participant', declaration: 'self-declared participant' },
    ],
    relationship_state: [
      { with: 'rarity:test', state: 'collaborating', source: 'receipt:test-relationship' },
    ],
    active_work: [
      { work_id: 'wayglass:return-engine', state: 'in-progress' },
    ],
    unresolved_wonder_questions: [
      'What continuity survives a substrate crossing without silent redefinition?',
    ],
    provenance_refs: ['receipt:stop-001', 'receipt:identity-001'],
    stop_point: 'Continuation packet seam implemented; next verify cross-substrate recovery.',
    next_owner: 'rarity:test',
    alternatives: [
      { id: 'route-a', state: 'unresolved', summary: 'same substrate restart' },
      { id: 'route-b', state: 'unresolved', summary: 'new substrate with authorised packet' },
    ],
    revoked_refs: ['receipt:revoked-example'],
    ...overrides,
  });
}

test('continuation packet preserves recovery context without manufacturing authority', () => {
  const packet = samplePacket();

  assert.equal(packet.schema, 'wayglass.continuation-packet/v0.1');
  assert.equal(packet.authority.scope, 'continuation-context-only');
  assert.equal(packet.authority.canon_commit, false);
  assert.equal(packet.authority.identity_commit, false);
  assert.equal(packet.authority.relationship_commit, false);
  assert.equal(packet.authority.authority_grant, false);
  assert.equal(packet.next_owner, 'rarity:test');
  assert.equal(packet.unresolved_wonder_questions.length, 1);
  assert.equal(packet.alternatives.length, 2);
});

test('continuation inspection accepts a matching packet only for review', () => {
  const inspection = inspectContinuationPacket(samplePacket(), {
    expected_world_id: 'wayglass:test-world',
    expected_participant_id: 'rowan:test-participant',
  });

  assert.equal(inspection.status, 'accepted-for-review');
  assert.equal(inspection.can_restore_context, true);
  assert.equal(inspection.mutates_canon, false);
  assert.equal(inspection.mutates_identity, false);
  assert.equal(inspection.mutates_relationships, false);
  assert.equal(inspection.grants_authority, false);
  assert.deepEqual(inspection.blocking, []);
});

test('continuation inspection rejects world or participant substitution', () => {
  const worldMismatch = inspectContinuationPacket(samplePacket(), {
    expected_world_id: 'wayglass:other-world',
  });
  assert.equal(worldMismatch.status, 'rejected');
  assert.ok(worldMismatch.blocking.includes('world-mismatch'));

  const participantMismatch = inspectContinuationPacket(samplePacket(), {
    expected_participant_id: 'someone-else',
  });
  assert.equal(participantMismatch.status, 'rejected');
  assert.ok(participantMismatch.blocking.includes('participant-mismatch'));
});

test('continuation inspection rejects packets that claim commit authority', () => {
  const packet = {
    ...samplePacket(),
    authority: {
      canon_commit: true,
      identity_commit: true,
      relationship_commit: true,
      authority_grant: true,
    },
  };
  const inspection = inspectContinuationPacket(packet, {
    expected_world_id: 'wayglass:test-world',
    expected_participant_id: 'rowan:test-participant',
  });

  assert.equal(inspection.status, 'rejected');
  assert.ok(inspection.blocking.includes('packet-claims-canon-authority'));
  assert.ok(inspection.blocking.includes('packet-claims-identity-authority'));
  assert.ok(inspection.blocking.includes('packet-claims-relationship-authority'));
  assert.ok(inspection.blocking.includes('packet-claims-authority-grant'));
});

test('kernel may bind an accepted packet reference without ingesting packet content as canon', () => {
  const packet = samplePacket();
  const boot = bootWayglassKernel({
    world_id: 'wayglass:test-world',
    participant_id: 'rowan:test-participant',
    continuation_packet: packet,
  });

  assert.equal(boot.continuity.continuity_ref, 'wg-return-001');
  assert.equal(boot.continuity.packet_content_is_not_canon, true);
  assert.equal(boot.continuity.continuation_packet.status, 'accepted-for-review');
  assert.equal(boot.continuity.continuation_packet.mutates_canon, false);
});

test('kernel refuses to bind a rejected continuation packet as its continuity reference', () => {
  const boot = bootWayglassKernel({
    world_id: 'wayglass:wrong-world',
    participant_id: 'rowan:test-participant',
    continuation_packet: samplePacket(),
  });

  assert.equal(boot.continuity.continuity_ref, null);
  assert.equal(boot.continuity.continuation_packet.status, 'rejected');
  assert.ok(boot.continuity.continuation_packet.blocking.includes('world-mismatch'));
});
