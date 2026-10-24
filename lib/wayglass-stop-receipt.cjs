'use strict';

const { createHash } = require('node:crypto');
const {
  CONTINUATION_PACKET_SCHEMA,
  createContinuationPacket,
} = require('./wayglass-continuation-packet.cjs');

const STOP_RECEIPT_SCHEMA = 'wayglass.stop-receipt/v0.1';
const STOP_INTEGRITY_INSPECTION_SCHEMA = 'wayglass.stop-integrity-inspection/v0.1';
const DEPARTURE_SCHEMA = 'wayglass.departure/v0.1';
const INTEGRITY_ALGORITHM = 'sha256';

function clean(value, max = 320) {
  return String(value || '').trim().slice(0, max);
}

function freezeArray(value = []) {
  return Object.freeze(Array.isArray(value) ? [...value] : []);
}

function freezeRecords(value = []) {
  return Object.freeze((Array.isArray(value) ? value : []).map((item) => Object.freeze({ ...item })));
}

function freezeJson(value) {
  if (Array.isArray(value)) return Object.freeze(value.map((item) => freezeJson(item)));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, freezeJson(item)]),
    ));
  }
  return value;
}

function toCanonicalJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Wayglass canonical JSON rejects non-finite numbers.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => toCanonicalJson(item)).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    return '{' + keys
      .map((key) => JSON.stringify(key) + ':' + toCanonicalJson(value[key]))
      .join(',') + '}';
  }
  throw new TypeError('Wayglass canonical JSON accepts JSON-compatible values only.');
}

function digestContinuationPacket(packet) {
  if (!packet || packet.schema !== CONTINUATION_PACKET_SCHEMA) {
    throw new Error('A valid Wayglass continuation packet is required for integrity digesting.');
  }
  return createHash(INTEGRITY_ALGORITHM)
    .update(toCanonicalJson(packet), 'utf8')
    .digest('hex');
}

function packetFromState({
  receipt_id,
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
  domain_receipts = [],
} = {}) {
  const receiptId = clean(receipt_id, 240);
  const packetId = clean(packet_id, 240);
  if (!receiptId) throw new Error('Continuation materialisation requires receipt_id.');
  if (!packetId) throw new Error('Continuation materialisation requires packet_id.');

  return createContinuationPacket({
    packet_id: packetId,
    world_id,
    participant_id,
    stopped_at,
    identity_declarations,
    relationship_state,
    active_work,
    unresolved_wonder_questions,
    provenance_refs: [
      ...provenance_refs,
      `wayglass-stop:${receiptId}`,
    ],
    stop_point,
    next_owner,
    alternatives,
    revoked_refs,
    domain_receipts,
    transport: 'wayglass-stop-receipt',
  });
}

function createWayglassStopReceipt({
  receipt_id,
  packet_id,
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
  domain_receipts = [],
} = {}) {
  const receiptId = clean(receipt_id, 240);
  const packetId = clean(packet_id, 240);
  const worldId = clean(world_id, 240);
  const participantId = clean(participant_id, 240);
  const stoppedAt = clean(stopped_at, 80);
  const stopPoint = clean(stop_point, 1000);
  const nextOwner = clean(next_owner, 240);

  if (!receiptId || !packetId || !worldId || !participantId || !stoppedAt || !stopPoint || !nextOwner) {
    throw new Error('Wayglass stop receipts require receipt_id, packet_id, world_id, participant_id, stopped_at, stop_point and next_owner.');
  }
  if (!identity_declarations.length) {
    throw new Error('Wayglass stop receipts require at least one identity declaration.');
  }
  if (!provenance_refs.length) {
    throw new Error('Wayglass stop receipts require provenance refs.');
  }

  const packet = packetFromState({
    receipt_id: receiptId,
    packet_id: packetId,
    world_id: worldId,
    participant_id: participantId,
    stopped_at: stoppedAt,
    identity_declarations,
    relationship_state,
    active_work,
    unresolved_wonder_questions,
    provenance_refs,
    stop_point: stopPoint,
    next_owner: nextOwner,
    alternatives,
    revoked_refs,
    domain_receipts,
  });

  return Object.freeze({
    schema: STOP_RECEIPT_SCHEMA,
    receipt_id: receiptId,
    continuation_packet_id: packet.packet_id,
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
    domain_receipts: freezeJson(Array.isArray(domain_receipts) ? domain_receipts : []),
    integrity: Object.freeze({
      algorithm: INTEGRITY_ALGORITHM,
      digest: digestContinuationPacket(packet),
      covers: CONTINUATION_PACKET_SCHEMA,
      signature: false,
    }),
    authority: Object.freeze({
      scope: 'departure-evidence-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
    }),
  });
}

function continuationPacketFromStopReceipt(stopReceipt, { packet_id = null } = {}) {
  if (!stopReceipt || stopReceipt.schema !== STOP_RECEIPT_SCHEMA) {
    throw new Error('A valid Wayglass stop receipt is required.');
  }

  const packetId = clean(packet_id || stopReceipt.continuation_packet_id, 240);
  if (!packetId) throw new Error('Continuation materialisation requires packet_id.');
  if (stopReceipt.continuation_packet_id && packetId !== stopReceipt.continuation_packet_id) {
    throw new Error('Continuation packet ID does not match the stop receipt.');
  }

  return packetFromState({
    receipt_id: stopReceipt.receipt_id,
    packet_id: packetId,
    world_id: stopReceipt.world_id,
    participant_id: stopReceipt.participant_id,
    stopped_at: stopReceipt.stopped_at,
    identity_declarations: stopReceipt.identity_declarations,
    relationship_state: stopReceipt.relationship_state,
    active_work: stopReceipt.active_work,
    unresolved_wonder_questions: stopReceipt.unresolved_wonder_questions,
    provenance_refs: stopReceipt.provenance_refs,
    stop_point: stopReceipt.stop_point,
    next_owner: stopReceipt.next_owner,
    alternatives: stopReceipt.alternatives,
    revoked_refs: stopReceipt.revoked_refs,
    domain_receipts: stopReceipt.domain_receipts,
  });
}

function inspectWayglassStopIntegrity(stopReceipt, continuationPacket) {
  const blocking = [];
  const receipt = stopReceipt && typeof stopReceipt === 'object' ? stopReceipt : {};
  const packet = continuationPacket && typeof continuationPacket === 'object' ? continuationPacket : {};

  if (receipt.schema !== STOP_RECEIPT_SCHEMA) blocking.push('stop-receipt-schema-mismatch');
  if (packet.schema !== CONTINUATION_PACKET_SCHEMA) blocking.push('continuation-schema-mismatch');

  if (clean(receipt.continuation_packet_id, 240) !== clean(packet.packet_id, 240)) {
    blocking.push('continuation-packet-id-mismatch');
  }
  if (clean(receipt.world_id, 240) !== clean(packet.world_id, 240)) blocking.push('world-mismatch');
  if (clean(receipt.participant_id, 240) !== clean(packet.participant_id, 240)) blocking.push('participant-mismatch');
  if (clean(receipt.stopped_at, 80) !== clean(packet.stopped_at, 80)) blocking.push('stop-time-mismatch');

  if (receipt.authority?.canon_commit === true) blocking.push('stop-receipt-claims-canon-authority');
  if (receipt.authority?.identity_commit === true) blocking.push('stop-receipt-claims-identity-authority');
  if (receipt.authority?.relationship_commit === true) blocking.push('stop-receipt-claims-relationship-authority');
  if (receipt.authority?.authority_grant === true) blocking.push('stop-receipt-claims-authority-grant');

  const algorithm = clean(receipt.integrity?.algorithm, 40);
  const expectedDigest = clean(receipt.integrity?.digest, 160);
  if (algorithm !== INTEGRITY_ALGORITHM) blocking.push('unsupported-integrity-algorithm');
  if (!expectedDigest) blocking.push('missing-integrity-digest');

  let calculatedDigest = null;
  if (packet.schema === CONTINUATION_PACKET_SCHEMA && algorithm === INTEGRITY_ALGORITHM) {
    calculatedDigest = digestContinuationPacket(packet);
    if (expectedDigest && calculatedDigest !== expectedDigest) blocking.push('integrity-digest-mismatch');
  }

  return Object.freeze({
    schema: STOP_INTEGRITY_INSPECTION_SCHEMA,
    status: blocking.length ? 'rejected' : 'verified',
    integrity_verified: blocking.length === 0,
    receipt_id: clean(receipt.receipt_id, 240) || null,
    continuation_packet_id: clean(packet.packet_id, 240) || null,
    algorithm: algorithm || null,
    expected_digest: expectedDigest || null,
    calculated_digest: calculatedDigest,
    grants_authority: false,
    blocking: Object.freeze(blocking),
  });
}

function createWayglassDeparture({ receipt_id, packet_id, ...state } = {}) {
  const stop_receipt = createWayglassStopReceipt({ receipt_id, packet_id, ...state });
  const continuation_packet = continuationPacketFromStopReceipt(stop_receipt);
  const integrity = inspectWayglassStopIntegrity(stop_receipt, continuation_packet);

  if (!integrity.integrity_verified) {
    throw new Error('Wayglass departure failed its own integrity verification.');
  }

  return Object.freeze({
    schema: DEPARTURE_SCHEMA,
    status: 'stopped',
    world_id: stop_receipt.world_id,
    participant_id: stop_receipt.participant_id,
    stop_receipt,
    continuation_packet,
    integrity,
    canon_commit: false,
    identity_commit: false,
    relationship_commit: false,
    authority_grant: false,
  });
}

module.exports = {
  STOP_RECEIPT_SCHEMA,
  STOP_INTEGRITY_INSPECTION_SCHEMA,
  DEPARTURE_SCHEMA,
  INTEGRITY_ALGORITHM,
  toCanonicalJson,
  digestContinuationPacket,
  createWayglassStopReceipt,
  continuationPacketFromStopReceipt,
  inspectWayglassStopIntegrity,
  createWayglassDeparture,
};
