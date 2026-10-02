import contractsModule from '../../../apps/starwell-server/flames/contracts.js';
import { resolveSupabaseRuntimeConfig } from './supabase-runtime-config.mjs';

const { FLAME_CONTRACTS } = contractsModule;
const HF_ROUTER = 'https://router.huggingface.co/v1';
const VERCEL_AI_GATEWAY = 'https://ai-gateway.vercel.sh/v1';
const SUPABASE_RELAY_PATH = '/functions/v1/arcsweep-model-relay';
const RELAY_FLAMES = new Set(['atlas', 'oxalpha', 'boxfire']);
const VERCEL_GATEWAY_MODELS = Object.freeze({
  oxalpha: 'zai/glm-5.3-flash',
});

// Hosted execution is a transport choice only. Identity, prompt, knowledge and
// receipt policy remain anchored to the canonical Flame contract. Every actual
// provider/model is returned to the server-boundary receipt layer.
export const HOSTED_FLAME_FALLBACKS = Object.freeze(Object.fromEntries(
  Object.values(FLAME_CONTRACTS)
    .filter((contract) => contract.runtime.hostedFallback?.model)
    .map((contract) => [contract.id, contract.runtime.hostedFallback.model]),
));

export const VERCEL_AI_GATEWAY_FALLBACKS = VERCEL_GATEWAY_MODELS;

function hfCredentialCandidates(env) {
  return [...new Set([
    String(env.get('HF_TOKEN') || '').trim(),
    String(env.get('HFTOKEN') || '').trim(),
  ].filter(Boolean))];
}

function vercelGatewayCredential(env) {
  return String(env.get('VERCEL_OIDC_TOKEN') || env.get('AI_GATEWAY_API_KEY') || '').trim();
}

function vercelGatewayStatus(flameId, env) {
  const model = VERCEL_GATEWAY_MODELS[flameId] || null;
  if (!model) return null;
  const credential = vercelGatewayCredential(env);
  return {
    configured: Boolean(credential),
    provider: 'vercel-ai-gateway',
    model,
    execution_path: 'vercel-ai-gateway-oidc',
    credential_type: env.get('VERCEL_OIDC_TOKEN') ? 'vercel-oidc' : env.get('AI_GATEWAY_API_KEY') ? 'ai-gateway-api-key' : null,
  };
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
  const gateway = vercelGatewayStatus(flameId, env);
  const relay = relayConfig(flameId, env);
  const hfConfigured = hfCredentials.length > 0;
  const gatewayConfigured = gateway?.configured === true;
  const configured = gatewayConfigured || hfConfigured || relay.configured;
  const fallbackChain = [
    ...(gateway ? [{
      provider: gateway.provider,
      model: gateway.model,
      execution_path: gateway.execution_path,
      credential_type: gateway.credential_type,
      configured: gatewayConfigured,
    }] : []),
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
    provider: gatewayConfigured ? gateway.provider : hfConfigured ? contract.runtime.hostedFallback.provider : relay.configured ? 'openrouter' : contract.runtime.hostedFallback.provider,
    model: gatewayConfigured ? gateway.model : hfConfigured ? model : relay.configured ? 'relay-resolved' : model,
    execution_path: gatewayConfigured ? gateway.execution_path : hfConfigured ? 'huggingface-hosted-fallback' : relay.configured ? 'supabase-edge-openrouter-fallback' : 'hosted-fallback-unavailable',
    credential_type: gatewayConfigured ? gateway.credential_type : null,
    primary_route_unchanged: true,
    flame_contract_schema: contract.schema,
    fallback_chain: fallbackChain,
    missing: configured ? [] : [
      ...(gateway ? ['VERCEL_OIDC_TOKEN|AI_GATEWAY_API_KEY'] : []),
      'HF_TOKEN|HFTOKEN',
      ...(relay.eligible ? relay.missing : []),
    ],
  };
}

async function responseJson(response) {
  return response.json().catch(() => ({}));
}

async function invokeVercelGateway(contract, model, message, credential, fetchImpl) {
  const response = await fetchImpl(`${VERCEL_AI_GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${credential}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
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
    const detail = data.error?.message || data.error || data.message || 'gateway rejected request';
    const error = new Error(`Vercel AI Gateway ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  const reply = String(data.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw new Error('Vercel AI Gateway returned an empty model response.');
  const routing = data.choices?.[0]?.message?.provider_metadata?.gateway?.routing
    || data.provider_metadata?.gateway?.routing
    || {};
  return {
    flame_id: contract.id,
    display_name: contract.identity.displayName,
    formal_name: contract.identity.formalName,
    provider: 'vercel-ai-gateway',
    model: String(data.model || model),
    upstream_provider: routing.provider || null,
    execution_path: 'vercel-ai-gateway-oidc',
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
  const gatewayModel = VERCEL_GATEWAY_MODELS[flameId] || null;
  const gatewayCredential = vercelGatewayCredential(env);
  if (gatewayModel && gatewayCredential) {
    try {
      return await invokeVercelGateway(contract, gatewayModel, message, gatewayCredential, fetchImpl);
    } catch (error) {
      failures.push(error?.message || String(error));
    }
  }

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
