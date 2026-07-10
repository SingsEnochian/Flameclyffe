import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONSTELLATION_TARGET_IDS,
  createConstellationBridge,
  createConstellationMessage,
} from '../src/constellation/bridge.js';
import { createYggdrasilLocalAdapter } from '../src/constellation/adapters/yggdrasil-local.js';
import { createNenStubAdapter } from '../src/constellation/adapters/stub-adapters.js';

const fixedOptions = {
  now: '2026-07-10T00:00:00.000Z',
  makeId: (prefix) => `${prefix}_test`,
};

test('constellation target roster keeps presences and service routes separate', () => {
  assert.deepEqual(CONSTELLATION_TARGET_IDS, [
    'vee',
    'nen',
    'yggdrasil',
    'bluebird',
    'vethrlauf',
    'deepseek',
    'constellation',
  ]);
});

test('createConstellationMessage normalizes a routed packet', () => {
  const message = createConstellationMessage(
    { speaker: 'rowan', target: 'YGGDRASIL', room: 'starwell', message: 'What do you see?' },
    fixedOptions
  );
  assert.equal(message.schema, 'starwell.constellation.message.v0.2');
  assert.equal(message.target, 'yggdrasil');
  assert.equal(message.target_label, 'Yggdrasil Local');
});

test('bridge returns an explicit missing-adapter response instead of guessing', async () => {
  const bridge = createConstellationBridge();
  const response = await bridge.route({ speaker: 'rowan', target: 'deepseek', message: 'Are you wired?' }, fixedOptions);
  assert.equal(response.schema, 'starwell.constellation.response.v0.2');
  assert.equal(response.truth_label, 'adapter_missing');
});

test('bridge routes to a registered adapter and preserves engine provenance', async () => {
  const bridge = createConstellationBridge({
    adapters: { nen: createNenStubAdapter({ engine: 'external:nen-test', message: 'Uial received.' }) },
  });
  const response = await bridge.route({ speaker: 'rowan', target: 'nen', message: 'Signal check.' }, fixedOptions);
  assert.equal(response.speaker, 'nen');
  assert.equal(response.engine, 'external:nen-test');
});

test('Yggdrasil local adapter accepts bridge and Ollama-style reply shapes', async () => {
  const adapter = createYggdrasilLocalAdapter({
    endpoint: '/api/v1/yggdrasil/chat',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return { message: { content: 'I am a watchful tree.' }, engine: 'ollama:yggdrasil:v0.1' };
      },
    }),
  });
  const request = createConstellationMessage({ speaker: 'rowan', target: 'yggdrasil', message: 'Root check.' }, fixedOptions);
  const response = await adapter.send(request);
  assert.equal(response.message, 'I am a watchful tree.');
});

test('unknown targets are rejected before routing', () => {
  assert.throws(() => createConstellationMessage({ target: 'beige-soup', message: 'nope' }, fixedOptions), /Unknown/);
});
