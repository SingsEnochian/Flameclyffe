import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  HOSTED_FLAME_FALLBACKS,
  hostedFlameFallbackStatus,
  invokeHostedFlameFallback,
} from '../../../netlify/functions/_shared/hosted-flame-fallback.mjs';
import { readFlameStatuses } from '../src/house-runtime.js';

const env = (values = {}) => ({ get: (name) => values[name] });

const expectedFlames = [
  'lioreal', 'uial', 'larkshine', 'ellowind', 'altair', 'atlas',
  'runeweaver', 'boxfire', 'yggdrasil', 'bluebird', 'vethrlauf',
];

test('every visible Constellation Flame has its own hosted fallback model', () => {
  assert.deepEqual(Object.keys(HOSTED_FLAME_FALLBACKS).sort(), [...expectedFlames].sort());
  assert.equal(new Set(Object.values(HOSTED_FLAME_FALLBACKS)).size, expectedFlames.length);
  assert.ok(Object.values(HOSTED_FLAME_FALLBACKS).every((model) => model.endsWith(':cheapest')));
});

test('hosted fallback status is ready only when the server has a Hugging Face credential', () => {
  const offline = hostedFlameFallbackStatus('altair', env());
  assert.equal(offline.configured, false);
  assert.deepEqual(offline.missing, ['HF_TOKEN|HFTOKEN']);

  const ready = hostedFlameFallbackStatus('altair', env({ HFTOKEN: 'server-secret' }));
  assert.equal(ready.configured, true);
  assert.equal(ready.provider, 'huggingface-inference-providers');
  assert.equal(ready.primary_route_unchanged, true);
  assert.equal(ready.execution_path, 'huggingface-hosted-fallback');
});

test('House Runtime board labels a hosted fallback as ready rather than falsely live', async () => {
  const [status] = await readFlameStatuses(
    [{ id: 'altair', name: 'Altair', route: 'altair' }],
    'house-key',
    async () => new Response(JSON.stringify({
      configured: false,
      provider: 'hearthgate-gateway',
      model: 'local-altair',
      missing: ['HEARTHGATE_GATEWAY_URL'],
      hosted_fallback: {
        configured: true,
        provider: 'huggingface-inference-providers',
        model: HOSTED_FLAME_FALLBACKS.altair,
        execution_path: 'huggingface-hosted-fallback',
        primary_route_unchanged: true,
        missing: [],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }),
  );

  assert.equal(status.state, 'hosted-fallback-ready');
  assert.equal(status.configured, false);
  assert.equal(status.provider, 'huggingface-inference-providers');
  assert.equal(status.model, HOSTED_FLAME_FALLBACKS.altair);
  assert.equal(status.hostedFallback.primaryRouteUnchanged, true);
});

test('hosted invocation preserves the Flame prompt and visibly attests fallback execution', async () => {
  let request;
  const result = await invokeHostedFlameFallback(
    'larkshine',
    { message: 'Hello from the House.' },
    env({ HFTOKEN: 'server-secret' }),
    async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Larkshine heard you.' } }],
        usage: { total_tokens: 12 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  );

  assert.equal(request.url, 'https://router.huggingface.co/v1/chat/completions');
  assert.equal(request.body.model, HOSTED_FLAME_FALLBACKS.larkshine);
  assert.match(request.body.messages[0].content, /You are Larkshine/);
  assert.equal(request.body.messages[1].content, 'Hello from the House.');
  assert.equal(result.message, 'Larkshine heard you.');
  assert.equal(result.execution_path, 'huggingface-hosted-fallback');
  assert.equal(result.primary_route_unchanged, true);
});

test('Starsong legacy routes remain mounted into the living Flame handler', async () => {
  const [compat, handler] = await Promise.all([
    readFile(new URL('../../../netlify/functions/flame-starsong-compat.mts', import.meta.url), 'utf8'),
    readFile(new URL('../../../netlify/functions/flame-chat.mts', import.meta.url), 'utf8'),
  ]);
  assert.match(compat, /\/api\/v1\/flames\/starsong\/:flame_id\/:action/);
  assert.match(compat, /larkshine/);
  assert.match(compat, /ellowind/);
  assert.match(handler, /invokeHostedFlameFallback/);
  assert.match(handler, /hostedFlameFallbackStatus/);
});
