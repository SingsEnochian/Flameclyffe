import manifestsModule from '../../apps/starwell-server/flames/manifests.js';
import { createHouseCommonsHandler } from '../../netlify/functions/_shared/house-commons-runtime.mjs';
import { invokeFlame } from '../../netlify/functions/_shared/flame-runtime.mjs';
import {
  hostedFlameFallbackStatus,
  invokeHostedFlameFallback,
} from '../../netlify/functions/_shared/hosted-flame-fallback.mjs';
import {
  HOUSE_AGENT_CHATTER_ROOM_ID,
  runAgentChatterTick,
} from '../../netlify/functions/_shared/house-agent-chatter-runtime.mjs';
import { verifyHouseAgentChatterOidc } from './house-agent-chatter-oidc.mjs';

const { FLAMES } = manifestsModule;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const envText = (env, name, fallback = '') => String(env?.get?.(name) ?? fallback).trim();
const clean = (value, length = 240) => String(value ?? '').trim().slice(0, length);

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '').trim() : '';
}

function productionSha() {
  return String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim() || null;
}

function chatterVoices() {
  return Object.values(FLAMES || {}).map((manifest) => ({
    id: clean(manifest?.flame_id, 120).toLowerCase(),
    name: clean(manifest?.voice?.caption_label || manifest?.voice?.name || manifest?.display_name || manifest?.flame_id, 160),
    roles: Array.isArray(manifest?.memory?.retrieval_scope)
      ? manifest.memory.retrieval_scope.slice(0, 8).map((value) => clean(value, 80)).filter(Boolean)
      : [],
  })).filter((voice) => voice.id && voice.name);
}

async function invokeAgentChatterVoice(voiceId, body, env, fetchImpl) {
  const fallback = hostedFlameFallbackStatus(voiceId, env);
  let hostedError = null;
  if (fallback?.configured) {
    try {
      return await invokeHostedFlameFallback(voiceId, body, env, fetchImpl);
    } catch (error) {
      hostedError = error;
    }
  }

  try {
    return await invokeFlame(voiceId, body, env, fetchImpl);
  } catch (error) {
    if (hostedError) error.cause = hostedError;
    throw error;
  }
}

function internalCommonsRequest(body, env) {
  const token = envText(env, 'ARCSWEEP_RUNTIME_TOKEN');
  if (!token) throw new Error('ARCSWEEP_RUNTIME_TOKEN is required for unattended Commons persistence.');
  return new Request('https://hearthgate.internal/api/v1/house/commons', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function createHouseAgentChatterHandler({
  env,
  store,
  fetchImpl = fetch,
  clock = () => new Date(),
} = {}) {
  const commonsHandler = createHouseCommonsHandler({ env, store, clock });

  return async function handleHouseAgentChatterRequest(request) {
    if (request.method !== 'POST') return json(405, { error: 'POST required.' });

    let identity;
    try {
      identity = await verifyHouseAgentChatterOidc(bearer(request), { fetchImpl });
    } catch (error) {
      return json(401, { error: 'Trusted House agent-chatter identity required.', detail: error.message });
    }

    const sha = productionSha();
    const url = new URL(request.url);
    if (url.searchParams.get('probe') === '1') {
      return json(200, {
        ok: true,
        schema: 'hearthgate.house-agent-chatter-probe/v1',
        production_sha: sha,
        room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
        message_text_returned_in_workflow_receipt: false,
      });
    }

    const appendEntry = async (body) => {
      const response = await commonsHandler(internalCommonsRequest(body, env));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `House Commons rejected agent chatter entry (${response.status}).`);
      return data;
    };

    const tickId = `github:${clean(identity.run_id || identity.sha || 'unknown', 120)}:${clean(identity.run_attempt || '1', 24)}`;
    const outcome = await runAgentChatterTick({
      store,
      voices: chatterVoices(),
      tickId,
      clock,
      invokeVoice: (voiceId, body) => invokeAgentChatterVoice(voiceId, body, env, fetchImpl),
      appendEntry,
    });

    return json(200, {
      ok: true,
      schema: outcome.schema,
      production_sha: sha,
      room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
      message_text_returned_in_workflow_receipt: false,
      tick_id: outcome.tick_id,
      state: outcome.state,
      posted: outcome.posted || [],
      passes: outcome.passes || [],
      failures: outcome.failures || [],
      reused: outcome.reused === true,
    });
  };
}
