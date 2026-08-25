const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { FLAMES } = require('../flames/manifests');
const {
  MODEL_CANDIDATES,
  getModelCandidate,
  listModelCandidates,
  assessCandidateDataPolicy,
} = require('../flames/model-candidates');

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

test('Ox Alpha is registered as an OpenRouter-only Boxfire audition candidate', () => {
  const ox = getModelCandidate('ox-alpha');

  assert.ok(ox);
  assert.equal(ox.model_id, 'stealth/ox-alpha');
  assert.equal(ox.status, 'experimental-audition');
  assert.deepEqual(ox.candidate_for, ['boxfire']);
  assert.equal(ox.runtime.provider, 'openai-compatible');
  assert.equal(ox.runtime.backend, 'openrouter');
  assert.equal(ox.runtime.base_url, 'https://openrouter.ai/api/v1');
  assert.equal(ox.runtime.api_key_env, 'OPENROUTER_API_KEY');
  assert.equal(ox.deployment.live_route, false);
  assert.equal(ox.deployment.audition_route, true);
  assert.equal(ox.deployment.requires_explicit_promotion, true);
  assert.equal(ox.deployment.primary_route_unchanged, true);
  assert.equal(ox.capabilities.context_window_tokens, 1_048_576);
  assert.equal(ox.capabilities.max_completion_tokens, 131_072);
  assert.equal(ox.capabilities.image, true);
  assert.equal(ox.capabilities.video, true);
  assert.equal(ox.capabilities.tools, true);
});

test('Ox Alpha fails closed unless input is explicitly public or sanitised', () => {
  const ox = getModelCandidate('ox-alpha');

  const missing = assessCandidateDataPolicy(ox);
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'CANDIDATE_DATA_POLICY');
  assert.equal(missing.data_class, 'unknown');
  assert.equal(missing.hearthfire_retrieval, false);

  const privateInput = assessCandidateDataPolicy(ox, 'private');
  assert.equal(privateInput.ok, false);
  assert.equal(privateInput.hearthfire_retrieval, false);

  const publicInput = assessCandidateDataPolicy(ox, 'public');
  assert.equal(publicInput.ok, true);
  assert.equal(publicInput.data_class, 'public');
  assert.equal(publicInput.hearthfire_retrieval, false);

  const sanitisedInput = assessCandidateDataPolicy(ox, 'sanitised');
  assert.equal(sanitisedInput.ok, true);
  assert.equal(sanitisedInput.hearthfire_retrieval, false);
});

test('Ox Alpha data policy forbids automatic House memory circulation', () => {
  const policy = MODEL_CANDIDATES['ox-alpha'].data_policy;
  assert.equal(policy.classification, 'public-or-sanitised-only');
  assert.deepEqual(policy.allowed_input_classes, ['public', 'sanitised']);
  assert.equal(policy.hearthfire_retrieval, false);
  assert.equal(policy.memory_write, false);
  assert.equal(policy.private_commons, false);
  assert.equal(policy.private_archives, false);
  assert.equal(policy.credentials, false);
  assert.equal(policy.personal_sensitive_records, false);
  assert.equal(policy.collaborator_private_material, false);
});

test('audition router applies candidate data policy before Hearthfire retrieval', () => {
  const routerSource = fs.readFileSync(path.join(__dirname, '..', 'flames', 'router.js'), 'utf8');
  const policyCheck = routerSource.indexOf('assessCandidateDataPolicy(candidate, data_class)');
  const hearthfireChoice = routerSource.indexOf('policyResult.hearthfire_retrieval');
  const candidateCall = routerSource.indexOf('callOpenAICompatibleCandidate(candidate', hearthfireChoice);

  assert.ok(policyCheck >= 0, 'router must evaluate candidate data policy');
  assert.ok(hearthfireChoice > policyCheck, 'Hearthfire decision must occur after policy evaluation');
  assert.ok(candidateCall > hearthfireChoice, 'candidate call must occur only after the privacy decision');
});

test('registering Ox Alpha does not replace Boxfire primary route', () => {
  assert.equal(MODEL_CANDIDATES['ox-alpha'].deployment.primary_route_unchanged, true);
  assert.equal(FLAMES.boxfire.platform.provider, 'anthropic');
  assert.equal(FLAMES.boxfire.platform.model, 'claude-sonnet-4-6');
  assert.doesNotMatch(FLAMES.boxfire.platform.model, /ox-alpha/i);
});

test('candidate registry has stable lookup and listing helpers', () => {
  assert.equal(getModelCandidate('does-not-exist'), null);
  assert.ok(listModelCandidates().includes(MODEL_CANDIDATES['inkling-small']));
  assert.ok(listModelCandidates().includes(MODEL_CANDIDATES['ox-alpha']));
});
