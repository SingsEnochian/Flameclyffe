'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { planRuntimeAliases } = require('../bifrost/alias-materializer');

test('Ellowind and Larkshine share a base but plan two distinct aliases', () => {
  const base = 'huihui_ai/qwen3-vl-abliterated:8b-instruct';
  const plan = planRuntimeAliases([base]);
  const ellowind = plan.find((item) => item.profileId === 'ellowind:qwen3-vl-8b-v1');
  const larkshine = plan.find((item) => item.profileId === 'larkshine:qwen3-vl-8b-v1');
  assert.ok(ellowind);
  assert.ok(larkshine);
  assert.equal(ellowind.state, 'ready-to-create');
  assert.equal(larkshine.state, 'ready-to-create');
  assert.equal(ellowind.baseModel, larkshine.baseModel);
  assert.notEqual(ellowind.runtimeAlias, larkshine.runtimeAlias);
  assert.equal(ellowind.identity.identityId, 'ellowind');
  assert.equal(larkshine.identity.identityId, 'larkshine');
});

test('existing runtime alias is never recreated', () => {
  const plan = planRuntimeAliases([
    'huihui_ai/qwen3-vl-abliterated:8b-instruct',
    'ellowind:qwen3-vl-8b-v1',
  ], { profileRefs: ['Ellowind'] });
  assert.equal(plan.length, 1);
  assert.equal(plan[0].state, 'alias-present');
});

test('missing base never becomes an executable alias plan', () => {
  const plan = planRuntimeAliases([], { profileRefs: ['Boxxy'] });
  assert.equal(plan.length, 1);
  assert.equal(plan[0].profileId, 'box:qwen3-coder-30b-a3b-v1');
  assert.equal(plan[0].state, 'base-missing');
  assert.equal(plan[0].identity.identityName, 'Boxfire');
});

test('unknown identity reference selects no profile instead of falling back', () => {
  const plan = planRuntimeAliases(['some:model'], { profileRefs: ['Sonata'] });
  assert.deepEqual(plan, []);
});

test('optional deep reasoner stays out unless explicitly included', () => {
  const ordinary = planRuntimeAliases([]);
  assert.equal(ordinary.some((item) => item.profileId === 'shared:qwen3.6-35b-a3b-deep-reasoner-v1'), false);
  const opted = planRuntimeAliases([], { includeOptIn: true, profileRefs: ['deep-reasoner'] });
  assert.equal(opted.length, 1);
  assert.equal(opted[0].profileId, 'shared:qwen3.6-35b-a3b-deep-reasoner-v1');
});
