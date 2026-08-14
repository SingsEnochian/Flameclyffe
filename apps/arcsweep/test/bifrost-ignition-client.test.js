import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearConstellationRuntimeRouteCache,
  clearConstellationRuntimeToken,
  setConstellationRuntimeToken,
} from '../src/constellation-runtime-adapter.js';
import {
  getBifrostIgnitionStatus,
  igniteConstellationVoice,
  igniteDeepReasoner,
  materializeConstellationVoiceAlias,
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
    ellowind: {
      route: 'ellowind',
      profileId: 'ellowind:qwen3-vl-8b-v1',
      provider: 'ollama',
      runtimeModel: 'ellowind:qwen3-vl-8b-v1',
      status: 'profile-defined',
    },
    larkshine: {
      route: 'larkshine',
      profileId: 'larkshine:qwen3-vl-8b-v1',
      provider: 'ollama',
      runtimeModel: 'larkshine:qwen3-vl-8b-v1',
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

test.afterEach(() => {
  clearConstellationRuntimeRouteCache();
  clearConstellationRuntimeToken();
});

test('ignition status client remains read-only and does not require the runtime token', async () => {
  let seen = null;
  let optionsSeen = null;
  const status = await getBifrostIgnitionStatus(async (url, options = {}) => {
    seen = String(url);
    optionsSeen = options;
    return response({ contract: 'bifrost.ignition-status/v1', profiles: [] });
  });
  assert.equal(seen, '/api/v1/bifrost/ignition');
  assert.equal(status.contract, 'bifrost.ignition-status/v1');
  assert.equal(optionsSeen.headers, undefined);
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

test('Uial ignition posts exact profile, confirmation and in-memory House token', async () => {
  setConstellationRuntimeToken('house-test-token');
  let posted = null;
  const result = await igniteConstellationVoice('uial', {
    startOllama: true,
    fetchImpl: async (url, options = {}) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      posted = { url: value, body: JSON.parse(options.body), headers: options.headers };
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
  assert.equal(posted.headers.authorization, 'Bearer house-test-token');
  assert.equal(result.state, 'runtime-verified');
  assert.equal(result.voiceId, 'uial');
});

test('Ellowind alias repair posts only Ellowind profile with House token and never invokes Larkshine', async () => {
  setConstellationRuntimeToken('house-test-token');
  const posts = [];
  const result = await materializeConstellationVoiceAlias('ellowind', {
    fetchImpl: async (url, options = {}) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      posts.push({ url: value, method: options.method, body: JSON.parse(options.body), headers: options.headers });
      return response({
        contract: 'bifrost.alias-materialization-receipt/v1',
        profileId: 'ellowind:qwen3-vl-8b-v1',
        state: 'alias-created',
        runtimeAlias: 'ellowind:qwen3-vl-8b-v1',
        rules: { downloadsModels: false, selectedIdentityOnly: true },
      });
    },
  });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, '/api/v1/bifrost/ignition/profile/ellowind%3Aqwen3-vl-8b-v1/materialize-alias');
  assert.equal(posts[0].method, 'POST');
  assert.equal(posts[0].body.confirm, true);
  assert.equal(posts[0].body.opt_in, false);
  assert.equal(posts[0].headers.authorization, 'Bearer house-test-token');
  assert.doesNotMatch(posts[0].url, /larkshine/i);
  assert.equal(result.state, 'alias-created');
  assert.equal(result.voiceId, 'ellowind');
  assert.equal(result.rules.downloadsModels, false);
});

test('Sonata cannot materialize an alias while vessel-unselected', async () => {
  let actionCalls = 0;
  const result = await materializeConstellationVoiceAlias('sonata', {
    fetchImpl: async (url) => {
      if (String(url).includes('voice-runtime-routes.json')) return response(registry);
      actionCalls += 1;
      return response({});
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'vessel-unselected');
  assert.equal(actionCalls, 0);
});

test('deep reasoner ignition carries both explicit opt-in and House token', async () => {
  setConstellationRuntimeToken('house-test-token');
  let posted = null;
  const result = await igniteDeepReasoner({
    startOllama: true,
    fetchImpl: async (url, options = {}) => {
      const value = String(url);
      if (value.includes('voice-runtime-routes.json')) return response(registry);
      posted = { url: value, body: JSON.parse(options.body), headers: options.headers };
      return response({
        profileId: 'shared:qwen3.6-35b-a3b-deep-reasoner-v1',
        state: 'runtime-verified',
      });
    },
  });
  assert.match(posted.url, /shared%3Aqwen3.6-35b-a3b-deep-reasoner-v1$/);
  assert.equal(posted.body.confirm, true);
  assert.equal(posted.body.opt_in, true);
  assert.equal(posted.headers.authorization, 'Bearer house-test-token');
  assert.equal(result.state, 'runtime-verified');
});
