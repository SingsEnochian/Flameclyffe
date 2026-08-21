import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATION_VOICES } from '../src/feedback-loop.js';
import { defaultCommonsVoiceIds, normaliseCommonsSelection, renderCommonsMarkdown } from '../src/house-commons-chat.js';

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
