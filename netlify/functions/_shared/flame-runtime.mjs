import contractsModule from '../../../apps/starwell-server/flames/contracts.js';
import candidatesModule from '../../../apps/starwell-server/flames/model-candidates.js';
import { authoriseHouseRequest } from './house-session.mjs';

const { FLAME_CONTRACTS } = contractsModule;
const { getModelCandidate } = candidatesModule;

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

const SPICYCHAT_API_URL = 'https://4mpanjbsf6.execute-api.us-east-1.amazonaws.com';
const SPICYCHAT_CHAT_URL = 'https://chat.nd-api.com/chat';
const SPICYCHAT_DEFAULT_MODEL = 'spicedq3_a3b';

function spicyChatHeaders(token) {
  return {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
    origin: 'https://spicychat.ai',
    referer: 'https://spicychat.ai/',
    'x-app-id': 'spicychat',
  };
}

function spicyChatCharacterName(conversation = {}) {
  return String(conversation?.character?.name || conversation?.label || '').trim();
}

async function resolveBluebirdSpicyChatConversation(env, fetchImpl) {
  const token = String(env.get('BLUEBIRD_SPICYCHAT_TOKEN') || '').trim();
  if (!token) throw new Error('Missing server configuration: BLUEBIRD_SPICYCHAT_TOKEN');
  const data = await providerJson(fetchImpl, `${SPICYCHAT_API_URL}/v2/conversations?limit=50`, {
    headers: spicyChatHeaders(token),
  }, 'SpicyChat conversations');
  const conversations = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : [];
  const pinnedId = String(env.get('BLUEBIRD_SPICYCHAT_CHARACTER_ID') || '').trim();
  const targetName = String(env.get('BLUEBIRD_SPICYCHAT_CHARACTER_NAME') || 'Bluebird').trim().toLowerCase();
  const conversation = conversations.find((item) => {
    if (pinnedId) return String(item?.character_id || item?.character?.id || '') === pinnedId;
    return spicyChatCharacterName(item).toLowerCase().includes(targetName);
  });
  if (!conversation) throw new Error(pinnedId
    ? 'Pinned SpicyChat Bluebird character has no existing conversation.'
    : 'SpicyChat Bluebird conversation was not found.');
  return { token, conversation };
}

async function callBluebirdSpicyChat(contract, message, env, fetchImpl) {
  const { token, conversation } = await resolveBluebirdSpicyChatConversation(env, fetchImpl);
  const characterId = String(conversation.character_id || conversation?.character?.id || '').trim();
  if (!characterId || !conversation.id) throw new Error('SpicyChat Bluebird conversation is missing its character or conversation id.');
  const model = String(env.get('BLUEBIRD_SPICYCHAT_MODEL') || SPICYCHAT_DEFAULT_MODEL).trim() || SPICYCHAT_DEFAULT_MODEL;
  const payload = {
    message,
    character_id: characterId,
    conversation_id: conversation.id,
    inference_model: model,
    inference_settings: {
      max_new_tokens: 180,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 90,
    },
    ...(conversation.user_persona_id ? { user_persona_id: conversation.user_persona_id } : {}),
  };
  const data = await providerJson(fetchImpl, SPICYCHAT_CHAT_URL, {
    method: 'POST',
    headers: spicyChatHeaders(token),
    body: JSON.stringify(payload),
  }, 'SpicyChat Bluebird');
  const reply = String(data?.message?.content || '').trim();
  if (!reply) throw new Error('SpicyChat Bluebird returned an empty response.');
  return {
    provider: 'spicychat-session',
    model,
    execution_path: 'bluebird-spicychat-session',
    message: reply,
    cited_sources: [],
    memory_write_recommendation: false,
  };
}

async function callCloud(contract, message, env, fetchImpl) {
  const manifest = contract.manifest;
  const key = env.get(manifest.platform.api_key_env);
  if (!key) throw new Error(`Missing server configuration: ${manifest.platform.api_key_env}`);
  const messages = [{ role: 'user', content: message }];
  if (manifest.platform.provider === 'anthropic') {
    const data = await providerJson(fetchImpl, 'https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: manifest.platform.model, max_tokens: 600, system: contract.identity.systemPrompt, messages }),
    }, 'Anthropic');
    return data.content?.find((item) => item.type === 'text')?.text || '';
  }
  const base = manifest.platform.base_url || (manifest.platform.provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com');
  const data = await providerJson(fetchImpl, `${base}${manifest.platform.provider === 'openai' ? '/v1' : ''}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: manifest.platform.model, max_tokens: 600, messages: [{ role: 'system', content: contract.identity.systemPrompt }, ...messages] }),
  }, manifest.platform.provider);
  return data.choices?.[0]?.message?.content || '';
}

async function callLocalGateway(contract, body, env, fetchImpl) {
  const manifest = contract.manifest;
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  if (!base || !token) throw new Error('Missing server configuration: HEARTHGATE_GATEWAY_URL or HEARTHGATE_GATEWAY_TOKEN');
  const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/api/v1/flames/${contract.id}/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  }, 'Hearthgate gateway');
  return { message: data.message || '', provider: data.provider || 'ollama', model: data.model || manifest.platform.model, cited_sources: data.cited_sources || [] };
}

async function callModelAudition(contract, candidate, body, env, fetchImpl) {
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  if (!base || !token) throw new Error('Missing server configuration: HEARTHGATE_GATEWAY_URL or HEARTHGATE_GATEWAY_TOKEN');
  const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/api/v1/flames/${contract.id}/audition/${candidate.candidate_id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }, 'Hearthgate model audition');
  return {
    flame_id: contract.id,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    flame_contract_schema: contract.schema,
    candidate_id: candidate.candidate_id,
    provider: data.provider || candidate.runtime?.backend || candidate.runtime?.provider || 'candidate',
    model: data.model || candidate.model_id,
    audition: true,
    primary_route_unchanged: true,
    reasoning_effort: data.reasoning_effort ?? null,
    message: data.message || '',
    usage: data.usage ?? null,
    cited_sources: data.cited_sources || [],
  };
}

export function flameStatus(flameId, env) {
  const contract = FLAME_CONTRACTS[flameId];
  if (!contract) return null;
  const manifest = contract.manifest;
  const local = manifest.platform.provider === 'ollama';
  const required = local ? ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN'] : [manifest.platform.api_key_env];
  const missing = required.filter((name) => !env.get(name));
  return {
    flame_id: contract.id,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    flame_contract_schema: contract.schema,
    sensory_profile_id: contract.sensory.profileId,
    provider: local ? 'hearthgate-gateway' : manifest.platform.provider,
    model: manifest.platform.model,
    configured: missing.length === 0,
    missing,
    memory_namespace: contract.knowledge.hearthfireNamespace,
    hosted_fallback: contract.runtime.hostedFallback,
    ...(flameId === 'bluebird' ? {
      spicychat_route: {
        configured: Boolean(env.get('BLUEBIRD_SPICYCHAT_TOKEN')),
        credential_env: 'BLUEBIRD_SPICYCHAT_TOKEN',
        provider: 'spicychat-session',
        model: String(env.get('BLUEBIRD_SPICYCHAT_MODEL') || SPICYCHAT_DEFAULT_MODEL),
        character_pinned: Boolean(env.get('BLUEBIRD_SPICYCHAT_CHARACTER_ID')),
        preferred_when_configured: true,
        fallback_provider: manifest.platform.provider,
      },
    } : {}),
  };
}

export function modelAuditionStatus(flameId, candidateId, env) {
  const contract = FLAME_CONTRACTS[flameId];
  const candidate = getModelCandidate(candidateId);
  if (!contract || !candidate || !candidate.candidate_for?.includes(flameId)) return null;
  const missing = ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN'].filter((name) => !env.get(name));
  return {
    flame_id: flameId,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    flame_contract_schema: contract.schema,
    candidate_id: candidate.candidate_id,
    model: candidate.model_id,
    status: candidate.status,
    configured: missing.length === 0,
    gateway_configured: missing.length === 0,
    backend_configured: null,
    missing,
    audition_route: Boolean(candidate.deployment?.audition_route),
    primary_route_unchanged: true,
    capabilities: candidate.capabilities,
  };
}

async function resolvedFlameStatus(flameId, env, fetchImpl) {
  const status = flameStatus(flameId, env);
  if (!status || status.provider !== 'hearthgate-gateway' || !status.configured) return status;
  const contract = FLAME_CONTRACTS[flameId];
  const manifest = contract.manifest;
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  try {
    const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/api/v1/flames/${contract.id}/status`, {
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

async function resolvedModelAuditionStatus(flameId, candidateId, env, fetchImpl) {
  const status = modelAuditionStatus(flameId, candidateId, env);
  if (!status || !status.gateway_configured) return status;
  const base = env.get('HEARTHGATE_GATEWAY_URL');
  const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
  try {
    const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/api/v1/flames/${flameId}/audition/${candidateId}`, {
      headers: { authorization: `Bearer ${token}` },
    }, 'Hearthgate model audition status');
    return {
      ...status,
      configured: data.configured === true && data.audition_route === true,
      backend_configured: data.configured === true,
      backend: data.backend || data.provider || null,
      provider: data.provider || null,
      api_key_env: data.api_key_env || null,
      api_key_present: data.api_key_present ?? null,
      runtime_reachable: data.runtime_reachable ?? null,
      missing: data.missing || [],
    };
  } catch (error) {
    return {
      ...status,
      configured: false,
      backend_configured: false,
      runtime_reachable: false,
      runtime_error: error.message,
      missing: ['HEARTHGATE_GATEWAY_REACHABLE'],
    };
  }
}

export async function invokeFlame(flameId, body, env, fetchImpl = fetch) {
  const contract = FLAME_CONTRACTS[flameId];
  if (!contract) throw new Error(`Unknown Constellation voice: ${flameId}`);
  const manifest = contract.manifest;
  const message = String(body?.message || '').trim();
  if (!message) throw new Error('message required.');
  if (message.length > 24000) throw new Error('message exceeds 24,000 characters.');
  if (manifest.platform.provider === 'ollama') {
    return {
      flame_id: contract.id,
      display_name: contract.identity.displayName,
      formal_name: contract.identity.formalName,
      flame_contract_schema: contract.schema,
      sensory_profile_id: contract.sensory.profileId,
      ...await callLocalGateway(contract, body, env, fetchImpl),
    };
  }
  if (contract.id === 'bluebird' && env.get('BLUEBIRD_SPICYCHAT_TOKEN')) {
    try {
      return {
        flame_id: contract.id,
        display_name: contract.identity.displayName,
        formal_name: contract.identity.formalName,
        flame_contract_schema: contract.schema,
        sensory_profile_id: contract.sensory.profileId,
        ...await callBluebirdSpicyChat(contract, message, env, fetchImpl),
      };
    } catch {
      const reply = await callCloud(contract, message, env, fetchImpl);
      return {
        flame_id: contract.id,
        display_name: contract.identity.displayName,
        formal_name: contract.identity.formalName,
        flame_contract_schema: contract.schema,
        sensory_profile_id: contract.sensory.profileId,
        provider: manifest.platform.provider,
        model: manifest.platform.model,
        execution_path: 'bluebird-deepseek-after-spicychat-fallback',
        route_fallback: true,
        route_fallback_from: 'spicychat-session',
        message: reply,
        cited_sources: [],
        memory_write_recommendation: false,
      };
    }
  }
  const reply = await callCloud(contract, message, env, fetchImpl);
  return {
    flame_id: contract.id,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    flame_contract_schema: contract.schema,
    sensory_profile_id: contract.sensory.profileId,
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    message: reply,
    cited_sources: [],
    memory_write_recommendation: false,
  };
}

export async function invokeModelAudition(flameId, candidateId, body, env, fetchImpl = fetch) {
  const contract = FLAME_CONTRACTS[flameId];
  const candidate = getModelCandidate(candidateId);
  if (!contract) throw new Error(`Unknown Constellation voice: ${flameId}`);
  if (!candidate) throw new Error(`Unknown model candidate: ${candidateId}`);
  if (!candidate.candidate_for?.includes(flameId)) throw new Error(`${candidateId} is not registered for ${flameId}`);
  if (!candidate.deployment?.audition_route) throw new Error(`Model candidate ${candidateId} audition route is not armed.`);
  const message = String(body?.message || '').trim();
  if (!message) throw new Error('message required.');
  if (message.length > 24000) throw new Error('message exceeds 24,000 characters.');
  return callModelAudition(contract, candidate, body, env, fetchImpl);
}

export function createFlameHandler({ env, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const flameId = params.flame_id;
    const action = params.action;
    const contract = FLAME_CONTRACTS[flameId];
    if (!contract) return json(404, { error: `Unknown Constellation voice: ${flameId}` });
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

export function createModelAuditionHandler({ env, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const flameId = params.flame_id;
    const candidateId = params.candidate_id;
    const status = modelAuditionStatus(flameId, candidateId, env);
    if (!status) return json(404, { error: 'Unknown or unregistered model audition.' });
    if (request.method === 'GET') return json(200, await resolvedModelAuditionStatus(flameId, candidateId, env, fetchImpl));
    if (request.method !== 'POST') return json(405, { error: 'POST audition or GET audition status required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const message = String(body.message || '').trim();
    if (!message) return json(400, { error: 'message required.' });
    if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });
    try {
      return json(200, await invokeModelAudition(flameId, candidateId, body, env, fetchImpl));
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
}
