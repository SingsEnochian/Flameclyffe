import assert from 'node:assert/strict';
import test from 'node:test';
import manifestsModule from '../../starwell-server/flames/manifests.js';
import { HOSTED_FLAME_FALLBACKS, hostedFlameFallbackStatus } from '../../../netlify/functions/_shared/hosted-flame-fallback.mjs';

const { FLAMES } = manifestsModule;

const env = (values = {}) => ({ get: (key) => values[key] });

test('Ox Alpha is a distinct live Flame identity backed by GLM-5.3-Flash', () => {
  const oa = FLAMES.oxalpha;
  assert.equal(oa?.flame_id, 'oxalpha');
  assert.equal(oa?.display_name, 'Ox Alpha');
  assert.equal(oa?.platform.model, 'zai-org/GLM-5.3-Flash');
  assert.equal(oa?.platform.api_key_env, 'HF_TOKEN');
  assert.equal(oa?.voice.caption_label, 'OA');
  assert.equal(oa?.memory.can_write_memory, false);
});

test('Ox Alpha has a Hugging Face hosted fallback with truthful credential status', () => {
  assert.equal(HOSTED_FLAME_FALLBACKS.oxalpha, 'zai-org/GLM-5.3-Flash');
  const unavailable = hostedFlameFallbackStatus('oxalpha', env());
  assert.equal(unavailable.configured, false);
  assert.deepEqual(unavailable.missing, ['HF_TOKEN|HFTOKEN']);
  const available = hostedFlameFallbackStatus('oxalpha', env({ HF_TOKEN: 'configured-secret' }));
  assert.equal(available.configured, true);
  assert.equal(available.provider, 'huggingface-inference-providers');
  assert.equal(available.model, 'zai-org/GLM-5.3-Flash');
  assert.equal(available.primary_route_unchanged, true);
});
