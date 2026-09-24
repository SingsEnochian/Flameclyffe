import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOUSE_AGENT_CHATTER_ROOM_ID,
  runAgentChatterTick,
} from '../../../netlify/functions/_shared/house-agent-chatter-runtime.mjs';

function memoryStore() {
  const values = new Map();
  return {
    values,
    async list({ prefix = '' } = {}) {
      return { blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) };
    },
    async get(key) { return values.get(key) ?? null; },
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
  };
}

test('replaying one background tick reuses its operational receipt and cannot duplicate the gathering', async () => {
  const store = memoryStore();
  let invokes = 0;
  let appends = 0;
  const voices = [
    { id: 'atlas', name: 'Atlas' },
    { id: 'boxfire', name: 'Boxfire' },
    { id: 'oxalpha', name: 'Ox Alpha' },
  ];
  const appendEntry = async (body) => {
    appends += 1;
    const entry = {
      schema: 'hearthgate.house-commons-entry/v4',
      id: `entry-${appends}`,
      created_at: `2026-09-24T10:0${appends}:00.000Z`,
      ...structuredClone(body),
    };
    await store.setJSON(`entries/${entry.created_at}-${entry.id}`, entry);
    await store.setJSON(`idempotency/${body.idempotency_key}`, entry);
    return entry;
  };
  const invokeVoice = async (voiceId) => {
    invokes += 1;
    return { message: `Turn from ${voiceId}`, provider: 'test', model: 'test-model', display_name: voiceId };
  };

  const first = await runAgentChatterTick({ store, voices, tickId: 'gh-retry-77', maxTurns: 2, invokeVoice, appendEntry });
  const second = await runAgentChatterTick({ store, voices, tickId: 'gh-retry-77', maxTurns: 2, invokeVoice, appendEntry });

  assert.equal(first.posted.length, 2);
  assert.equal(second.posted.length, 2);
  assert.equal(second.reused, true);
  assert.equal(invokes, 2);
  assert.equal(appends, 2);
  const durableEntries = [...store.values.entries()]
    .filter(([key, value]) => key.startsWith('entries/') && value?.thread_id === HOUSE_AGENT_CHATTER_ROOM_ID);
  assert.equal(durableEntries.length, 2);
});
