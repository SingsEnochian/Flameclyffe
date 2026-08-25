import manifestsModule from '../../../apps/starwell-server/flames/manifests.js';
import candidatesModule from '../../../apps/starwell-server/flames/model-candidates.js';
import { authoriseHouseRequest } from './house-session.mjs';

const { FLAMES } = manifestsModule;
const { getModelCandidate, assessCandidateDataPolicy } = candidatesModule;

const DEFAULT_INPUT_LIMIT = 24_000;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function candidateCredential(candidate, env) {
  const canonical = candidate.runtime?.api_key_env;
  const aliases = canonical === 'HF_TOKEN' ? ['HF_TOKEN', 'HFTOKEN'] : [canonical];
  for (const name of aliases.filter(Boolean)) {
    const value = String(env.get(name) || '').trim();
    if (value) return { value, source: 'environment', source_name: name };
  }
  return { value: '', source: null, source_name: null };
}

function isWebDirect(candidate) {
  return candidate?.runtime?.provider === 'openai-compatible' && Boolean(candidate.runtime?.base_url);
}

function inputLimit(candidate) {
  const configured = Number(candidate?.runtime?.max_input_chars);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_INPUT_LIMIT;
}

function serialiseContext(context) {
  if (context == null || context === '') return '';
  if (typeof context === 'string') return context;
  try { return JSON.stringify(context); }
  catch { return String(context); }
}

function inputSize(body) {
  return String(body?.message || '').length + serialiseContext(body?.context).length;
}

function providerDetail(data) {
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  return 'provider rejected request';
}

async function providerJson(fetchImpl, url, options, label) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(120_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${label} ${response.status}: ${providerDetail(data)}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function reasoningEffort(body, candidate) {
  if (!candidate.capabilities?.reasoning_effort) return null;
  const supplied = String(body?.reasoning_effort || '').trim().toLowerCase();
  const allowed = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
  return allowed.has(supplied) ? supplied : candidate.runtime?.default_reasoning_effort || null;
}

function providerLabel(candidate) {
  if (candidate.runtime?.backend === 'openrouter') return 'OpenRouter';
  if (candidate.runtime?.backend === 'huggingface-inference-providers') return 'Hugging Face Inference Providers';
  return 'Hosted model candidate';
}

async function callWebDirect(manifest, candidate, body, policyResult, env, fetchImpl) {
  const credential = candidateCredential(candidate, env);
  if (!credential.value) throw new Error(`Missing server configuration: ${candidate.runtime.api_key_env}`);

  const base = String(env.get(candidate.runtime.base_url_env) || candidate.runtime.base_url).replace(/\/$/, '');
  const effort = reasoningEffort(body, candidate);
  const context = serialiseContext(body?.context);
  const contextText = context ? `ARCSWEEP CONTEXT\n${context}\n\n` : '';
  const payload = {
    model: candidate.model_id,
    max_tokens: Number(candidate.runtime?.max_tokens) || 1200,
    stream: false,
    messages: [
      { role: 'system', content: manifest.system_prompt },
      { role: 'user', content: `${contextText}${String(body?.message || '').trim()}` },
    ],
  };
  if (effort) payload.reasoning_effort = effort;

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${credential.value}`,
  };
  if (candidate.runtime?.backend === 'openrouter') {
    const referer = String(env.get('OPENROUTER_HTTP_REFERER') || '').trim();
    if (referer) headers['HTTP-Referer'] = referer;
    headers['X-Title'] = String(env.get('OPENROUTER_APP_TITLE') || 'Flameclyffe Bifröst');
  }

  const endpoint = `${base}/chat/completions`;
  const options = { method: 'POST', headers, body: JSON.stringify(payload) };
  let data;
  let appliedEffort = effort;
  try {
    data = await providerJson(fetchImpl, endpoint, options, providerLabel(candidate));
  } catch (error) {
    if (!effort || error.status !== 400) throw error;
    const retryPayload = { ...payload };
    delete retryPayload.reasoning_effort;
    data = await providerJson(fetchImpl, endpoint, { ...options, body: JSON.stringify(retryPayload) }, providerLabel(candidate));
    appliedEffort = null;
  }

  const choice = data.choices?.[0]?.message || {};
  return {
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    candidate_id: candidate.candidate_id,
    provider: candidate.runtime.backend || candidate.runtime.provider,
    model: candidate.model_id,
    audition: true,
    primary_route_unchanged: true,
    execution_path: 'web-direct',
    credential_source: credential.source,
    data_class: policyResult.data_class,
    hearthfire_retrieval: false,
    reasoning_effort: appliedEffort,
    message: choice.content || '',
    tool_calls: choice.tool_calls || [],
    usage: data.usage || null,
    generation_id: data.id || null,
    cited_sources: [],
  };
}

async function callLegacyGateway(manifest, candidate, body, policyResult, env, fetchImpl) {
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  if (!base || !token) throw new Error('Missing server configuration: HEARTHGATE_GATEWAY_URL or HEARTHGATE_GATEWAY_TOKEN');
  const data = await providerJson(fetchImpl, `${String(base).replace(/\/$/, '')}/api/v1/flames/${manifest.flame_id}/audition/${candidate.candidate_id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }, 'Hearthgate model audition');
  return {
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    candidate_id: candidate.candidate_id,
    provider: data.provider || candidate.runtime?.backend || candidate.runtime?.provider || 'candidate',
    model: data.model || candidate.model_id,
    audition: true,
    primary_route_unchanged: true,
    execution_path: 'hearthgate-gateway',
    data_class: data.data_class ?? policyResult.data_class,
    hearthfire_retrieval: data.hearthfire_retrieval ?? policyResult.hearthfire_retrieval,
    reasoning_effort: data.reasoning_effort ?? null,
    message: data.message || '',
    tool_calls: data.tool_calls || [],
    usage: data.usage ?? null,
    generation_id: data.generation_id || null,
    cited_sources: data.cited_sources || [],
  };
}

function statusFor(manifest, candidate, env) {
  const common = {
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    candidate_id: candidate.candidate_id,
    model: candidate.model_id,
    status: candidate.status,
    audition_route: Boolean(candidate.deployment?.audition_route),
    primary_route_unchanged: true,
    capabilities: candidate.capabilities,
    data_policy: candidate.data_policy || null,
    max_input_chars: inputLimit(candidate),
  };

  if (isWebDirect(candidate)) {
    const credential = candidateCredential(candidate, env);
    return {
      ...common,
      configured: Boolean(credential.value),
      backend_configured: Boolean(credential.value),
      gateway_configured: null,
      provider: candidate.runtime.provider,
      backend: candidate.runtime.backend,
      api_key_env: candidate.runtime.api_key_env,
      api_key_present: Boolean(credential.value),
      credential_source: credential.source,
      runtime_reachable: null,
      missing: credential.value ? [] : [candidate.runtime.api_key_env],
      execution_path: 'web-direct',
      hearthfire_retrieval: false,
    };
  }

  const missing = ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN'].filter((name) => !env.get(name));
  return {
    ...common,
    configured: missing.length === 0,
    backend_configured: null,
    gateway_configured: missing.length === 0,
    missing,
    execution_path: 'hearthgate-gateway',
  };
}

export function createHostedModelAuditionHandler({ env, fetchImpl = null } = {}) {
  const transport = fetchImpl || ((...args) => fetch(...args));
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });

    const flameId = String(params.flame_id || '');
    const candidateId = String(params.candidate_id || '');
    const manifest = FLAMES[flameId];
    const candidate = getModelCandidate(candidateId);
    if (!manifest || !candidate || !candidate.candidate_for?.includes(flameId)) {
      return json(404, { error: 'Unknown or unregistered model audition.' });
    }
    if (!candidate.deployment?.audition_route) return json(409, { error: 'Model audition route is not armed.' });

    if (request.method === 'GET') return json(200, statusFor(manifest, candidate, env));
    if (request.method !== 'POST') return json(405, { error: 'POST audition or GET audition status required.' });

    let body;
    try { body = await request.json(); }
    catch { return json(400, { error: 'Valid JSON body required.' }); }

    const message = String(body?.message || '').trim();
    if (!message) return json(400, { error: 'message required.' });
    const limit = inputLimit(candidate);
    if (inputSize(body) > limit) return json(413, { error: `audition input exceeds ${limit.toLocaleString('en-US')} characters.`, max_input_chars: limit });

    const policyResult = assessCandidateDataPolicy(candidate, body?.data_class);
    if (!policyResult.ok) {
      return json(403, {
        flame_id: flameId,
        candidate_id: candidateId,
        audition: true,
        primary_route_unchanged: true,
        code: policyResult.code,
        error: policyResult.reason,
        data_class: policyResult.data_class,
        allowed_input_classes: policyResult.allowed_input_classes,
        hearthfire_retrieval: false,
      });
    }

    try {
      const result = isWebDirect(candidate)
        ? await callWebDirect(manifest, candidate, body, policyResult, env, transport)
        : await callLegacyGateway(manifest, candidate, body, policyResult, env, transport);
      return json(200, result);
    } catch (error) {
      return json(/Missing server configuration/.test(error.message) ? 503 : 502, {
        flame_id: flameId,
        candidate_id: candidateId,
        audition: true,
        primary_route_unchanged: true,
        data_class: policyResult.data_class,
        hearthfire_retrieval: isWebDirect(candidate) ? false : policyResult.hearthfire_retrieval,
        error: error.message,
      });
    }
  };
}
