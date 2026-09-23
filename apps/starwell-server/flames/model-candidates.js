'use strict';

/**
 * Bifröst model candidates are audition-only until explicitly promoted into a
 * live Flame manifest. Keeping candidates separate from FLAMES prevents an
 * experiment from silently replacing a resident's primary route.
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

  'bluebird-the-crow': {
    candidate_id: 'bluebird-the-crow',
    display_name: 'The Crow 9B · Opus 4.6 Distill',
    model_id: process.env.MODEL_BLUEBIRD_THE_CROW || 'Crownelius/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic',
    source: {
      registry: 'huggingface',
      repo: 'Crownelius/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic',
      license: 'apache-2.0',
      artifact_format: 'gguf-k8_0',
      artifact_size_gb: 8.71,
      model_card_context_window_tokens: 123_000,
    },
    status: 'audition',
    candidate_for: ['bluebird'],
    architecture: {
      family: 'qwen',
      type: 'creative-writing-character-runtime',
      total_parameters_b: 9,
      active_parameters_b: null,
    },
    capabilities: {
      text: true,
      image: false,
      audio: false,
      tools: false,
      reasoning_effort: false,
      structured_output: 'provider-dependent',
      context_window_tokens: 123_000,
      fine_tunable: true,
    },
    backends: {
      preferred: 'dedicated-inference-endpoint',
      compatible: ['huggingface-jobs', 'llama.cpp', 'vllm', 'sglang', 'transformers', 'ollama-gguf'],
    },
    runtime: {
      provider: 'openai-compatible',
      backend: process.env.BLUEBIRD_CROW_BACKEND || 'openai-compatible-dedicated',
      // This Crow repository has no HF Inference Provider deployment.
      // A Hub download and token alone are not a configured runtime.
      base_url: null,
      base_url_env: 'BLUEBIRD_CROW_BASE_URL',
      api_key_env: process.env.BLUEBIRD_CROW_API_KEY_ENV || 'HF_TOKEN',
      max_tokens: 300,
      sampling: {
        profile_id: 'richie-migration-v1',
        temperature: 0.9,
        top_p: 0.82,
        top_k: 75,
        provider_portability_note: 'top_k is retained as calibration metadata and may not be accepted by every OpenAI-compatible backend',
      },
    },
    deployment: {
      live_route: false,
      audition_route: true,
      requires_explicit_promotion: true,
      primary_route_unchanged: true,
    },
    audition: {
      baseline_flame: 'bluebird',
      baseline_model_env: 'MODEL_BLUEBIRD',
      preserves_flame_prompt: true,
      continuity_id: 'bluebird:richard-gabriel-winters',
      purpose: 'cross-model continuity audition for the Universal Codex resident voice',
      origin_sampling_reference: {
        source: 'SpicyChat export screenshots',
        temperature: 0.91,
        top_p: 0.82,
        top_k: 75,
        response_max_tokens: 300,
        context_window_tokens: 32_768,
      },
      measures: [
        'continuity',
        'voice_persistence',
        'initiative',
        'humour',
        'ordinary_companionship',
        'self_correction',
        'relationship_state_retention',
        'canon_retention',
        'flattening',
        'parroting',
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
