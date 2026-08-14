'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  localConcurrency,
  keepAliveForMode,
  residencyPolicy,
} = require('../bifrost/residency-policy');
const { LocalModelScheduler } = require('../bifrost/local-model-scheduler');

test('default local concurrency is one and invalid overrides fail back conservatively', () => {
  assert.equal(localConcurrency({}), 1);
  assert.equal(localConcurrency({ BIFROST_LOCAL_MODEL_CONCURRENCY: '2' }), 2);
  assert.equal(localConcurrency({ BIFROST_LOCAL_MODEL_CONCURRENCY: '99' }), 1);
  assert.equal(localConcurrency({ BIFROST_LOCAL_MODEL_CONCURRENCY: 'zero' }), 1);
});

test('verification unloads immediately while interactive and scene modes keep short leases', () => {
  assert.equal(keepAliveForMode('verification', {}), '0');
  assert.equal(keepAliveForMode('ignition', {}), '0');
  assert.equal(keepAliveForMode('scene-cognition', {}), '2m');
  assert.equal(keepAliveForMode('interactive', {}), '5m');
  assert.equal(keepAliveForMode('interactive', { BIFROST_KEEP_ALIVE: '12m' }), '12m');
  assert.equal(residencyPolicy('verification', {}).rules.identityIndependentFromResidency, true);
});

test('scheduler serializes local model work by default', async () => {
  const scheduler = new LocalModelScheduler({ concurrency: 1 });
  const order = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });

  const first = scheduler.run({ model: 'lioreal:starwell-v1', profileId: 'lioreal:qwen3-14b-abliterated-v1', identityId: 'lioreal' }, async () => {
    order.push('first-start');
    await firstGate;
    order.push('first-end');
    return 'lioreal';
  });

  const second = scheduler.run({ model: 'uial:fablevibes-v1', profileId: 'uial:fablevibes-v1', identityId: 'uial' }, async () => {
    order.push('second-start');
    return 'uial';
  });

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(order, ['first-start']);
  assert.equal(scheduler.snapshot().active, 1);
  assert.equal(scheduler.snapshot().queued, 1);

  releaseFirst();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(order, ['first-start', 'first-end', 'second-start']);
  assert.equal(firstResult.value, 'lioreal');
  assert.equal(secondResult.value, 'uial');
  assert.equal(scheduler.snapshot().completed, 2);
});

test('scheduler metadata preserves separate identities even when model ancestry is shared', async () => {
  const scheduler = new LocalModelScheduler({ concurrency: 2 });
  const [ellowind, larkshine] = await Promise.all([
    scheduler.run({ model: 'ellowind:qwen3-vl-8b-v1', profileId: 'ellowind:qwen3-vl-8b-v1', identityId: 'ellowind' }, async (meta) => meta),
    scheduler.run({ model: 'larkshine:qwen3-vl-8b-v1', profileId: 'larkshine:qwen3-vl-8b-v1', identityId: 'larkshine' }, async (meta) => meta),
  ]);
  assert.equal(ellowind.scheduling.identityId, 'ellowind');
  assert.equal(larkshine.scheduling.identityId, 'larkshine');
  assert.notEqual(ellowind.scheduling.model, larkshine.scheduling.model);
});

test('failed local task releases capacity for the next queued task', async () => {
  const scheduler = new LocalModelScheduler({ concurrency: 1 });
  const first = scheduler.run({ model: 'box:qwen3-coder-30b-a3b-v1' }, async () => {
    throw new Error('synthetic failure');
  });
  const second = scheduler.run({ model: 'uial:fablevibes-v1' }, async () => 'ok');
  await assert.rejects(first, /synthetic failure/);
  const result = await second;
  assert.equal(result.value, 'ok');
  assert.equal(scheduler.snapshot().failed, 1);
  assert.equal(scheduler.snapshot().completed, 1);
});
