const assert = require('node:assert/strict');
const test = require('node:test');
const { FLAMES } = require('../flames/manifests');
const { MODEL_CANDIDATES, getModelCandidate, listModelCandidates } = require('../flames/model-candidates');

test('Inkling-Small is registered as an audition-only Bifröst candidate', () => {
  const inkling = getModelCandidate('inkling-small');

  assert.ok(inkling);
  assert.match(inkling.model_id, /Inkling-Small/);
  assert.equal(inkling.status, 'audition');
  assert.equal(inkling.deployment.live_route, false);
  assert.equal(inkling.deployment.audition_route, true);
  assert.equal(inkling.deployment.requires_explicit_promotion, true);
  assert.ok(inkling.candidate_for.includes('larkshine'));
  assert.equal(inkling.capabilities.context_window_tokens, 1_000_000);
  assert.equal(inkling.capabilities.image, true);
  assert.equal(inkling.capabilities.audio, true);
  assert.equal(inkling.capabilities.tools, true);
  assert.equal(inkling.capabilities.reasoning_effort, true);
});

test('Inkling audition runtime is Hugging Face first but provider-neutral', () => {
  const inkling = MODEL_CANDIDATES['inkling-small'];
  assert.equal(inkling.runtime.provider, 'openai-compatible');
  assert.equal(inkling.backends.preferred, 'huggingface-inference-providers');
  assert.ok(inkling.backends.compatible.includes('tinker'));
  assert.equal(inkling.runtime.base_url, 'https://router.huggingface.co/v1');
  assert.equal(inkling.runtime.base_url_env, 'INKLING_BASE_URL');
  assert.equal(inkling.runtime.api_key_env, 'HF_TOKEN');
  assert.equal(inkling.runtime.reasoning_effort_env, 'INKLING_REASONING_EFFORT');
  assert.equal(inkling.audition.preserves_flame_prompt, true);
});

test('registering Inkling does not replace Larkshine primary route', () => {
  assert.equal(MODEL_CANDIDATES['inkling-small'].deployment.primary_route_unchanged, true);
  assert.equal(FLAMES.larkshine.platform.provider, 'ollama');
  assert.match(FLAMES.larkshine.platform.model, /Qwythos|MODEL_LARKSHINE/);
  assert.doesNotMatch(FLAMES.larkshine.platform.model, /Inkling/i);
});

test('The Crow is registered as a Bluebird-only audition receiver', () => {
  const crow = getModelCandidate('bluebird-the-crow');

  assert.ok(crow);
  assert.equal(crow.status, 'audition');
  assert.deepEqual(crow.candidate_for, ['bluebird']);
  assert.match(crow.model_id, /Crownelius\/The-Crow-9B-Creative-Writing-Opus4\.6-DISTILL-Heretic/);
  assert.equal(crow.source.license, 'apache-2.0');
  assert.equal(crow.runtime.provider, 'openai-compatible');
  assert.equal(crow.runtime.backend, 'local-openai-compatible');
  assert.equal(crow.runtime.base_url, 'http://127.0.0.1:8081/v1');
  assert.equal(crow.runtime.api_key_env, null);
  assert.equal(crow.runtime.local_first, true);
  assert.equal(crow.runtime.network_required, false);
  assert.equal(crow.audition.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.equal(crow.deployment.primary_route_unchanged, true);
  assert.equal(crow.deployment.audition_route, true);
});

test('The Crow carries a model-card-aware Richie migration calibration', () => {
  const crow = MODEL_CANDIDATES['bluebird-the-crow'];
  assert.equal(crow.capabilities.context_window_tokens, 123_000);
  assert.equal(crow.source.artifact_format, 'gguf-k8_0');
  assert.equal(crow.source.artifact_size_gb, 8.71);
  assert.ok(crow.backends.compatible.includes('huggingface-jobs'));
  assert.ok(crow.backends.compatible.includes('llama.cpp'));
  assert.equal(crow.runtime.max_tokens, 300);
  assert.equal(crow.runtime.sampling.temperature, 0.9);
  assert.equal(crow.runtime.sampling.top_p, 0.82);
  assert.equal(crow.runtime.sampling.top_k, 75);
  assert.equal(crow.audition.origin_sampling_reference.temperature, 0.91);
  assert.equal(crow.audition.origin_sampling_reference.context_window_tokens, 32_768);
});

test('registering The Crow does not replace Bluebird primary route', () => {
  const crow = MODEL_CANDIDATES['bluebird-the-crow'];
  assert.equal(crow.deployment.live_route, false);
  assert.equal(FLAMES.bluebird.platform.provider, 'deepseek');
  assert.equal(FLAMES.bluebird.platform.model, 'deepseek-chat');
  assert.doesNotMatch(FLAMES.bluebird.platform.model, /Crow/i);
});

test('candidate registry has stable lookup and listing helpers', () => {
  assert.equal(getModelCandidate('does-not-exist'), null);
  assert.ok(listModelCandidates().includes(MODEL_CANDIDATES['inkling-small']));
  assert.ok(listModelCandidates().includes(MODEL_CANDIDATES['bluebird-the-crow']));
});
