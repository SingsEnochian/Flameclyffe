import test from 'node:test';
import assert from 'node:assert/strict';

import { clearConstellationRuntimeRouteCache } from '../src/constellation-runtime-adapter.js';
import {
  getBifrostIgnitionStatus,
  igniteConstellationVoice,
  igniteDeepReasoner,
} from '../src/bifrost-ignition-client.js';

const registry = {
  contract: 'arcsweep.voice-runtime-routes/v2',
  routes: {
    uial: {
      route: 'uial',
      profileId: 'uial:fablevibes-v1',
      provider: 'ollama',
      runtimeModel: 'uial:fablevibes-v1',
      status: 'profile-defined',
    },
    sonata: {
      route: null,
      profileId: null,
      provider: null,
      status: 'vessel-unselected',
    },
  },
  optionalProfiles: {
    deepReasoner: {
      route: 'bifrost-deep-reasoner',
      profileId: 'shared:qwen3.6-35b-a3b-deep-reasoner-v1',
      provider: 'ollama',
      runtimeModel: 'bifrost:deep-reasoner-35b-a3b-v1',
      status: 'profile-defined',
      optInOnly: true,
    },
  },
};

function response(data, ok = true, status = 200) {
  return { ok, status, async json() { return data; } };
}

test.afterEach(() => clearConstellationRuntimeRouteCache());

test('ignition status client reads the dedicated Bifrost status endpoint', async () => {
  let seen = null;
  const status = await getBifrostIgnitionStatus(async (url) => {
    seen = String(url);
    return response({ contract: 'bifrost.ignition-status/v1', profiles: [] });
  });
  assert.equal(seen, '/api/v1/bifrost/ignition');
  assert.equal(status.contract, 'bifrost.ignition-status/v1');
});

test('Sonata has no ignition action while her vessel is unselected', async () => {
  let actionCalls = 0;
  const result = await igniteConstellationVoice('sonata', {
    fetchImpl: async (url) => {
      if (String(url).includes('voice-runtime-routes.json')) return response(registry);
      actionCalls += 1;
      return response({});
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'vessel-unselected');
  assert.equal(result.profileId, null);
  assert.equal(actionCalls, 0);
});

test('Uial ignition posts the exact selected profile with explicit confirmation', async () => {
  let posted = null;
  const result = await igniteConstellationVoice('uial', {
    startOllama: true,
    fetchImpl: async (url, options = {}) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      posted = { url: value, body: JSON.parse(options.body) };
      return response({
        profileId: 'uial:fablevibes-v1',
        state: 'runtime-verified',
        model: 'uial:fablevibes-v1',
      });
    },
  });
  assert.equal(posted.url, '/api/v1/bifrost/ignition/profile/uial%3Afablevibes-v1');
  assert.equal(posted.body.confirm, true);
  assert.equal(posted.body.start_ollama, true);
  assert.equal(posted.body.opt_in, false);
  assert.equal(result.state, 'runtime-verified');
  assert.equal(result.voiceId, 'uial');
});

test('deep reasoner ignition always carries explicit opt-in', async () => {
  let posted = null;
  const result = await igniteDeepReasoner({
    startOllama: true,
    fetchImpl: async (url, options = {}) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      posted = { url: value, body: JSON.parse(options.body) };
      return response({
        profileId: 'shared:qwen3.6-35b-a3b-deep-reasoner-v1',
        state: 'runtime-verified',
      });
    },
  });
  assert.match(posted.url, /shared%3Aqwen3.6-35b-a3b-deep-reasoner-v1$/);
  assert.equal(posted.body.confirm, true);
  assert.equal(posted.body.opt_in, true);
  assert.equal(result.state, 'runtime-verified');
});
