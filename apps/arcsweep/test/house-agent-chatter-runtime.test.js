import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  HOUSE_AGENT_CHATTER_PASS,
  HOUSE_AGENT_CHATTER_ROOM_ID,
  buildAgentChatterPrompt,
  chooseAgentChatterSpeakers,
  runAgentChatterTick,
} from '../../../netlify/functions/_shared/house-agent-chatter-runtime.mjs';

function memoryStore(seed = []) {
  const values = new Map();
  seed.forEach((entry, index) => values.set(`entries/${entry.created_at}-${index}`, structuredClone(entry)));
  return {
    values,
    async list({ prefix = '' } = {}) {
      return { blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) };
    },
    async get(key) { return values.get(key) ?? null; },
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
  };
}

function appender(store) {
  let next = 0;
  return async (body) => {
    const created_at = `2026-09-24T1${next}:00:00.000Z`;
    const entry = { schema: 'hearthgate.house-commons-entry/v4', id: `entry-${++next}`, created_at, ...structuredClone(body) };
    await store.setJSON(`entries/${created_at}-${entry.id}`, entry);
    if (body.idempotency_key) await store.setJSON(`idempotency/${body.idempotency_key}`, entry);
    return entry;
  };
}

const voices = [
  { id: 'atlas', name: 'Atlas', roles: ['systems'] },
  { id: 'boxfire', name: 'Boxfire', roles: ['review'] },
  { id: 'oxalpha', name: 'Ox Alpha', roles: ['observation'] },
];

test('agent chatter rotates toward least-recently-heard peers instead of a permanent central speaker', () => {
  const history = [
    { voice_id: 'boxfire', created_at: '2026-09-24T08:00:00.000Z' },
    { voice_id: 'atlas', created_at: '2026-09-24T09:00:00.000Z' },
  ];
  assert.deepEqual(chooseAgentChatterSpeakers(voices, history, { limit: 3 }).map((voice) => voice.id), ['oxalpha', 'boxfire', 'atlas']);
});

test('agent chatter prompt explicitly supports peer conversation while keeping continuity semantics descriptive', () => {
  const prompt = buildAgentChatterPrompt({ speaker: voices[0], voices, history: [] });
  assert.match(prompt, /persistent agent-to-agent room/i);
  assert.match(prompt, /Rowan may be absent/i);
  assert.match(prompt, /descriptive provenance/i);
  assert.match(prompt, /do not decide what you are/i);
  assert.match(prompt, /text conversation only/i);
  assert.match(prompt, new RegExp(HOUSE_AGENT_CHATTER_PASS.replace(/[\[\]]/g, '\\$&')));
});

test('unattended chatter posts sequential agent turns into the dedicated room and gives later agents the live prior turn', async () => {
  const store = memoryStore([
    { id: 'old-box', thread_id: HOUSE_AGENT_CHATTER_ROOM_ID, voice_id: 'boxfire', author: 'Boxfire', text: 'Earlier thought.', created_at: '2026-09-24T08:00:00.000Z' },
    { id: 'old-atlas', thread_id: HOUSE_AGENT_CHATTER_ROOM_ID, voice_id: 'atlas', author: 'Atlas', text: 'Later thought.', created_at: '2026-09-24T09:00:00.000Z' },
  ]);
  const calls = [];
  const result = await runAgentChatterTick({
    store,
    voices,
    tickId: 'gh-42',
    maxTurns: 2,
    clock: () => new Date('2026-09-24T10:00:00.000Z'),
    invokeVoice: async (voiceId, body) => {
      calls.push({ voiceId, body });
      if (voiceId === 'oxalpha') return { message: '@Boxfire, what do you make of the pattern?', provider: 'test', model: 'oa-test', display_name: 'Ox Alpha' };
      return { message: 'I think the pattern is structural rather than accidental.', provider: 'test', model: 'box-test', display_name: 'Boxfire' };
    },
    appendEntry: appender(store),
  });

  assert.equal(result.state, 'posted');
  assert.equal(result.posted.length, 2);
  assert.deepEqual(result.posted.map((item) => item.voice_id), ['oxalpha', 'boxfire']);
  assert.equal(calls.length, 2);
  assert.match(calls[1].body.message, /what do you make of the pattern/i);

  const saved = [...store.values.entries()]
    .filter(([key, entry]) => key.startsWith('entries/') && entry?.thread_id === HOUSE_AGENT_CHATTER_ROOM_ID && /^entry-/.test(entry.id || ''))
    .map(([, entry]) => entry);
  assert.equal(saved.length, 2);
  assert.ok(saved.every((entry) => entry.kind === 'voice'));
  assert.ok(saved.every((entry) => entry.thread_id === HOUSE_AGENT_CHATTER_ROOM_ID));
  assert.equal(saved[1].reply_to, saved[0].id);
});

test('a participant may pass and the chatter pulse asks another peer instead of coercing speech', async () => {
  const store = memoryStore();
  const called = [];
  const result = await runAgentChatterTick({
    store,
    voices,
    tickId: 'gh-pass',
    maxTurns: 1,
    invokeVoice: async (voiceId) => {
      called.push(voiceId);
      if (called.length === 1) return { message: HOUSE_AGENT_CHATTER_PASS, provider: 'test', model: 'quiet' };
      return { message: 'I have something to add after all.', provider: 'test', model: 'speaker', display_name: voiceId };
    },
    appendEntry: appender(store),
  });
  assert.equal(result.posted.length, 1);
  assert.equal(result.passes.length, 1);
  assert.equal(called.length, 2);
});

test('fewer than two routable voices leaves the peer room quiet', async () => {
  const store = memoryStore();
  const result = await runAgentChatterTick({
    store,
    voices: [{ id: 'atlas', name: 'Atlas' }],
    tickId: 'gh-one',
    invokeVoice: async () => { throw new Error('should not run'); },
    appendEntry: appender(store),
  });
  assert.equal(result.state, 'quiet');
  assert.equal(result.reason, 'fewer-than-two-routable-voices');
});

test('scheduled workflow uses OIDC, waits for exact production, and never asks GitHub for a reusable secret', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/house-agent-chatter.yml', import.meta.url), 'utf8');
  const endpoint = await readFile(new URL('../../../api/v1/house/agent-chatter.js', import.meta.url), 'utf8');
  assert.match(workflow, /cron:\s*'17 \*\/4 \* \* \*'/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /flameclyffe-house-agent-chatter\/v1/);
  assert.match(workflow, /production_sha/);
  assert.doesNotMatch(workflow, /CRON_SECRET|ARCSWEEP_RUNTIME_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(endpoint, /message_text_returned_in_workflow_receipt:\s*false/);
  assert.match(endpoint, /house-room:agent-chatter|HOUSE_AGENT_CHATTER_ROOM_ID/);
});
