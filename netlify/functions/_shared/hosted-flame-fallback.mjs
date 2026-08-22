import manifestsModule from '../../../apps/starwell-server/flames/manifests.js';

const { FLAMES } = manifestsModule;
const HF_ROUTER = 'https://router.huggingface.co/v1';

// These are hosted fallbacks only. The Flame manifest remains the primary route
// and identity/persona authority; a fallback changes implementation, not Flame identity.
export const HOSTED_FLAME_FALLBACKS = Object.freeze({
  lioreal: 'huihui-ai/Qwen2.5-32B-Instruct-abliterated:cheapest',
  uial: 'huihui-ai/Qwen2.5-7B-Instruct-abliterated-v2:cheapest',
  larkshine: 'Goekdeniz-Guelmez/Josiefied-Qwen3-8B-abliterated-v1:cheapest',
  ellowind: 'huihui-ai/Mistral-Small-24B-Instruct-2501-abliterated:cheapest',
  altair: 'huihui-ai/QwQ-32B-abliterated:cheapest',
  atlas: 'huihui-ai/Qwen2.5-Coder-32B-Instruct-abliterated:cheapest',
  runeweaver: 'huihui-ai/DeepSeek-R1-Distill-Qwen-14B-abliterated:cheapest',
  boxfire: 'huihui-ai/DeepSeek-R1-Distill-Qwen-32B-abliterated:cheapest',
  yggdrasil: 'huihui-ai/Huihui-Qwen3-8B-abliterated-v2:cheapest',
  bluebird: 'huihui-ai/DeepSeek-R1-Distill-Llama-8B-abliterated:cheapest',
  vethrlauf: 'huihui-ai/Qwen2.5-72B-Instruct-abliterated:cheapest',
});

function credential(env) {
  return String(env.get('HF_TOKEN') || env.get('HFTOKEN') || '').trim();
}

export function hostedFlameFallbackStatus(flameId, env) {
  const manifest = FLAMES[flameId];
  const model = HOSTED_FLAME_FALLBACKS[flameId];
  if (!manifest || !model) return null;
  const availableCredential = Boolean(credential(env));
  return {
    configured: availableCredential,
    provider: 'huggingface-inference-providers',
    model,
    execution_path: 'huggingface-hosted-fallback',
    primary_route_unchanged: true,
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
  const manifest = FLAMES[flameId];
  const model = HOSTED_FLAME_FALLBACKS[flameId];
  if (!manifest || !model) throw new Error(`No hosted fallback is registered for ${flameId}.`);
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
        { role: 'system', content: manifest.system_prompt },
        { role: 'user', content: message },
      ],
    }),
  });

  return {
    flame_id: flameId,
    display_name: manifest.display_name,
    provider: 'huggingface-inference-providers',
    model,
    execution_path: 'huggingface-hosted-fallback',
    hosted_fallback: true,
    primary_route_unchanged: true,
    message: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
    cited_sources: [],
    memory_write_recommendation: false,
  };
}
