import assert from 'node:assert/strict';
import test from 'node:test';

import flameAuditionHandler from '../../../netlify/functions/flame-audition.mts';

const values = {
  ARCSWEEP_RUNTIME_TOKEN: 'house-key',
  HFTOKEN: 'hf-test-secret',
};

globalThis.Netlify = { env: { get: (name) => values[name] || null } };

test('Inkling web audition recognises HFTOKEN alias without Hearthgate', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://router.huggingface.co/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer hf-test-secret');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'thinkingmachines/Inkling-Small:baseten');
    assert.equal(body.messages.at(-1).content, 'Try the ridiculous trenchcoat.');
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'It has pockets.' } }],
      usage: { prompt_tokens: 10, completion_tokens: 4 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const request = new Request('https://example.test/api/v1/flames/larkshine/audition/inkling-small', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Try the ridiculous trenchcoat.', reasoning_effort: 'high' }),
    });
    const response = await flameAuditionHandler(request, { params: { flame_id: 'larkshine', candidate_id: 'inkling-small' } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.message, 'It has pockets.');
    assert.equal(data.execution_path, 'web-direct');
    assert.equal(data.credential_source, 'environment');
    assert.equal(data.primary_route_unchanged, true);
    assert.equal(data.visible_retry, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Inkling retries the same model with reasoning disabled when the provider returns reasoning-only output', async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    bodies.push(body);
    if (bodies.length === 1) {
      assert.equal(body.reasoning_effort, 'high');
      return new Response(JSON.stringify({
        choices: [{ message: { content: '' } }],
        usage: { completion_tokens: 24, completion_tokens_details: { reasoning_tokens: 22 } },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(body.model, 'thinkingmachines/Inkling-Small:baseten');
    assert.equal(body.reasoning_effort, 'none');
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'The trenchcoat is visible now.' } }],
      usage: { completion_tokens: 8, completion_tokens_details: { reasoning_tokens: 0 } },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const request = new Request('https://example.test/api/v1/flames/larkshine/audition/inkling-small', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Say something visible.', reasoning_effort: 'high' }),
    });
    const response = await flameAuditionHandler(request, { params: { flame_id: 'larkshine', candidate_id: 'inkling-small' } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.message, 'The trenchcoat is visible now.');
    assert.equal(data.reasoning_effort, 'none');
    assert.equal(data.visible_retry, 'reasoning-none');
    assert.equal(bodies.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Inkling refuses to report success when every completion is reasoning-only', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: '' } }],
    usage: { completion_tokens: 24, completion_tokens_details: { reasoning_tokens: 24 } },
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const request = new Request('https://example.test/api/v1/flames/larkshine/audition/inkling-small', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Say something visible.', reasoning_effort: 'high' }),
    });
    const response = await flameAuditionHandler(request, { params: { flame_id: 'larkshine', candidate_id: 'inkling-small' } });
    assert.equal(response.status, 502);
    const data = await response.json();
    assert.match(data.error, /no visible content/i);
    assert.equal(data.audition, true);
    assert.equal(data.primary_route_unchanged, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Inkling web audition status reports configured from HFTOKEN alias', async () => {
  const request = new Request('https://example.test/api/v1/flames/larkshine/audition/inkling-small', {
    headers: { authorization: 'Bearer house-key' },
  });
  const response = await flameAuditionHandler(request, { params: { flame_id: 'larkshine', candidate_id: 'inkling-small' } });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.configured, true);
  assert.equal(data.execution_path, 'web-direct');
  assert.equal(data.gateway_configured, null);
  assert.deepEqual(data.missing, []);
});
