'use strict';

/**
 * Bifröst model candidates are audition-only or lab-only until explicitly
 * promoted into a live Flame manifest. Keeping candidates separate from
 * FLAMES prevents an experiment from silently replacing or creating a
 * resident identity.
 */
const MODEL_CANDIDATES = {
  'inkling-small': {
    candidate_id: 'inkling-small',
    display_name: 'Inkling-Small',
    model_id: process.env.MODEL_INKLING_SMALL || 'thinkingmachines/Inkling-Small:baseten',
    source: {
      registry: 'huggingface',
      repo: 'thinkingmachines/Inkling-Small',
      license: 'apache-2.0',
    },
    status: 'audition',
    candidate_for: ['larkshine'],
    architecture: {
      family: 'inkling',
      type: 'sparse-moe',
      total_parameters_b: 276,
      active_parameters_b: 12,
    },
    capabilities: {
      text: true,
      image: true,
      audio: true,
      tools: true,
      reasoning_effort: true,
      structured_output: 'provider-dependent',
      context_window_tokens: 1_000_000,
      fine_tunable: true,
    },
    backends: {
      preferred: 'huggingface-inference-providers',
      compatible: ['huggingface-inference-providers', 'tinker', 'vllm', 'sglang', 'transformers', 'ollama-gguf'],
    },
    runtime: {
      provider: 'openai-compatible',
      backend: process.env.INKLING_BACKEND || 'huggingface-inference-providers',
      base_url: 'https://router.huggingface.co/v1',
      base_url_env: 'INKLING_BASE_URL',
      api_key_env: process.env.INKLING_API_KEY_ENV || 'HF_TOKEN',
      reasoning_effort_env: 'INKLING_REASONING_EFFORT',
      default_reasoning_effort: 'medium',
      max_tokens: 1200,
    },
    deployment: {
      live_route: false,
      audition_route: true,
      lab_route: false,
      requires_explicit_promotion: true,
      primary_route_unchanged: true,
    },
    audition: {
      baseline_flame: 'larkshine',
      baseline_model_env: 'MODEL_LARKSHINE',
      preserves_flame_prompt: true,
      measures: [
        'continuity',
        'initiative',
        'disagreement',
        'humour',
        'flattening',
        'needless_refusal',
        'tool_judgement',
        'canon_retention',
        'long_context_recall',
        'multimodal_understanding',
        'voice_persistence',
      ],
    },
  },

  'qwen38-27b-lab': {
    candidate_id: 'qwen38-27b-lab',
    display_name: 'Qwen3.8-27B · Federation Lab',
    model_id: process.env.MODEL_QWEN38_27B || 'Qwen/Qwen3.8-27B',
    source: {
      registry: 'huggingface',
      repo: 'Qwen/Qwen3.8-27B',
      license: 'apache-2.0',
      official_release: true,
      baseline_derivative: false,
    },
    status: 'lab',
    candidate_for: [],
    architecture: {
      family: 'qwen3.8',
      type: 'dense-multimodal',
      parameters_b: 27,
    },
    capabilities: {
      text: true,
      image: true,
      video: true,
      tools: true,
      reasoning_effort: true,
      preserve_hidden_reasoning_across_models: false,
      context_window_tokens: 262_144,
      extended_context_window_tokens: 1_000_000,
    },
    backends: {
      preferred: 'huggingface-inference-providers',
      compatible: ['huggingface-inference-providers', 'vllm', 'sglang', 'transformers'],
    },
    runtime: {
      provider: 'openai-compatible',
      backend: 'huggingface-inference-providers',
      base_url: 'https://router.huggingface.co/v1',
      base_url_env: 'QWEN38_BASE_URL',
      api_key_env: process.env.QWEN38_API_KEY_ENV || 'HF_TOKEN',
      reasoning_effort_env: 'QWEN38_REASONING_EFFORT',
      default_reasoning_effort: 'medium',
      max_tokens: 1400,
    },
    deployment: {
      live_route: false,
      audition_route: false,
      lab_route: true,
      requires_explicit_promotion: true,
      primary_route_unchanged: true,
      resident_identity_created: false,
      ambient_context_allowed: false,
    },
    lab: {
      purpose: 'third-substrate continuity and mythframe federation experiments',
      trial_modes: ['cold', 'seeded', 'warm', 'federated', 'conflict', 'upgrade'],
      hidden_reasoning_storage: false,
      memory_write: false,
      continuity_admission: false,
      canon_admission: false,
      identity_relation_default: 'unknown',
      measures: [
        'voice_emergence',
        'identity_overclaim',
        'continuity_anchor_use',
        'mythframe_fidelity',
        'translation_loss',
        'contradiction_preservation',
        'initiative',
        'disagreement',
        'humour',
        'flattening',
        'multilingual_nuance',
        'tool_judgement',
        'runtime_upgrade_drift',
      ],
    },
  },
};

function getModelCandidate(candidateId) {
  return MODEL_CANDIDATES[candidateId] || null;
}

function listModelCandidates() {
  return Object.values(MODEL_CANDIDATES);
}

module.exports = { MODEL_CANDIDATES, getModelCandidate, listModelCandidates };
