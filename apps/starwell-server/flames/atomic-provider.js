'use strict';

const {
  AtomicChatError,
  createAtomicChatClient,
} = require('../providers/atomic-chat');

const DEFAULT_MODEL_ENV = 'ATOMIC_CHAT_MODEL';
const UNCONFIGURED_MODEL = '__select_loaded_model__';

function resolveAtomicModel(manifest, env = process.env) {
  const modelEnv = manifest?.platform?.model_env || DEFAULT_MODEL_ENV;
  const configured = String(env[modelEnv] || manifest?.platform?.model || '').trim();

  if (!configured || configured === UNCONFIGURED_MODEL) {
    throw new AtomicChatError(
      `Atomic Chat has no model selected. Set ${modelEnv} to the id of a model loaded in Atomic Chat.`,
      { code: 'ATOMIC_CHAT_MODEL_NOT_CONFIGURED' },
    );
  }

  return configured;
}

async function callAtomic(manifest, systemPrompt, userMessage, options = {}) {
  const model = resolveAtomicModel(manifest, options.env || process.env);
  const clientFactory = options.clientFactory || createAtomicChatClient;
  const client = clientFactory({
    baseUrl: manifest.platform.base_url,
    allowLan: options.allowLan,
    apiKey: options.apiKey,
  });

  const result = await client.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    maxTokens: manifest.platform.max_tokens || 600,
    temperature: manifest.platform.temperature,
  });

  return {
    text: result.text,
    model: result.model || model,
    usage: result.usage || null,
    finishReason: result.finishReason || null,
  };
}

module.exports = {
  DEFAULT_MODEL_ENV,
  UNCONFIGURED_MODEL,
  callAtomic,
  resolveAtomicModel,
};
