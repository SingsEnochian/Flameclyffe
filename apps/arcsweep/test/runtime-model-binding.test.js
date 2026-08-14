import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearConstellationRuntimeRouteCache,
  clearConstellationRuntimeToken,
  constellationRuntimeRouteForVoice,
  invokeConstellationRuntimeVoice,
  setConstellationRuntimeToken,
} from '../src/constellation-runtime-adapter.js';

const registry = {
  contract: 'arcsweep.voice-runtime-routes/v2',
  routes: {
    uial: {
      route: 'uial',
      profileId: 'uial:fablevibes-v1',
      provider: 'ollama',
      runtimeModel: 'uial:fablevibes-v1',
      sourceModel: 'tvall43/Qwen3.6-14B-A3B-FableVibes',
      status: 'profile-defined',
    },
    box: {
      route: 'boxfire',
      profileId: 'box:qwen3-coder-30b-a3b-v1',
      provider: 'ollama',
      runtimeModel: 'box:qwen3-coder-30b-a3b-v1',
      sourceModel: 'huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated',
      status: 'profile-defined',
      legacyRuntimeId: 'boxfire',
    },
    vethraluf: {
      route: 'vethrlauf',
      profileId: 'vethraluf:deepseek-chat-existing-v1',
      provider: 'deepseek',
      runtimeModel: 'deepseek-chat',
      sourceModel: 'deepseek-chat',
      status: 'existing-runtime-binding',
      legacyRuntimeId: 'vethrlauf',
    },
    sonata: {
      route: null,
      profileId: null,
      status: 'vessel-unselected',
    },
  },
};

function response(value, { ok = true, status = 200 } = {}) {
  return { ok, status, async json() { return value; } };
}

function registryFetch(chatReply) {
  return async (input, options = {}) => {
    const url = String(input);
    if (url.includes('voice-runtime-routes.json')) return response(registry);
    if (url.includes('/api/v1/flames/uial/chat')) {
      const body = JSON.parse(options.body);
      assert.equal(body.metadata.expected_profile_id, 'uial:fablevibes-v1');
      return response(chatReply);
    }
    throw new Error(`Unexpected test fetch: ${url}`);
  };
}

test.afterEach(() => {
  clearConstellationRuntimeRouteCache();
  clearConstellationRuntimeToken();
});

test('canonical voice ids retain legacy route aliases without changing identity', async () => {
  const fetchImpl = async () => response(registry);
  const box = await constellationRuntimeRouteForVoice('box', fetchImpl);
  clearConstellationRuntimeRouteCache();
  const vethraluf = await constellationRuntimeRouteForVoice('vethraluf', fetchImpl);
  assert.equal(box.route, 'boxfire');
  assert.equal(box.voiceId, 'box');
  assert.equal(vethraluf.route, 'vethrlauf');
  assert.equal(vethraluf.voiceId, 'vethraluf');
});

test('Sonata remains vessel-unselected and receives no fallback route', async () => {
  const route = await constellationRuntimeRouteForVoice('sonata', async () => response(registry));
  assert.equal(route.available, false);
  assert.equal(route.status, 'vessel-unselected');
  assert.equal(route.route, null);
});

test('matching Bifrost profile attestation is accepted', async () => {
  setConstellationRuntimeToken('session-test-token');
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'uial',
    message: 'hello',
    fetchImpl: registryFetch({
      profile_id: 'uial:fablevibes-v1',
      provider: 'ollama',
      model: 'uial:fablevibes-v1',
      source_model: 'tvall43/Qwen3.6-14B-A3B-FableVibes',
      runtime_verified: true,
      message: 'present',
      cited_sources: [],
    }),
  });
  assert.equal(reply.status, 'replied');
  assert.equal(reply.profileId, 'uial:fablevibes-v1');
  assert.equal(reply.runtimeVerified, true);
});

test('wrong runtime profile is rejected before becoming a voice reply', async () => {
  setConstellationRuntimeToken('session-test-token');
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'uial',
    message: 'hello',
    fetchImpl: registryFetch({
      profile_id: 'lioreal:qwen3-14b-abliterated-v1',
      provider: 'ollama',
      model: 'lioreal:starwell-v1',
      source_model: 'mlabonne/Qwen3-14B-abliterated',
      runtime_verified: true,
      message: 'wrong vessel',
    }),
  });
  assert.equal(reply.status, 'runtime-mismatch');
  assert.match(reply.reason, /profile/i);
});

test('wrong source lineage is rejected even when profile label is forged', async () => {
  setConstellationRuntimeToken('session-test-token');
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'uial',
    message: 'hello',
    fetchImpl: registryFetch({
      profile_id: 'uial:fablevibes-v1',
      provider: 'ollama',
      model: 'uial:fablevibes-v1',
      source_model: 'some/other-model',
      runtime_verified: true,
      message: 'forged profile',
    }),
  });
  assert.equal(reply.status, 'runtime-mismatch');
  assert.match(reply.reason, /source/i);
});

test('missing runtime verification is rejected', async () => {
  setConstellationRuntimeToken('session-test-token');
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'uial',
    message: 'hello',
    fetchImpl: registryFetch({
      profile_id: 'uial:fablevibes-v1',
      provider: 'ollama',
      model: 'uial:fablevibes-v1',
      source_model: 'tvall43/Qwen3.6-14B-A3B-FableVibes',
      message: 'unattested',
    }),
  });
  assert.equal(reply.status, 'runtime-mismatch');
  assert.match(reply.reason, /attestation/i);
});
