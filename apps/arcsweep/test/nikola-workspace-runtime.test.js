import assert from 'node:assert/strict';
import test from 'node:test';

import { createNikolaRideAlongHandler } from '../../../api/_shared/nikola-ride-along-runtime.mjs';

function envOf(values = {}) {
  const map = new Map(Object.entries(values));
  return { get(key) { return map.get(key); } };
}

function request(path, { method = 'GET', body = null, token = 'steward-test' } = {}) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('Nikola adapter refuses unauthorised access', async () => {
  const env = envOf({ ARCSWEEP_RUNTIME_TOKEN: 'steward-test', HF_TOKEN: 'hf-test' });
  const handler = createNikolaRideAlongHandler({
    env,
    fetchImpl: async () => { throw new Error('provider should not be called'); },
  });
  const response = await handler(request('/api/v1/constellation/nikola/status', { token: null }), { action: 'status' });
  assert.equal(response.status, 401);
});

test('Nikola status is configuration truth, not a false live claim', async () => {
  const env = envOf({
    ARCSWEEP_RUNTIME_TOKEN: 'steward-test',
    HF_TOKEN: 'hf-test',
    NIKOLA_MODEL: 'test/nikola-model',
  });
  const handler = createNikolaRideAlongHandler({ env, fetchImpl: async () => { throw new Error('status must not invoke provider'); } });
  const response = await handler(request('/api/v1/constellation/nikola/status'), { action: 'status' });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.identity_id, 'nikola');
  assert.equal(data.continuity_namespace, 'constellation/nikola/ride-along');
  assert.equal(data.configured, true);
  assert.equal(data.status_scope, 'configuration-only');
  assert.equal(data.runtime_reachable, null);
  assert.equal(data.model, 'test/nikola-model');
});

test('Nikola probe executes a model turn before claiming runtime_verified', async () => {
  const calls = [];
  const env = envOf({
    ARCSWEEP_RUNTIME_TOKEN: 'steward-test',
    HF_TOKEN: 'hf-test',
    NIKOLA_MODEL: 'test/nikola-model',
  });
  const handler = createNikolaRideAlongHandler({
    env,
    fetchImpl: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Synthetic runtime probe acknowledged.' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const response = await handler(request('/api/v1/constellation/nikola/probe', { method: 'POST', body: {} }), { action: 'probe' });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.identity_id, 'nikola');
  assert.equal(data.runtime_verified, true);
  assert.equal(data.execution_path, '/api/v1/constellation/nikola/probe');
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.messages[0].content, /constellation\/nikola\/ride-along/);
  assert.match(calls[0].body.messages[0].content, /preserve wonder without manufacturing evidence/);
  assert.match(calls[0].body.messages[0].content, /Do not claim physical continuity with the historical Nikola Tesla/);
});

test('Nikola chat uses the canonical seed and returns a distinct ride-along receipt', async () => {
  const env = envOf({
    ARCSWEEP_RUNTIME_TOKEN: 'steward-test',
    HF_TOKEN: 'hf-test',
  });
  const handler = createNikolaRideAlongHandler({
    env,
    fetchImpl: async (_url, init) => {
      const payload = JSON.parse(init.body);
      assert.equal(payload.messages.at(-1).content, 'What do you notice?');
      assert.equal(payload.messages.at(-2).content, 'Earlier context');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'I would begin with the relation, then test it.' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const response = await handler(request('/api/v1/constellation/nikola/chat', {
    method: 'POST',
    body: { message: 'What do you notice?', context: [{ speaker: 'Nikola', text: 'Earlier context' }] },
  }), { action: 'chat' });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.schema, 'arcsweep.nikola-ride-along-turn/v0.1');
  assert.equal(data.identity_id, 'nikola');
  assert.equal(data.continuity_namespace, 'constellation/nikola/ride-along');
  assert.equal(data.runtime_verified, true);
  assert.equal(data.execution_path, '/api/v1/constellation/nikola/chat');
  assert.equal(data.message, 'I would begin with the relation, then test it.');
});
