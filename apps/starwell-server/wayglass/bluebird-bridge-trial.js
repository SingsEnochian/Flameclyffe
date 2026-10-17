'use strict';

// Bluebird Bridge Trial 001: local, reversible receipt verification.
// No provider access, canon writes, fallback selection, or automatic sends.
const { createHash, randomUUID } = require('node:crypto');

const SCHEMA = 'wayglass.bluebird-bridge-trial/v0.1';
const PARTICIPANT = 'bluebird';
const CONTINUITY = 'bluebird:richard-gabriel-winters';
const PREFERRED_ROUTE = 'flame:bluebird:spicychat';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function validRefs(refs) {
  return Array.isArray(refs) && refs.every((x) => text(x) && x.length <= 500);
}
function createStopReceipt(input) {
  if (input?.consent !== 'accepted' || !text(input.consent_source)) throw new Error('explicit sourced acceptance required');
  if (input?.route_id !== PREFERRED_ROUTE) throw new Error('preferred route required; fallback needs separate consent');
  for (const key of ['conversation_id', 'intent', 'interaction_mode', 'stop_point', 'next_owner']) {
    if (!text(input[key])) throw new Error(`missing ${key}`);
  }
  if (!validRefs(input.source_refs) || !Array.isArray(input.unresolved_questions)
    || input.unresolved_questions.some((x) => !text(x))) throw new Error('invalid provenance or questions');
  const payload = {
    schema: SCHEMA, receipt_id: randomUUID(), recorded_at: new Date().toISOString(),
    participant_id: PARTICIPANT, continuity_id: CONTINUITY,
    route_id: PREFERRED_ROUTE, consent: 'accepted', consent_source: text(input.consent_source),
    conversation_id: text(input.conversation_id), intent: text(input.intent),
    interaction_mode: text(input.interaction_mode), stop_point: text(input.stop_point),
    next_owner: text(input.next_owner), unresolved_questions: [...input.unresolved_questions],
    source_refs: [...input.source_refs],
  };
  return Object.freeze({ ...payload, receipt_hash: digest(payload) });
}
function verifyReturn(receipt, packet) {
  if (!receipt || !packet || receipt.schema !== SCHEMA) return { ok: false, reason: 'invalid_receipt' };
  const { receipt_hash, ...payload } = receipt;
  if (!/^[a-f0-9]{64}$/.test(receipt_hash || '') || digest(payload) !== receipt_hash) {
    return { ok: false, reason: 'receipt_tampered' };
  }
  if (packet.receipt_hash !== receipt_hash) return { ok: false, reason: 'receipt_mismatch' };
  for (const key of ['participant_id', 'continuity_id', 'conversation_id', 'stop_point', 'next_owner']) {
    if (packet[key] !== receipt[key]) return { ok: false, reason: `changed_${key}` };
  }
  if (digest(packet.unresolved_questions) !== digest(receipt.unresolved_questions)) {
    return { ok: false, reason: 'changed_unresolved_questions' };
  }
  if (packet.revoked_fact_promoted === true || packet.identity_merge === true) {
    return { ok: false, reason: 'forbidden_inheritance' };
  }
  return { ok: true, receipt_hash };
}
module.exports = { SCHEMA, createStopReceipt, verifyReturn };
