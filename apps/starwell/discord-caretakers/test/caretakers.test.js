import assert from 'node:assert/strict';
import test from 'node:test';

import { createOpenAICompatibleAdapter } from '../../src/constellation/adapters/openai-compatible.js';
import { CARETAKER_PROFILES } from '../src/profiles.js';
import { splitDiscordMessage } from '../src/output.js';
import { createAccessPolicy } from '../src/policy.js';

test('the House roster contains five separate Discord identities', () => {
  assert.deepEqual(
    CARETAKER_PROFILES.map((profile) => profile.id),
    ['vee', 'nen', 'yggdrasil', 'bluebird', 'vethrlauf']
  );
  assert.equal(new Set(CARETAKER_PROFILES.map((profile) => profile.tokenEnv)).size, 5);
  assert.equal(new Set(CARETAKER_PROFILES.map((profile) => profile.applicationIdEnv)).size, 5);
});

test('policy rejects DMs, unknown callers, and unlisted rooms', () => {
  const policy = createAccessPolicy({
    DISCORD_ALLOWED_USER_IDS: 'rowan-id',
    DISCORD_ALLOWED_CHANNEL_IDS: 'hearth-id',
    CARETAKER_COOLDOWN_SECONDS: '60',
  });

  assert.equal(policy.check({ inGuild: () => false }).ok, false);
  assert.equal(policy.check({ inGuild: () => true, user: { id: 'other' }, channelId: 'hearth-id' }).ok, false);
  assert.equal(policy.check({ inGuild: () => true, user: { id: 'rowan-id' }, channelId: 'other' }).ok, false);
  assert.equal(policy.check({ inGuild: () => true, user: { id: 'rowan-id' }, channelId: 'hearth-id' }).ok, true);
});

test('Discord output is split below the message limit', () => {
  const chunks = splitDiscordMessage('feather '.repeat(1000), 500);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 500));
});

test('DeepSeek-compatible adapter preserves the named speaker and never returns reasoning text', async () => {
  const calls = [];
  const adapter = createOpenAICompatibleAdapter({
    target: 'bluebird',
    apiKey: 'test-only',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    systemPrompt: 'Test prompt',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            id: 'test-request',
            choices: [{ message: { content: 'Field report received.', reasoning_content: 'hidden' } }],
          };
        },
      };
    },
  });

  const response = await adapter.send({ room: 'hearth', message: 'Report.', speaker: 'rowan' });
  const body = JSON.parse(calls[0].init.body);

  assert.equal(calls[0].url, 'https://api.deepseek.com/chat/completions');
  assert.equal(body.model, 'deepseek-v4-flash');
  assert.equal(response.speaker, 'bluebird');
  assert.equal(response.message, 'Field report received.');
  assert.ok(!response.message.includes('hidden'));
});
