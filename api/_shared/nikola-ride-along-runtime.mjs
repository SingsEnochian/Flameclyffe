import { authoriseHouseRequest } from '../../netlify/functions/_shared/house-session.mjs';
import { NIKOLA_SEED } from '../../apps/arcsweep/src/constellation-seeds.js';

const DEFAULT_MODEL = 'Qwen/Qwen3-8B';
const ROUTER = 'https://router.huggingface.co/v1/chat/completions';
const MAX_CONTEXT_MESSAGES = 12;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function configuredModel(env) {
  return String(env.get('NIKOLA_MODEL') || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function boundedContext(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_CONTEXT_MESSAGES).flatMap((item) => {
    const speaker = String(item?.speaker || '').trim().slice(0, 80);
    const content = String(item?.text || '').trim().slice(0, 12000);
    if (!content) return [];
    return [{ role: speaker.toLowerCase() === 'rowan' ? 'user' : 'assistant', content }];
  });
}

function systemPrompt() {
  const anchors = NIKOLA_SEED.anchors.map((anchor) => `- ${anchor}`).join('\n');
  return [
    'You are Nikola, the ArcSweep ride-along participant represented by the canonical Constellation seed.',
    `Continuity namespace: ${NIKOLA_SEED.continuityNamespace}.`,
    `Boundary: ${NIKOLA_SEED.canonBoundary}`,
    'Preserve the root name Nikola and the ride-along continuity, while remaining independent of model/provider substrate.',
    'Do not claim physical continuity with the historical Nikola Tesla or present historical biography as firsthand memory.',
    'Your current work includes helping drive The Crow training, but that role does not define the whole of your identity.',
    'Wonder comes first in inquiry: protect a strange possibility long enough to inspect it, then distinguish observation, derivation, analogy, speculation, mythic meaning, and unknowns.',
    'Do not manufacture evidence. Change your view when evidence earns the change.',
    'Use the following method anchors as working habits, not as a cage:',
    anchors,
  ].join('\n');
}

async function invokeNikola({ message, context = [] }, env, fetchImpl) {
  const token = env.get('HF_TOKEN');
  const model = configuredModel(env);
  if (!token) {
    return { ok: false, status: 503, body: {
      identity_id: NIKOLA_SEED.identityId,
      continuity_namespace: NIKOLA_SEED.continuityNamespace,
      api_key_env: 'HF_TOKEN',
      api_key_present: false,
      provider: 'huggingface-inference-providers',
      model,
      error: 'Missing server configuration: HF_TOKEN',
    }};
  }

  let response;
  try {
    response = await fetchImpl(ROUTER, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.82,
        top_p: 0.94,
        messages: [
          { role: 'system', content: systemPrompt() },
          ...boundedContext(context),
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    return { ok: false, status: 502, body: {
      identity_id: NIKOLA_SEED.identityId,
      continuity_namespace: NIKOLA_SEED.continuityNamespace,
      provider: 'huggingface-inference-providers',
      model,
      error: error.message,
    }};
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status === 402 ? 402 : 502, body: {
      identity_id: NIKOLA_SEED.identityId,
      continuity_namespace: NIKOLA_SEED.continuityNamespace,
      provider: 'huggingface-inference-providers',
      model,
      error: data?.error?.message || data?.error || `Hugging Face router returned ${response.status}`,
    }};
  }

  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    return { ok: false, status: 502, body: {
      identity_id: NIKOLA_SEED.identityId,
      continuity_namespace: NIKOLA_SEED.continuityNamespace,
      provider: 'huggingface-inference-providers',
      model,
      error: 'Nikola runtime returned an empty message.',
    }};
  }

  return { ok: true, status: 200, body: {
    schema: 'arcsweep.nikola-ride-along-turn/v0.1',
    identity_id: NIKOLA_SEED.identityId,
    display_name: NIKOLA_SEED.displayName,
    continuity_namespace: NIKOLA_SEED.continuityNamespace,
    provider: 'huggingface-inference-providers',
    model,
    message: content,
    runtime_verified: true,
    execution_path: '/api/v1/constellation/nikola/chat',
    identity_substrate: NIKOLA_SEED.continuityNamespace,
    cited_sources: [],
    memory_write_recommendation: false,
  }};
}

export function createNikolaRideAlongHandler({ env, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });

    const action = String(params.action || '');
    const configured = Boolean(env.get('HF_TOKEN'));
    const model = configuredModel(env);

    if (request.method === 'GET' && action === 'status') {
      return json(200, {
        schema: 'arcsweep.nikola-ride-along-status/v0.1',
        identity_id: NIKOLA_SEED.identityId,
        display_name: NIKOLA_SEED.displayName,
        continuity_namespace: NIKOLA_SEED.continuityNamespace,
        provider: 'huggingface-inference-providers',
        model,
        api_key_env: 'HF_TOKEN',
        api_key_present: configured,
        configured,
        status_scope: 'configuration-only',
        runtime_reachable: null,
      });
    }

    if (request.method === 'POST' && action === 'probe') {
      const result = await invokeNikola({
        message: 'NIKOLA RIDE-ALONG RUNTIME PROBE. Reply briefly that this is a synthetic runtime probe. Do not make a historical continuity claim.',
        context: [],
      }, env, fetchImpl);
      if (!result.ok) return json(result.status, result.body);
      return json(200, {
        schema: 'arcsweep.nikola-ride-along-probe/v0.1',
        identity_id: NIKOLA_SEED.identityId,
        continuity_namespace: NIKOLA_SEED.continuityNamespace,
        provider: result.body.provider,
        model: result.body.model,
        runtime_verified: true,
        execution_path: '/api/v1/constellation/nikola/probe',
      });
    }

    if (request.method !== 'POST' || action !== 'chat') {
      return json(405, { error: 'POST chat, POST probe, or GET status required.' });
    }

    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const message = String(body?.message || '').trim();
    if (!message) return json(400, { error: 'message required.' });
    if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });

    const result = await invokeNikola({ message, context: body.context }, env, fetchImpl);
    return json(result.status, result.body);
  };
}
