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

export default {
  async fetch(request) {
    const params = routeParams(request);
    let runtimeWorld = null;
    let boundRequest = request;

    if (request.method === 'POST' && params.action === 'chat') {
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

    const flameId = String(params.flame_id || '');
    const action = String(params.action || '');
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
