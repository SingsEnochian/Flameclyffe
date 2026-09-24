import contractsModule from '../../apps/starwell-server/flames/contracts.js';
import {
  HOUSE_AGENT_CHATTER_AUDIENCE,
  HOUSE_AGENT_CHATTER_WORKFLOW_REF,
  verifyGitHubActionsOidc,
} from './github-actions-oidc.mjs';
import { issueHouseSession, houseSessionCookie } from '../../netlify/functions/_shared/house-session.mjs';
import { flameStatus, invokeFlame } from '../../netlify/functions/_shared/flame-runtime.mjs';
import {
  hostedFlameFallbackStatus,
  invokeHostedFlameFallback,
} from '../../netlify/functions/_shared/hosted-flame-fallback.mjs';
import {
  HOUSE_AGENT_CHATTER_ROOM_ID,
  runAgentChatterTick,
} from '../../netlify/functions/_shared/house-agent-chatter-runtime.mjs';

const { FLAME_CONTRACTS } = contractsModule;
const ALLOWED_EVENTS = Object.freeze(['schedule', 'workflow_dispatch', 'push']);

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

function voiceBindings(env) {
  const rows = Object.values(FLAME_CONTRACTS).map((contract) => {
    const primary = flameStatus(contract.id, env);
    const hosted = hostedFlameFallbackStatus(contract.id, env);
    return {
      id: contract.id,
      name: contract.identity.displayName,
      roles: [...contract.roles],
      primary_configured: primary?.configured === true,
      hosted_configured: hosted?.configured === true,
    };
  });
  const hosted = rows.filter((row) => row.hosted_configured);
  return hosted.length >= 2 ? hosted : rows.filter((row) => row.hosted_configured || row.primary_configured);
}

async function invokeUnattendedVoice(binding, body, env) {
  const failures = [];
  if (binding?.hosted_configured) {
    try { return await invokeHostedFlameFallback(binding.id, body, env); }
    catch (error) { failures.push(`hosted: ${error?.message || error}`); }
  }
  if (binding?.primary_configured) {
    try { return await invokeFlame(binding.id, body, env); }
    catch (error) { failures.push(`primary: ${error?.message || error}`); }
  }
  throw new Error(failures.length ? failures.join(' | ') : `No unattended execution path is configured for ${binding?.id || 'voice'}.`);
}

function internalCommonsAppender(request, { env, commonsHandler }) {
  const session = issueHouseSession(env);
  const setCookie = houseSessionCookie(request, session.token, session.ttl);
  const cookie = setCookie.split(';')[0].trim();
  return async (body) => {
    const response = await commonsHandler(new Request('https://house.internal/api/v1/house/commons', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
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

  const url = new URL(request.url);
  const bindings = voiceBindings(env);
  const productionSha = process.env.VERCEL_GIT_COMMIT_SHA || null;
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
      routable_voices: bindings.map((voice) => ({ id: voice.id, hosted: voice.hosted_configured, primary: voice.primary_configured })),
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
    const maxTurns = boundedInt(env.get('HOUSE_AGENT_CHATTER_MAX_TURNS'), 2, 1, 3);
    const result = await runAgentChatterTick({
      store,
      voices: bindings,
      tickId: `gh-${oidc.run_id || Date.now()}`,
      maxTurns,
      maxAttempts: Math.min(bindings.length, Math.max(4, maxTurns + 2)),
      invokeVoice: async (voiceId, body) => invokeUnattendedVoice(byId.get(voiceId), body, env),
      appendEntry: internalCommonsAppender(request, { env, commonsHandler }),
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
