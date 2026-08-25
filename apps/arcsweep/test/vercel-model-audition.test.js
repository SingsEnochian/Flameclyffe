import assert from 'node:assert/strict';
import test from 'node:test';

import vercelAuditionEndpoint from '../../../api/v1/flames/[flame_id]/audition/[candidate_id].js';

function restoreEnv(previous) {
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

test('Vercel Ox Alpha route resolves path params and preserves the privacy gate', async () => {
  const names = ['ARCSWEEP_RUNTIME_TOKEN', 'OPENROUTER_API_KEY', 'OPENROUTER_HTTP_REFERER', 'OPENROUTER_APP_TITLE'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.ARCSWEEP_RUNTIME_TOKEN = 'house-key';
  process.env.OPENROUTER_API_KEY = 'or-vercel-test-secret';
  process.env.OPENROUTER_HTTP_REFERER = 'https://flameclyffe.vercel.app';
  process.env.OPENROUTER_APP_TITLE = 'Flameclyffe Vercel Test';

  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async (url, options) => {
    providerCalls += 1;
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer or-vercel-test-secret');
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'stealth/ox-alpha');
    return new Response(JSON.stringify({
      id: 'gen_vercel_ox',
      choices: [{ message: { content: 'Hosted route reached Ox.' } }],
      usage: { prompt_tokens: 80, completion_tokens: 12 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const blocked = new Request('https://flameclyffe.vercel.app/api/v1/flames/boxfire/audition/ox-alpha', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Unclassified request.' }),
    });
    const blockedResponse = await vercelAuditionEndpoint.fetch(blocked);
    assert.equal(blockedResponse.status, 403);
    assert.equal(providerCalls, 0);

    const allowed = new Request('https://flameclyffe.vercel.app/api/v1/flames/boxfire/audition/ox-alpha', {
      method: 'POST',
      headers: { authorization: 'Bearer house-key', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Inspect this public patch.', data_class: 'public' }),
    });
    const allowedResponse = await vercelAuditionEndpoint.fetch(allowed);
    assert.equal(allowedResponse.status, 200);
    const data = await allowedResponse.json();
    assert.equal(providerCalls, 1);
    assert.equal(data.candidate_id, 'ox-alpha');
    assert.equal(data.provider, 'openrouter');
    assert.equal(data.data_class, 'public');
    assert.equal(data.hearthfire_retrieval, false);
    assert.equal(data.generation_id, 'gen_vercel_ox');
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(previous);
  }
});

test('Vercel Ox Alpha GET reports hosted configuration without returning the secret', async () => {
  const names = ['ARCSWEEP_RUNTIME_TOKEN', 'OPENROUTER_API_KEY'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.ARCSWEEP_RUNTIME_TOKEN = 'house-key';
  process.env.OPENROUTER_API_KEY = 'or-vercel-test-secret';

  try {
    const request = new Request('https://flameclyffe.vercel.app/api/v1/flames/boxfire/audition/ox-alpha', {
      headers: { authorization: 'Bearer house-key' },
    });
    const response = await vercelAuditionEndpoint.fetch(request);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.configured, true);
    assert.equal(data.backend, 'openrouter');
    assert.equal(data.max_input_chars, 1_000_000);
    assert.equal(data.hearthfire_retrieval, false);
    assert.equal(JSON.stringify(data).includes('or-vercel-test-secret'), false);
  } finally {
    restoreEnv(previous);
  }
});
