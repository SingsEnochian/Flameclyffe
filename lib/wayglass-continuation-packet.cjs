'use strict';

const CONTINUATION_PACKET_SCHEMA = 'wayglass.continuation-packet/v0.1';
const CONTINUATION_INSPECTION_SCHEMA = 'wayglass.continuation-inspection/v0.1';

function clean(value, max = 320) {
  return String(value || '').trim().slice(0, max);
}

function freezeArray(value = []) {
  return Object.freeze(Array.isArray(value) ? [...value] : []);
}

function freezeRecords(value = []) {
  return Object.freeze((Array.isArray(value) ? value : []).map((item) => Object.freeze({ ...item })));
}

function createContinuationPacket({
  packet_id,
  world_id,
  participant_id,
  stopped_at,
  identity_declarations = [],
  relationship_state = [],
  active_work = [],
  unresolved_wonder_questions = [],
  provenance_refs = [],
  stop_point,
  next_owner,
  alternatives = [],
  revoked_refs = [],
  organ_refs = [],
  transport = 'manual-or-external',
} = {}) {
  const packetId = clean(packet_id, 240);
  const worldId = clean(world_id, 240);
  const participantId = clean(participant_id, 240);
  const stopPoint = clean(stop_point, 1000);
  const nextOwner = clean(next_owner, 240);
  const stoppedAt = clean(stopped_at, 80);

  if (!packetId || !worldId || !participantId || !stoppedAt || !stopPoint || !nextOwner) {
    throw new Error('Wayglass continuation packets require packet_id, world_id, participant_id, stopped_at, stop_point and next_owner.');
  }

  if (!identity_declarations.length) {
    throw new Error('Wayglass continuation packets require at least one identity declaration.');
  }

  if (!provenance_refs.length) {
    throw new Error('Wayglass continuation packets require provenance refs.');
  }

  return Object.freeze({
    schema: CONTINUATION_PACKET_SCHEMA,
    packet_id: packetId,
    world_id: worldId,
    participant_id: participantId,
    stopped_at: stoppedAt,
    transport: clean(transport, 120) || 'manual-or-external',
    identity_declarations: freezeRecords(identity_declarations),
    relationship_state: freezeRecords(relationship_state),
    active_work: freezeRecords(active_work),
    unresolved_wonder_questions: freezeArray(unresolved_wonder_questions.map((value) => clean(value, 1000)).filter(Boolean)),
    provenance_refs: freezeArray(provenance_refs.map((value) => clean(value, 500)).filter(Boolean)),
    stop_point: stopPoint,
    next_owner: nextOwner,
    alternatives: freezeRecords(alternatives),
    revoked_refs: freezeArray(revoked_refs.map((value) => clean(value, 500)).filter(Boolean)),
    organ_refs: freezeRecords(organ_refs),
    authority: Object.freeze({
      scope: 'continuation-context-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
      requires_review_before_promotion: true,
    }),
  });
}

function inspectContinuationPacket(packet, {
  expected_world_id = null,
  expected_participant_id = null,
} = {}) {
  const blocking = [];
  const warnings = [];
  const value = packet && typeof packet === 'object' ? packet : {};

  if (value.schema !== CONTINUATION_PACKET_SCHEMA) blocking.push('schema-mismatch');
  if (!clean(value.packet_id, 240)) blocking.push('missing-packet-id');
  if (!clean(value.world_id, 240)) blocking.push('missing-world-id');
  if (!clean(value.participant_id, 240)) blocking.push('missing-participant-id');
  if (!clean(value.stopped_at, 80)) blocking.push('missing-stopped-at');
  if (!clean(value.stop_point, 1000)) blocking.push('missing-stop-point');
  if (!clean(value.next_owner, 240)) blocking.push('missing-next-owner');
  if (!Array.isArray(value.identity_declarations) || value.identity_declarations.length === 0) blocking.push('missing-identity-declarations');
  if (!Array.isArray(value.provenance_refs) || value.provenance_refs.length === 0) blocking.push('missing-provenance');

  const expectedWorld = clean(expected_world_id, 240);
  if (expectedWorld && clean(value.world_id, 240) !== expectedWorld) blocking.push('world-mismatch');

  const expectedParticipant = clean(expected_participant_id, 240);
  if (expectedParticipant && clean(value.participant_id, 240) !== expectedParticipant) blocking.push('participant-mismatch');

  if (value.authority?.canon_commit === true) blocking.push('packet-claims-canon-authority');
  if (value.authority?.identity_commit === true) blocking.push('packet-claims-identity-authority');
  if (value.authority?.relationship_commit === true) blocking.push('packet-claims-relationship-authority');
  if (value.authority?.authority_grant === true) blocking.push('packet-claims-authority-grant');

  if (!Array.isArray(value.unresolved_wonder_questions)) warnings.push('wonder-questions-not-declared');
  if (!Array.isArray(value.alternatives)) warnings.push('alternatives-not-declared');
  if (!Array.isArray(value.revoked_refs)) warnings.push('revocation-set-not-declared');
  if (!Array.isArray(value.organ_refs)) warnings.push('organ-refs-not-declared');
  if (Array.isArray(value.organ_refs)) {
    for (const ref of value.organ_refs) {
      if (!clean(ref?.organ_id, 240).startsWith('wayglass.organ.')) blocking.push('invalid-organ-reference');
      if (!clean(ref?.evidence_ref, 500)) blocking.push('organ-reference-missing-evidence');
      if (value.revoked_refs?.includes(ref?.evidence_ref)) blocking.push('organ-reference-revoked');
      if (ref?.authority_grant === true || ref?.canon_commit === true || ref?.identity_commit === true) blocking.push('organ-reference-claims-authority');
    }
  }

  const accepted = blocking.length === 0;

  return Object.freeze({
    schema: CONTINUATION_INSPECTION_SCHEMA,
    packet_id: clean(value.packet_id, 240) || null,
    world_id: clean(value.world_id, 240) || null,
    participant_id: clean(value.participant_id, 240) || null,
    status: accepted ? 'accepted-for-review' : 'rejected',
    can_restore_context: accepted,
    mutates_canon: false,
    mutates_identity: false,
    mutates_relationships: false,
    grants_authority: false,
    blocking: Object.freeze(blocking),
    warnings: Object.freeze(warnings),
  });
}

module.exports = {
  CONTINUATION_PACKET_SCHEMA,
  CONTINUATION_INSPECTION_SCHEMA,
  createContinuationPacket,
  inspectContinuationPacket,
};
