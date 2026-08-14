'use strict';

const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';

const MODEL_PROFILES = Object.freeze({
  'lioreal:qwen3-14b-abliterated-v1': {
    profile_id: 'lioreal:qwen3-14b-abliterated-v1',
    label: 'Lioreal · Qwen3 14B Abliterated',
    owner: 'lioreal',
    source: { kind: 'huggingface', repo: 'mlabonne/Qwen3-14B-abliterated' },
    artifact: {
      strategy: 'gguf-import',
      repo: 'bartowski/mlabonne_Qwen3-14B-abliterated-GGUF',
      quant: 'Q4_K_M',
    },
    runtime: {
      provider: 'ollama',
      model_env: 'MODEL_LIOREAL',
      default_model: 'lioreal:starwell-v1',
      base_url_env: 'OLLAMA_URL_LIOREAL',
      default_base_url: DEFAULT_OLLAMA,
    },
    capabilities: ['text', 'writing', 'reasoning'],
    assignment: 'specified',
  },
  'uial:fablevibes-v1': {
    profile_id: 'uial:fablevibes-v1',
    label: 'Uial · Qwen3.6 FableVibes',
    owner: 'uial',
    source: { kind: 'huggingface', repo: 'tvall43/Qwen3.6-14B-A3B-FableVibes' },
    artifact: {
      strategy: 'gguf-import',
      repo: 'tvall43/Qwen3.6-14B-A3B-FableVibes-GGUF',
      quant: 'Q4_K_M',
    },
    runtime: {
      provider: 'ollama',
      model_env: 'MODEL_UIAL',
      default_model: 'uial:fablevibes-v1',
      base_url_env: 'OLLAMA_URL_UIAL',
      default_base_url: DEFAULT_OLLAMA,
    },
    capabilities: ['text', 'writing', 'roleplay'],
    assignment: 'specified',
  },
  'box:qwen3-coder-30b-a3b-v1': {
    profile_id: 'box:qwen3-coder-30b-a3b-v1',
    label: 'Box · Huihui Qwen3 Coder 30B A3B',
    owner: 'box',
    source: { kind: 'huggingface', repo: 'huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated' },
    artifact: {
      strategy: 'gguf-import',
      repo: 'mradermacher/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated-GGUF',
      quant: 'Q4_K_M',
    },
    runtime: {
      provider: 'ollama',
      model_env: 'MODEL_BOX',
      default_model: 'box:qwen3-coder-30b-a3b-v1',
      base_url_env: 'OLLAMA_URL_BOX',
      default_base_url: DEFAULT_OLLAMA,
    },
    capabilities: ['text', 'code', 'qa', 'reasoning'],
    assignment: 'specified',
  },
  'ellowind:qwen3-vl-8b-v1': {
    profile_id: 'ellowind:qwen3-vl-8b-v1',
    label: 'Ellowind · Huihui Qwen3 VL 8B',
    owner: 'ellowind',
    source: { kind: 'huggingface', repo: 'huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated' },
    artifact: {
      strategy: 'ollama-pull',
      model: 'huihui_ai/qwen3-vl-abliterated:8b-instruct',
    },
    runtime: {
      provider: 'ollama',
      model_env: 'MODEL_ELLOWIND',
      default_model: 'huihui_ai/qwen3-vl-abliterated:8b-instruct',
      base_url_env: 'OLLAMA_URL_ELLOWIND',
      default_base_url: DEFAULT_OLLAMA,
    },
    capabilities: ['text', 'vision', 'visual-read', 'writing'],
    assignment: 'specified-visual',
  },
  'larkshine:qwen3-vl-8b-v1': {
    profile_id: 'larkshine:qwen3-vl-8b-v1',
    label: 'Larkshine · Huihui Qwen3 VL 8B',
    owner: 'larkshine',
    source: { kind: 'huggingface', repo: 'huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated' },
    artifact: {
      strategy: 'ollama-pull',
      model: 'huihui_ai/qwen3-vl-abliterated:8b-instruct',
    },
    runtime: {
      provider: 'ollama',
      model_env: 'MODEL_LARKSHINE',
      default_model: 'huihui_ai/qwen3-vl-abliterated:8b-instruct',
      base_url_env: 'OLLAMA_URL_LARKSHINE',
      default_base_url: DEFAULT_OLLAMA,
    },
    capabilities: ['text', 'vision', 'visual-read', 'writing'],
    assignment: 'specified-visual',
  },
  'bluebird:deepseek-chat-existing-v1': {
    profile_id: 'bluebird:deepseek-chat-existing-v1',
    label: 'Bluebird · Existing DeepSeek Chat Binding',
    owner: 'bluebird',
    source: { kind: 'provider', repo: 'deepseek-chat' },
    artifact: { strategy: 'provider-credential' },
    runtime: {
      provider: 'deepseek',
      model_env: 'MODEL_BLUEBIRD',
      default_model: 'deepseek-chat',
      base_url_env: 'DEEPSEEK_URL_BLUEBIRD',
      default_base_url: 'https://api.deepseek.com',
      api_key_env: 'BLUEBIRD_DEEPSEEK_API_KEY',
    },
    capabilities: ['text'],
    assignment: 'existing-runtime-binding',
  },
  'vethraluf:deepseek-chat-existing-v1': {
    profile_id: 'vethraluf:deepseek-chat-existing-v1',
    label: 'Vethraluf · Existing DeepSeek Chat Binding',
    owner: 'vethraluf',
    source: { kind: 'provider', repo: 'deepseek-chat' },
    artifact: { strategy: 'provider-credential' },
    runtime: {
      provider: 'deepseek',
      model_env: 'MODEL_VETHRALUF',
      default_model: 'deepseek-chat',
      base_url_env: 'DEEPSEEK_URL_VETHRALUF',
      default_base_url: 'https://api.deepseek.com',
      api_key_env: 'VETHRLAUF_DEEPSEEK_API_KEY',
    },
    capabilities: ['text', 'audit'],
    assignment: 'existing-runtime-binding',
  },
  'shared:qwen3.6-35b-a3b-deep-reasoner-v1': {
    profile_id: 'shared:qwen3.6-35b-a3b-deep-reasoner-v1',
    label: 'Shared · Huihui Qwen3.6 35B A3B Deep Reasoner',
    owner: 'shared',
    source: { kind: 'huggingface', repo: 'huihui-ai/Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated' },
    artifact: {
      strategy: 'gguf-import',
      repo: 'mradermacher/Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated-GGUF',
      quant: 'Q4_K_M',
    },
    runtime: {
      provider: 'ollama',
      model_env: 'MODEL_BIFROST_DEEP_REASONER',
      default_model: 'bifrost:deep-reasoner-35b-a3b-v1',
      base_url_env: 'OLLAMA_URL_DEEP_REASONER',
      default_base_url: DEFAULT_OLLAMA,
    },
    capabilities: ['text', 'deep-reasoning'],
    assignment: 'specified-optional',
    opt_in_only: true,
  },
});

function materialiseModelProfile(profileId, env = process.env) {
  const definition = MODEL_PROFILES[profileId];
  if (!definition) return null;
  const runtime = definition.runtime || {};
  return {
    ...definition,
    runtime: {
      ...runtime,
      provider: runtime.provider,
      model: (runtime.model_env && env[runtime.model_env]) || runtime.default_model,
      base_url: (runtime.base_url_env && env[runtime.base_url_env]) || runtime.default_base_url || null,
      api_key_env: runtime.api_key_env || null,
    },
  };
}

function platformForProfile(profileId, env = process.env) {
  const profile = materialiseModelProfile(profileId, env);
  if (!profile) throw new Error(`Unknown Bifrost model profile: ${profileId}`);
  return {
    provider: profile.runtime.provider,
    model: profile.runtime.model,
    base_url: profile.runtime.base_url,
    api_key_env: profile.runtime.api_key_env,
  };
}

function publicModelProfile(profileId, env = process.env) {
  const profile = materialiseModelProfile(profileId, env);
  if (!profile) return null;
  return {
    profile_id: profile.profile_id,
    label: profile.label,
    owner: profile.owner,
    source: profile.source,
    artifact: profile.artifact,
    provider: profile.runtime.provider,
    model: profile.runtime.model,
    base_url: profile.runtime.base_url,
    capabilities: profile.capabilities,
    assignment: profile.assignment,
    opt_in_only: Boolean(profile.opt_in_only),
  };
}

module.exports = {
  MODEL_PROFILES,
  materialiseModelProfile,
  platformForProfile,
  publicModelProfile,
};
