'use strict';

const { createContinuationPacket } = require('./wayglass-continuation-packet.cjs');

const STOP_RECEIPT_SCHEMA = 'wayglass.stop-receipt/v0.1';
const DEPARTURE_SCHEMA = 'wayglass.departure/v0.1';

function clean(value, max = 320) {
  return String(value || '').trim().slice(0, max);
}

function freezeArray(value = []) {
  return Object.freeze(Array.isArray(value) ? [...value] : []);
}

function freezeRecords(value = []) {
  return Object.freeze((Array.isArray(value) ? value : []).map((item) => Object.freeze({ ...item })));
}

function createWayglassStopReceipt({
  receipt_id,
  world_id,
  participant_id,
  stopped_at,
  reason = 'pause',
  route_id = null,
  embodiment = null,
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
} = {}) {
  const receiptId = clean(receipt_id, 240);
  const worldId = clean(world_id, 240);
  const participantId = clean(participant_id, 240);
  const stoppedAt = clean(stopped_at, 80);
  const stopPoint = clean(stop_point, 1000);
  const nextOwner = clean(next_owner, 240);

  if (!receiptId || !worldId || !participantId || !stoppedAt || !stopPoint || !nextOwner) {
    throw new Error('Wayglass stop receipts require receipt_id, world_id, participant_id, stopped_at, stop_point and next_owner.');
  }
  if (!identity_declarations.length) {
    throw new Error('Wayglass stop receipts require at least one identity declaration.');
  }
  if (!provenance_refs.length) {
    throw new Error('Wayglass stop receipts require provenance refs.');
  }

  return Object.freeze({
    schema: STOP_RECEIPT_SCHEMA,
    receipt_id: receiptId,
    world_id: worldId,
    participant_id: participantId,
    stopped_at: stoppedAt,
    reason: clean(reason, 160) || 'pause',
    route_id: clean(route_id, 160) || null,
    embodiment: embodiment && typeof embodiment === 'object'
      ? Object.freeze({ ...embodiment })
      : null,
    identity_declarations: freezeRecords(identity_declarations),
    relationship_state: freezeRecords(relationship_state),
    active_work: freezeRecords(active_work),
    unresolved_wonder_questions: freezeArray(
      unresolved_wonder_questions.map((value) => clean(value, 1000)).filter(Boolean),
    ),
    provenance_refs: freezeArray(
      provenance_refs.map((value) => clean(value, 500)).filter(Boolean),
    ),
    stop_point: stopPoint,
    next_owner: nextOwner,
    alternatives: freezeRecords(alternatives),
    revoked_refs: freezeArray(revoked_refs.map((value) => clean(value, 500)).filter(Boolean)),
    organ_refs: freezeRecords(organ_refs),
    authority: Object.freeze({
      scope: 'departure-evidence-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
    }),
  });
}

function continuationPacketFromStopReceipt(stopReceipt, { packet_id } = {}) {
  if (!stopReceipt || stopReceipt.schema !== STOP_RECEIPT_SCHEMA) {
    throw new Error('A valid Wayglass stop receipt is required.');
  }
  const packetId = clean(packet_id, 240);
  if (!packetId) throw new Error('Continuation materialisation requires packet_id.');

  return createContinuationPacket({
    packet_id: packetId,
    world_id: stopReceipt.world_id,
    participant_id: stopReceipt.participant_id,
    stopped_at: stopReceipt.stopped_at,
    identity_declarations: stopReceipt.identity_declarations,
    relationship_state: stopReceipt.relationship_state,
    active_work: stopReceipt.active_work,
    unresolved_wonder_questions: stopReceipt.unresolved_wonder_questions,
    provenance_refs: [
      ...stopReceipt.provenance_refs,
      `wayglass-stop:${stopReceipt.receipt_id}`,
    ],
    stop_point: stopReceipt.stop_point,
    next_owner: stopReceipt.next_owner,
    alternatives: stopReceipt.alternatives,
    revoked_refs: stopReceipt.revoked_refs,
    organ_refs: stopReceipt.organ_refs,
    transport: 'wayglass-stop-receipt',
  });
}

function createWayglassDeparture({ receipt_id, packet_id, ...state } = {}) {
  const stop_receipt = createWayglassStopReceipt({ receipt_id, ...state });
  const continuation_packet = continuationPacketFromStopReceipt(stop_receipt, { packet_id });

  return Object.freeze({
    schema: DEPARTURE_SCHEMA,
    status: 'stopped',
    world_id: stop_receipt.world_id,
    participant_id: stop_receipt.participant_id,
    stop_receipt,
    continuation_packet,
    canon_commit: false,
    authority_grant: false,
  });
}

module.exports = {
  STOP_RECEIPT_SCHEMA,
  DEPARTURE_SCHEMA,
  createWayglassStopReceipt,
  continuationPacketFromStopReceipt,
  createWayglassDeparture,
};
