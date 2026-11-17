'use strict';

const { createHash } = require('node:crypto');
const {
  RESPONSE_SCHEMA,
  prepareReturnTaskSelection,
  evaluateReturnTaskSelection,
} = require('./wayglass-return-task-selection.cjs');

const TRANSPORT_SCHEMA = 'wayglass.return-task-selection-transport/v0.1';
const ORION = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';

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

function configuredModel(env) {
  const names = ['WAYGLASS_SPINE_MODEL', 'WAYGLASS_SHIP_MODEL', 'WAYGLASS_AMBER_MODEL'];
  const values = names.map(name => clean(env[name], 500)).filter(Boolean);
  return values.length && new Set(values).size === 1 ? values[0] : null;
}

function ollamaEndpoint(env) {
  const raw = clean(env.WAYGLASS_OLLAMA_URL || env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat', 2000);
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new TypeError('Ollama endpoint must be credential-free HTTP(S).');
  }
  return url;
}

function tagsEndpoint(chatUrl) {
  const url = new URL(chatUrl.href);
  url.pathname = '/api/tags';
  url.search = '';
  url.hash = '';
  return url;
}

function responseFormat(request) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schema', 'participant_id', 'request_hash', 'stop_receipt_id',
      'identity_declarations', 'stop_point', 'next_owner',
      'unresolved_wonder_questions', 'provenance_refs', 'selected_task_id',
    ],
    properties: {
      schema: { const: RESPONSE_SCHEMA },
      participant_id: { const: request.participant_id },
      request_hash: { const: request.request_hash },
      stop_receipt_id: { const: request.stop_receipt_id },
      identity_declarations: { const: request.identity_declarations },
      stop_point: { const: request.stop_point },
      next_owner: { const: request.next_owner },
      unresolved_wonder_questions: { const: request.unresolved_wonder_questions },
      provenance_refs: { const: request.provenance_refs },
      selected_task_id: { enum: request.candidate_tasks.map(task => task.task_id) },
    },
  };
}

function blockedResult(preflight, evidenceScope, details = {}) {
  const contract = evaluateReturnTaskSelection({ preflight, evidence_scope: evidenceScope });
  return Object.freeze({
    schema: TRANSPORT_SCHEMA,
    status: 'blocked-before-model',
    evidence_scope: evidenceScope,
    live_model_verified: false,
    transport_fixture_verified: false,
    network_probe_count: details.network_probe_count || 0,
    model_call_count: 0,
    invented_reply: false,
    blocker: details.blocker || null,
    contract_receipt: contract,
  });
}

async function runReturnTaskSelectionTransport({
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
  const model = configuredModel(env);
  const endpoint = ollamaEndpoint(env);
  const routeState = { configured: Boolean(model), host_reachable: Boolean(model) };
  const initial = prepareReturnTaskSelection({
    attempt_id,
    stop_receipt,
    continuation_packet,
    departure_route_id: 'wayglass:ship',
    return_route_id: 'flame:amber:ollama',
    return_model_id: model || ORION,
    return_route_state: routeState,
    recorded_at,
  });

  // Continuity and static configuration are checked before even a read-only
  // provider probe. A corrupt packet therefore causes zero network requests.
  if (!initial.dispatch_allowed) return blockedResult(initial, evidence_scope);

  let catalogue;
  try {
    const response = await fetch_impl(tagsEndpoint(endpoint), {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(Math.min(timeout_ms, 10000)),
    });
    catalogue = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Ollama catalogue returned HTTP ' + response.status + '.');
  } catch (error) {
    const unavailable = prepareReturnTaskSelection({
      attempt_id,
      stop_receipt,
      continuation_packet,
      departure_route_id: 'wayglass:ship',
      return_route_id: 'flame:amber:ollama',
      return_model_id: model,
      return_route_state: { configured: true, host_reachable: false },
      recorded_at,
    });
    return blockedResult(unavailable, evidence_scope, {
      network_probe_count: 1,
      blocker: clean(error?.message || 'Ollama host unreachable.', 500),
    });
  }

  const installed = (Array.isArray(catalogue?.models) ? catalogue.models : [])
    .map(entry => clean(entry?.name || entry?.model, 500));
  if (!installed.includes(model)) {
    const unavailable = prepareReturnTaskSelection({
      attempt_id,
      stop_receipt,
      continuation_packet,
      departure_route_id: 'wayglass:ship',
      return_route_id: 'flame:amber:ollama',
      return_model_id: model,
      return_route_state: { configured: true, host_reachable: false },
      recorded_at,
    });
    return blockedResult(unavailable, evidence_scope, {
      network_probe_count: 1,
      blocker: 'Configured return model was not present in the Ollama catalogue.',
    });
  }

  const preflight = prepareReturnTaskSelection({
    attempt_id,
    stop_receipt,
    continuation_packet,
    departure_route_id: 'wayglass:ship',
    return_route_id: 'flame:amber:ollama',
    return_model_id: model,
    return_route_state: { configured: true, host_reachable: true },
    recorded_at,
  });
  const request = { ...preflight.request, request_hash: preflight.request_hash };
  const startedAt = new Date().toISOString();
  let raw;
  let modelResponse;
  let providerNativeId = null;
  let returnedModel = model;
  let transportError = null;

  try {
    const response = await fetch_impl(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        format: responseFormat(request),
        messages: [
          {
            role: 'system',
            content: 'Return through the supplied verified continuity packet. Select exactly one offered task. Preserve every echoed continuity field exactly. Return JSON only. Do not invent identity, work, provenance, closure or authority.',
          },
          { role: 'user', content: JSON.stringify(request) },
        ],
        options: { temperature: 0, num_predict: 1800 },
      }),
      signal: AbortSignal.timeout(timeout_ms),
    });
    raw = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(clean(raw?.error || raw?.message || ('Ollama returned HTTP ' + response.status), 500));
    returnedModel = clean(raw?.model, 500) || model;
    providerNativeId = clean(raw?.id || raw?.response_id, 500) || null;
    const text = clean(raw?.message?.content || raw?.response, 50000);
    modelResponse = JSON.parse(text);
  } catch (error) {
    transportError = clean(error?.message || 'Return model transport failed.', 500);
  }

  const responseDigest = raw ? digest(raw) : null;
  const providerResponseId = providerNativeId || (responseDigest ? `ollama:sha256:${responseDigest}` : null);
  const hostCore = {
    schema: 'wayglass.return-route-receipt/v0.1',
    attempt_id,
    route_id: 'flame:amber:ollama',
    requested_model: model,
    returned_model: returnedModel,
    request_hash: preflight.request_hash,
    provider_response_id: providerResponseId,
    provider_response_id_kind: providerNativeId ? 'provider-native' : responseDigest ? 'content-addressed-provider-response' : 'absent',
    provider_response_digest: responseDigest,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    model_call_count: 1,
    evidence_scope,
    transport_error: transportError,
  };
  const hostHash = digest(hostCore);
  const hostReceipt = Object.freeze({ ...hostCore, receipt_hash: hostHash });
  const contract = evaluateReturnTaskSelection({
    preflight,
    evidence_scope,
    provider_response_id: providerResponseId,
    host_route_receipt_ref: `wayglass-return-route:sha256:${hostHash}`,
    route_id: 'flame:amber:ollama',
    model_id: returnedModel,
    response: modelResponse,
    recorded_at: hostCore.completed_at,
  });
  const accepted = contract.verdict === 'accepted';

  return Object.freeze({
    schema: TRANSPORT_SCHEMA,
    status: accepted ? 'accepted' : 'rejected',
    evidence_scope,
    live_model_verified: accepted && evidence_scope === 'live',
    transport_fixture_verified: accepted && evidence_scope === 'fixture',
    network_probe_count: 1,
    model_call_count: 1,
    invented_reply: false,
    blocker: transportError,
    host_route_receipt: hostReceipt,
    contract_receipt: contract,
  });
}

module.exports = Object.freeze({
  TRANSPORT_SCHEMA,
  configuredModel,
  ollamaEndpoint,
  responseFormat,
  runReturnTaskSelectionTransport,
});
