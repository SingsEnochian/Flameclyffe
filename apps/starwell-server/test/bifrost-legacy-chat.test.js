'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveLegacyMember } = require('../bifrost/legacy-member-map');
const { legacyModelStatus } = require('../bifrost/legacy-model-status');
const {
  stripHtml,
  normaliseContext,
  proxyLegacyMemberChat,
} = require('../bifrost/legacy-chat-adapter');

function response(data, ok = true, status = 200) {
  return { ok, status, async json() { return data; } };
}

test('legacy Box, Boxxy and Boxfire all resolve to the same authoritative Flame route', () => {
  for (const ref of ['Box', 'Boxxy', 'Boxfire']) {
    const resolved = resolveLegacyMember(ref);
    assert.equal(resolved.flameId, 'boxfire');
    assert.equal(resolved.canonicalVoiceId, 'box');
    assert.equal(resolved.profileId, 'box:qwen3-coder-30b-a3b-v1');
    assert.equal(resolved.identity.identityName, 'Boxfire');
  }
});

test('legacy Ellowind and Larkshine resolve to separate Flame routes and profiles', () => {
  const ellowind = resolveLegacyMember('Ellowind');
  const larkshine = resolveLegacyMember('Larkshine');
  assert.equal(ellowind.flameId, 'ellowind');
  assert.equal(larkshine.flameId, 'larkshine');
  assert.notEqual(ellowind.profileId, larkshine.profileId);
  assert.notEqual(ellowind.model, larkshine.model);
});

test('legacy model status derives current assignments from Bifrost instead of MEMBER_CONFIGS', async () => {
  const status = await legacyModelStatus({
    fetchImpl: async (url) => {
      if (String(url).endsWith('/api/tags')) {
        return response({ models: [
          { name: 'lioreal:starwell-v1' },
          { name: 'uial:fablevibes-v1' },
          { name: 'box:qwen3-coder-30b-a3b-v1' },
          { name: 'ellowind:qwen3-vl-8b-v1' },
          { name: 'larkshine:qwen3-vl-8b-v1' },
        ] });
      }
      throw new Error(`unexpected status URL ${url}`);
    },
  });
  assert.equal(status.rules.legacyMemberConfigIgnored, true);
  assert.equal(status.models.lioreal.model, 'lioreal:starwell-v1');
  assert.equal(status.models.uial.model, 'uial:fablevibes-v1');
  assert.equal(status.models.boxfire.model, 'box:qwen3-coder-30b-a3b-v1');
  assert.equal(status.models.ellowind.model, 'ellowind:qwen3-vl-8b-v1');
  assert.equal(status.models.larkshine.model, 'larkshine:qwen3-vl-8b-v1');
  assert.notEqual(status.models.ellowind.model, status.models.larkshine.model);
  const serialised = JSON.stringify(status).toLowerCase();
  assert.doesNotMatch(serialised, /gpt-4o/);
  assert.doesNotMatch(serialised, /claude-3-5-sonnet/);
});

test('legacy adapter contains no provider selection and forwards expected profile to Flame route', async () => {
  let request = null;
  const result = await proxyLegacyMemberChat({
    memberId: 'Lioreal',
    prompt: '<p>Tell me what you notice.</p>',
    context: [{ member: 'Rowan', html: '<strong>Context</strong> here.' }],
    authorization: 'Bearer house-token',
    env: { ARCSWEEP_RUNTIME_TOKEN: 'house-token', PORT: '3841' },
    fetchImpl: async (url, options = {}) => {
      request = { url: String(url), headers: options.headers, body: JSON.parse(options.body) };
      return response({
        message: 'I notice the threshold.',
        profile_id: 'lioreal:qwen3-14b-abliterated-v1',
        provider: 'ollama',
        model: 'lioreal:starwell-v1',
        source_model: 'mlabonne/Qwen3-14B-abliterated',
        runtime_verified: true,
        cited_sources: ['source-1'],
      });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(request.url, 'http://127.0.0.1:3841/api/v1/flames/lioreal/chat');
  assert.equal(request.headers.authorization, 'Bearer house-token');
  assert.equal(request.body.metadata.expected_profile_id, 'lioreal:qwen3-14b-abliterated-v1');
  assert.equal(request.body.message, 'Tell me what you notice.');
  assert.equal(request.body.context[0].text, 'Context here.');
  assert.equal(result.body.runtimeVerified, true);
  assert.equal(result.body.model, 'lioreal:starwell-v1');
});

test('legacy adapter refuses missing or invalid House runtime token before any model call', async () => {
  let called = false;
  const missing = await proxyLegacyMemberChat({
    memberId: 'Uial',
    prompt: 'hello',
    env: {},
    fetchImpl: async () => { called = true; return response({}); },
  });
  assert.equal(missing.status, 503);
  assert.equal(called, false);

  const invalid = await proxyLegacyMemberChat({
    memberId: 'Uial',
    prompt: 'hello',
    authorization: 'Bearer wrong',
    env: { ARCSWEEP_RUNTIME_TOKEN: 'right' },
    fetchImpl: async () => { called = true; return response({}); },
  });
  assert.equal(invalid.status, 401);
  assert.equal(called, false);
});

test('unknown legacy member receives no fallback model or identity', async () => {
  let called = false;
  const result = await proxyLegacyMemberChat({
    memberId: 'Sonata',
    prompt: 'hello',
    authorization: 'Bearer house-token',
    env: { ARCSWEEP_RUNTIME_TOKEN: 'house-token' },
    fetchImpl: async () => { called = true; return response({}); },
  });
  assert.equal(result.status, 400);
  assert.equal(called, false);
  assert.match(result.body.error, /No canonical Bifröst route/);
});

test('legacy context stripping keeps content but drops markup', () => {
  assert.equal(stripHtml('<p>Hello <em>there</em>.</p>'), 'Hello there .');
  const context = normaliseContext([{ speaker: 'A', html: '<b>B</b>' }]);
  assert.deepEqual(context, [{ speaker: 'A', text: 'B' }]);
});
