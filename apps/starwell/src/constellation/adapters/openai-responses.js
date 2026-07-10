import { CONSTELLATION_TARGETS } from '../bridge.js';

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  if (!Array.isArray(data?.output)) return '';

  return data.output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item) => item?.type === 'output_text' && typeof item?.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

export function createOpenAIResponsesAdapter({
  target,
  apiKey,
  model = 'gpt-5.6',
  systemPrompt,
  fetchImpl = globalThis.fetch,
  timeoutMs = 90_000,
} = {}) {
  const targetConfig = CONSTELLATION_TARGETS[target];
  if (!targetConfig) throw new RangeError(`Unknown constellation target: ${target}`);
  if (!apiKey) throw new TypeError(`${target} adapter requires an API key`);
  if (typeof fetchImpl !== 'function') throw new TypeError(`${target} adapter requires fetch`);

  const engine = `openai:${model}`;

  return {
    id: target,
    engine,
    async send(request) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;

      try {
        response = await fetchImpl('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            instructions: systemPrompt,
            input: request.message,
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
      const message = extractOutputText(data);
      if (!message) throw new Error(`${targetConfig.label} provider returned an empty reply`);

      return {
        speaker: target,
        speaker_label: targetConfig.label,
        engine,
        room: request.room,
        message,
        memory_used: [],
        truth_label: 'openai_responses_api',
        metadata: {
          target_role: targetConfig.role,
          provider_request_id: data?.id || null,
        },
      };
    },
  };
}
