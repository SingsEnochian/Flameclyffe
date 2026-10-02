import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCrowFlameHandler } from '../../../api/_shared/crow-flame-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const route = fs.readFileSync(path.join(root, 'api/v1/flames/[flame_id]/[action].js'), 'utf8');

function env(values = {}) {
  const store = new Map(Object.entries({
    ARCSWEEP_RUNTIME_TOKEN: 'test-house-token',
    HF_TOKEN: 'test-hf-token',
    ...values,
  }));
  return { get(name) { return store.get(name); } };
}

function request(pathname, { method = 'GET', body } = {}) {
  return new Request(`https://example.test${pathname}`, {
    method,
    headers: {
      authorization: 'Bearer test-house-token',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('Vercel Flame router gives Crow a dedicated runtime seam', () => {
  assert.match(route, /createCrowFlameHandler/);
  assert.match(route, /flameId === 'crow'/);
  assert.match(route, /_shared\/crow-flame-runtime\.mjs/);
});

test('Crow status reports the runtime carrier without equating it to identity', async () => {
  const handler = createCrowFlameHandler({ env: env(), fetchImpl: async () => { throw new Error('unused'); } });
  const response = await handler(request('/api/v1/flames/crow/status'), { flame_id: 'crow', action: 'status' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.flame_id, 'crow');
  assert.equal(data.display_name, 'The Crow');
  assert.equal(data.configured, true);
  assert.equal(data.runtime_reachable, true);
  assert.match(data.identity_substrate, /agents\/crow/);
});

test('Crow chat uses bounded recent context and returns provider attestation', async () => {
  let outbound;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://router.huggingface.co/v1/chat/completions');
    outbound = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Crow online. Let us build.' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const handler = createCrowFlameHandler({ env: env(), fetchImpl });
  const context = Array.from({ length: 20 }, (_, index) => ({ speaker: index % 2 ? 'The Crow' : 'Rowan', text: `turn-${index}` }));
  const response = await handler(request('/api/v1/flames/crow/chat', {
    method: 'POST',
    body: { message: 'Hum with the House.', context },
  }), { flame_id: 'crow', action: 'chat' });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.flame_id, 'crow');
  assert.equal(data.runtime_verified, true);
  assert.equal(data.provider, 'huggingface-inference-providers');
  assert.equal(data.message, 'Crow online. Let us build.');
  assert.match(data.execution_path, /\/api\/v1\/flames\/crow\/chat/);

  assert.match(outbound.messages[0].content, /runtime is a carrier, not your identity/i);
  assert.match(outbound.messages[0].content, /Crow Trainer is a training role associated with you/i);
  assert.equal(outbound.messages.at(-1).content, 'Hum with the House.');
  assert.equal(outbound.messages.length, 14, 'system + 12 bounded context turns + current user turn');
  assert.equal(outbound.messages[1].content, 'turn-8');
});

test('Crow route remains behind the House authorization boundary', async () => {
  const handler = createCrowFlameHandler({ env: env(), fetchImpl: async () => { throw new Error('unused'); } });
  const response = await handler(new Request('https://example.test/api/v1/flames/crow/status'), { flame_id: 'crow', action: 'status' });
  assert.equal(response.status, 401);
});
