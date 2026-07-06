const DEFAULT_ENDPOINT = '/api/v1/yggdrasil/chat';
const DEFAULT_ENGINE = 'ollama:yggdrasil:v0.1';

function extractReply(data) {
  if (typeof data === 'string') return data;
  return data?.reply || data?.message || data?.text || '';
}

export function createYggdrasilLocalAdapter({ endpoint = DEFAULT_ENDPOINT, fetchImpl = globalThis.fetch } = {}) {
  return {
    id: 'yggdrasil',
    engine: DEFAULT_ENGINE,
    endpoint,
    async send(request) {
      if (typeof fetchImpl !== 'function') {
        throw new TypeError('Yggdrasil local adapter requires a fetch implementation');
      }

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: request.message,
          speaker: request.speaker,
          room: request.room,
          context_level: request.context_level,
          metadata: request.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Yggdrasil local adapter failed with ${response.status}`);
      }

      const data = await response.json();
      const message = extractReply(data);

      return {
        speaker: 'yggdrasil',
        speaker_label: 'Yggdrasil Local',
        engine: data.engine || DEFAULT_ENGINE,
        room: request.room,
        message: message || 'Yggdrasil returned an empty reply.',
        memory_used: Array.isArray(data.memory_used) ? data.memory_used : ['local-yggdrasil-route'],
        truth_label: 'local_model_response',
        metadata: {
          endpoint,
          local_first: true,
          raw_status: response.status,
        },
      };
    },
  };
}
