import assert from 'node:assert/strict';
import test from 'node:test';

import { createAspectMessageBus } from '../src/aspects/aspect-message-bus.js';
import {
  aspectEnvelopeToHouseEntry,
  bindAspectBusToHouse,
  houseEntryAspectMetadata,
  persistAspectTrace,
  readPersistedAspectTrace,
} from '../src/aspects/aspect-house-runtime.js';

test('ordinary aspect chatter persists to #agent-chatter with aspect/runtime identities separate', () => {
  const envelope = {
    id: 'aspect-msg-1',
    traceId: 'trace-1',
    sender: {
      aspectId: 'critic',
      invocationId: 'runtime:vethrlauf:house:vethrlauf:test:model',
      voiceId: 'vethrlauf',
      provider: 'test-provider',
      model: 'test-model',
    },
    recipients: ['maker'],
    kind: 'challenge',
    body: 'Reload state still needs verification.',
    evidenceRefs: ['receipt:reload'],
    stateRefs: ['state:before'],
  };

  const entry = aspectEnvelopeToHouseEntry(envelope);
  const metadata = houseEntryAspectMetadata(entry);

  assert.equal(entry.thread_id, 'house-room:agent-chatter');
  assert.equal(entry.kind, 'voice');
  assert.equal(entry.author, 'Critic');
  assert.equal(entry.voice_id, 'vethrlauf');
  assert.equal(entry.runtime.provider, 'test-provider');
  assert.equal(entry.runtime.model, 'test-model');
  assert.equal(entry.status, 'challenge');
  assert.equal(metadata.traceId, 'trace-1');
  assert.equal(metadata.aspectKind, 'challenge');
  assert.deepEqual(metadata.recipients, ['maker']);
  assert.deepEqual(metadata.evidenceRefs, ['receipt:reload']);
});

test('operational results route to #action while exploratory narrative routes to #roleplay', () => {
  const result = aspectEnvelopeToHouseEntry({
    id: 'aspect-result-1', traceId: 'trace-result', sender: { aspectId: 'maker' }, recipients: [],
    kind: 'result', body: 'Patch applied.', evidenceRefs: [], stateRefs: [],
  });
  const narrative = aspectEnvelopeToHouseEntry({
    id: 'aspect-story-1', traceId: 'trace-story', sender: { aspectId: 'narrative' }, recipients: [],
    kind: 'proposal', body: { mode: 'exploration', domain: 'narrative', text: 'Try the relational memory leaf.' }, evidenceRefs: [], stateRefs: [],
  });

  assert.equal(result.thread_id, 'house-room:action');
  assert.equal(narrative.thread_id, 'house-room:roleplay');
});

test('trace persistence preserves House reply lineage when parents were persisted first', async () => {
  let nextId = 0;
  const writes = [];
  const append = async (_token, entry) => {
    const saved = { ...entry, id: `house-entry-${++nextId}`, created_at: `2026-09-24T21:0${nextId}:00.000-04:00` };
    writes.push(saved);
    return saved;
  };

  const source = [
    {
      id: 'm1', traceId: 'trace-chain', sender: { aspectId: 'mapper' }, recipients: ['maker'],
      kind: 'proposal', body: 'Reuse the existing runtime adapter.', evidenceRefs: [], stateRefs: [],
    },
    {
      id: 'm2', traceId: 'trace-chain', parentId: 'm1', sender: { aspectId: 'maker', voiceId: 'oxalpha' }, recipients: ['mapper'],
      kind: 'result', body: 'Bound the adapter.', evidenceRefs: [], stateRefs: [],
    },
  ];

  const results = await persistAspectTrace(source, { token: 'test-token', append });

  assert.equal(results.length, 2);
  assert.equal(writes[0].reply_to, null);
  assert.equal(writes[1].reply_to, 'house-entry-1');
  assert.equal(writes[0].thread_id, 'house-room:agent-chatter');
  assert.equal(writes[1].thread_id, 'house-room:action');
});

test('live bus binding serializes persistence without blocking publish', async () => {
  const bus = createAspectMessageBus();
  const persisted = [];
  const bridge = bindAspectBusToHouse({
    bus,
    token: 'test-token',
    persist: async (envelope, options) => {
      const result = {
        status: 'persisted', envelopeId: envelope.id, traceId: envelope.traceId,
        entry: { id: `house:${envelope.id}`, reply_to: options.houseParentId || null },
      };
      persisted.push(result);
      return result;
    },
  });

  const first = bus.publish({
    id: 'bus-1', traceId: 'bus-trace', sender: { aspectId: 'mapper' }, recipients: ['critic'],
    kind: 'proposal', body: 'Try the existing seam.',
  });
  bus.publish({
    id: 'bus-2', traceId: 'bus-trace', parentId: first.id, sender: { aspectId: 'critic' }, recipients: ['mapper'],
    kind: 'challenge', body: 'Keep model identity separate.',
  });

  const results = await bridge.flush();
  bridge.stop();

  assert.equal(results.length, 2);
  assert.equal(persisted[0].entry.reply_to, null);
  assert.equal(persisted[1].entry.reply_to, 'house:bus-1');
});

test('persisted traces can be recovered from canonical House links', async () => {
  const entries = [
    aspectEnvelopeToHouseEntry({
      id: 'recover-1', traceId: 'recover-trace', sender: { aspectId: 'continuity' }, recipients: [],
      kind: 'observation', body: 'This thread survives reconnect.', evidenceRefs: [], stateRefs: ['state:1'],
    }),
    aspectEnvelopeToHouseEntry({
      id: 'other-1', traceId: 'other-trace', sender: { aspectId: 'mapper' }, recipients: [],
      kind: 'thought', body: 'Different thread.', evidenceRefs: [], stateRefs: [],
    }),
  ];
  const recovered = await readPersistedAspectTrace('recover-trace', {
    token: 'test-token',
    read: async () => ({ entries }),
  });

  assert.equal(recovered.status, 'read');
  assert.equal(recovered.entries.length, 1);
  assert.equal(recovered.entries[0].aspect.envelopeId, 'recover-1');
  assert.deepEqual(recovered.entries[0].aspect.stateRefs, ['state:1']);
});
