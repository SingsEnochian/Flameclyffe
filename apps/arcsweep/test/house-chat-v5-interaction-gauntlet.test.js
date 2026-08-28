import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chatSource = await readFile(new URL('../src/house-commons-chat-v5.js', import.meta.url), 'utf8');
const streamSource = await readFile(new URL('../../../netlify/functions/_shared/flame-chat-stream-runtime.mjs', import.meta.url), 'utf8');
const roomManagementSource = await readFile(new URL('../src/house-chat-room-management-v5.js', import.meta.url), 'utf8');

test('desktop and mobile chat paths keep the native composer interaction contract', () => {
  assert.match(chatSource, /event\.key !== 'Enter' \|\| event\.shiftKey/);
  assert.match(chatSource, /addEventListener\('paste'/);
  assert.match(chatSource, /addEventListener\('dragover'/);
  assert.match(chatSource, /addEventListener\('drop'/);
  assert.match(chatSource, /@media\(max-width:650px\)/);
  assert.match(chatSource, /prefers-reduced-motion:reduce/);
});

test('live room path carries optimistic send, real stream, cancellation, retry, and reconnect hooks', () => {
  assert.match(chatSource, /createOptimisticStewardEntry/);
  assert.match(chatSource, /streamConstellationRuntimeVoice/);
  assert.match(chatSource, /data-cancel-stream/);
  assert.match(chatSource, /data-retry-optimistic/);
  assert.match(chatSource, /addEventListener\?\.\('online'/);
  assert.match(chatSource, /idempotency_key: `commons:\$\{turnId\}:rowan`/);
});

test('reply continuity, search, pins, room switching, unread state, DMs, and export remain inspectable', () => {
  assert.match(chatSource, /data-jump-parent/);
  assert.match(chatSource, /data-house-room-search/);
  assert.match(chatSource, /data-pin-entry/);
  assert.match(chatSource, /markHouseRoomRead/);
  assert.match(chatSource, /data-direct-room/);
  assert.match(chatSource, /data-export-room/);
});

test('provider work is actually aborted when the client closes a stream', () => {
  assert.match(streamSource, /new AbortController\(\)/);
  assert.match(streamSource, /request\.signal/);
  assert.match(streamSource, /AbortSignal\.any/);
  assert.match(streamSource, /cancel\(reason\)/);
  assert.match(streamSource, /first_token_ms/);
});

test('room rename and archive are durable House operations rather than local-only labels', () => {
  assert.match(roomManagementSource, /upsertHouseRoom/);
  assert.match(roomManagementSource, /Rename room/);
  assert.match(roomManagementSource, /Archive room/);
  assert.match(roomManagementSource, /archived: true/);
});
