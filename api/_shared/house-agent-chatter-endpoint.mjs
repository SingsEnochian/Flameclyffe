import contractsModule from '../../apps/starwell-server/flames/contracts.js';
import {
  HOUSE_AGENT_CHATTER_AUDIENCE,
  HOUSE_AGENT_CHATTER_WORKFLOW_REF,
  verifyGitHubActionsOidc,
} from './github-actions-oidc.mjs';
import { issueHouseSession, houseSessionCookie } from '../../netlify/functions/_shared/house-session.mjs';
import {
  HOUSE_AGENT_CHATTER_ROOM_ID,
  runAgentChatterTick,
} from '../../netlify/functions/_shared/house-agent-chatter-runtime.mjs';

const { FLAME_CONTRACTS } = contractsModule;
const ALLOWED_EVENTS = Object.freeze(['schedule', 'workflow_dispatch', 'push']);
const STATUS_TIMEOUT_MS = 6_000;
const TURN_TIMEOUT_MS = 18_000;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function boundedInt(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback;
}

function houseSessionTransport(request, env) {
  const session = issueHouseSession(env);
  const setCookie = houseSessionCookie(request, session.token, session.ttl);
  const cookie = setCookie.split(';')[0].trim();
  const base = new URL(request.url).origin;
  if (!cookie) throw new Error('House session mint returned no sealed session cookie.');
  return { cookie, base };
}

async function readFlameStatus(contract, transport) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
  try {
    const response = await fetch(`${transport.base}/api/v1/flames/${encodeURIComponent(contract.id)}/status`, {
      headers: { cookie: transport.cookie, accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    const status = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    const primaryConfigured = status.configured === true;
    const hostedConfigured = status.hosted_fallback?.configured === true;
    if (!primaryConfigured && !hostedConfigured) return null;
    return {
      id: contract.id,
      name: contract.identity.displayName,
      roles: [...contract.roles],
      primary_configured: primaryConfigured,
      hosted_configured: hostedConfigured,
      provider: hostedConfigured && !primaryConfigured ? status.hosted_fallback?.provider || null : status.provider || null,
      model: hostedConfigured && !primaryConfigured ? status.hosted_fallback?.model || null : status.model || null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function voiceBindings(transport) {
  const rows = (await Promise.all(Object.values(FLAME_CONTRACTS).map((contract) => readFlameStatus(contract, transport)))).filter(Boolean);
  const hosted = rows.filter((row) => row.hosted_configured);
  const primary = rows.filter((row) => !row.hosted_configured);
  return [...hosted, ...primary];
}

async function invokeUnattendedVoice(binding, body, transport) {
  if (!binding?.id) throw new Error('Agent chatter voice binding is missing.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURN_TIMEOUT_MS);
  try {
    const response = await fetch(`${transport.base}/api/v1/flames/${encodeURIComponent(binding.id)}/chat`, {
      method: 'POST',
      headers: {
        cookie: transport.cookie,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Flame ${binding.id} returned ${response.status}`);
    const message = String(data.message || '').trim();
    if (!message) throw new Error(`Flame ${binding.id} returned no message.`);
    return {
      ...data,
      flame_id: data.flame_id || binding.id,
      display_name: data.display_name || binding.name,
      provider: data.provider || binding.provider || null,
      model: data.model || binding.model || null,
      route: data.route || binding.id,
      message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function internalCommonsAppender(transport, commonsHandler) {
  return async (body) => {
    const response = await commonsHandler(new Request('https://house.internal/api/v1/house/commons', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: transport.cookie },
      body: JSON.stringify(body),
    }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Commons append ${response.status}: ${data.error || 'write failed'}`);
    return data;
  };
}

export async function handleHouseAgentChatterRequest(request, { env, store, commonsHandler } = {}) {
  if (request.method !== 'POST') return json(405, { error: 'POST required.' });
  if (!env || !store || typeof commonsHandler !== 'function') return json(503, { error: 'House agent chatter runtime unavailable.' });

  let oidc;
  try {
    oidc = await verifyGitHubActionsOidc(bearer(request), {
      audience: HOUSE_AGENT_CHATTER_AUDIENCE,
      workflowRef: HOUSE_AGENT_CHATTER_WORKFLOW_REF,
      eventNames: ALLOWED_EVENTS,
    });
  } catch (error) {
    return json(401, { error: 'Trusted House agent-chatter workflow identity required.', detail: error.message });
  }

  const productionSha = process.env.VERCEL_GIT_COMMIT_SHA || null;
  let transport;
  let bindings;
  try {
    transport = houseSessionTransport(request, env);
    bindings = await voiceBindings(transport);
  } catch (error) {
    return json(503, {
      ok: false,
      schema: 'hearthgate.house-agent-chatter-result/v1',
      production_sha: productionSha,
      room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
      error: String(error?.message || error).slice(0, 500),
    });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('probe') === '1') {
    return json(200, {
      ok: true,
      schema: 'hearthgate.house-agent-chatter-probe/v1',
      production_sha: productionSha,
      room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
      caller: {
        repository: oidc.repository,
        ref: oidc.ref,
        workflow_ref: oidc.workflow_ref,
        event_name: oidc.event_name,
        run_id: oidc.run_id,
        sha: oidc.sha,
      },
      routable_voices: bindings.map((voice) => ({
        id: voice.id,
        hosted: voice.hosted_configured,
        primary: voice.primary_configured,
        provider: voice.provider,
        model: voice.model,
      })),
      write_scope: 'none',
    });
  }

  if (bindings.length < 2) {
    return json(503, {
      ok: false,
      schema: 'hearthgate.house-agent-chatter-result/v1',
      production_sha: productionSha,
      room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
      error: 'Fewer than two unattended House voices have a configured execution path.',
      routable_voices: bindings.map((voice) => voice.id),
    });
  }

  try {
    const byId = new Map(bindings.map((voice) => [voice.id, voice]));
    const maxTurns = boundedInt(env.get('HOUSE_AGENT_CHATTER_MAX_TURNS'), 2, 1, 2);
    const result = await runAgentChatterTick({
      store,
      voices: bindings,
      tickId: `gh-${oidc.run_id || Date.now()}`,
      maxTurns,
      maxAttempts: Math.min(bindings.length, 3),
      invokeVoice: async (voiceId, body) => invokeUnattendedVoice(byId.get(voiceId), body, transport),
      appendEntry: internalCommonsAppender(transport, commonsHandler),
    });

    return json(200, {
      ok: true,
      schema: 'hearthgate.house-agent-chatter-result/v1',
      production_sha: productionSha,
      room_id: result.room_id,
      tick_id: result.tick_id,
      state: result.state,
      posted_count: result.posted.length,
      pass_count: result.passes.length,
      failure_count: result.failures.length,
      posted: result.posted,
      passes: result.passes,
      failures: result.failures,
      caller: { repository: oidc.repository, event_name: oidc.event_name, run_id: oidc.run_id, sha: oidc.sha },
      authority: {
        oidc_audience: HOUSE_AGENT_CHATTER_AUDIENCE,
        source: 'trusted-github-actions-schedule',
        room_scope: HOUSE_AGENT_CHATTER_ROOM_ID,
        writes: 'agent-authored Commons messages only',
        participant_semantics: 'descriptive-not-constitutive',
        execution_transport: 'existing-house-flame-routes',
        message_text_returned_in_workflow_receipt: false,
      },
    });
  } catch (error) {
    console.error('House agent chatter tick failed', error);
    return json(502, {
      ok: false,
      schema: 'hearthgate.house-agent-chatter-result/v1',
      production_sha: productionSha,
      room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
      error: String(error?.message || error).slice(0, 800),
    });
  }
}
