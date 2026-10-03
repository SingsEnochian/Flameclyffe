'use strict';

const MODEL_OBSERVATION_SCHEMA = 'wayglass.model-observation/v0.1';

function clean(value, max = 12000) {
  return String(value || '').trim().slice(0, max);
}

function createModelObservation({
  route,
  result = {},
  payload = {},
  completedAt = new Date().toISOString(),
  observationId,
} = {}) {
  if (!route) throw new Error('route required for model observation');
  const output = clean(result.output);
  const thinking = clean(result.thinking, 24000) || null;
  const id = clean(observationId, 180)
    || ('wg-observation-' + (globalThis.crypto?.randomUUID?.() || Date.now()));

  return Object.freeze({
    schema: MODEL_OBSERVATION_SCHEMA,
    observation_id: id,
    observed_at: completedAt,
    epistemic_register: 'external-observation',
    source: Object.freeze({
      kind: 'model-route',
      route_id: route.route_id,
      provider: route.provider,
      model: route.model(),
      environment: route.environment || null,
      lineage: route.lineage || null,
      response_id: result.response_id || null,
    }),
    interaction: Object.freeze({
      session_id: clean(payload.session_id, 160) || null,
      surface_id: clean(payload.surface_id, 160) || null,
      channel: payload?.interaction?.channel === 'OOC' ? 'OOC' : 'IC',
    }),
    content: Object.freeze({
      output,
      deliberation_trace: thinking,
      deliberation_is_canon: false,
    }),
    usage: result.usage || null,
    provider_data_policy: route.data_policy || null,
    authority: Object.freeze({
      scope: 'observation-only',
      canon_commit: false,
      relationship_commit: false,
      continuity_commit: false,
      identity_commit: false,
      requires_explicit_promotion: true,
    }),
    review: Object.freeze({
      state: 'unreviewed',
      promoted: false,
    }),
  });
}

module.exports = {
  MODEL_OBSERVATION_SCHEMA,
  createModelObservation,
};
