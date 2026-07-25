'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AtomicChatError,
  createAtomicChatClient,
  normalizeBaseUrl,
} = require('../providers/atomic-chat');
const { sanitizeMessages } = require('../routes/atomic-engine.routes');

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('normalizes the default Atomic Chat endpoint to /v1', () => {
  assert.equal(normalizeBaseUrl('http://127.0.0.1:1337'), 'http://127.0.0.1:1337/v1');
  assert.equal(normalizeBaseUrl('http://localhost:1337/v1/'), 'http://localhost:1337/v1');
});

test('rejects non-loopback endpoints unless LAN access is explicit', () => {
  assert.throws(
    () => normalizeBaseUrl('http://192.168.1.20:1337/v1'),
    (error) => error instanceof AtomicChatError && error.code === 'ATOMIC_CHAT_NON_LOOPBACK_FORBIDDEN',
  );
  assert.equal(
    normalizeBaseUrl('http://192.168.1.20:1337/v1', true),
    'http://192.168.1.20:1337/v1',
  );
});

test('discovers OpenAI-compatible models without requiring an API key', async () => {
  let observedUrl = '';
  let observedAuthorization = null;
  const client = createAtomicChatClient({
    baseUrl: 'http://127.0.0.1:1337/v1',
    fetchImpl: async (url, init) => {
      observedUrl = url;
      observedAuthorization = new Headers(init.headers).get('authorization');
      return jsonResponse({
        object: 'list',
        data: [
          { id: 'local/qwen', owned_by: 'atomic' },
          { id: 'local/gemma', owned_by: 'atomic' },
        ],
      });
    },
  });

  const models = await client.listModels();
  assert.equal(observedUrl, 'http://127.0.0.1:1337/v1/models');
  assert.equal(observedAuthorization, null);
  assert.deepEqual(models, [
    { id: 'local/qwen', ownedBy: 'atomic', object: 'model' },
    { id: 'local/gemma', ownedBy: 'atomic', object: 'model' },
  ]);
});

test('sends a bounded non-streaming chat completion request', async () => {
  let observedBody;
  const client = createAtomicChatClient({
    baseUrl: 'http://127.0.0.1:1337/v1',
    fetchImpl: async (_url, init) => {
      observedBody = JSON.parse(init.body);
      return jsonResponse({
        id: 'chatcmpl-local',
        model: 'local/qwen',
        choices: [
          {
            finish_reason: 'stop',
            message: { role: 'assistant', content: 'Seldrin clear.' },
          },
        ],
        usage: { prompt_tokens: 9, completion_tokens: 3, total_tokens: 12 },
      });
    },
  });

  const result = await client.chat({
    model: 'local/qwen',
    messages: [{ role: 'user', content: 'Status?' }],
    maxTokens: 50000,
    temperature: 4,
  });

  assert.equal(observedBody.stream, false);
  assert.equal(observedBody.max_tokens, 32768);
  assert.equal(observedBody.temperature, 2);
  assert.equal(result.text, 'Seldrin clear.');
  assert.equal(result.finishReason, 'stop');
});

test('health reports a quiet structured failure rather than throwing', async () => {
  const client = createAtomicChatClient({
    baseUrl: 'http://127.0.0.1:1337/v1',
    fetchImpl: async () => {
      throw Object.assign(new Error('connection refused'), { name: 'TypeError' });
    },
  });

  const status = await client.health();
  assert.equal(status.ok, false);
  assert.equal(status.error.code, 'ATOMIC_CHAT_UNREACHABLE');
  assert.equal(status.models.length, 0);
});

test('route message boundary rejects empty and excessive input', () => {
  assert.throws(() => sanitizeMessages([]), /non-empty array/);
  assert.throws(
    () => sanitizeMessages([{ role: 'user', content: 'x'.repeat(100001) }]),
    /exceeds 100000 characters/,
  );
});
