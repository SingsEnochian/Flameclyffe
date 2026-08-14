'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseIgnitionPolicy, executeIgnitionPolicy } = require('../bifrost/ignition-policy');

const profiles = {
  local: { runtime: { provider: 'ollama' } },
  remote: { runtime: { provider: 'deepseek' } },
  optional: { runtime: { provider: 'ollama' }, opt_in_only: true },
};

test('startup ignition is disabled unless explicitly enabled', () => {
  const policy = parseIgnitionPolicy({});
  assert.equal(policy.enabled, false);
  assert.equal(policy.startOllama, false);
  assert.deepEqual(policy.profiles, []);
});

test('startup policy parses explicit profile and consent switches', () => {
  const policy = parseIgnitionPolicy({
    BIFROST_IGNITION_ON_START: '1',
    BIFROST_START_OLLAMA: 'true',
    BIFROST_IGNITE_PROFILES: 'local, optional, local',
    BIFROST_ALLOW_REMOTE_IGNITION: 'yes',
    BIFROST_ALLOW_OPT_IN_IGNITION: 'on',
  });
  assert.equal(policy.enabled, true);
  assert.equal(policy.startOllama, true);
  assert.deepEqual(policy.profiles, ['local', 'optional']);
  assert.equal(policy.allowRemote, true);
  assert.equal(policy.allowOptIn, true);
});

test('disabled startup policy performs no actions', async () => {
  let calls = 0;
  const result = await executeIgnitionPolicy({ enabled: false }, {
    modelProfiles: profiles,
    startOllamaServer: async () => { calls += 1; },
    igniteProfile: async () => { calls += 1; },
    igniteOptionalProfile: async () => { calls += 1; },
  });
  assert.equal(result.state, 'disabled');
  assert.equal(calls, 0);
});

test('explicit local startup may start Ollama and ignite selected profile', async () => {
  const calls = [];
  const result = await executeIgnitionPolicy({
    enabled: true,
    startOllama: true,
    profiles: ['local'],
    allowRemote: false,
    allowOptIn: false,
  }, {
    modelProfiles: profiles,
    startOllamaServer: async () => { calls.push('ollama'); return { started: true, probe: { reachable: true } }; },
    igniteProfile: async (id) => { calls.push(id); return { profileId: id, state: 'runtime-verified' }; },
  });
  assert.deepEqual(calls, ['ollama', 'local']);
  assert.equal(result.state, 'completed');
  assert.equal(result.startedOllama, true);
});

test('remote profile is not challenged at startup without remote authorisation', async () => {
  let remoteCalled = false;
  const result = await executeIgnitionPolicy({
    enabled: true,
    startOllama: false,
    profiles: ['remote'],
    allowRemote: false,
    allowOptIn: false,
  }, {
    modelProfiles: profiles,
    igniteProfile: async () => { remoteCalled = true; return { state: 'runtime-verified' }; },
  });
  assert.equal(remoteCalled, false);
  assert.equal(result.receipts[0].state, 'remote-probe-not-authorised');
});

test('optional profile is not challenged at startup without opt-in authorisation', async () => {
  let optionalCalled = false;
  const result = await executeIgnitionPolicy({
    enabled: true,
    startOllama: false,
    profiles: ['optional'],
    allowRemote: false,
    allowOptIn: false,
  }, {
    modelProfiles: profiles,
    igniteOptionalProfile: async () => { optionalCalled = true; return { state: 'runtime-verified' }; },
  });
  assert.equal(optionalCalled, false);
  assert.equal(result.receipts[0].state, 'opt-in-required');
});

test('missing or unverified profile produces receipt instead of aborting startup', async () => {
  const result = await executeIgnitionPolicy({
    enabled: true,
    startOllama: false,
    profiles: ['missing', 'local'],
    allowRemote: false,
    allowOptIn: false,
  }, {
    modelProfiles: profiles,
    igniteProfile: async (id) => ({ profileId: id, state: 'activation-pending' }),
  });
  assert.equal(result.state, 'completed-without-verified-vessels');
  assert.equal(result.receipts[0].state, 'profile-missing');
  assert.equal(result.receipts[1].state, 'activation-pending');
  assert.equal(result.rules.missingWeightsDoNotAbortHearthgate, true);
});
