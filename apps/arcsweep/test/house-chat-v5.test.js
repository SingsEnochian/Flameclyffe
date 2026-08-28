import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  HOUSE_CHAT_HOME_ROOM_ID,
  createOptimisticStewardEntry,
  directRoomSeed,
  parseHouseMentions,
  roomContext,
  roomEntries,
} from '../src/house-commons-chat-v5-core.js';
import { houseModelPlainText, renderHouseModelRichText } from '../src/house-chat-rich-text.js';

test('House Chat v5 keeps room identity and structured context explicit', () => {
  const rows = [
    { id: 'a', thread_id: HOUSE_CHAT_HOME_ROOM_ID, author: 'Rowan', text: 'First.' },
    { id: 'b', thread_id: 'house-room:luna', author: 'Atlas', text: 'Elsewhere.' },
    { id: 'c', thread_id: HOUSE_CHAT_HOME_ROOM_ID, author: 'Lioreal', text: 'Second.' },
  ];
  assert.deepEqual(roomContext(rows, HOUSE_CHAT_HOME_ROOM_ID), [
    { speaker: 'Rowan', text: 'First.' },
    { speaker: 'Lioreal', text: 'Second.' },
  ]);
  assert.equal(roomEntries(rows, 'house-room:luna').length, 1);
});

test('House Chat v5 mention routing and direct-room identity remain deterministic', () => {
  assert.deepEqual(parseHouseMentions('Hey @Atlas and @Altair').sort(), ['altair', 'atlas']);
  const room = directRoomSeed('atlas');
  assert.equal(room.id, 'house-room:dm:atlas');
  assert.equal(room.kind, 'direct');
  assert.deepEqual(room.participants, ['atlas']);
});

test('optimistic Rowan turns carry an idempotency receipt before persistence', () => {
  const entry = createOptimisticStewardEntry({ roomId: HOUSE_CHAT_HOME_ROOM_ID, turnId: 'turn-1', text: 'Hello', idempotencyKey: 'commons:turn-1:rowan' });
  assert.equal(entry.status, 'sending');
  assert.equal(entry.optimistic, true);
  assert.equal(entry.idempotency_key, 'commons:turn-1:rowan');
});

test('incoming model Markdown becomes native rich HTML and clean fallback text', () => {
  const raw = '# Heading\n\n**Bold** and _soft_\n\n- one\n- two\n\n```js\nconst x = 1;\n```\n\n[OpenAI](https://openai.com)';
  const html = renderHouseModelRichText(raw);
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<pre/);
  assert.match(html, /<a href="https:\/\/openai.com">OpenAI<\/a>/);
  const plain = houseModelPlainText(raw);
  assert.doesNotMatch(plain, /\*\*|```|^# /m);
});

test('v5 editor uses Selection/Range rather than execCommand', async () => {
  const [chat, rich] = await Promise.all([
    readFile(new URL('../src/house-commons-chat-v5.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/house-chat-rich-text.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(chat, /execCommand|queryCommandState/);
  assert.doesNotMatch(rich, /execCommand|queryCommandState/);
  assert.match(rich, /createRange\(\)/);
});

test('v5 mounts before compatibility and social decorators', async () => {
  const manifest = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const chat = manifest.indexOf('./house-commons-chat-v5.js');
  const compat = manifest.indexOf('./house-chat-v5-compat.js');
  const social = manifest.indexOf('./house-chat-room-social.js');
  const tools = manifest.indexOf('./house-chat-tools-v5.js');
  assert.ok(chat >= 0 && compat > chat && social > compat && tools > social);
});
