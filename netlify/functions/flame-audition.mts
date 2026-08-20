import { createClient } from '@supabase/supabase-js';
import manifestsModule from '../../apps/starwell-server/flames/manifests.js';
import candidatesModule from '../../apps/starwell-server/flames/model-candidates.js';
import { authoriseHouseRequest } from './_shared/house-session.mjs';

const { FLAMES } = manifestsModule;
const { getModelCandidate } = candidatesModule;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function supabaseFor(env) {
  const url = env.get('SUPABASE_URL');
  const key = env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function vaultSecret(env, provider) {
  const client = supabaseFor(env);
  if (!client) return '';
  const { data, error } = await client.rpc('provider_vault_read', { p_provider: provider });
  if (error) throw new Error(`Provider Vault read failed: ${error.message}`);
  return String(data || '').trim();
}

function directCredential(envName, env) {
  const names = envName === 'HF_TOKEN' ? ['HF_TOKEN', 'HFTOKEN'] : [envName];
  for (const name of names.filter(Boolean)) {
    const value = String(env.get(name) || '').trim();
    if (value) return { value, source: 'environment', source_name: name };
  }
  return { value: '', source: null, source_name: null };
}

async function candidateCredential(candidate, env) {
  const envName = candidate.runtime?.api_key_env;
  const direct = directCredential(envName, env);
  if (direct.value) return direct;
  if (envName === 'HF_TOKEN') {
    const value = await vaultSecret(env, 'huggingface');
    if (value) return { value, source: 'provider-vault', source_name: 'huggingface' };
  }
  return { value: '', source: null, source_name: null };
}

function isWebDirect(candidate) {
  return candidate?.runtime?.provider === 'openai-compatible' && Boolean(candidate.runtime.base_url);
}

async function providerJson(url, options, label) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${label} ${response.status}: ${data.error?.message || data.error || 'provider rejected request'}`);
  }
  return data;
}

function reasoningEffort(body, candidate) {
  const supplied = String(body?.reasoning_effort || '').trim().toLowerCase();
  const allowed = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
  return allowed.has(supplied) ? supplied : candidate.runtime?.default_reasoning_effort || null;
}

async function callWebDirect(manifest, candidate, body, env) {
  const credential = await candidateCredential(candidate, env);
  if (!credential.value) throw new Error(`Missing server configuration: ${candidate.runtime.api_key_env}`);
  const base = String(env.get(candidate.runtime.base_url_env) || candidate.runtime.base_url).replace(/\/$/, '');
  const effort = reasoningEffort(body, candidate);
  const message = String(body?.message || '').trim();
  const contextText = body?.context
    ? `ARCSWEEP CONTEXT\n${typeof body.context === 'string' ? body.context : JSON.stringify(body.context)}\n\n`
    : '';
  const payload = {
    model: candidate.model_id,
    max_tokens: Number(candidate.runtime?.max_tokens) || 1200,
    stream: false,
    messages: [
      { role: 'system', content: manifest.system_prompt },
      { role: 'user', content: `${contextText}${message}` },
    ],
  };
  if (effort) payload.reasoning_effort = effort;

  const data = await providerJson(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${credential.value}` },
    body: JSON.stringify(payload),
  }, 'Hugging Face Inference Providers');

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
    reasoning_effort: effort,
    message: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
    cited_sources: [],
  };
}

async function callLegacyGateway(manifest, candidate, body, env) {
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  if (!base || !token) throw new Error('Missing server configuration: HEARTHGATE_GATEWAY_URL or HEARTHGATE_GATEWAY_TOKEN');
  const data = await providerJson(`${String(base).replace(/\/$/, '')}/api/v1/flames/${manifest.flame_id}/audition/${candidate.candidate_id}`, {
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
    reasoning_effort: data.reasoning_effort ?? null,
    message: data.message || '',
    usage: data.usage ?? null,
    cited_sources: data.cited_sources || [],
  };
}

async function statusFor(manifest, candidate, env) {
  if (isWebDirect(candidate)) {
    const credential = await candidateCredential(candidate, env);
    return {
      flame_id: manifest.flame_id,
      display_name: manifest.display_name,
      candidate_id: candidate.candidate_id,
      model: candidate.model_id,
      status: candidate.status,
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
      audition_route: Boolean(candidate.deployment?.audition_route),
      primary_route_unchanged: true,
      execution_path: 'web-direct',
      capabilities: candidate.capabilities,
    };
  }

  const missing = ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN'].filter((name) => !env.get(name));
  return {
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    candidate_id: candidate.candidate_id,
    model: candidate.model_id,
    status: candidate.status,
    configured: missing.length === 0,
    backend_configured: null,
    gateway_configured: missing.length === 0,
    missing,
    audition_route: Boolean(candidate.deployment?.audition_route),
    primary_route_unchanged: true,
    execution_path: 'hearthgate-gateway',
    capabilities: candidate.capabilities,
  };
}

export default async (request, context) => {
  const env = { get: (name) => Netlify.env.get(name) };
  if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });

  const flameId = String(context?.params?.flame_id || '');
  const candidateId = String(context?.params?.candidate_id || '');
  const manifest = FLAMES[flameId];
  const candidate = getModelCandidate(candidateId);
  if (!manifest || !candidate || !candidate.candidate_for?.includes(flameId)) {
    return json(404, { error: 'Unknown or unregistered model audition.' });
  }
  if (!candidate.deployment?.audition_route) return json(409, { error: 'Model audition route is not armed.' });

  if (request.method === 'GET') {
    try { return json(200, await statusFor(manifest, candidate, env)); }
    catch (error) { return json(502, { error: error.message, configured: false }); }
  }
  if (request.method !== 'POST') return json(405, { error: 'POST audition or GET audition status required.' });

  let body;
  try { body = await request.json(); }
  catch { return json(400, { error: 'Valid JSON body required.' }); }
  const message = String(body?.message || '').trim();
  if (!message) return json(400, { error: 'message required.' });
  if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });

  try {
    const result = isWebDirect(candidate)
      ? await callWebDirect(manifest, candidate, body, env)
      : await callLegacyGateway(manifest, candidate, body, env);
    return json(200, result);
  } catch (error) {
    return json(/Missing server configuration/.test(error.message) ? 503 : 502, {
      flame_id: flameId,
      candidate_id: candidateId,
      audition: true,
      primary_route_unchanged: true,
      error: error.message,
    });
  }
};

export const config = {
  path: '/api/v1/flames/:flame_id/audition/:candidate_id',
};
