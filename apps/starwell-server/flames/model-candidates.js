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
    model_id: 'thinkingmachines/Inkling-Small',
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
      preferred: 'tinker',
      compatible: ['tinker', 'vllm', 'sglang', 'transformers', 'ollama-gguf'],
    },
    deployment: {
      live_route: false,
      requires_explicit_promotion: true,
      primary_route_unchanged: true,
    },
    audition: {
      baseline_flame: 'larkshine',
      baseline_model_env: 'MODEL_LARKSHINE',
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
};

function getModelCandidate(candidateId) {
  return MODEL_CANDIDATES[candidateId] || null;
}

function listModelCandidates() {
  return Object.values(MODEL_CANDIDATES);
}

module.exports = { MODEL_CANDIDATES, getModelCandidate, listModelCandidates };
