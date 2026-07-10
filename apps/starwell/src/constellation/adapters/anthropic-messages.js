import { CONSTELLATION_TARGETS } from '../bridge.js';

function extractText(data) {
  if (!Array.isArray(data?.content)) return '';
  return data.content
    .filter((item) => item?.type === 'text' && typeof item?.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

export function createAnthropicMessagesAdapter({
  target,
  apiKey,
  model = 'claude-fable-5',
  systemPrompt,
  fetchImpl = globalThis.fetch,
  timeoutMs = 90_000,
  maxTokens = 4096,
} = {}) {
  const targetConfig = CONSTELLATION_TARGETS[target];
  if (!targetConfig) throw new RangeError(`Unknown constellation target: ${target}`);
  if (!apiKey) throw new TypeError(`${target} adapter requires an API key`);
  if (typeof fetchImpl !== 'function') throw new TypeError(`${target} adapter requires fetch`);

  const engine = `anthropic:${model}`;

  return {
    id: target,
    engine,
    async send(request) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;

      try {
        response = await fetchImpl('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: request.message }],
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
      const message = extractText(data);
      if (!message) throw new Error(`${targetConfig.label} provider returned an empty reply`);

      return {
        speaker: target,
        speaker_label: targetConfig.label,
        engine,
        room: request.room,
        message,
        memory_used: [],
        truth_label: 'anthropic_messages_api',
        metadata: {
          target_role: targetConfig.role,
          provider_request_id: data?.id || null,
        },
      };
    },
  };
}
