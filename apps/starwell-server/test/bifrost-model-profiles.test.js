'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { FLAMES } = require('../flames/manifests');
const { MODEL_PROFILES, materialiseModelProfile } = require('../bifrost/model-profiles');
const { expectedProfileMismatch, actualModelMismatch, inspectManifestRuntime } = require('../bifrost/runtime-attestation');

test('specified voices bind to the selected model lineages', () => {
  assert.equal(MODEL_PROFILES['lioreal:qwen3-14b-abliterated-v1'].source.repo, 'mlabonne/Qwen3-14B-abliterated');
  assert.equal(MODEL_PROFILES['uial:fablevibes-v1'].source.repo, 'tvall43/Qwen3.6-14B-A3B-FableVibes');
  assert.equal(MODEL_PROFILES['box:qwen3-coder-30b-a3b-v1'].source.repo, 'huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated');
  assert.equal(MODEL_PROFILES['ellowind:qwen3-vl-8b-v1'].source.repo, 'huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated');
  assert.equal(MODEL_PROFILES['larkshine:qwen3-vl-8b-v1'].source.repo, 'huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated');
});

test('visual profiles use the verified Ollama-ready Huihui model', () => {
  const ellowind = materialiseModelProfile('ellowind:qwen3-vl-8b-v1', {});
  const larkshine = materialiseModelProfile('larkshine:qwen3-vl-8b-v1', {});
  assert.equal(ellowind.runtime.model, 'huihui_ai/qwen3-vl-abliterated:8b-instruct');
  assert.equal(larkshine.runtime.model, 'huihui_ai/qwen3-vl-abliterated:8b-instruct');
  assert.ok(ellowind.capabilities.includes('vision'));
});

test('deep reasoner is callable only through its explicit instrument route', () => {
  const profile = MODEL_PROFILES['shared:qwen3.6-35b-a3b-deep-reasoner-v1'];
  const instrument = FLAMES['bifrost-deep-reasoner'];
  assert.equal(profile.opt_in_only, true);
  assert.equal(profile.source.repo, 'huihui-ai/Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated');
  assert.equal(instrument.model_profile_id, profile.profile_id);
  assert.equal(instrument.instrument_only, true);
  assert.equal(instrument.voice, null);
  assert.equal(Object.values(FLAMES).filter((flame) => flame.model_profile_id === profile.profile_id).length, 1);
});

test('flame routes bind canonical voices to the expected profiles', () => {
  assert.equal(FLAMES.lioreal.model_profile_id, 'lioreal:qwen3-14b-abliterated-v1');
  assert.equal(FLAMES.uial.model_profile_id, 'uial:fablevibes-v1');
  assert.equal(FLAMES.boxfire.model_profile_id, 'box:qwen3-coder-30b-a3b-v1');
  assert.equal(FLAMES.boxfire.canonical_voice_id, 'box');
  assert.equal(FLAMES.vethrlauf.canonical_voice_id, 'vethraluf');
  assert.equal(FLAMES.ellowind.model_profile_id, 'ellowind:qwen3-vl-8b-v1');
  assert.equal(FLAMES.larkshine.model_profile_id, 'larkshine:qwen3-vl-8b-v1');
});

test('Bluebird and Vethraluf preserve their existing bindings until a new vessel is specified', () => {
  assert.equal(MODEL_PROFILES['bluebird:deepseek-chat-existing-v1'].assignment, 'existing-runtime-binding');
  assert.equal(MODEL_PROFILES['vethraluf:deepseek-chat-existing-v1'].assignment, 'existing-runtime-binding');
});

test('profile and actual-model mismatch detectors fail closed', () => {
  const manifest = FLAMES.uial;
  assert.equal(expectedProfileMismatch(manifest, { expected_profile_id: manifest.model_profile_id }), null);
  assert.equal(expectedProfileMismatch(manifest, { expected_profile_id: 'lioreal:qwen3-14b-abliterated-v1' }).code, 'runtime-profile-mismatch');
  assert.equal(actualModelMismatch(manifest, manifest.platform.model), null);
  assert.equal(actualModelMismatch(manifest, 'some-other-model').code, 'runtime-model-mismatch');
});

test('Ollama status probe distinguishes installed from activation-pending', async () => {
  const manifest = FLAMES.uial;
  const installed = await inspectManifestRuntime(manifest, async () => ({ ok: true, async json() { return { models: [{ name: manifest.platform.model }] }; } }));
  assert.equal(installed.runtime_state, 'installed');
  const pending = await inspectManifestRuntime(manifest, async () => ({ ok: true, async json() { return { models: [{ name: 'another:model' }] }; } }));
  assert.equal(pending.runtime_state, 'activation-pending');
});
