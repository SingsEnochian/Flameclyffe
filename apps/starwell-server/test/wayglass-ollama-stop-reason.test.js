'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { callOllama } = require('../wayglass/router');

function route() {
  return { endpoint: () => 'http://127.0.0.1:11434/api/chat', model: () => 'synthetic-orion' };
}

function fakeTransport(body, captured) {
  return async (_url, options) => {
    captured.push(JSON.parse(options.body));
    return { ok: true, json: async () => body };
  };
}

test('Ollama length stop remains distinct from an unfinished Wyrdrune draft', async () => {
  const requests = [];
  const result = await callOllama(route(), { input: 'Synthetic WTL test only' }, null,
    fakeTransport({ message: { content: 'ᚹᛏᛚ { open', thinking: '' }, done_reason: 'length',
      prompt_eval_count: 31, eval_count: 1400 }, requests));
  assert.equal(result.output, 'ᚹᛏᛚ { open');
  assert.equal(result.stop_reason, 'length');
  assert.deepEqual(result.usage, { prompt_tokens: 31, completion_tokens: 1400 });
  assert.equal(requests[0].options.num_predict, 1400);
  assert.equal(requests[0].stream, false);
});

test('normal completion does not silently rewrite incomplete-looking text', async () => {
  const requests = [];
  const result = await callOllama(route(), { input: 'Synthetic test', max_output_tokens: 3200 }, null,
    fakeTransport({ message: { content: 'WTL {', thinking: 'private synthetic thought' },
      done_reason: 'stop', eval_count: 9 }, requests));
  assert.equal(result.output, 'WTL {');
  assert.equal(result.stop_reason, 'stop');
  assert.equal(requests[0].options.num_predict, 3200);
  assert.equal(result.usage.prompt_tokens, null);
});

test('absent or nonstring provider stop reason is unknown, not a fabricated stop', async () => {
  for (const done_reason of [undefined, null, 42]) {
    const response = { message: { content: 'synthetic partial' }, done_reason };
    const result = await callOllama(route(), { input: 'Synthetic' }, null, fakeTransport(response, []));
    assert.equal(result.stop_reason, null);
  }
});

test('provider error fails closed without manufacturing completion provenance', async () => {
  await assert.rejects(
    callOllama(route(), { input: 'Synthetic' }, null, async () => ({
      ok: false, status: 503, json: async () => ({ error: 'provider offline' }),
    })),
    /provider offline/,
  );
});
