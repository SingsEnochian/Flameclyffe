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
