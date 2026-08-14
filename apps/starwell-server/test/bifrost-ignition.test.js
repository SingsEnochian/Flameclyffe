'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  IGNITION_ACK,
  inspectProfile,
  igniteProfile,
  igniteOptionalProfile,
  ignitionStatus,
} = require('../bifrost/ignition');

function response(data, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() { return data; },
  };
}

function ollamaFetch({ models = [], chatModel = null, answer = IGNITION_ACK } = {}) {
  return async (url) => {
    if (String(url).endsWith('/api/tags')) {
      return response({ models: models.map((name) => ({ name })) });
    }
    if (String(url).endsWith('/api/chat')) {
      return response({
        model: chatModel || models[0],
        done: true,
        message: { content: answer },
        load_duration: 12,
        total_duration: 34,
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
}

test('installed local vessel is cold until challenge round trip succeeds', async () => {
  const status = await inspectProfile('uial:fablevibes-v1', ollamaFetch({ models: ['uial:fablevibes-v1'] }));
  assert.equal(status.state, 'installed');
  assert.equal(status.installed, true);
});

test('correct installed local vessel becomes runtime-verified', async () => {
  const receipt = await igniteProfile('uial:fablevibes-v1', {
    fetchImpl: ollamaFetch({ models: ['uial:fablevibes-v1'], chatModel: 'uial:fablevibes-v1' }),
  });
  assert.equal(receipt.state, 'runtime-verified');
  assert.equal(receipt.actualModel, 'uial:fablevibes-v1');
  assert.equal(receipt.challenge, IGNITION_ACK);
  assert.ok(receipt.verifiedAt);
});

test('wrong returned model fails closed', async () => {
  const receipt = await igniteProfile('uial:fablevibes-v1', {
    fetchImpl: ollamaFetch({ models: ['uial:fablevibes-v1'], chatModel: 'lioreal:starwell-v1' }),
  });
  assert.equal(receipt.state, 'runtime-model-mismatch');
  assert.match(receipt.error, /expected uial:fablevibes-v1/);
});

test('wrong ignition answer is not accepted as verification', async () => {
  const receipt = await igniteProfile('uial:fablevibes-v1', {
    fetchImpl: ollamaFetch({ models: ['uial:fablevibes-v1'], answer: 'hello instead' }),
  });
  assert.equal(receipt.state, 'ignition-challenge-failed');
  assert.match(receipt.error, /BIFROST_IGNITION_ACK/);
});

test('missing local weights remain activation-pending and are never downloaded by ignition', async () => {
  let chatCalled = false;
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/tags')) return response({ models: [] });
    chatCalled = true;
    throw new Error('chat should not be called');
  };
  const receipt = await igniteProfile('box:qwen3-coder-30b-a3b-v1', { fetchImpl });
  assert.equal(receipt.state, 'activation-pending');
  assert.equal(chatCalled, false);
});

test('remote provider ignition is not attempted without explicit remote authorisation', async () => {
  let called = false;
  const receipt = await igniteProfile('bluebird:deepseek-chat-existing-v1', {
    allowRemoteProbe: false,
    fetchImpl: async () => { called = true; return response({}); },
  });
  assert.equal(receipt.state, 'remote-probe-not-authorised');
  assert.equal(called, false);
});

test('optional deep reasoner can ignite only through the explicit optional path', async () => {
  await assert.rejects(
    () => igniteProfile('shared:qwen3.6-35b-a3b-deep-reasoner-v1', {
      fetchImpl: ollamaFetch({ models: ['bifrost:deep-reasoner-35b-a3b-v1'] }),
    }),
    /opt-in-required/
  );

  const receipt = await igniteOptionalProfile('shared:qwen3.6-35b-a3b-deep-reasoner-v1', {
    fetchImpl: ollamaFetch({
      models: ['bifrost:deep-reasoner-35b-a3b-v1'],
      chatModel: 'bifrost:deep-reasoner-35b-a3b-v1',
    }),
  });
  assert.equal(receipt.state, 'runtime-verified');
  assert.equal(receipt.optIn, true);
});

test('ignition status contract preserves no-download and explicit-action laws', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/tags')) return response({ models: [] });
    throw new Error('unexpected remote request');
  };
  const previousBluebird = process.env.BLUEBIRD_DEEPSEEK_API_KEY;
  const previousVethraluf = process.env.VETHRLAUF_DEEPSEEK_API_KEY;
  delete process.env.BLUEBIRD_DEEPSEEK_API_KEY;
  delete process.env.VETHRLAUF_DEEPSEEK_API_KEY;
  try {
    const status = await ignitionStatus({ fetchImpl });
    assert.equal(status.contract, 'bifrost.ignition-status/v1');
    assert.equal(status.rules.noAutomaticModelDownload, true);
    assert.equal(status.rules.localDaemonStartRequiresExplicitAction, true);
    assert.equal(status.rules.remoteProviderProbeRequiresExplicitAction, true);
    assert.equal(status.rules.runtimeVerifiedRequiresChallengeRoundTrip, true);
  } finally {
    if (previousBluebird) process.env.BLUEBIRD_DEEPSEEK_API_KEY = previousBluebird;
    if (previousVethraluf) process.env.VETHRLAUF_DEEPSEEK_API_KEY = previousVethraluf;
  }
});
