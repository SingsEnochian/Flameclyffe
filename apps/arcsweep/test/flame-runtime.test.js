import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlameHandler, flameStatus } from '../../../netlify/functions/_shared/flame-runtime.mjs';

const makeEnv = (values = {}) => ({ get: (name) => values[name] || null });

test('Flame router refuses calls without the shared runtime token', async () => {
  const handler = createFlameHandler({ env: makeEnv({ ARCSWEEP_RUNTIME_TOKEN: 'house-key' }) });
  const response = await handler(new Request('https://example.test/api/v1/flames/boxfire/status'), { flame_id: 'boxfire', action: 'status' });
  assert.equal(response.status, 401);
});

test('Flame status distinguishes missing cloud and local configuration', () => {
  assert.deepEqual(flameStatus('boxfire', makeEnv()).missing, ['ANTHROPIC_API_KEY']);
  assert.deepEqual(flameStatus('yggdrasil', makeEnv()).missing, ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN']);
});

test('Boxfire dispatches through its own provider and model', async () => {
  const env = makeEnv({ ARCSWEEP_RUNTIME_TOKEN: 'house-key', ANTHROPIC_API_KEY: 'provider-key' });
  const handler = createFlameHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'claude-sonnet-4-6');
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Built and verified.' }] }), { status: 200 });
  } });
  const request = new Request('https://example.test/api/v1/flames/boxfire/chat', { method: 'POST', headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Run the test.' }) });
  const response = await handler(request, { flame_id: 'boxfire', action: 'chat' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message, 'Built and verified.');
});

test('local voices require the protected Hearthgate gateway instead of localhost fallback', async () => {
  const env = makeEnv({ ARCSWEEP_RUNTIME_TOKEN: 'house-key' });
  const handler = createFlameHandler({ env });
  const request = new Request('https://example.test/api/v1/flames/yggdrasil/chat', { method: 'POST', headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Root check.' }) });
  const response = await handler(request, { flame_id: 'yggdrasil', action: 'chat' });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /HEARTHGATE_GATEWAY/);
});
