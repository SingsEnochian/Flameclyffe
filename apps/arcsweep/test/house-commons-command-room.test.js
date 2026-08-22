import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommonsThreads, suggestThreadTitle, runtimeThreadContext } from '../src/house-commons-command-room.js';

test('Commons command room groups threads with participants unread and summaries', () => {
  const entries = [
    { id: 'a', thread_id: 't1', kind: 'steward', author: 'Rowan', text: '@Atlas inspect Terra Prime', created_at: '2026-08-21T20:00:00Z', world: { id: 'terra', name: 'Terra Prime' } },
    { id: 'b', thread_id: 't1', kind: 'voice', author: 'Atlas', text: 'Reading.', created_at: '2026-08-21T20:01:00Z' },
    { id: 'c', thread_id: 't1', kind: 'system', author: 'Atlas', text: 'Terra Prime thread summary', summary_of: 't1', created_at: '2026-08-21T20:02:00Z' },
  ];
  const [thread] = buildCommonsThreads(entries, { pinned: ['t1'], seenAt: '2026-08-21T20:00:30Z' });
  assert.equal(thread.id, 't1');
  assert.equal(thread.pinned, true);
  assert.equal(thread.unread, 2);
  assert.deepEqual(thread.participants, ['Rowan', 'Atlas']);
  assert.equal(thread.summary, 'Terra Prime thread summary');
  assert.equal(thread.world.name, 'Terra Prime');
});

test('Commons suggests compact titles without mention noise', () => {
  assert.equal(suggestThreadTitle([{ kind: 'steward', text: '@Atlas inspect the continuity braid' }]), 'inspect the continuity braid');
});

test('Runtime thread context braids thread and shared envelope state', () => {
  const context = runtimeThreadContext({ id: 't1', participants: ['Rowan', 'Atlas'], summary: 'Summary', world: { id: 'terra' } }, { session_id: 'session-1', canon: { refs: ['c1'] }, premaq: { P: 0.8 }, provenance: ['receipt-1'] });
  assert.equal(context.thread_id, 't1');
  assert.equal(context.runtime_session_id, 'session-1');
  assert.equal(context.world.id, 'terra');
  assert.deepEqual(context.canon.refs, ['c1']);
  assert.equal(context.premaq.P, 0.8);
  assert.deepEqual(context.provenance, ['receipt-1']);
});
