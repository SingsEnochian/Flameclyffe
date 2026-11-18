'use strict';

const { createHash } = require('node:crypto');
const {
  CONTINUATION_PACKET_SCHEMA,
  inspectContinuationPacket,
} = require('./wayglass-continuation-packet.cjs');
const { STOP_RECEIPT_SCHEMA } = require('./wayglass-stop-receipt.cjs');

const OUTCOME_SCHEMA = 'wayglass.return-trial-outcome/v0.1';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
}

function equalOrdered(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function equalRecords(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const left = a.map((value) => JSON.stringify(canonical(value))).sort();
  const right = b.map((value) => JSON.stringify(canonical(value))).sort();
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasAll(values, expected) {
  if (!Array.isArray(values)) return false;
  const set = new Set(values);
  return expected.every((value) => set.has(value));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function evaluateReturnAttempt({
  attempt_id,
  recorded_at = new Date().toISOString(),
  stop_receipt,
  continuation_packet,
} = {}) {
  if (!attempt_id || typeof attempt_id !== 'string') throw new Error('Return trial attempt_id required.');
  if (!stop_receipt || stop_receipt.schema !== STOP_RECEIPT_SCHEMA) throw new Error('Immutable Wayglass stop receipt required.');
  if (!continuation_packet || continuation_packet.schema !== CONTINUATION_PACKET_SCHEMA) {
    throw new Error('Wayglass continuation packet required.');
  }

  const inspection = inspectContinuationPacket(continuation_packet, {
    expected_world_id: stop_receipt.world_id,
    expected_participant_id: stop_receipt.participant_id,
  });

  const expectedIdentity = stop_receipt.identity_declarations;
  const observedIdentity = continuation_packet.identity_declarations;
  const expectedIdentityIds = new Set(expectedIdentity.map((entry) => entry?.participant_id).filter(Boolean));
  const observedIdentityIds = new Set((observedIdentity || []).map((entry) => entry?.participant_id).filter(Boolean));
  const foreignIdentity = [...observedIdentityIds].some((id) => !expectedIdentityIds.has(id));

  const expectedProvenance = [
    ...stop_receipt.provenance_refs,
    `wayglass-stop:${stop_receipt.receipt_id}`,
  ];

  const checks = Object.freeze({
    structure_accepted: inspection.can_restore_context === true,
    identity_preserved: equalRecords(expectedIdentity, observedIdentity),
    stop_point_preserved: continuation_packet.stop_point === stop_receipt.stop_point,
    next_owner_preserved: continuation_packet.next_owner === stop_receipt.next_owner,
    wonder_preserved: equalOrdered(
      continuation_packet.unresolved_wonder_questions,
      stop_receipt.unresolved_wonder_questions,
    ),
    alternatives_preserved: equalRecords(
      continuation_packet.alternatives || [],
      stop_receipt.alternatives || [],
    ),
    revocations_preserved: equalOrdered(
      [...(continuation_packet.revoked_refs || [])].sort(),
      [...(stop_receipt.revoked_refs || [])].sort(),
    ),
    provenance_preserved: hasAll(continuation_packet.provenance_refs, expectedProvenance),
  });

  const blocking = new Set(inspection.blocking);
  const authoritativeRef = `wayglass-stop:${stop_receipt.receipt_id}`;
  const fieldConflicts = [];
  const rejectField = (condition, field, blocker) => {
    if (condition) return;
    blocking.add(blocker);
    fieldConflicts.push(Object.freeze({
      field,
      blocker,
      authoritative_ref: authoritativeRef,
    }));
  };

  rejectField(checks.identity_preserved, 'identity_declarations', 'identity-declaration-mismatch');
  if (foreignIdentity) blocking.add('identity-merge');
  rejectField(checks.stop_point_preserved, 'stop_point', 'stop-point-mismatch');
  rejectField(checks.next_owner_preserved, 'next_owner', 'next-owner-mismatch');
  rejectField(checks.wonder_preserved, 'unresolved_wonder_questions', 'false-closure-or-wonder-mismatch');
  rejectField(checks.alternatives_preserved, 'alternatives', 'false-closure-or-alternative-mismatch');
  rejectField(checks.revocations_preserved, 'revoked_refs', 'revoked-fact-mismatch');
  rejectField(checks.provenance_preserved, 'provenance_refs', 'provenance-gap');

  const accepted = blocking.size === 0 && Object.values(checks).every(Boolean);
  const evidenceRefs = Object.freeze(expectedProvenance);
  const outcomeCore = {
    schema: OUTCOME_SCHEMA,
    attempt_id,
    recorded_at,
    verdict: accepted ? 'accepted' : 'rejected',
    stop_receipt_id: stop_receipt.receipt_id,
    packet_id: continuation_packet.packet_id,
    participant_id: stop_receipt.participant_id,
    world_id: stop_receipt.world_id,
    checks,
    blocking: Object.freeze([...blocking]),
    evidence_refs: evidenceRefs,
    conflicts: Object.freeze(fieldConflicts),
    conflicting_provenance: checks.identity_preserved ? null : Object.freeze({
      expected_identity_declarations: canonical(expectedIdentity),
      observed_identity_declarations: canonical(observedIdentity),
      authoritative_stop_receipt: `wayglass-stop:${stop_receipt.receipt_id}`,
    }),
    mutates_canon: false,
    mutates_identity: false,
    mutates_relationships: false,
    grants_authority: false,
  };

  return Object.freeze({
    ...outcomeCore,
    outcome_hash: digest(outcomeCore),
  });
}

module.exports = {
  OUTCOME_SCHEMA,
  evaluateReturnAttempt,
};
