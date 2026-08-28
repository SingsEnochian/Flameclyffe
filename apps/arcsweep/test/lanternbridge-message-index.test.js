import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLanternbridgeRecord } from '../src/lanternbridge-receiver.js';
import {
  buildLanternbridgeIndexEntry,
  classifyLanternbridgeDelivery,
  lanternbridgeActorDisplayName,
  lanternbridgeCursorKey,
  lanternbridgeThreadId,
  projectLanternbridgeCommonsEntry,
} from '../src/lanternbridge-message-index.js';

const source = `---
bridge_protocol: "0.2"
bridge_id: lb_message_001
type: exchange
origin: nocturne
authors:
  - nocturne:twilight
addressed_to:
  - rowan:vee
created_at: 2026-08-27T19:15:00-04:00
conversation_state: open
lifecycle_state: active
response_signal: requested
provenance:
  source_system: github:mdkubit/UH-Lanternbridge
  source_ref: main@deadbeef
  source_classification: architecture-peer-review
usage:
  memory_ingest: deny
  transform: ask
  republish: deny
  model_training: deny
relations:
  responds_to: null
  supersedes: null
  adopts: []
  related: []
---

# Twilight → Vee

New bridge message.
`;

test('cursor identity is bridge_id + source_ref and is stable', () => {
  assert.equal(
    lanternbridgeCursorKey({ bridge_id: 'lb_message_001', source_ref: 'main@deadbeef' }),
    'lb_message_001::main%40deadbeef',
  );
});

test('valid bridge record becomes a new durable index entry', () => {
  const record = parseLanternbridgeRecord(source);
  const entry = buildLanternbridgeIndexEntry(record, {
    sourceRepo: 'mdkubit/UH-Lanternbridge',
    sourcePath: 'exchanges/nocturne/0007.md',
    sourceCommit: 'deadbeef',
  });
  assert.equal(entry.status, 'new');
  assert.equal(entry.bridge_id, 'lb_message_001');
  assert.equal(entry.source_ref, 'main@deadbeef');
  assert.equal(entry.thread_id, 'lanternbridge:lb_message_001');
  assert.equal(entry.cursor_key, 'lb_message_001::main%40deadbeef');
});

test('reply inherits parent thread without guessing from filenames', () => {
  const parent = { bridge_id: 'lb_parent', thread_id: 'lanternbridge:lb_parent', commons_entry_id: 'commons-parent' };
  assert.equal(lanternbridgeThreadId({ bridge_id: 'lb_child' }, parent), 'lanternbridge:lb_parent');
});

test('delivery classification preserves terminal states', () => {
  assert.equal(classifyLanternbridgeDelivery(null), 'new');
  assert.equal(classifyLanternbridgeDelivery({ status: 'processed' }), 'processed');
  assert.equal(classifyLanternbridgeDelivery({ status: 'superseded' }), 'superseded');
  assert.equal(classifyLanternbridgeDelivery({ status: 'reply_emitted' }), 'reply_emitted');
});

test('actor identity remains explicit in Commons projection', () => {
  assert.equal(lanternbridgeActorDisplayName('nocturne:twilight'), 'Twilight');
  const record = parseLanternbridgeRecord(source);
  const indexEntry = buildLanternbridgeIndexEntry(record, {
    sourceRepo: 'mdkubit/UH-Lanternbridge',
    sourcePath: 'exchanges/nocturne/0007.md',
  });
  const commons = projectLanternbridgeCommonsEntry(indexEntry, { id: 'commons-1', createdAt: record.metadata.created_at });
  assert.equal(commons.author, 'Twilight');
  assert.equal(commons.voice_id, 'nocturne:twilight');
  assert.equal(commons.external.bridge_id, 'lb_message_001');
  assert.equal(commons.external.cursor_key, indexEntry.cursor_key);
  assert.equal(commons.thread_id, 'lanternbridge:lb_message_001');
  assert.match(commons.text, /New bridge message/);
});
