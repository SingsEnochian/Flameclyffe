import manifestsModule from '../../../apps/starwell-server/flames/manifests.js';
import { authoriseHouseRequest } from './house-session.mjs';

const { FLAMES } = manifestsModule;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function providerJson(fetchImpl, url, options, label) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(45000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${label} ${response.status}: ${data.error?.message || data.error || 'provider rejected request'}`);
  return data;
}

async function callCloud(manifest, message, env, fetchImpl) {
  const key = env.get(manifest.platform.api_key_env);
  if (!key) throw new Error(`Missing server configuration: ${manifest.platform.api_key_env}`);
  const messages = [{ role: 'user', content: message }];
  if (manifest.platform.provider === 'anthropic') {
    const data = await providerJson(fetchImpl, 'https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: manifest.platform.model, max_tokens: 600, system: manifest.system_prompt, messages }),
    }, 'Anthropic');
    return data.content?.find((item) => item.type === 'text')?.text || '';
  }
  const base = manifest.platform.base_url || (manifest.platform.provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com');
  const data = await providerJson(fetchImpl, `${base}${manifest.platform.provider === 'openai' ? '/v1' : ''}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: manifest.platform.model, max_tokens: 600, messages: [{ role: 'system', content: manifest.system_prompt }, ...messages] }),
  }, manifest.platform.provider);
  return data.choices?.[0]?.message?.content || '';
}

async function callLocalGateway(manifest, body, env, fetchImpl) {
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  if (!base || !token) throw new Error('Missing server configuration: HEARTHGATE_GATEWAY_URL or HEARTHGATE_GATEWAY_TOKEN');
  const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/api/v1/flames/${manifest.flame_id}/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  }, 'Hearthgate gateway');
  return { message: data.message || '', provider: data.provider || 'ollama', model: data.model || manifest.platform.model, cited_sources: data.cited_sources || [] };
}

export function flameStatus(flameId, env) {
  const manifest = FLAMES[flameId];
  if (!manifest) return null;
  const local = manifest.platform.provider === 'ollama';
  const required = local ? ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN'] : [manifest.platform.api_key_env];
  const missing = required.filter((name) => !env.get(name));
  return {
    flame_id: manifest.flame_id, display_name: manifest.display_name,
    provider: local ? 'hearthgate-gateway' : manifest.platform.provider,
    model: manifest.platform.model, configured: missing.length === 0, missing,
    memory_namespace: manifest.memory.hearthfire_namespace,
  };
}

async function resolvedFlameStatus(flameId, env, fetchImpl) {
  const status = flameStatus(flameId, env);
  if (!status || status.provider !== 'hearthgate-gateway' || !status.configured) return status;
  const manifest = FLAMES[flameId];
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  try {
    const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/api/v1/flames/${manifest.flame_id}/status`, {
      headers: { authorization: `Bearer ${token}` },
    }, 'Hearthgate gateway');
    return {
      ...status,
      configured: data.runtime_reachable === true && data.model_available === true,
      gateway_configured: true,
      runtime_reachable: data.runtime_reachable,
      model_available: data.model_available,
      runtime_error: data.runtime_error || null,
      missing: data.model_available === true ? [] : [`OLLAMA_MODEL:${manifest.platform.model}`],
    };
  } catch (error) {
    return { ...status, configured: false, gateway_configured: true, runtime_reachable: false, model_available: false, runtime_error: error.message, missing: ['HEARTHGATE_GATEWAY_REACHABLE'] };
  }
}

export async function invokeFlame(flameId, body, env, fetchImpl = fetch) {
  const manifest = FLAMES[flameId];
  if (!manifest) throw new Error(`Unknown Constellation voice: ${flameId}`);
  const message = String(body?.message || '').trim();
  if (!message) throw new Error('message required.');
  if (message.length > 24000) throw new Error('message exceeds 24,000 characters.');
  if (manifest.platform.provider === 'ollama') return { flame_id: flameId, display_name: manifest.display_name, ...await callLocalGateway(manifest, body, env, fetchImpl) };
  const reply = await callCloud(manifest, message, env, fetchImpl);
  return { flame_id: flameId, display_name: manifest.display_name, provider: manifest.platform.provider, model: manifest.platform.model, message: reply, cited_sources: [], memory_write_recommendation: false };
}

export function createFlameHandler({ env, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const flameId = params.flame_id;
    const action = params.action;
    const manifest = FLAMES[flameId];
    if (!manifest) return json(404, { error: `Unknown Constellation voice: ${flameId}` });
    if (request.method === 'GET' && action === 'status') return json(200, await resolvedFlameStatus(flameId, env, fetchImpl));
    if (request.method !== 'POST' || action !== 'chat') return json(405, { error: 'POST chat or GET status required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const message = String(body.message || '').trim();
    if (!message) return json(400, { error: 'message required.' });
    if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });
    try {
      return json(200, await invokeFlame(flameId, body, env, fetchImpl));
    } catch (error) {
      return json(/Missing server configuration/.test(error.message) ? 503 : 502, { flame_id: flameId, error: error.message });
    }
  };
}
