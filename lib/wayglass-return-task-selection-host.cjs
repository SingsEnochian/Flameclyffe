'use strict';

const { createHash } = require('node:crypto');
const {
  RESPONSE_SCHEMA,
  prepareReturnTaskSelection,
  evaluateReturnTaskSelection,
} = require('./wayglass-return-task-selection.cjs');

const HOST_TRANSPORT_SCHEMA = 'wayglass.return-task-selection-host-transport/v0.1';
const RETURN_ROUTE_ID = 'flame:amber:ollama';
const FALLBACK_MODEL = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';

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

function configuredFallbackModel(env = process.env) {
  const names = ['WAYGLASS_SPINE_MODEL', 'WAYGLASS_SHIP_MODEL', 'WAYGLASS_AMBER_MODEL'];
  const values = names.map(name => clean(env[name], 500)).filter(Boolean);
  return values.length && new Set(values).size === 1 ? values[0] : FALLBACK_MODEL;
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
  const provisionalModel = configuredFallbackModel(env);

  // Continuity is evaluated before ANY host request. Corrupt continuity therefore
  // cannot reach the route catalogue or a model.
  const continuityGate = prepareReturnTaskSelection({
    attempt_id,
    stop_receipt,
    continuation_packet,
    departure_route_id: 'wayglass:ship',
    return_route_id: RETURN_ROUTE_ID,
    return_model_id: provisionalModel,
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
      departure_route_id: 'wayglass:ship',
      return_route_id: RETURN_ROUTE_ID,
      return_model_id: provisionalModel,
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
    .find(item => item?.route_id === RETURN_ROUTE_ID);
  const routeModel = clean(route?.model, 500) || provisionalModel;
  if (!route || route.configured !== true) {
    const unavailable = prepareReturnTaskSelection({
      attempt_id,
      stop_receipt,
      continuation_packet,
      departure_route_id: 'wayglass:ship',
      return_route_id: RETURN_ROUTE_ID,
      return_model_id: routeModel,
      return_route_state: { configured: false, host_reachable: true },
      recorded_at,
    });
    return blocked(unavailable, evidence_scope, {
      network_probe_count: 1,
      blocker: route ? 'Amber host route is present but not configured.' : 'Amber host route is absent.',
      host_endpoint: base.origin + base.pathname,
    });
  }

  const preflight = prepareReturnTaskSelection({
    attempt_id,
    stop_receipt,
    continuation_packet,
    departure_route_id: 'wayglass:ship',
    return_route_id: RETURN_ROUTE_ID,
    return_model_id: routeModel,
    return_route_state: { configured: true, host_reachable: true },
    recorded_at,
  });
  if (!preflight.dispatch_allowed) return blocked(preflight, evidence_scope, {
    network_probe_count: 1,
    host_endpoint: base.origin + base.pathname,
  });

  const request = { ...preflight.request, request_hash: preflight.request_hash };
  const prompt = [
    'RETURN_ENGINE_TASK_SELECTION',
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

  try {
    const response = await fetch_impl(endpoint(base, '/respond'), {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: RETURN_ROUTE_ID,
        external_provider_consent: false,
        world_id: stop_receipt.world_id,
        participant_id: stop_receipt.participant_id,
        continuation_packet,
        stop_receipt,
        input: prompt,
        history: [],
        interaction: { channel: 'OOC', turn_owner: stop_receipt.participant_id },
        session_id: attempt_id + ':amber-return',
        surface_id: 'wayglass:return-trial-004',
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
    route_id: RETURN_ROUTE_ID,
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
    route_id: RETURN_ROUTE_ID,
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
  RETURN_ROUTE_ID,
  wayglassHostEndpoint,
  runReturnTaskSelectionViaHost,
});
