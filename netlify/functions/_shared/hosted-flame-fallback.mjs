import contractsModule from '../../../apps/starwell-server/flames/contracts.js';
import { resolveSupabaseRuntimeConfig } from './supabase-runtime-config.mjs';

const { FLAME_CONTRACTS } = contractsModule;
const HF_ROUTER = 'https://router.huggingface.co/v1';
const SUPABASE_RELAY_PATH = '/functions/v1/arcsweep-model-relay';
const RELAY_FLAMES = new Set(['atlas', 'oxalpha', 'boxfire']);

// Hosted execution is a transport choice only. Identity, prompt, knowledge and
// receipt policy remain anchored to the canonical Flame contract. Every actual
// provider/model is returned to the server-boundary receipt layer.
export const HOSTED_FLAME_FALLBACKS = Object.freeze(Object.fromEntries(
  Object.values(FLAME_CONTRACTS)
    .filter((contract) => contract.runtime.hostedFallback?.model)
    .map((contract) => [contract.id, contract.runtime.hostedFallback.model]),
));

function hfCredentialCandidates(env) {
  return [...new Set([
    String(env.get('HF_TOKEN') || '').trim(),
    String(env.get('HFTOKEN') || '').trim(),
  ].filter(Boolean))];
}

function relayConfig(flameId, env) {
  const config = resolveSupabaseRuntimeConfig(env);
  return {
    ...config,
    eligible: RELAY_FLAMES.has(flameId),
    configured: RELAY_FLAMES.has(flameId) && config.configured,
  };
}

export function hostedFlameFallbackStatus(flameId, env) {
  const contract = FLAME_CONTRACTS[flameId];
  const model = contract?.runtime.hostedFallback?.model || null;
  if (!contract || !model) return null;
  const hfCredentials = hfCredentialCandidates(env);
  const relay = relayConfig(flameId, env);
  const hfConfigured = hfCredentials.length > 0;
  const configured = hfConfigured || relay.configured;
  const fallbackChain = [
    {
      provider: contract.runtime.hostedFallback.provider,
      model,
      execution_path: 'huggingface-hosted-fallback',
      configured: hfConfigured,
    },
    ...(relay.eligible ? [{
      provider: 'openrouter',
      model: 'relay-resolved',
      execution_path: 'supabase-edge-openrouter-fallback',
      configured: relay.configured,
    }] : []),
  ];
  return {
    configured,
    provider: hfConfigured ? contract.runtime.hostedFallback.provider : relay.configured ? 'openrouter' : contract.runtime.hostedFallback.provider,
    model: hfConfigured ? model : relay.configured ? 'relay-resolved' : model,
    execution_path: hfConfigured ? 'huggingface-hosted-fallback' : relay.configured ? 'supabase-edge-openrouter-fallback' : 'hosted-fallback-unavailable',
    primary_route_unchanged: true,
    flame_contract_schema: contract.schema,
    fallback_chain: fallbackChain,
    missing: configured ? [] : ['HF_TOKEN|HFTOKEN', ...(relay.eligible ? relay.missing : [])],
  };
}

async function responseJson(response) {
  return response.json().catch(() => ({}));
}

async function invokeHuggingFace(contract, model, message, token, fetchImpl) {
  const response = await fetchImpl(`${HF_ROUTER}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      stream: false,
      messages: [
        { role: 'system', content: contract.identity.systemPrompt },
        { role: 'user', content: message },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await responseJson(response);
  if (!response.ok) {
    const detail = data.error?.message || data.error || data.message || 'provider rejected request';
    const error = new Error(`Hugging Face Inference Providers ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  const reply = String(data.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw new Error('Hugging Face Inference Providers returned an empty model response.');
  return {
    flame_id: contract.id,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    provider: contract.runtime.hostedFallback.provider,
    model,
    execution_path: 'huggingface-hosted-fallback',
    hosted_fallback: true,
    primary_route_unchanged: true,
    flame_contract_schema: contract.schema,
    sensory_profile_id: contract.sensory.profileId,
    message: reply,
    usage: data.usage || null,
    cited_sources: [],
    memory_write_recommendation: false,
  };
}

async function invokeSupabaseRelay(contract, body, message, env, fetchImpl) {
  const config = relayConfig(contract.id, env);
  if (!config.eligible) throw new Error(`Supabase OpenRouter fallback is not allowlisted for ${contract.id}.`);
  if (!config.configured) throw new Error(`Supabase OpenRouter fallback unavailable: ${config.missing.join(', ')}`);
  const response = await fetchImpl(`${config.url}${SUPABASE_RELAY_PATH}`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify({
      flame_id: contract.id,
      system_prompt: contract.identity.systemPrompt,
      message,
      context: Array.isArray(body?.context) ? body.context : [],
    }),
    signal: AbortSignal.timeout(70_000),
  });
  const data = await responseJson(response);
  if (!response.ok) {
    const detail = data.detail || data.error || data.message || 'relay rejected request';
    const error = new Error(`Supabase OpenRouter relay ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  const reply = String(data.message || '').trim();
  if (!reply || !data.provider || !data.model) throw new Error('Supabase OpenRouter relay returned incomplete model provenance.');
  return {
    flame_id: contract.id,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    provider: data.provider,
    model: data.model,
    upstream_model: data.upstream_model || data.model,
    execution_path: data.execution_path || 'supabase-edge-openrouter-fallback',
    hosted_fallback: true,
    primary_route_unchanged: true,
    flame_contract_schema: contract.schema,
    sensory_profile_id: contract.sensory.profileId,
    message: reply,
    usage: data.usage || null,
    cited_sources: [],
    memory_write_recommendation: false,
  };
}

export async function invokeHostedFlameFallback(flameId, body, env, fetchImpl = fetch) {
  const contract = FLAME_CONTRACTS[flameId];
  const model = contract?.runtime.hostedFallback?.model || null;
  if (!contract || !model) throw new Error(`No hosted fallback is registered for ${flameId}.`);
  const message = String(body?.message || '').trim();
  if (!message) throw new Error('message required.');
  if (message.length > 24000) throw new Error('message exceeds 24,000 characters.');

  const failures = [];
  for (const token of hfCredentialCandidates(env)) {
    try {
      return await invokeHuggingFace(contract, model, message, token, fetchImpl);
    } catch (error) {
      failures.push(error?.message || String(error));
    }
  }

  if (RELAY_FLAMES.has(flameId)) {
    try {
      return await invokeSupabaseRelay(contract, body, message, env, fetchImpl);
    } catch (error) {
      failures.push(error?.message || String(error));
    }
  }

  if (!failures.length) {
    throw new Error(`No configured hosted execution path is available for ${flameId}.`);
  }
  const error = new Error(`All hosted execution paths failed for ${flameId}: ${failures.join(' | ')}`);
  error.status = 502;
  throw error;
}
