import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONSTELLATION_TARGET_IDS,
  createConstellationBridge,
  createConstellationMessage,
} from '../src/constellation/bridge.js';
import { createYggdrasilLocalAdapter } from '../src/constellation/adapters/yggdrasil-local.js';
import { createFaerStubAdapter } from '../src/constellation/adapters/stub-adapters.js';

const fixedOptions = {
  now: '2026-07-06T00:00:00.000Z',
  makeId: (prefix) => `${prefix}_test`,
};

test('constellation target roster keeps the core presences separate', () => {
  assert.deepEqual(CONSTELLATION_TARGET_IDS, ['vee', 'faer', 'yggdrasil', 'deepseek', 'constellation']);
});

test('createConstellationMessage normalizes a routed packet', () => {
  const message = createConstellationMessage(
    {
      speaker: 'rowan',
      target: 'YGGDRASIL',
      room: 'starwell',
      message: 'What do you see?',
      metadata: { source: 'test' },
    },
    fixedOptions
  );

  assert.equal(message.schema, 'starwell.constellation.message.v0.1');
  assert.equal(message.message_id, 'cmsg_test');
  assert.equal(message.target, 'yggdrasil');
  assert.equal(message.target_label, 'Yggdrasil Local');
  assert.equal(message.context_level, 'light');
  assert.deepEqual(message.metadata, { source: 'test' });
});

test('bridge returns an explicit missing-adapter response instead of guessing', async () => {
  const bridge = createConstellationBridge();
  const response = await bridge.route(
    { speaker: 'rowan', target: 'deepseek', message: 'Are you wired?' },
    fixedOptions
  );

  assert.equal(response.schema, 'starwell.constellation.response.v0.1');
  assert.equal(response.speaker, 'constellation');
  assert.equal(response.engine, 'router:constellation');
  assert.equal(response.truth_label, 'adapter_missing');
  assert.equal(response.metadata.missing_target, 'deepseek');
});

test('bridge routes to a registered adapter and preserves engine provenance', async () => {
  const bridge = createConstellationBridge({
    adapters: {
      faer: createFaerStubAdapter({
        engine: 'external:faer-test',
        message: 'Lochflame received.',
        memory_used: ['test-memory'],
      }),
    },
  });

  const response = await bridge.route(
    { speaker: 'rowan', target: 'faer', message: 'Signal check.' },
    fixedOptions
  );

  assert.equal(response.speaker, 'faer');
  assert.equal(response.speaker_label, 'Faer Uial');
  assert.equal(response.engine, 'external:faer-test');
  assert.equal(response.message, 'Lochflame received.');
  assert.deepEqual(response.memory_used, ['test-memory']);
  assert.equal(response.truth_label, 'adapter_stub');
});

test('Yggdrasil local adapter posts to the existing local endpoint shape', async () => {
  const calls = [];
  const adapter = createYggdrasilLocalAdapter({
    endpoint: '/api/v1/yggdrasil/chat',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            reply: 'I am a watchful tree.',
            engine: 'ollama:yggdrasil:v0.1',
            memory_used: ['local-root'],
          };
        },
      };
    },
  });

  const request = createConstellationMessage(
    { speaker: 'rowan', target: 'yggdrasil', message: 'Root check.' },
    fixedOptions
  );
  const response = await adapter.send(request);
  const body = JSON.parse(calls[0].init.body);

  assert.equal(calls[0].url, '/api/v1/yggdrasil/chat');
  assert.equal(body.message, 'Root check.');
  assert.equal(body.context_level, 'light');
  assert.equal(response.speaker, 'yggdrasil');
  assert.equal(response.engine, 'ollama:yggdrasil:v0.1');
  assert.equal(response.message, 'I am a watchful tree.');
  assert.deepEqual(response.memory_used, ['local-root']);
  assert.equal(response.truth_label, 'local_model_response');
});

test('unknown targets are rejected before routing', () => {
  assert.throws(
    () => createConstellationMessage({ target: 'beige-soup', message: 'nope' }, fixedOptions),
    /Unknown constellation target/
  );
});
