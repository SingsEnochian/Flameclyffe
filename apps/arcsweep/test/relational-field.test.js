import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELATIONAL_FIELD_SCHEMA,
  applyRelationalFieldEvent,
  createRelationalField,
  relationalFieldProjection,
} from '../src/relational-field.js';

test('relational field remains distinct from its participants', () => {
  const field = createRelationalField({
    relationId: 'relation:rileth',
    participantIds: ['entity:ril', 'entity:eth'],
    environmentId: 'world:amalthi',
    state: { coherence: 0.5 },
  });

  assert.equal(field.schema, RELATIONAL_FIELD_SCHEMA);
  assert.deepEqual(field.participant_ids, ['entity:ril', 'entity:eth']);
  assert.notEqual(field.relation_id, field.participant_ids[0]);
  assert.notEqual(field.relation_id, field.participant_ids[1]);
});

test('relational field rejects relation ids that erase participant identity', () => {
  assert.throws(() => createRelationalField({
    relationId: 'entity:ril',
    participantIds: ['entity:ril', 'entity:eth'],
  }), /distinct from every participant identity/);
});

test('events update relation state without mutating participant identity', () => {
  const field = createRelationalField({
    relationId: 'relation:pair-01',
    participantIds: ['entity:a', 'entity:b'],
    state: { trust: 0.2, synchrony: 0.1 },
    historyRefs: ['source:opening-state'],
  });

  const next = applyRelationalFieldEvent(field, {
    eventId: 'event:shared-flight',
    patch: { synchrony: 0.8 },
    timestamp: '2026-09-18T18:36:00Z',
    sourceRef: 'source:scene-01',
  });

  assert.equal(field.revision, 0);
  assert.equal(field.state.synchrony, 0.1);
  assert.equal(next.revision, 1);
  assert.equal(next.state.trust, 0.2);
  assert.equal(next.state.synchrony, 0.8);
  assert.deepEqual(next.participant_ids, field.participant_ids);
  assert.ok(next.history_refs.includes('event:shared-flight'));
  assert.equal(next.last_event.relation_id, 'relation:pair-01');
});

test('projection is suitable for Observer, PREMAQC, Runa, and Codex adapters', () => {
  const field = createRelationalField({
    relationId: 'relation:test',
    participantIds: ['entity:a', 'entity:b'],
    provenance: { source: 'fixture' },
  });

  const projection = relationalFieldProjection(field);
  assert.equal(projection.relation_id, 'relation:test');
  assert.deepEqual(projection.participant_ids, ['entity:a', 'entity:b']);
  assert.deepEqual(projection.provenance, { source: 'fixture' });
});
