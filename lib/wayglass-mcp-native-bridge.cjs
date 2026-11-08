'use strict';

// The cloud MCP principal and native House Steward credential are distinct.
// Both are supplied by trusted host adapters; request text cannot grant either.
const { resolveWayglassRoute } = require('./wayglass-route-registry.cjs');
const INPUT_KEYS = new Set(['route_id', 'input', 'history', 'interaction', 'max_output_tokens', 'think']);
const CONTEXT_KEYS = new Set(['world_id', 'participant_id', 'session_id', 'surface_id', 'character_id',
  'waygate_manifest', 'continuation_packet', 'stop_receipt', 'embodiment', 'checkpoint_storage_id',
  'checkpoint_world_id', 'checkpoint_participant_id', 'emergence_question_id']);
const MAX_BYTES = 1024 * 1024;
const id = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 1024 && !/[\u0000-\u001f]/.test(value);
function denied(message = 'Native Wayglass authorization unavailable') {
  const error = new Error(message); error.code = 'WAYGLASS_NATIVE_DENIED'; return error;
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }

function createWayglassMcpNativeBridge({ nativeOrigin, resource, authorize, credentialFor,
  featherStopped, fetchImpl = globalThis.fetch, adapterTimeoutMs = 5000 } = {}) {
  let origin;
  try { origin = new URL(nativeOrigin); } catch { throw new TypeError('Native origin required'); }
  if (origin.origin !== nativeOrigin || origin.username || origin.password || origin.search || origin.hash ||
      (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(origin.hostname)))) {
    throw new TypeError('Native origin must be HTTPS or loopback HTTP without a path');
  }
  if (!id(resource) || !resource.startsWith('https://') ||
      [authorize, credentialFor, featherStopped, fetchImpl].some(fn => typeof fn !== 'function')) {
    throw new TypeError('Resource and trusted authorization, credential, Feather and transport adapters required');
  }

  if (!Number.isInteger(adapterTimeoutMs) || adapterTimeoutMs < 1 || adapterTimeoutMs > 30000) {
    throw new TypeError('Bounded native adapter timeout required');
  }
  async function adapterCall(adapter, request, message) {
    const controller = new AbortController(); let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(() => adapter(copy(request), { signal: controller.signal })),
        new Promise((_, reject) => { timer = setTimeout(() => {
          controller.abort(); reject(denied(message));
        }, adapterTimeoutMs); }),
      ]);
    } catch { throw denied(message); }
    finally { clearTimeout(timer); }
  }
  const binding = g => JSON.stringify([g.active === true, g.ownerAuthorized === true,
    g.revoked === true, g.consentActive === true, g.consentRevoked === true,
    g.subject, g.grantId, g.resource, g.consentRef, g.scopes, g.routeIds,
    g.nativeContext || {}, g.externalProviderConsent === true]);
  function validGrant(grant, request, routeId) {
    return grant && grant.active === true && grant.ownerAuthorized === true && grant.revoked !== true &&
      grant.consentRevoked !== true && grant.consentActive === true && grant.subject === request.subject &&
      grant.resource === resource && grant.consentRef === request.consentRef && id(grant.grantId) &&
      Array.isArray(grant.scopes) && grant.scopes.includes('wayglass:constellation') &&
      Array.isArray(grant.routeIds) && !grant.routeIds.some(route => !id(route)) &&
      (!routeId || grant.routeIds.includes(routeId));
  }
  async function grantFor(context, action, routeId = null) {
    // Snapshot context before crossing an asynchronous boundary.
    if (!context || !id(context.principalId) || context.resource !== resource ||
        !id(context.consentRef) || !Array.isArray(context.scopes) || !context.scopes.includes('wayglass:constellation')) throw denied();
    const request = { subject: context.principalId, resource, consentRef: context.consentRef,
      scopes: [...context.scopes], action, routeId };
    const grant = await adapterCall(authorize, request, 'Native Wayglass authorization unavailable');
    // Snapshot immediately: an adapter may return a shared mutable grant object.
    const snapshot = copy(grant);
    if (!validGrant(snapshot, request, routeId)) throw denied();
    // Unknown stop state is a stop. Callback is a trusted current host service.
    const stopped = await adapterCall(featherStopped, request, 'Feather stopped or unavailable');
    if (stopped !== false) throw denied('Feather stopped or unavailable');
    // Do not validate before an await and then copy changed authority afterward.
    // The receiving host still needs an atomic grant/Feather gate at its effect.
    if (!validGrant(grant, request, routeId) || binding(grant) !== binding(snapshot)) {
      throw denied('Native grant changed during stop check');
    }
    return { grant: snapshot, request };
  }

  async function nativeCall(path, method, body, authority) {
    let credential;
    try { credential = await adapterCall(credentialFor, { ...copy(authority.request), grantId: authority.grant.grantId }, 'Native House credential unavailable'); }
    catch { throw denied('Native House credential unavailable'); }
    if (!credential || !id(credential.authorization) || !credential.authorization.startsWith('Bearer ') ||
        Object.keys(credential).some(key => key !== 'authorization')) throw denied('Native House credential unavailable');
    // Recheck grant and Feather after credential retrieval; waiting cannot retain authority.
    await refreshAuthority(authority);
    let response;
    try {
      response = await fetchImpl(nativeOrigin + path, { method, redirect: 'error',
        headers: { authorization: credential.authorization, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(method === 'GET' ? 30000 : 125000) });
      if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('Native service rejected request');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Missing response');
      const chunks = []; let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          length += value.byteLength; if (length > MAX_BYTES) throw new Error('Native response too large');
          chunks.push(Buffer.from(value));
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      const responseBody = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      // Revocation during an upstream wait also prevents disclosure of its result.
      await refreshAuthority(authority);
      return responseBody;
    } catch { throw denied('Native Wayglass request failed'); }
  }

  async function refreshAuthority(authority) {
    const refreshed = await grantFor({ principalId: authority.request.subject, resource,
      consentRef: authority.request.consentRef, scopes: authority.request.scopes }, authority.request.action, authority.request.routeId);
    if (binding(refreshed.grant) !== binding(authority.grant)) throw denied('Native grant changed during request');
  }

  function routeAllowed(routeId, authority) {
    const route = resolveWayglassRoute(routeId);
    if (!route || !authority.grant.routeIds.includes(routeId)) return false;
    if (route.participant_id === 'bluebird' && (!authority.grant.scopes.includes('wayglass:bluebird') ||
        !authority.request.scopes.includes('wayglass:bluebird'))) return false;
    return true;
  }

  async function listRoutes(context) {
    const authority = await grantFor(context, 'routes');
    const body = await nativeCall('/api/v1/wayglass/routes', 'GET', null, authority);
    if (body?.schema !== 'wayglass.route-catalogue/v0.1' || !Array.isArray(body.routes)) throw denied('Invalid native route catalogue');
    return body.routes.filter(route => route && routeAllowed(route.route_id, authority));
  }

  async function respond(payload, context) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).some(key => !INPUT_KEYS.has(key)) || !id(payload.route_id) ||
        typeof payload.input !== 'string' || !payload.input.trim() || payload.input.length > 12000) throw denied('Invalid native turn');
    const input = copy(payload);
    const authority = await grantFor(context, 'respond', input.route_id);
    if (!routeAllowed(input.route_id, authority)) throw denied('Native route scope denied');
    const route = resolveWayglassRoute(input.route_id);
    const nativeContext = authority.grant.nativeContext || {};
    if (typeof nativeContext !== 'object' || Array.isArray(nativeContext) ||
        Object.keys(nativeContext).some(key => !CONTEXT_KEYS.has(key)) ||
        (route.participant_id && nativeContext.participant_id !== route.participant_id) ||
        (route.world_id && nativeContext.world_id !== route.world_id)) throw denied('Native participant binding unavailable');
    if (route.capabilities?.local !== true && authority.grant.externalProviderConsent !== true) throw denied('External provider consent required');
    const result = await nativeCall('/api/v1/wayglass/respond', 'POST', { ...input, ...nativeContext,
      external_provider_consent: authority.grant.externalProviderConsent === true }, authority);
    if (result?.schema !== 'wayglass.route-turn/v0.1' || result.route_id !== route.route_id ||
        result.provider !== route.provider || result.model !== route.model() || typeof result.output !== 'string' || !result.output.trim() ||
        result.kernel_preflight?.status !== 'ready-for-route' || result.kernel_preflight.route_id !== route.route_id ||
        result.receipt?.selected_route_id !== route.route_id || result.receipt.provider !== route.provider ||
        result.receipt.requested_model !== result.model || result.receipt.canon_commit !== false ||
        result.receipt.participant_id !== (route.participant_id || nativeContext.participant_id || null) ||
        result.participant_id !== result.receipt.participant_id || !id(result.receipt.observation_id) ||
        result.observation?.observation_id !== result.receipt.observation_id ||
        result.observation?.source?.route_id !== route.route_id || result.observation?.source?.provider !== route.provider ||
        result.observation?.source?.model !== result.model) throw denied('Native response attribution mismatch');
    return { ...result, mcp_invocation: { schema: 'wayglass.mcp-native-invocation/v0.1',
      subject: authority.grant.subject, grant_id: authority.grant.grantId, consent_ref: authority.grant.consentRef,
      resource, route_id: route.route_id, participant_binding: result.participant_id, model_is_participant: false } };
  }
  return { listRoutes, respond };
}
module.exports = { createWayglassMcpNativeBridge };
