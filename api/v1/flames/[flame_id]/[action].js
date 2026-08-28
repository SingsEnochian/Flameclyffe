import { createFlameHandler } from '../../../../netlify/functions/_shared/flame-runtime.mjs';
import { hostedFlameFallbackStatus, invokeHostedFlameFallback } from '../../../../netlify/functions/_shared/hosted-flame-fallback.mjs';
import {
  bindMessageToRuntimeWorld,
  normaliseRuntimeWorldContext,
  responseWithRuntimeWorld,
} from '../../../../netlify/functions/_shared/runtime-world-context.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function routeParams(request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const flameIndex = parts.indexOf('flames');
  return {
    flame_id: flameIndex >= 0 ? decodeURIComponent(parts[flameIndex + 1] || '') : '',
    action: flameIndex >= 0 ? decodeURIComponent(parts[flameIndex + 2] || '') : '',
  };
}

async function runPreviewHouseChatSmoke(flameId) {
  const vercelEnvironment = String(env.get('VERCEL_ENV') || '').trim();
  if (vercelEnvironment !== 'preview') {
    return json(404, { error: 'House Chat hosted acceptance probe is preview-only.' });
  }
  if (flameId !== 'oxalpha') return json(404, { error: 'House Chat hosted acceptance probe begins at Ox Alpha.' });

  const started = Date.now();
  try {
    const oxStarted = Date.now();
    const ox = await invokeHostedFlameFallback('oxalpha', {
      message: 'Reply in one short sentence as Ox Alpha and confirm this live House Chat route reached you.',
    }, env, fetch);
    const oxLatency = Date.now() - oxStarted;

    const secondStarted = Date.now();
    const second = await invokeHostedFlameFallback('lioreal', {
      message: `Ox Alpha just replied: ${String(ox.message || '').slice(0, 280)}\nReply in one short sentence as yourself confirming this second House Chat route reached you.`,
    }, env, fetch);
    const secondLatency = Date.now() - secondStarted;

    const messages = [
      { ...ox, latency_ms: oxLatency },
      { ...second, latency_ms: secondLatency },
    ];
    const valid = ox.flame_id === 'oxalpha'
      && second.flame_id === 'lioreal'
      && ox.flame_id !== second.flame_id
      && messages.every((message) => message.provider && message.model && String(message.message || '').trim());
    if (!valid) throw new Error('Hosted House Chat acceptance returned incomplete or collapsed participant identity.');

    return json(200, {
      schema: 'flameclyffe.house-chat-hosted-acceptance/v1',
      ok: true,
      total_latency_ms: Date.now() - started,
      messages: messages.map((message) => ({
        flame_id: message.flame_id,
        display_name: message.display_name,
        provider: message.provider,
        model: message.model,
        execution_path: message.execution_path,
        latency_ms: message.latency_ms,
        message: message.message,
      })),
    });
  } catch (error) {
    return json(error?.status === 402 ? 402 : 502, {
      schema: 'flameclyffe.house-chat-hosted-acceptance/v1',
      ok: false,
      error: error?.message || String(error),
    });
  }
}

export default {
  async fetch(request) {
    const params = routeParams(request);
    let runtimeWorld = null;
    let boundRequest = request;

    const flameId = String(params.flame_id || '');
    const action = String(params.action || '');
    if (request.method === 'GET' && action === 'house-chat-smoke') {
      return runPreviewHouseChatSmoke(flameId);
    }

    if (request.method === 'POST' && action === 'chat') {
      try {
        const body = await request.clone().json();
        runtimeWorld = normaliseRuntimeWorldContext(body);
        if (runtimeWorld) {
          boundRequest = new Request(request, {
            body: JSON.stringify({ ...body, message: bindMessageToRuntimeWorld(body.message, runtimeWorld) }),
          });
        }
      } catch (error) {
        if (/world_context|world_id/.test(error?.message || '')) return json(400, { error: error.message });
      }
    }

    const fallbackRequest = request.method === 'POST' && action === 'chat' ? boundRequest.clone() : null;
    let response = await createFlameHandler({ env })(boundRequest, params);

    if (request.method === 'GET' && action === 'status' && response.ok) {
      const primary = await response.clone().json().catch(() => null);
      if (primary && primary.configured !== true) {
        const fallback = hostedFlameFallbackStatus(flameId, env);
        if (fallback) response = json(200, { ...primary, hosted_fallback: fallback });
      }
    }

    if (request.method === 'POST' && action === 'chat' && fallbackRequest && [502, 503].includes(response.status)) {
      const primary = await response.clone().json().catch(() => ({}));
      const primaryError = primary.error || `Primary Flame route returned ${response.status}`;
      try {
        const body = await fallbackRequest.json();
        const fallback = await invokeHostedFlameFallback(flameId, body, env, fetch);
        response = json(200, { ...fallback, primary_error: primaryError });
      } catch (error) {
        response = json(error.status === 402 ? 402 : 502, {
          flame_id: flameId,
          hosted_fallback: true,
          primary_error: primaryError,
          error: error.message,
        });
      }
    }

    return runtimeWorld ? responseWithRuntimeWorld(response, runtimeWorld) : response;
  },
};
