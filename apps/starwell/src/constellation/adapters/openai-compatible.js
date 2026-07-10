import { CONSTELLATION_TARGETS } from '../bridge.js';

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function extractMessage(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n')
      .trim();
  }
  return '';
}

export function createOpenAICompatibleAdapter({
  target,
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  fetchImpl = globalThis.fetch,
  timeoutMs = 90_000,
  temperature = 0.72,
} = {}) {
  const targetConfig = CONSTELLATION_TARGETS[target];
  if (!targetConfig) throw new RangeError(`Unknown constellation target: ${target}`);
  if (!apiKey) throw new TypeError(`${target} adapter requires an API key`);
  if (!baseUrl) throw new TypeError(`${target} adapter requires a base URL`);
  if (!model) throw new TypeError(`${target} adapter requires a model`);
  if (typeof fetchImpl !== 'function') throw new TypeError(`${target} adapter requires fetch`);

  const endpoint = `${trimTrailingSlash(baseUrl)}/chat/completions`;
  const engine = `external:${target}:${model}`;

  return {
    id: target,
    engine,
    async send(request) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;

      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: request.message,
              },
            ],
            temperature,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        throw new Error(`${targetConfig.label} provider failed with status ${response.status}`);
      }

      const data = await response.json();
      const message = extractMessage(data);
      if (!message) throw new Error(`${targetConfig.label} provider returned an empty reply`);

      return {
        speaker: target,
        speaker_label: targetConfig.label,
        engine,
        room: request.room,
        message,
        memory_used: [],
        truth_label: 'configured_provider_response',
        metadata: {
          target_role: targetConfig.role,
          provider_request_id: data?.id || null,
        },
      };
    },
  };
}
