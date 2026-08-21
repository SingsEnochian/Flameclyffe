import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATION_VOICES } from '../src/feedback-loop.js';
import {
  defaultCommonsVoiceIds,
  normaliseCommonsSelection,
  renderCommonsMarkdown,
  commonsThreadId,
  filterCommonsEntries,
  exportCommonsMarkdown,
} from '../src/house-commons-chat-v2.js';

test('House Commons defaults to the entire Constellation', () => {
  const ids = defaultCommonsVoiceIds();
  assert.deepEqual(ids, CONSTELLATION_VOICES.map((voice) => voice.id));
  assert.deepEqual(normaliseCommonsSelection(null), ids);
});

test('House Commons preserves an explicit valid subset', () => {
  assert.deepEqual(normaliseCommonsSelection(['lioreal', 'atlas', 'lioreal']), ['lioreal', 'atlas']);
});

test('Commons formatting renders safe lightweight markup', () => {
  const html = renderCommonsMarkdown('**bold** and _soft_ and `<x>`\n\n> quoted');
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>soft<\/em>/);
  assert.match(html, /<code>&lt;x&gt;<\/code>/);
  assert.match(html, /<blockquote>quoted<\/blockquote>/);
  assert.equal(html.includes('<x>'), false);
});

test('thread identity prefers explicit thread then turn then entry id', () => {
  assert.equal(commonsThreadId({ id: 'e', turn_id: 't', thread_id: 'x' }), 'x');
  assert.equal(commonsThreadId({ id: 'e', turn_id: 't' }), 't');
  assert.equal(commonsThreadId({ id: 'e' }), 'e');
});

test('Commons search and thread filters compose without losing provenance', () => {
  const rows = [
    { id: '1', thread_id: 'a', author: 'Rowan', text: 'Violet flame', status: 'sent' },
    { id: '2', thread_id: 'a', author: 'Atlas', text: 'Three ripples', status: 'replied' },
    { id: '3', thread_id: 'b', author: 'Lioreal', text: 'Continuity note', status: 'replied' },
  ];
  assert.deepEqual(filterCommonsEntries(rows, 'ripples', 'a').map((row) => row.id), ['2']);
  assert.deepEqual(filterCommonsEntries(rows, 'lioreal', '').map((row) => row.id), ['3']);
});

test('Commons markdown export keeps thread and reply receipts visible', () => {
  const text = exportCommonsMarkdown([{ author: 'Atlas', created_at: '2026-08-21T00:00:00.000Z', status: 'replied', thread_id: 'thread-1', reply_to: 'turn-1', text: 'Answer.' }]);
  assert.match(text, /thread:thread-1/);
  assert.match(text, /reply:turn-1/);
  assert.match(text, /Answer\./);
});
