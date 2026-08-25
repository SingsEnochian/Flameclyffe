import assert from 'node:assert/strict';
import test from 'node:test';

import flameAuditionHandler from '../../../netlify/functions/flame-audition.mts';

const values = {
  ARCSWEEP_RUNTIME_TOKEN: 'house-key',
  HFTOKEN: 'hf-test-secret',
  OPENROUTER_API_KEY: 'or-test-secret',
  OPENROUTER_HTTP_REFERER: 'https://flameclyffe.test',
  OPENROUTER_APP_TITLE: 'Flameclyffe Test',
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

test('Ox Alpha web audition fails closed before provider dispatch when data class is missing', async () => {
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async () => {
    providerCalls += 1;
    throw new Error('provider must not be called');
  };

  try {
    const request = new Request('https://example.test/api/v1/flames/boxfire/audition/ox-alpha', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Inspect this patch.' }),
    });
    const response = await flameAuditionHandler(request, { params: { flame_id: 'boxfire', candidate_id: 'ox-alpha' } });
    assert.equal(response.status, 403);
    const data = await response.json();
    assert.equal(data.code, 'CANDIDATE_DATA_POLICY');
    assert.equal(data.data_class, 'unknown');
    assert.equal(data.hearthfire_retrieval, false);
    assert.equal(providerCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Ox Alpha web audition uses OpenRouter directly only for explicitly public input', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer or-test-secret');
    assert.equal(options.headers['HTTP-Referer'], 'https://flameclyffe.test');
    assert.equal(options.headers['X-Title'], 'Flameclyffe Test');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'stealth/ox-alpha');
    assert.equal(body.max_tokens, 8192);
    assert.equal('reasoning_effort' in body, false);
    assert.match(body.messages.at(-1).content, /ARCSWEEP CONTEXT/);
    return new Response(JSON.stringify({
      id: 'gen_test_ox',
      choices: [{ message: { content: 'Patch analysis complete.' } }],
      usage: { prompt_tokens: 200, completion_tokens: 40 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const request = new Request('https://example.test/api/v1/flames/boxfire/audition/ox-alpha', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'Inspect this public patch.',
        context: { repository: 'SingsEnochian/Flameclyffe', visibility: 'public' },
        data_class: 'public',
      }),
    });
    const response = await flameAuditionHandler(request, { params: { flame_id: 'boxfire', candidate_id: 'ox-alpha' } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.message, 'Patch analysis complete.');
    assert.equal(data.provider, 'openrouter');
    assert.equal(data.execution_path, 'web-direct');
    assert.equal(data.data_class, 'public');
    assert.equal(data.hearthfire_retrieval, false);
    assert.equal(data.generation_id, 'gen_test_ox');
    assert.equal(data.primary_route_unchanged, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Ox Alpha hosted status advertises the guarded long-context envelope without exposing a credential', async () => {
  const request = new Request('https://example.test/api/v1/flames/boxfire/audition/ox-alpha', {
    headers: { authorization: 'Bearer house-key' },
  });
  const response = await flameAuditionHandler(request, { params: { flame_id: 'boxfire', candidate_id: 'ox-alpha' } });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.configured, true);
  assert.equal(data.api_key_env, 'OPENROUTER_API_KEY');
  assert.equal(data.api_key_present, true);
  assert.equal(data.max_input_chars, 1_000_000);
  assert.equal(data.hearthfire_retrieval, false);
  assert.equal(data.data_policy.classification, 'public-or-sanitised-only');
  assert.equal(JSON.stringify(data).includes('or-test-secret'), false);
});
