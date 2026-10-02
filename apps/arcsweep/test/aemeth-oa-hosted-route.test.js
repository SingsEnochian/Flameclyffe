import assert from 'node:assert/strict';
import test from 'node:test';
import manifestsModule from '../../starwell-server/flames/manifests.js';
import { HOSTED_FLAME_FALLBACKS, VERCEL_AI_GATEWAY_FALLBACKS, hostedFlameFallbackStatus } from '../../../netlify/functions/_shared/hosted-flame-fallback.mjs';

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

test('Ox Alpha has a truthful multi-path hosted fallback with Vercel OIDC first', () => {
  assert.equal(HOSTED_FLAME_FALLBACKS.oxalpha, 'zai-org/GLM-5.3-Flash');
  assert.equal(VERCEL_AI_GATEWAY_FALLBACKS.oxalpha, 'zai/glm-5.3-flash');

  const unavailable = hostedFlameFallbackStatus('oxalpha', env());
  assert.equal(unavailable.configured, false);
  assert.deepEqual(unavailable.missing, [
    'VERCEL_OIDC_TOKEN|AI_GATEWAY_API_KEY',
    'HF_TOKEN|HFTOKEN',
    'SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY|SUPABASE_SECRET_KEY',
  ]);

  const oidc = hostedFlameFallbackStatus('oxalpha', env({ VERCEL_OIDC_TOKEN: 'short-lived-identity' }));
  assert.equal(oidc.configured, true);
  assert.equal(oidc.provider, 'vercel-ai-gateway');
  assert.equal(oidc.model, 'zai/glm-5.3-flash');
  assert.equal(oidc.credential_type, 'vercel-oidc');
  assert.equal(oidc.primary_route_unchanged, true);

  const hf = hostedFlameFallbackStatus('oxalpha', env({ HF_TOKEN: 'configured-secret' }));
  assert.equal(hf.configured, true);
  assert.equal(hf.provider, 'huggingface-inference-providers');
  assert.equal(hf.model, 'zai-org/GLM-5.3-Flash');
});
