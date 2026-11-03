import test from 'node:test';
import assert from 'node:assert/strict';
import { correctUserMessage } from '../src/transcript-edit.js';

test('local typo corrections preserve original sent text and every revision', () => {
  const message = { role: 'user', content: 'I hear yuo', world_id: 'wayglass:writing-room' };
  assert.equal(correctUserMessage(message, 'I hear you', '2026-11-03T00:00:00Z'), true);
  assert.equal(correctUserMessage(message, 'I hear you!', '2026-11-03T00:00:01Z'), true);
  assert.equal(message.content, 'I hear you!');
  assert.equal(message.edits[0].content, 'I hear yuo');
  assert.equal(message.edits[1].content, 'I hear you');
  assert.equal(message.world_id, 'wayglass:writing-room');
  assert.equal(correctUserMessage(message, '  I hear you!  '), false);
  assert.equal(message.edits.length, 2);
});

test('edit helper rejects empty text and cannot rewrite assistant or provider messages', () => {
  assert.throws(() => correctUserMessage({ role: 'assistant', content: 'Vethrlauf' }, 'impostor'), /Only Rowan/);
  assert.throws(() => correctUserMessage({ role: 'user', content: 'Hello' }, '   '), /cannot be empty/);
});
