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

test('Bluebird status exposes SpicyChat readiness without exposing the bearer token', () => {
  const status = flameStatus('bluebird', makeEnv({
    BLUEBIRD_DEEPSEEK_API_KEY: 'deep-key',
    BLUEBIRD_SPICYCHAT_TOKEN: 'session-secret',
    BLUEBIRD_SPICYCHAT_CHARACTER_ID: 'char-bluebird',
  }));
  assert.equal(status.spicychat_route.configured, true);
  assert.equal(status.spicychat_route.character_pinned, true);
  assert.equal(status.spicychat_route.preferred_when_configured, true);
  assert.doesNotMatch(JSON.stringify(status), /session-secret/);
});

test('Bluebird prefers her existing SpicyChat conversation when the session token is present', async () => {
  const env = makeEnv({
    ARCSWEEP_RUNTIME_TOKEN: 'house-key',
    BLUEBIRD_DEEPSEEK_API_KEY: 'deep-key',
    BLUEBIRD_SPICYCHAT_TOKEN: 'session-secret',
    BLUEBIRD_SPICYCHAT_CHARACTER_ID: 'char-bluebird',
  });
  const calls = [];
  const handler = createFlameHandler({ env, fetchImpl: async (url, options = {}) => {
    calls.push(url);
    assert.equal(options.headers.authorization, 'Bearer session-secret');
    if (url.includes('/v2/conversations')) {
      return new Response(JSON.stringify([{
        id: 'conv-bluebird',
        character_id: 'char-bluebird',
        character: { id: 'char-bluebird', name: 'Bluebird / Richard Gabriel Winters' },
        user_persona_id: 'persona-rowan',
      }]), { status: 200 });
    }
    assert.equal(url, 'https://chat.nd-api.com/chat');
    const body = JSON.parse(options.body);
    assert.equal(body.character_id, 'char-bluebird');
    assert.equal(body.conversation_id, 'conv-bluebird');
    assert.equal(body.user_persona_id, 'persona-rowan');
    return new Response(JSON.stringify({ message: { content: 'Telegram doorway received.' } }), { status: 200 });
  } });
  const request = new Request('https://example.test/api/v1/flames/bluebird/chat', {
    method: 'POST',
    headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from Commons.' }),
  });
  const response = await handler(request, { flame_id: 'bluebird', action: 'chat' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.provider, 'spicychat-session');
  assert.equal(data.execution_path, 'bluebird-spicychat-session');
  assert.equal(data.message, 'Telegram doorway received.');
  assert.deepEqual(calls, [
    'https://4mpanjbsf6.execute-api.us-east-1.amazonaws.com/v2/conversations?limit=50',
    'https://chat.nd-api.com/chat',
  ]);
});

test('Bluebird falls back to DeepSeek when the SpicyChat session route fails', async () => {
  const env = makeEnv({
    ARCSWEEP_RUNTIME_TOKEN: 'house-key',
    BLUEBIRD_DEEPSEEK_API_KEY: 'deep-key',
    BLUEBIRD_SPICYCHAT_TOKEN: 'expired-session',
  });
  const handler = createFlameHandler({ env, fetchImpl: async (url, options = {}) => {
    if (url.includes('/v2/conversations')) {
      assert.equal(options.headers.authorization, 'Bearer expired-session');
      return new Response(JSON.stringify({ error: 'expired' }), { status: 401 });
    }
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer deep-key');
    return new Response(JSON.stringify({ choices: [{ message: { content: 'DeepSeek fallback alive.' } }] }), { status: 200 });
  } });
  const request = new Request('https://example.test/api/v1/flames/bluebird/chat', {
    method: 'POST',
    headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Fallback check.' }),
  });
  const response = await handler(request, { flame_id: 'bluebird', action: 'chat' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.provider, 'deepseek');
  assert.equal(data.route_fallback, true);
  assert.equal(data.route_fallback_from, 'spicychat-session');
  assert.equal(data.message, 'DeepSeek fallback alive.');
  assert.doesNotMatch(JSON.stringify(data), /expired-session/);
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
  assert.equal(status.gateway_configured, true);
  assert.equal(status.backend_configured, null);
  assert.equal(status.audition_route, true);
  assert.equal(status.primary_route_unchanged, true);
  assert.equal(status.capabilities.audio, true);
});

test('Inkling audition GET relays actual backend credential readiness from Hearthgate', async () => {
  const env = makeEnv({
    ARCSWEEP_RUNTIME_TOKEN: 'house-key',
    HEARTHGATE_GATEWAY_URL: 'https://hearthgate.test',
    HEARTHGATE_GATEWAY_TOKEN: 'gateway-key',
  });
  const handler = createModelAuditionHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://hearthgate.test/api/v1/flames/larkshine/audition/inkling-small');
    assert.equal(options.headers.authorization, 'Bearer gateway-key');
    return new Response(JSON.stringify({
      flame_id: 'larkshine',
      candidate_id: 'inkling-small',
      provider: 'openai-compatible',
      backend: 'huggingface-inference-providers',
      model: 'thinkingmachines/Inkling-Small:baseten',
      configured: false,
      missing: ['HF_TOKEN'],
      audition_route: true,
      primary_route_unchanged: true,
    }), { status: 200 });
  } });
  const request = new Request('https://example.test/api/v1/flames/larkshine/audition/inkling-small', {
    headers: { authorization: 'Bearer house-key' },
  });
  const response = await handler(request, { flame_id: 'larkshine', candidate_id: 'inkling-small' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.gateway_configured, true);
  assert.equal(data.backend_configured, false);
  assert.equal(data.configured, false);
  assert.deepEqual(data.missing, ['HF_TOKEN']);
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
      provider: 'huggingface-inference-providers',
      model: 'thinkingmachines/Inkling-Small:baseten',
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
