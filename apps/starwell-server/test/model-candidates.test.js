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

test('Inkling audition runtime is explicit and credential-gated', () => {
  const inkling = MODEL_CANDIDATES['inkling-small'];
  assert.equal(inkling.runtime.provider, 'openai-compatible');
  assert.equal(inkling.runtime.base_url_env, 'TINKER_BASE_URL');
  assert.equal(inkling.runtime.api_key_env, 'TINKER_API_KEY');
  assert.equal(inkling.runtime.reasoning_effort_env, 'INKLING_REASONING_EFFORT');
  assert.equal(inkling.audition.preserves_flame_prompt, true);
});

test('registering Inkling does not replace Larkshine primary route', () => {
  assert.equal(MODEL_CANDIDATES['inkling-small'].deployment.primary_route_unchanged, true);
  assert.equal(FLAMES.larkshine.platform.provider, 'ollama');
  assert.match(FLAMES.larkshine.platform.model, /Qwythos|MODEL_LARKSHINE/);
  assert.doesNotMatch(FLAMES.larkshine.platform.model, /Inkling/i);
});

test('candidate registry has stable lookup and listing helpers', () => {
  assert.equal(getModelCandidate('does-not-exist'), null);
  assert.ok(listModelCandidates().includes(MODEL_CANDIDATES['inkling-small']));
});
