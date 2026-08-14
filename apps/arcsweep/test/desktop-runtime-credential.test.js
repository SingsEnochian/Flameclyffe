import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearConstellationRuntimeRouteCache,
  clearConstellationRuntimeToken,
  constellationRuntimeAuthorizationHeaders,
  hasConstellationRuntimeCredential,
  invokeConstellationRuntimeVoice,
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
  },
};

function response(data, ok = true, status = 200) {
  return { ok, status, async json() { return data; } };
}

test.afterEach(() => {
  clearConstellationRuntimeRouteCache();
  clearConstellationRuntimeToken();
  delete globalThis.window;
});

test('Electron may report credential readiness without exposing the secret to Arcsweep', async () => {
  globalThis.window = { electronAPI: { hasRuntimeToken: async () => true } };
  assert.equal(await hasConstellationRuntimeCredential(), true);
  assert.deepEqual(constellationRuntimeAuthorizationHeaders(), {});
  assert.equal('runtimeToken' in globalThis.window.electronAPI, false);
});

test('Electron credential allows model invocation while renderer sends no Bearer secret', async () => {
  globalThis.window = { electronAPI: { hasRuntimeToken: async () => true } };
  let chatRequest = null;
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'uial',
    message: 'presence check',
    fetchImpl: async (url, options = {}) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      chatRequest = { url: value, headers: options.headers, body: JSON.parse(options.body) };
      return response({
        profile_id: 'uial:fablevibes-v1',
        provider: 'ollama',
        model: 'uial:fablevibes-v1',
        source_model: 'tvall43/Qwen3.6-14B-A3B-FableVibes',
        runtime_verified: true,
        message: 'present',
        cited_sources: [],
      });
    },
  });
  assert.equal(chatRequest.url, '/api/v1/flames/uial/chat');
  assert.equal(chatRequest.headers.authorization, undefined);
  assert.equal(chatRequest.body.metadata.expected_profile_id, 'uial:fablevibes-v1');
  assert.equal(reply.status, 'replied');
  assert.equal(reply.runtimeVerified, true);
});

test('browser path without manual token or Electron credential remains offline-no-token', async () => {
  globalThis.window = { electronAPI: { hasRuntimeToken: async () => false } };
  let chatCalled = false;
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'uial',
    message: 'presence check',
    fetchImpl: async (url) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      chatCalled = true;
      return response({});
    },
  });
  assert.equal(reply.status, 'offline-no-token');
  assert.equal(chatCalled, false);
});

test('manual in-memory session token still takes precedence in browser/PWA mode', async () => {
  const { setConstellationRuntimeToken } = await import('../src/constellation-runtime-adapter.js');
  setConstellationRuntimeToken('session-secret');
  assert.equal(await hasConstellationRuntimeCredential(), true);
  assert.equal(constellationRuntimeAuthorizationHeaders().authorization, 'Bearer session-secret');
});
