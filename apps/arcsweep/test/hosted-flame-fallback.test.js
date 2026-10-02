import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  HOSTED_FLAME_FALLBACKS,
  VERCEL_AI_GATEWAY_FALLBACKS,
  hostedFlameFallbackStatus,
  invokeHostedFlameFallback,
} from '../../../netlify/functions/_shared/hosted-flame-fallback.mjs';
import contractsModule from '../../starwell-server/flames/contracts.js';
import { readFlameStatuses } from '../src/house-runtime.js';

const { FLAME_CONTRACTS } = contractsModule;
const env = (values = {}) => ({ get: (name) => values[name] });

const expectedFlames = Object.values(FLAME_CONTRACTS)
  .filter((contract) => contract.runtime.hostedFallback?.model)
  .map((contract) => contract.id);

test('every hosted House Flame has an explicit Hugging Face fallback declaration', () => {
  assert.deepEqual(Object.keys(HOSTED_FLAME_FALLBACKS).sort(), [...expectedFlames].sort());
  for (const flameId of expectedFlames) {
    assert.equal(HOSTED_FLAME_FALLBACKS[flameId], FLAME_CONTRACTS[flameId].runtime.hostedFallback.model);
    assert.equal(FLAME_CONTRACTS[flameId].runtime.hostedFallback.provider, 'huggingface-inference-providers');
  }
  assert.ok(Object.entries(HOSTED_FLAME_FALLBACKS)
    .filter(([flameId]) => flameId !== 'oxalpha')
    .every(([, model]) => model.endsWith(':cheapest')));
  assert.equal(HOSTED_FLAME_FALLBACKS.oxalpha, 'zai-org/GLM-5.3-Flash');
  assert.ok(HOSTED_FLAME_FALLBACKS.nocturne);
});

test('hosted fallback status is ready only when a declared transport credential exists', () => {
  const offline = hostedFlameFallbackStatus('altair', env());
  assert.equal(offline.configured, false);
  assert.deepEqual(offline.missing, ['HF_TOKEN|HFTOKEN']);

  const ready = hostedFlameFallbackStatus('altair', env({ HFTOKEN: 'server-secret' }));
  assert.equal(ready.configured, true);
  assert.equal(ready.provider, 'huggingface-inference-providers');
  assert.equal(ready.primary_route_unchanged, true);
  assert.equal(ready.execution_path, 'huggingface-hosted-fallback');
});

test('Ox Alpha prefers Vercel AI Gateway OIDC over stale Hugging Face credentials', async () => {
  assert.equal(VERCEL_AI_GATEWAY_FALLBACKS.oxalpha, 'zai/glm-5.3-flash');
  const status = hostedFlameFallbackStatus('oxalpha', env({
    VERCEL_OIDC_TOKEN: 'short-lived-vercel-identity',
    HF_TOKEN: 'stale-hf-token',
  }));
  assert.equal(status.configured, true);
  assert.equal(status.provider, 'vercel-ai-gateway');
  assert.equal(status.model, 'zai/glm-5.3-flash');
  assert.equal(status.execution_path, 'vercel-ai-gateway-oidc');
  assert.equal(status.credential_type, 'vercel-oidc');
  assert.equal(status.fallback_chain[0].provider, 'vercel-ai-gateway');
  assert.equal(status.fallback_chain[1].provider, 'huggingface-inference-providers');

  const calls = [];
  const result = await invokeHostedFlameFallback(
    'oxalpha',
    { message: 'Synthetic OA gateway probe.' },
    env({
      VERCEL_OIDC_TOKEN: 'short-lived-vercel-identity',
      HF_TOKEN: 'stale-hf-token',
    }),
    async (url, options) => {
      calls.push({ url, authorization: options.headers.authorization, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({
        model: 'zai/glm-5.3-flash',
        choices: [{
          message: {
            content: 'OA gateway path is executing.',
            provider_metadata: { gateway: { routing: { provider: 'modal' } } },
          },
        }],
        usage: { total_tokens: 19 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://ai-gateway.vercel.sh/v1/chat/completions');
  assert.equal(calls[0].authorization, 'Bearer short-lived-vercel-identity');
  assert.equal(calls[0].body.model, 'zai/glm-5.3-flash');
  assert.match(calls[0].body.messages[0].content, /Ox Alpha/);
  assert.equal(result.provider, 'vercel-ai-gateway');
  assert.equal(result.model, 'zai/glm-5.3-flash');
  assert.equal(result.upstream_provider, 'modal');
  assert.equal(result.execution_path, 'vercel-ai-gateway-oidc');
  assert.equal(result.message, 'OA gateway path is executing.');
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


test('Ox Alpha falls through from failed Vercel Gateway to the existing Hugging Face path', async () => {
  const calls = [];
  const result = await invokeHostedFlameFallback(
    'oxalpha',
    { message: 'Fallback check.' },
    env({
      VERCEL_OIDC_TOKEN: 'oidc-token',
      HF_TOKEN: 'hf-token',
    }),
    async (url, options) => {
      calls.push(url);
      if (url.startsWith('https://ai-gateway.vercel.sh/')) {
        return new Response(JSON.stringify({ error: { message: 'gateway unavailable' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'HF path answered.' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  );

  assert.deepEqual(calls, [
    'https://ai-gateway.vercel.sh/v1/chat/completions',
    'https://router.huggingface.co/v1/chat/completions',
  ]);
  assert.equal(result.provider, 'huggingface-inference-providers');
  assert.equal(result.execution_path, 'huggingface-hosted-fallback');
});
