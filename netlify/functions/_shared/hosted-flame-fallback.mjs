import contractsModule from '../../../apps/starwell-server/flames/contracts.js';

const { FLAME_CONTRACTS } = contractsModule;
const HF_ROUTER = 'https://router.huggingface.co/v1';

// Hosted execution is a transport choice only. Identity, prompt, knowledge and
// receipt policy remain anchored to the canonical Flame contract.
export const HOSTED_FLAME_FALLBACKS = Object.freeze(Object.fromEntries(
  Object.values(FLAME_CONTRACTS)
    .filter((contract) => contract.runtime.hostedFallback?.model)
    .map((contract) => [contract.id, contract.runtime.hostedFallback.model]),
));

function credential(env) {
  return String(env.get('HF_TOKEN') || env.get('HFTOKEN') || '').trim();
}

export function hostedFlameFallbackStatus(flameId, env) {
  const contract = FLAME_CONTRACTS[flameId];
  const model = contract?.runtime.hostedFallback?.model || null;
  if (!contract || !model) return null;
  const availableCredential = Boolean(credential(env));
  return {
    configured: availableCredential,
    provider: contract.runtime.hostedFallback.provider,
    model,
    execution_path: 'huggingface-hosted-fallback',
    primary_route_unchanged: true,
    flame_contract_schema: contract.schema,
    missing: availableCredential ? [] : ['HF_TOKEN|HFTOKEN'],
  };
}

async function providerJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(60_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error?.message || data.error || data.message || 'provider rejected request';
    const error = new Error(`Hugging Face Inference Providers ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function invokeHostedFlameFallback(flameId, body, env, fetchImpl = fetch) {
  const contract = FLAME_CONTRACTS[flameId];
  const model = contract?.runtime.hostedFallback?.model || null;
  if (!contract || !model) throw new Error(`No hosted fallback is registered for ${flameId}.`);
  const token = credential(env);
  if (!token) throw new Error('Missing server configuration: HF_TOKEN or HFTOKEN');
  const message = String(body?.message || '').trim();
  if (!message) throw new Error('message required.');
  if (message.length > 24000) throw new Error('message exceeds 24,000 characters.');

  const data = await providerJson(fetchImpl, `${HF_ROUTER}/chat/completions`, {
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
  });

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
    message: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
    cited_sources: [],
    memory_write_recommendation: false,
  };
}
