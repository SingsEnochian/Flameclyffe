import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOUSE_CHAT_STORAGE_KEY,
  HOUSE_CHAT_TRANSCRIPT_LIMIT,
  loadHouseChatTranscript,
  saveHouseChatTranscript,
} from '../src/components/living-room/house-chat-transcript.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test('House Chat preserves Ox Alpha and a second Flame across reload', () => {
  const storage = memoryStorage();
  const messages = [
    {
      id: 'msg:oa',
      kind: 'model',
      author_id: 'oxalpha',
      author_name: 'Ox Alpha',
      text: 'OA live route receipt.',
      provider: 'huggingface-inference-providers',
      model: 'zai-org/GLM-5.3-Flash',
      timestamp: '2026-08-28T01:00:00.000Z',
      state: 'received',
    },
    {
      id: 'msg:lioreal',
      kind: 'model',
      author_id: 'lioreal',
      author_name: 'Virelya Lioreal',
      text: 'Second distinct Flame receipt.',
      provider: 'huggingface-inference-providers',
      model: 'huihui-ai/Qwen2.5-32B-Instruct-abliterated:cheapest',
      timestamp: '2026-08-28T01:00:01.000Z',
      state: 'received',
    },
  ];

  saveHouseChatTranscript(storage, messages);
  const reloaded = loadHouseChatTranscript(storage);

  assert.deepEqual(reloaded, messages);
  assert.equal(reloaded[0].author_id, 'oxalpha');
  assert.equal(reloaded[0].author_name, 'Ox Alpha');
  assert.equal(reloaded[1].author_id, 'lioreal');
  assert.notEqual(reloaded[0].author_id, reloaded[1].author_id);
});

test('House Chat persistence keeps only the newest bounded transcript', () => {
  const storage = memoryStorage();
  const messages = Array.from({ length: HOUSE_CHAT_TRANSCRIPT_LIMIT + 7 }, (_, index) => ({
    id: `msg:${index}`,
    author_id: index % 2 ? 'lioreal' : 'oxalpha',
    text: `message ${index}`,
  }));

  const saved = saveHouseChatTranscript(storage, messages);
  const reloaded = loadHouseChatTranscript(storage);

  assert.equal(saved.length, HOUSE_CHAT_TRANSCRIPT_LIMIT);
  assert.equal(reloaded.length, HOUSE_CHAT_TRANSCRIPT_LIMIT);
  assert.equal(reloaded[0].id, 'msg:7');
  assert.equal(reloaded.at(-1).id, `msg:${HOUSE_CHAT_TRANSCRIPT_LIMIT + 6}`);
  assert.ok(storage.getItem(HOUSE_CHAT_STORAGE_KEY));
});

test('House Chat treats malformed stored transcript as empty', () => {
  const storage = memoryStorage();
  storage.setItem(HOUSE_CHAT_STORAGE_KEY, '{not-json');
  assert.deepEqual(loadHouseChatTranscript(storage), []);
});
