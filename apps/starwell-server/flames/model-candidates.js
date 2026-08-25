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

  'ox-alpha': {
    candidate_id: 'ox-alpha',
    display_name: 'Ox Alpha',
    model_id: process.env.MODEL_OX_ALPHA || 'stealth/ox-alpha',
    source: {
      registry: 'openrouter',
      provider: 'anonymous-stealth-provider',
      model_page: 'https://openrouter.ai/stealth/ox-alpha',
      terms: 'openrouter-stealth-model-terms',
      released: '2026-08-20',
    },
    status: 'experimental-audition',
    candidate_for: ['boxfire'],
    architecture: {
      family: 'stealth',
      type: 'reasoning-agentic-coding',
      provider_identity: 'undisclosed',
    },
    capabilities: {
      text: true,
      image: true,
      video: true,
      audio: false,
      tools: true,
      tool_choice: true,
      reasoning_effort: false,
      structured_output: 'response-format-json-no-schema-enforcement',
      context_window_tokens: 1_048_576,
      max_completion_tokens: 131_072,
      fine_tunable: false,
    },
    backends: {
      preferred: 'openrouter',
      compatible: ['openrouter'],
    },
    runtime: {
      provider: 'openai-compatible',
      backend: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1',
      base_url_env: 'OPENROUTER_BASE_URL',
      api_key_env: 'OPENROUTER_API_KEY',
      max_tokens: 8192,
    },
    data_policy: {
      classification: 'public-or-sanitised-only',
      allowed_input_classes: ['public', 'sanitised'],
      default_input_class: 'unknown',
      hearthfire_retrieval: false,
      memory_write: false,
      private_commons: false,
      private_archives: false,
      credentials: false,
      personal_sensitive_records: false,
      collaborator_private_material: false,
      reason: 'Stealth preview provider retains prompts/completions; audition is intentionally restricted to public or sanitised material.',
    },
    deployment: {
      live_route: false,
      audition_route: true,
      requires_explicit_promotion: true,
      primary_route_unchanged: true,
      persistence_dependency: false,
      fallback_required: true,
    },
    audition: {
      baseline_flame: 'boxfire',
      baseline_model_env: null,
      preserves_flame_prompt: true,
      measures: [
        'patch_correctness',
        'architecture_fidelity',
        'tool_discipline',
        'test_discipline',
        'regression_avoidance',
        'long_context_recall',
        'failure_path_honesty',
        'token_consumption',
        'completion_quality',
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

function assessCandidateDataPolicy(candidate, requestedClass) {
  const policy = candidate?.data_policy;
  if (!policy) {
    return {
      ok: true,
      data_class: requestedClass || null,
      hearthfire_retrieval: true,
      policy: null,
    };
  }

  const dataClass = requestedClass || policy.default_input_class || 'unknown';
  const allowed = Array.isArray(policy.allowed_input_classes) ? policy.allowed_input_classes : [];
  if (!allowed.includes(dataClass)) {
    return {
      ok: false,
      code: 'CANDIDATE_DATA_POLICY',
      data_class: dataClass,
      allowed_input_classes: allowed,
      hearthfire_retrieval: false,
      policy,
      reason: `${candidate.candidate_id} accepts only explicitly classified ${allowed.join(' or ')} audition input.`,
    };
  }

  return {
    ok: true,
    data_class: dataClass,
    hearthfire_retrieval: policy.hearthfire_retrieval !== false,
    policy,
  };
}

module.exports = {
  MODEL_CANDIDATES,
  getModelCandidate,
  listModelCandidates,
  assessCandidateDataPolicy,
};
