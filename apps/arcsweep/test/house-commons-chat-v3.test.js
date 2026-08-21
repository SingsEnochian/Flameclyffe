import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATION_VOICES } from '../src/feedback-loop.js';
import {
  defaultCommonsVoiceIds,
  filterCommonsEntries,
  parseCommonsMentions,
  renderCommonsMarkdown,
  unreadCommonsEntries,
} from '../src/house-commons-chat-v3.js';

test('Commons v3 defaults to the full Constellation', () => {
  assert.deepEqual(defaultCommonsVoiceIds(), CONSTELLATION_VOICES.map((voice) => voice.id));
});

test('mention routing targets named Flames and @all targets everyone', () => {
  assert.deepEqual(parseCommonsMentions('Hey @Atlas and @Altair, thoughts?'), ['altair', 'atlas']);
  assert.deepEqual(parseCommonsMentions('@all please answer'), defaultCommonsVoiceIds());
  assert.deepEqual(parseCommonsMentions('No mention here'), []);
});

test('search can include pinned-only thread filtering and cross-link metadata', () => {
  const rows = [
    { id: 'a', thread_id: 't1', author: 'Rowan', text: 'hello', created_at: '2026-08-21T10:00:00Z', links: [{ kind: 'canon', id: 'rand', label: 'Rand al Thor' }] },
    { id: 'b', thread_id: 't2', author: 'Atlas', text: 'systems', created_at: '2026-08-21T11:00:00Z' },
  ];
  assert.deepEqual(filterCommonsEntries(rows, 'rand', '', ['t1'], false).map((row) => row.id), ['a']);
  assert.deepEqual(filterCommonsEntries(rows, '', '', ['t2'], true).map((row) => row.id), ['b']);
});

test('unread markers use the last-seen timestamp', () => {
  const rows = [
    { id: 'a', created_at: '2026-08-21T10:00:00Z' },
    { id: 'b', created_at: '2026-08-21T12:00:00Z' },
  ];
  assert.deepEqual(unreadCommonsEntries(rows, '2026-08-21T11:00:00Z').map((row) => row.id), ['b']);
});

test('mentions render visibly without allowing raw HTML', () => {
  const html = renderCommonsMarkdown('@Atlas **look** <script>oops</script>');
  assert.match(html, /commons-mention/);
  assert.match(html, /<strong>look<\/strong>/);
  assert.equal(html.includes('<script>'), false);
});
