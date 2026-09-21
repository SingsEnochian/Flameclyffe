import test from 'node:test';
import assert from 'node:assert/strict';

import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerRelationalFieldService } from '../src/os/relational-field-service.js';
import {
  createEmptyRelationalFieldStore,
  normaliseRelationalFieldStore,
} from '../src/relational-field-store.js';

function installMemoryStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
  return values;
}

test('Relational Field store normaliser rejects identity-soup records', () => {
  const store = createEmptyRelationalFieldStore();
  store.relations.good = {
    schema: 'arcsweep.relational-field/v0.1',
    relation_id: 'good',
    participant_ids: ['entity:a', 'entity:b'],
    state: {},
  };
  store.relations.bad = {
    schema: 'arcsweep.relational-field/v0.1',
    relation_id: 'bad',
    participant_ids: ['bad', 'entity:b'],
    state: {},
  };
  const normalised = normaliseRelationalFieldStore(store);
  assert.ok(normalised.relations.good);
  assert.equal(normalised.relations.bad, undefined);
});

test('Relational Field OS persists explicit relation creation and event updates with receipts', async () => {
  installMemoryStorage();
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerRelationalFieldService(registry, { bus });

  const denied = await registry.invoke('relation.create', {
    relation_id: 'relation:a-b',
    participant_ids: ['entity:a', 'entity:b'],
  }, { authority: 'mutate', source: 'test' });
  assert.equal(denied.status, 'rejected');
  assert.equal(denied.reason, 'confirmation-required');

  const created = await registry.invoke('relation.create', {
    relation_id: 'relation:a-b',
    participant_ids: ['entity:a', 'entity:b'],
    environment_id: 'world:test',
    state: { trust: 'forming' },
    provenance: { source: 'explicit-test' },
  }, { authority: 'mutate', confirmed: true, source: 'test' });
  assert.equal(created.status, 'applied');
  assert.equal(created.output.field.relation_id, 'relation:a-b');
  assert.deepEqual(created.output.field.participant_ids, ['entity:a', 'entity:b']);
  assert.equal(created.output.receipt.canon_promoted, false);

  const updated = await registry.invoke('relation.apply-event', {
    relation_id: 'relation:a-b',
    event: {
      event_id: 'event:trust-1',
      patch: { trust: 'established' },
      source_ref: 'receipt:test',
    },
  }, { authority: 'mutate', confirmed: true, source: 'test' });
  assert.equal(updated.status, 'applied');
  assert.equal(updated.output.field.revision, 1);
  assert.equal(updated.output.field.state.trust, 'established');
  assert.deepEqual(updated.output.field.participant_ids, ['entity:a', 'entity:b']);

  const read = await registry.invoke('relation.get', { relation_id: 'relation:a-b' }, { authority: 'read', source: 'test' });
  assert.equal(read.status, 'applied');
  assert.equal(read.output.field.revision, 1);
  assert.equal(read.output.field.state.trust, 'established');

  const changes = bus.history().filter((item) => item.name === 'arcsweep:relational-field-changed');
  assert.equal(changes.length, 2);
  assert.equal(changes[0].payload.participant_count, 2);
  assert.equal(JSON.stringify(changes).includes('trust'), false);
});

test('Relational Field projections are non-mutating and bounded by PREMAQC/Runa rules', async () => {
  installMemoryStorage();
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerRelationalFieldService(registry, { bus });

  await registry.invoke('relation.create', {
    relation_id: 'relation:projection',
    participant_ids: ['entity:one', 'entity:two'],
    state: { mode: 'linked' },
  }, { authority: 'mutate', confirmed: true, source: 'test' });

  const observer = await registry.invoke('relation.project-observer', {
    relation_id: 'relation:projection',
  }, { authority: 'read', source: 'test' });
  assert.equal(observer.status, 'applied');
  assert.equal(observer.output.authority.mutates_relation, false);

  const premaqc = await registry.invoke('relation.project-premaqc', {
    relation_id: 'relation:projection',
    evidence: {
      R: { asserted: true, value: 0.8, evidence_refs: ['observation:test'] },
      Q: { inferred: true, value: 1 },
    },
  }, { authority: 'read', source: 'test' });
  assert.equal(premaqc.status, 'applied');
  assert.equal(premaqc.output.axes.R.asserted, true);
  assert.equal(premaqc.output.axes.Q.asserted, false);
  assert.equal(premaqc.output.authority.same_letter_translation_forbidden, true);

  const runa = await registry.invoke('relation.project-runa', {
    relation_id: 'relation:projection',
    resonance: { descriptor: 'test-only' },
    glyph: { id: 'glyph:test' },
  }, { authority: 'read', source: 'test' });
  assert.equal(runa.status, 'applied');
  assert.equal(runa.output.authority.physical_output_claim, false);
  assert.equal(runa.output.authority.semantic_projection_only, true);

  const reread = await registry.invoke('relation.get', { relation_id: 'relation:projection' }, { authority: 'read', source: 'test' });
  assert.equal(reread.output.field.revision, 0);
  assert.deepEqual(reread.output.field.state, { mode: 'linked' });

  const projectedEvents = bus.history().filter((item) => item.name === 'arcsweep:relational-field-projected');
  assert.equal(projectedEvents.length, 3);
  assert.ok(projectedEvents.every((item) => item.payload.persisted === false));
});
