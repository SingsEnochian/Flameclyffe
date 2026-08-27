const assert = require('node:assert/strict');
const test = require('node:test');
const { FLAMES } = require('../flames/manifests');

test('Ox Alpha is a distinct Hugging Face-backed Flame route', () => {
  const ox = FLAMES.oxalpha;
  assert.ok(ox);
  assert.equal(ox.flame_id, 'oxalpha');
  assert.equal(ox.display_name, 'Ox Alpha');
  assert.equal(ox.platform.provider, 'openai');
  assert.match(ox.platform.model, /GLM-5\.3-Flash|MODEL_OX_ALPHA/);
  assert.equal(ox.platform.base_url, 'https://router.huggingface.co');
  assert.equal(ox.platform.api_key_env, 'HF_TOKEN');
  assert.equal(ox.voice.caption_label, 'OA');
});

test('Ox Alpha keeps its own memory namespace and cannot write memory by default', () => {
  const ox = FLAMES.oxalpha;
  assert.equal(ox.memory.hearthfire_namespace, 'hearthfire:ox-alpha');
  assert.equal(ox.memory.can_write_memory, false);
  assert.equal(ox.memory.requires_consent_for_write, true);
});
