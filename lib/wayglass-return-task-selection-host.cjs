'use strict';

const { createHash } = require('node:crypto');
const {
  RESPONSE_SCHEMA,
  prepareReturnTaskSelection,
  evaluateReturnTaskSelection,
} = require('./wayglass-return-task-selection.cjs');

const HOST_TRANSPORT_SCHEMA = 'wayglass.return-task-selection-host-transport/v0.1';
const DEFAULT_DEPARTURE_ROUTE_ID = 'wayglass:ship';
const DEFAULT_RETURN_ROUTE_ID = 'wayglass:crow';
const PROVISIONAL_MODEL = 'pending:authenticated-route-catalogue';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function wayglassHostEndpoint(env = process.env) {
  const raw = clean(
    env.WAYGLASS_HOST_URL
      || env.WAYGLASS_BASE_URL
      || 'http://127.0.0.1:3000/api/v1/wayglass',
    2000,
  );
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new TypeError('Wayglass host endpoint must be credential-free HTTP(S).');
  }
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

function endpoint(base, suffix) {
  const url = new URL(base.href);
  url.pathname = base.pathname.replace(/\/$/, '') + suffix;
  return url;
}

function hostAuthHeaders(env = process.env) {
  const authorization = clean(env.WAYGLASS_HOUSE_AUTHORIZATION, 4000);
  const cookie = clean(env.WAYGLASS_HOUSE_COOKIE, 8000);
  return Object.freeze({
    ...(authorization ? { Authorization: authorization } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
  });
}

function parseModelOutput(text) {
  const source = clean(text, 60000);
  if (!source) return null;
  try { return JSON.parse(source); }
  catch { return null; }
}

function blocked(preflight, evidenceScope, details = {}) {
  const contract = evaluateReturnTaskSelection({ preflight, evidence_scope: evidenceScope });
  return Object.freeze({
    schema: HOST_TRANSPORT_SCHEMA,
    status: 'blocked-before-model',
    evidence_scope: evidenceScope,
    live_model_verified: false,
    transport_fixture_verified: false,
    network_probe_count: details.network_probe_count || 0,
    model_call_count: 0,
    invented_reply: false,
    blocker: details.blocker || null,
    host_endpoint: details.host_endpoint || null,
    contract_receipt: contract,
  });
}

async function runReturnTaskSelectionViaHost({
  attempt_id,
  stop_receipt,
  continuation_packet,
  departure_route_id = stop_receipt?.route_id || DEFAULT_DEPARTURE_ROUTE_ID,
  return_route_id = DEFAULT_RETURN_ROUTE_ID,
  env = process.env,
  fetch_impl = globalThis.fetch,
  evidence_scope = 'live',
  recorded_at = new Date().toISOString(),
  timeout_ms = 120000,
} = {}) {
  if (!['live', 'fixture'].includes(evidence_scope)) {
    throw new TypeError('evidence_scope must be live or fixture.');
  }

  const base = wayglassHostEndpoint(env);
  const authHeaders = hostAuthHeaders(env);

  // Continuity is evaluated before ANY host request. Corrupt continuity therefore
  // cannot reach the route catalogue or a model.
  const continuityGate = prepareReturnTaskSelection({
    attempt_id,
    stop_receipt,
    continuation_packet,
    departure_route_id,
    return_route_id,
    return_model_id: PROVISIONAL_MODEL,
    return_route_state: { configured: true, host_reachable: true },
    recorded_at,
  });
  if (!continuityGate.dispatch_allowed) {
    return blocked(continuityGate, evidence_scope, { host_endpoint: base.origin + base.pathname });
  }

  let catalogue;
  try {
    const response = await fetch_impl(endpoint(base, '/routes'), {
      method: 'GET',
      headers: authHeaders,
      redirect: 'error',
      signal: AbortSignal.timeout(Math.min(timeout_ms, 10000)),
    });
    catalogue = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Wayglass route catalogue returned HTTP ' + response.status + '.');
  } catch (error) {
    const unavailable = prepareReturnTaskSelection({
      attempt_id,
      stop_receipt,
      continuation_packet,
      departure_route_id,
      return_route_id,
      return_model_id: PROVISIONAL_MODEL,
      return_route_state: { configured: true, host_reachable: false },
      recorded_at,
    });
    return blocked(unavailable, evidence_scope, {
      network_probe_count: 1,
      blocker: clean(error?.message || 'Wayglass host unreachable.', 500),
      host_endpoint: base.origin + base.pathname,
    });
  }

  const route = (Array.isArray(catalogue?.routes) ? catalogue.routes : [])
    .find(item => item?.route_id === return_route_id);
  const routeModel = clean(route?.model, 500) || PROVISIONAL_MODEL;
  const routeParticipant = clean(route?.participant_id, 240);
  if (!route || route.configured !== true || routeParticipant !== stop_receipt.participant_id) {
    const unavailable = prepareReturnTaskSelection({
      attempt_id,
      stop_receipt,
      continuation_packet,
      departure_route_id,
      return_route_id,
      return_model_id: routeModel,
      return_route_state: {
        configured: Boolean(route?.configured === true),
        host_reachable: true,
        participant_id: routeParticipant || null,
      },
      recorded_at,
    });
    return blocked(unavailable, evidence_scope, {
      network_probe_count: 1,
      blocker: !route
        ? 'Requested returning route is absent.'
        : route.configured !== true
          ? 'Requested returning route is present but not configured.'
          : 'Requested returning route belongs to another participant.',
      host_endpoint: base.origin + base.pathname,
    });
  }

  const preflight = prepareReturnTaskSelection({
    attempt_id,
    stop_receipt,
    continuation_packet,
    departure_route_id,
    return_route_id,
    return_model_id: routeModel,
    return_route_state: {
      configured: true,
      host_reachable: true,
      participant_id: routeParticipant,
    },
    recorded_at,
  });
  if (!preflight.dispatch_allowed) return blocked(preflight, evidence_scope, {
    network_probe_count: 1,
    host_endpoint: base.origin + base.pathname,
  });

  const request = { ...preflight.request, request_hash: preflight.request_hash };
  const prompt = [
    'ONE_SHIP_RETURN_ENGINE_TASK_SELECTION',
    'Read only the verified request below.',
    'Select exactly one offered non-revoked task.',
    'Preserve identity declarations, stop point, next_owner, unresolved Wonder questions and provenance exactly.',
    'Return JSON only. Do not invent identity, work, memory, closure, provenance or authority.',
    JSON.stringify(request),
  ].join('\n');

  const startedAt = new Date().toISOString();
  let routeTurn = null;
  let transportError = null;
  let modelResponse = null;
  let returnedModel = routeModel;
  let providerResponseId = null;
  let returnedRouteId = return_route_id;
  let returnedParticipantId = null;

  try {
    const response = await fetch_impl(endpoint(base, '/respond'), {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        route_id: return_route_id,
        external_provider_consent: false,
        world_id: stop_receipt.world_id,
        participant_id: stop_receipt.participant_id,
        continuation_packet,
        stop_receipt,
        input: prompt,
        history: [],
        interaction: { channel: 'OOC', turn_owner: stop_receipt.participant_id },
        session_id: attempt_id + ':return',
        surface_id: 'wayglass:return-trial-004-one-ship',
        max_output_tokens: 1800,
        think: false,
      }),
      signal: AbortSignal.timeout(timeout_ms),
    });
    routeTurn = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(clean(routeTurn?.error || routeTurn?.message || ('Wayglass host returned HTTP ' + response.status), 500));
    }
    if (routeTurn?.schema !== 'wayglass.route-turn/v0.1') {
      throw new Error('Wayglass host did not return a route-turn receipt.');
    }
    returnedRouteId = clean(routeTurn?.route_id, 240) || return_route_id;
    returnedParticipantId = clean(routeTurn?.participant_id, 240) || null;
    returnedModel = clean(
      routeTurn?.receipt?.returned_model
        || routeTurn?.receipt?.requested_model
        || routeTurn?.model,
      500,
    ) || routeModel;
    providerResponseId = clean(
      routeTurn?.receipt?.provider_response_id
        || routeTurn?.receipt?.observation_id
        || routeTurn?.response_id,
      500,
    ) || null;
    modelResponse = parseModelOutput(routeTurn?.output);
  } catch (error) {
    transportError = clean(error?.message || 'Wayglass host return transport failed.', 500);
  }

  const routeDigest = routeTurn ? digest(routeTurn) : null;
  if (!providerResponseId && routeDigest) providerResponseId = 'wayglass-host:sha256:' + routeDigest;

  const hostCore = {
    schema: 'wayglass.return-route-receipt/v0.2',
    attempt_id,
    route_id: returnedRouteId,
    participant_id: returnedParticipantId,
    requested_model: routeModel,
    returned_model: returnedModel,
    request_hash: preflight.request_hash,
    provider_response_id: providerResponseId,
    provider_response_id_kind: routeTurn?.receipt?.observation_id
      ? 'host-observation'
      : routeDigest
        ? 'content-addressed-host-turn'
        : 'absent',
    host_route_turn_digest: routeDigest,
    host_endpoint: base.origin + base.pathname,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    model_call_count: 1,
    network_probe_count: 1,
    evidence_scope,
    transport_error: transportError,
  };
  const hostHash = digest(hostCore);
  const hostReceipt = Object.freeze({ ...hostCore, receipt_hash: hostHash });

  const contract = evaluateReturnTaskSelection({
    preflight,
    evidence_scope,
    provider_response_id: providerResponseId,
    host_route_receipt_ref: 'wayglass-return-route:sha256:' + hostHash,
    host_participant_id: returnedParticipantId,
    route_id: returnedRouteId,
    model_id: returnedModel,
    response: modelResponse,
    recorded_at: hostCore.completed_at,
  });
  const accepted = contract.verdict === 'accepted';

  return Object.freeze({
    schema: HOST_TRANSPORT_SCHEMA,
    status: accepted ? 'accepted' : 'rejected',
    evidence_scope,
    live_model_verified: accepted && evidence_scope === 'live',
    transport_fixture_verified: accepted && evidence_scope === 'fixture',
    network_probe_count: 1,
    model_call_count: 1,
    invented_reply: false,
    blocker: transportError,
    host_endpoint: hostCore.host_endpoint,
    host_route_receipt: hostReceipt,
    contract_receipt: contract,
  });
}

module.exports = Object.freeze({
  HOST_TRANSPORT_SCHEMA,
  DEFAULT_DEPARTURE_ROUTE_ID,
  DEFAULT_RETURN_ROUTE_ID,
  hostAuthHeaders,
  wayglassHostEndpoint,
  runReturnTaskSelectionViaHost,
});
