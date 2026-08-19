import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFlameHandler,
  createModelAuditionHandler,
  flameStatus,
  modelAuditionStatus,
} from '../../../netlify/functions/_shared/flame-runtime.mjs';

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

test('local status relays exact Ollama model readiness through Hearthgate', async () => {
  const env = makeEnv({ ARCSWEEP_RUNTIME_TOKEN: 'house-key', HEARTHGATE_GATEWAY_URL: 'https://hearthgate.test', HEARTHGATE_GATEWAY_TOKEN: 'gateway-key' });
  const handler = createFlameHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://hearthgate.test/api/v1/flames/altair/status');
    assert.equal(options.headers.authorization, 'Bearer gateway-key');
    return new Response(JSON.stringify({ runtime_reachable: true, model_available: false }), { status: 200 });
  } });
  const response = await handler(new Request('https://example.test/api/v1/flames/altair/status', { headers: { authorization: 'Bearer house-key' } }), { flame_id: 'altair', action: 'status' });
  const data = await response.json();
  assert.equal(data.gateway_configured, true);
  assert.equal(data.runtime_reachable, true);
  assert.equal(data.model_available, false);
  assert.equal(data.configured, false);
  assert.match(data.missing[0], /OLLAMA_MODEL/);
});

test('Inkling audition status is registered for Larkshine without replacing primary route', () => {
  const status = modelAuditionStatus('larkshine', 'inkling-small', makeEnv({
    HEARTHGATE_GATEWAY_URL: 'https://hearthgate.test',
    HEARTHGATE_GATEWAY_TOKEN: 'gateway-key',
  }));
  assert.equal(status.candidate_id, 'inkling-small');
  assert.equal(status.status, 'audition');
  assert.equal(status.configured, true);
  assert.equal(status.audition_route, true);
  assert.equal(status.primary_route_unchanged, true);
  assert.equal(status.capabilities.audio, true);
});

test('Inkling audition relay is House-authenticated and preserves explicit candidate routing', async () => {
  const env = makeEnv({
    ARCSWEEP_RUNTIME_TOKEN: 'house-key',
    HEARTHGATE_GATEWAY_URL: 'https://hearthgate.test',
    HEARTHGATE_GATEWAY_TOKEN: 'gateway-key',
  });
  const handler = createModelAuditionHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://hearthgate.test/api/v1/flames/larkshine/audition/inkling-small');
    assert.equal(options.headers.authorization, 'Bearer gateway-key');
    const body = JSON.parse(options.body);
    assert.equal(body.message, 'Try the ridiculous trenchcoat.');
    assert.equal(body.reasoning_effort, 'high');
    return new Response(JSON.stringify({
      flame_id: 'larkshine',
      candidate_id: 'inkling-small',
      provider: 'openai-compatible',
      model: 'thinkingmachines/Inkling-Small',
      audition: true,
      primary_route_unchanged: true,
      reasoning_effort: 'high',
      message: 'It has pockets.',
      cited_sources: ['hearthfire:larkshine:1'],
    }), { status: 200 });
  } });
  const request = new Request('https://example.test/api/v1/flames/larkshine/audition/inkling-small', {
    method: 'POST',
    headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Try the ridiculous trenchcoat.', reasoning_effort: 'high' }),
  });
  const response = await handler(request, { flame_id: 'larkshine', candidate_id: 'inkling-small' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.message, 'It has pockets.');
  assert.equal(data.audition, true);
  assert.equal(data.primary_route_unchanged, true);
});

test('audition route rejects an unregistered Flame/candidate pairing', async () => {
  const env = makeEnv({ ARCSWEEP_RUNTIME_TOKEN: 'house-key' });
  const handler = createModelAuditionHandler({ env });
  const request = new Request('https://example.test/api/v1/flames/boxfire/audition/inkling-small', {
    method: 'POST',
    headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Borrow the coat.' }),
  });
  const response = await handler(request, { flame_id: 'boxfire', candidate_id: 'inkling-small' });
  assert.equal(response.status, 404);
});
