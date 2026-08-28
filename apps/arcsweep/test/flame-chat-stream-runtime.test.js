import test from 'node:test';
import assert from 'node:assert/strict';

import { createFlameChatStreamHandler, normaliseFlameConversationContext, providerMessages } from '../../../netlify/functions/_shared/flame-chat-stream-runtime.mjs';
import manifestsModule from '../../starwell-server/flames/manifests.js';

const { FLAMES } = manifestsModule;

function env(values = {}) {
  return { get(name) { return values[name]; } };
}

function sseResponse(chunks) {
  return new Response(chunks.join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

test('structured House history remains provider message context rather than prompt smuggling', () => {
  const context = normaliseFlameConversationContext([
    { speaker: 'Rowan', text: 'First.' },
    { speaker: 'Caladnaur Lioreal', text: 'Second.' },
  ]);
  const messages = providerMessages(FLAMES.lioreal, 'Third.', context);
  assert.equal(messages[0].role, 'system');
  assert.deepEqual(messages.slice(1).map((item) => item.role), ['user', 'assistant', 'user']);
  assert.match(messages[1].content, /\[Rowan\]\nFirst\./);
  assert.equal(messages.at(-1).content, 'Third.');
});

test('hosted fallback streams started, token deltas, and completion through one SSE contract', async () => {
  let providerBody = null;
  const fetchImpl = async (_url, options) => {
    providerBody = JSON.parse(options.body);
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
  };
  const handler = createFlameChatStreamHandler({
    env: env({ ARCSWEEP_RUNTIME_TOKEN: 'house', HFTOKEN: 'hf-token' }),
    fetchImpl,
    clock: () => '2026-08-28T06:30:00.000Z',
  });
  const request = new Request('https://example.test/api/v1/flames/lioreal/chat', {
    method: 'POST',
    headers: { authorization: 'Bearer house', 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({ message: 'Hello?', context: [{ speaker: 'Rowan', text: 'Earlier.' }], session_id: 'stream-test' }),
  });
  const response = await handler(request, { flame_id: 'lioreal', action: 'chat' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const body = await response.text();
  assert.match(body, /event: started/);
  assert.match(body, /event: delta/);
  assert.match(body, /"text":"Hel"/);
  assert.match(body, /"text":"lo"/);
  assert.match(body, /event: completed/);
  assert.match(body, /"message":"Hello"/);
  assert.equal(providerBody.stream, true);
  assert.equal(providerBody.messages.at(-1).content, 'Hello?');
  assert.ok(providerBody.messages.some((item) => /Earlier\./.test(item.content)));
});
