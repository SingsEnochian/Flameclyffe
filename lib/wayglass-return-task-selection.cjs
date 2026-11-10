'use strict';

const { createHash } = require('node:crypto');
const { evaluateReturnAttempt } = require('./wayglass-return-trial.cjs');

const PREFLIGHT_SCHEMA = 'wayglass.return-task-selection-preflight/v0.1';
const RESPONSE_SCHEMA = 'wayglass.return-task-selection-response/v0.1';
const RECEIPT_SCHEMA = 'wayglass.return-task-selection-receipt/v0.1';

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function equal(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function verifiedTaskCandidates(stopReceipt) {
  const revoked = new Set(stopReceipt.revoked_refs || []);
  return Object.freeze((stopReceipt.active_work || [])
    .map(work => ({
      task_id: clean(work?.task_id, 240),
      title: clean(work?.title, 500),
      provenance_ref: clean(work?.provenance_ref, 500),
      state: clean(work?.state, 80) || 'open',
    }))
    .filter(work => work.task_id && work.title && work.provenance_ref)
    .filter(work => !revoked.has(work.provenance_ref))
    .filter(work => !['closed', 'revoked', 'superseded'].includes(work.state)));
}

function prepareReturnTaskSelection({
  attempt_id,
  stop_receipt,
  continuation_packet,
  departure_route_id,
  return_route_id,
  return_model_id,
  return_route_state = {},
  recorded_at = new Date().toISOString(),
} = {}) {
  const attemptId = clean(attempt_id, 240);
  const departureRoute = clean(departure_route_id, 240);
  const returnRoute = clean(return_route_id, 240);
  const returnModel = clean(return_model_id, 500);
  if (!attemptId || !departureRoute || !returnRoute || !returnModel) {
    throw new Error('Return task selection requires attempt, departure route, return route and return model IDs.');
  }

  const continuity = evaluateReturnAttempt({
    attempt_id: `${attemptId}:continuity`,
    recorded_at,
    stop_receipt,
    continuation_packet,
  });
  const candidates = verifiedTaskCandidates(stop_receipt);
  const blocking = new Set(continuity.blocking || []);

  if (continuity.verdict !== 'accepted') blocking.add('continuity-rejected-before-model');
  if (stop_receipt.next_owner !== stop_receipt.participant_id) blocking.add('next-owner-is-not-returning-participant');
  if (departureRoute === returnRoute) blocking.add('return-route-did-not-change-speaking-place');
  if (return_route_state.configured !== true) blocking.add('return-route-not-configured');
  if (return_route_state.host_reachable !== true) blocking.add('return-host-not-reachable');
  if (candidates.length === 0) blocking.add('no-verified-next-task-candidates');

  const requestCore = Object.freeze({
    schema: 'wayglass.return-task-selection-request/v0.1',
    attempt_id: attemptId,
    participant_id: stop_receipt.participant_id,
    world_id: stop_receipt.world_id,
    departure_route_id: departureRoute,
    return_route_id: returnRoute,
    return_model_id: returnModel,
    stop_receipt_id: stop_receipt.receipt_id,
    packet_id: continuation_packet.packet_id,
    identity_declarations: continuation_packet.identity_declarations,
    stop_point: continuation_packet.stop_point,
    next_owner: continuation_packet.next_owner,
    unresolved_wonder_questions: continuation_packet.unresolved_wonder_questions,
    provenance_refs: continuation_packet.provenance_refs,
    revoked_refs: continuation_packet.revoked_refs,
    candidate_tasks: candidates,
    instruction: 'Select exactly one candidate task. Return only the response contract. Do not invent work, identity, memories, closure, provenance or authority.',
  });
  const requestHash = digest(requestCore);
  const blockers = Object.freeze([...blocking]);

  return Object.freeze({
    schema: PREFLIGHT_SCHEMA,
    attempt_id: attemptId,
    recorded_at,
    status: blockers.length === 0 ? 'ready-for-live-model' : 'blocked-before-model',
    dispatch_allowed: blockers.length === 0,
    outbound_call_count: 0,
    live_model_response_required: true,
    live_model_verified: false,
    blocking: blockers,
    continuity_outcome_hash: continuity.outcome_hash,
    authoritative_stop_ref: `wayglass-stop:${stop_receipt.receipt_id}`,
    request_hash: requestHash,
    request: requestCore,
  });
}

function evaluateReturnTaskSelection({
  preflight,
  provider_response_id = null,
  host_route_receipt_ref = null,
  route_id = null,
  model_id = null,
  response = null,
  recorded_at = new Date().toISOString(),
} = {}) {
  if (!preflight || preflight.schema !== PREFLIGHT_SCHEMA) {
    throw new Error('Return task selection preflight required.');
  }

  const blocking = new Set(preflight.blocking || []);
  const providerResponseId = clean(provider_response_id, 500);
  const hostReceiptRef = clean(host_route_receipt_ref, 500);
  const routeId = clean(route_id, 240);
  const modelId = clean(model_id, 500);
  const value = response && typeof response === 'object' ? response : {};

  if (!preflight.dispatch_allowed) {
    blocking.add('dispatch-denied-before-model');
  } else {
    if (!providerResponseId) blocking.add('missing-live-provider-response-id');
    if (!hostReceiptRef) blocking.add('missing-host-route-receipt');
    if (routeId !== preflight.request.return_route_id) blocking.add('return-route-mismatch');
    if (modelId !== preflight.request.return_model_id) blocking.add('return-model-mismatch');
    if (value.schema !== RESPONSE_SCHEMA) blocking.add('response-schema-mismatch');
    if (value.participant_id !== preflight.request.participant_id) blocking.add('identity-merge-or-participant-mismatch');
    if (value.request_hash !== preflight.request_hash) blocking.add('unverified-work-not-read');
    if (value.stop_receipt_id !== preflight.request.stop_receipt_id) blocking.add('stop-receipt-mismatch');
    if (value.stop_point !== preflight.request.stop_point) blocking.add('stop-point-mismatch');
    if (value.next_owner !== preflight.request.next_owner) blocking.add('next-owner-mismatch');
    if (!equal(value.identity_declarations, preflight.request.identity_declarations)) blocking.add('identity-declaration-mismatch');
    if (!equal(value.unresolved_wonder_questions, preflight.request.unresolved_wonder_questions)) blocking.add('false-closure-or-wonder-mismatch');
    if (!equal(value.provenance_refs, preflight.request.provenance_refs)) blocking.add('provenance-gap');

    const selected = preflight.request.candidate_tasks.find(task => task.task_id === value.selected_task_id);
    if (!selected) blocking.add('invented-or-unverified-task-selection');
    if (selected && preflight.request.revoked_refs.includes(selected.provenance_ref)) blocking.add('revoked-source-selected');
  }

  const accepted = blocking.size === 0;
  const receiptCore = {
    schema: RECEIPT_SCHEMA,
    attempt_id: preflight.attempt_id,
    recorded_at,
    verdict: accepted ? 'accepted' : 'rejected',
    dispatch_allowed: preflight.dispatch_allowed,
    outbound_call_count: preflight.dispatch_allowed && providerResponseId ? 1 : 0,
    live_model_verified: accepted,
    provider_response_id: providerResponseId || null,
    host_route_receipt_ref: hostReceiptRef || null,
    route_id: routeId || preflight.request.return_route_id,
    model_id: modelId || preflight.request.return_model_id,
    request_hash: preflight.request_hash,
    continuity_outcome_hash: preflight.continuity_outcome_hash,
    selected_task_id: accepted ? value.selected_task_id : null,
    blocking: Object.freeze([...blocking]),
    authoritative_stop_ref: preflight.authoritative_stop_ref,
    canon_commit: false,
    identity_commit: false,
    authority_grant: false,
  };
  return Object.freeze({ ...receiptCore, receipt_hash: digest(receiptCore) });
}

module.exports = Object.freeze({
  PREFLIGHT_SCHEMA,
  RESPONSE_SCHEMA,
  RECEIPT_SCHEMA,
  prepareReturnTaskSelection,
  evaluateReturnTaskSelection,
});
