'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { materializeRuntimeAlias } = require('../bifrost/alias-executor');

function response(models) {
  return {
    ok: true,
    status: 200,
    async json() { return { models: models.map((name) => ({ name })) }; },
  };
}

test('materializing Ellowind creates only Ellowind alias from shared visual base', async () => {
  const base = 'huihui_ai/qwen3-vl-abliterated:8b-instruct';
  const alias = 'ellowind:qwen3-vl-8b-v1';
  let created = false;
  const calls = [];
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-alias-'));
  try {
    const receipt = await materializeRuntimeAlias('Ellowind', {
      cacheRoot,
      fetchImpl: async () => response(created ? [base, alias] : [base]),
      runner: (runtimeAlias, baseModel, modelfile) => {
        calls.push({ runtimeAlias, baseModel, modelfile });
        created = true;
      },
    });
    assert.equal(receipt.state, 'alias-created');
    assert.equal(receipt.profileId, 'ellowind:qwen3-vl-8b-v1');
    assert.equal(receipt.identity.identityId, 'ellowind');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].runtimeAlias, alias);
    assert.equal(calls[0].baseModel, base);
    assert.notEqual(calls[0].runtimeAlias, 'larkshine:qwen3-vl-8b-v1');
    assert.equal(receipt.rules.downloadsModels, false);
    assert.equal(receipt.rules.selectedProfileOnly, true);
  } finally {
    fs.rmSync(cacheRoot, { recursive: true, force: true });
  }
});

test('Boxxy resolves to Boxfire profile but does nothing when the base is missing', async () => {
  let runnerCalled = false;
  const receipt = await materializeRuntimeAlias('Boxxy', {
    fetchImpl: async () => response([]),
    runner: () => { runnerCalled = true; },
  });
  assert.equal(receipt.state, 'base-missing');
  assert.equal(receipt.profileId, 'box:qwen3-coder-30b-a3b-v1');
  assert.equal(receipt.identity.identityName, 'Boxfire');
  assert.equal(runnerCalled, false);
});

test('existing alias is returned without invoking create', async () => {
  const base = 'huihui_ai/qwen3-vl-abliterated:8b-instruct';
  const alias = 'larkshine:qwen3-vl-8b-v1';
  let runnerCalled = false;
  const receipt = await materializeRuntimeAlias('Larkshine', {
    fetchImpl: async () => response([base, alias]),
    runner: () => { runnerCalled = true; },
  });
  assert.equal(receipt.state, 'alias-present');
  assert.equal(runnerCalled, false);
});

test('optional reasoner alias remains blocked without opt-in', async () => {
  const receipt = await materializeRuntimeAlias('deep-reasoner', {
    fetchImpl: async () => response([]),
  });
  assert.equal(receipt.state, 'opt-in-required');
});

test('unknown identity never receives a fallback alias', async () => {
  const receipt = await materializeRuntimeAlias('Sonata', {
    fetchImpl: async () => response([]),
  });
  assert.equal(receipt.state, 'profile-missing');
});
