'use strict';

const { createHash } = require('node:crypto');

const HARNESS_ATTESTATION_SCHEMA = 'wayglass.harness-attestation/v0.1';
const HARNESS_SENSITIVITY_SCHEMA = 'wayglass.harness-sensitivity/v0.1';

const HARNESSES = Object.freeze({
  'wayglass:writing-room/direct-v0.1': Object.freeze({
    harness_id: 'wayglass:writing-room/direct-v0.1',
    label: 'Wayglass Writing Room · Direct',
    harness_version: 'v0.1',
    api_dialect: 'wayglass-respond/v0.1',
    loop_owner: 'wayglass-server',
    context_policy: 'direct-coauthor',
    tool_schema_fingerprint: 'none-v0',
    retry_policy: 'single-attempt',
    compaction_policy: 'recent-16-turns',
    termination_policy: 'single-response',
    instruction_profile: 'direct',
  }),
  'wayglass:writing-room/reflective-v0.1': Object.freeze({
    harness_id: 'wayglass:writing-room/reflective-v0.1',
    label: 'Wayglass Writing Room · Reflective',
    harness_version: 'v0.1',
    api_dialect: 'wayglass-respond/v0.1',
    loop_owner: 'wayglass-server',
    context_policy: 'reflect-before-commit',
    tool_schema_fingerprint: 'none-v0',
    retry_policy: 'single-attempt',
    compaction_policy: 'recent-16-turns',
    termination_policy: 'single-response',
    instruction_profile: 'reflective',
  }),
});

function clean(value, max = 320) {
  return String(value || '').trim().slice(0, max);
}

function resolveWayglassHarness(harnessId) {
  const id = clean(harnessId, 180);
  return HARNESSES[id] || null;
}

function publicWayglassHarnesses() {
  return Object.values(HARNESSES).map((harness) => Object.freeze({
    ...harness,
    authority: Object.freeze({
      scope: 'harness-provenance-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
    }),
  }));
}

function createHarnessAttestation(harness, { observed_at = null } = {}) {
  if (!harness || !harness.harness_id) {
    throw new Error('Wayglass harness attestation requires a registered harness.');
  }
  return Object.freeze({
    schema: HARNESS_ATTESTATION_SCHEMA,
    observed_at: clean(observed_at, 80) || new Date().toISOString(),
    harness_id: clean(harness.harness_id, 180),
    harness_version: clean(harness.harness_version, 80),
    api_dialect: clean(harness.api_dialect, 120),
    loop_owner: clean(harness.loop_owner, 120),
    context_policy: clean(harness.context_policy, 160),
    tool_schema_fingerprint: clean(harness.tool_schema_fingerprint, 180),
    retry_policy: clean(harness.retry_policy, 160),
    compaction_policy: clean(harness.compaction_policy, 160),
    termination_policy: clean(harness.termination_policy, 160),
    instruction_profile: clean(harness.instruction_profile, 80),
    authority: Object.freeze({
      scope: 'harness-provenance-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
    }),
  });
}

function normaliseWords(value) {
  return clean(value, 40000)
    .toLowerCase()
    .match(/[a-z0-9_'-]+/g) || [];
}

function lexicalJaccard(a, b) {
  const left = new Set(normaliseWords(a));
  const right = new Set(normaliseWords(b));
  if (!left.size && !right.size) return 1;
  let overlap = 0;
  for (const word of left) if (right.has(word)) overlap += 1;
  const union = new Set([...left, ...right]).size;
  return union ? overlap / union : 1;
}

function digestText(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function observationArm(observation) {
  const source = observation?.source || {};
  const harness = observation?.harness || null;
  const content = observation?.content || {};
  const output = clean(content.output, 40000);
  const completionTokens = Number.isFinite(observation?.usage?.completion_tokens)
    ? observation.usage.completion_tokens
    : null;

  return Object.freeze({
    observation_id: clean(observation?.observation_id, 180) || null,
    route_id: clean(source.route_id, 180) || null,
    provider: clean(source.provider, 120) || null,
    model: clean(source.model, 180) || null,
    harness_id: clean(harness?.harness_id, 180) || null,
    harness_version: clean(harness?.harness_version, 80) || null,
    context_policy: clean(harness?.context_policy, 160) || null,
    output_sha256: digestText(output),
    output_chars: output.length,
    output_words: normaliseWords(output).length,
    completion_tokens: completionTokens,
    thinking_exposed: Boolean(content.deliberation_trace),
    canon_commit: Boolean(observation?.authority?.canon_commit),
  });
}

function createHarnessSensitivityFingerprint({
  experiment_id,
  task_id,
  left_observation,
  right_observation,
  measured_at = null,
} = {}) {
  const experimentId = clean(experiment_id, 180);
  const taskId = clean(task_id, 180);
  if (!experimentId || !taskId) {
    throw new Error('Harness sensitivity fingerprint requires experiment_id and task_id.');
  }
  if (!left_observation || !right_observation) {
    throw new Error('Harness sensitivity fingerprint requires two model observations.');
  }

  const left = observationArm(left_observation);
  const right = observationArm(right_observation);

  for (const field of ['route_id', 'provider', 'model']) {
    if (!left[field] || !right[field] || left[field] !== right[field]) {
      throw new Error('Harness sensitivity comparison requires the same ' + field + ' in both arms.');
    }
  }
  if (!left.harness_id || !right.harness_id || left.harness_id === right.harness_id) {
    throw new Error('Harness sensitivity comparison requires two distinct attested harnesses.');
  }

  const leftOutput = left_observation?.content?.output || '';
  const rightOutput = right_observation?.content?.output || '';
  const completionTokenDelta = left.completion_tokens != null && right.completion_tokens != null
    ? right.completion_tokens - left.completion_tokens
    : null;

  return Object.freeze({
    schema: HARNESS_SENSITIVITY_SCHEMA,
    experiment_id: experimentId,
    task_id: taskId,
    measured_at: clean(measured_at, 80) || new Date().toISOString(),
    controlled: Object.freeze({
      route_id: left.route_id,
      provider: left.provider,
      model: left.model,
      same_model: true,
      same_route: true,
    }),
    arms: Object.freeze({
      left,
      right,
    }),
    delta: Object.freeze({
      output_changed: left.output_sha256 !== right.output_sha256,
      lexical_jaccard: lexicalJaccard(leftOutput, rightOutput),
      output_char_delta: right.output_chars - left.output_chars,
      output_word_delta: right.output_words - left.output_words,
      completion_token_delta: completionTokenDelta,
      thinking_exposure_changed: left.thinking_exposed !== right.thinking_exposed,
    }),
    authority: Object.freeze({
      scope: 'evaluation-observation-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
      native_model_promotion: false,
    }),
  });
}

module.exports = {
  HARNESS_ATTESTATION_SCHEMA,
  HARNESS_SENSITIVITY_SCHEMA,
  HARNESSES,
  resolveWayglassHarness,
  publicWayglassHarnesses,
  createHarnessAttestation,
  createHarnessSensitivityFingerprint,
};
