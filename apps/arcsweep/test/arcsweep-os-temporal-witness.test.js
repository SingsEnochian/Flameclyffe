import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createTemporalWitnessStore, registerTemporalWitnessService } from '../src/os/temporal-witness-service.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('Temporal Witness records only from explicit confirmed human operation and keeps prose off the event bus', async () => {
  const storage = memoryStorage();
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const fixedNow = () => new Date('2026-09-10T18:50:00.000Z');
  registerTemporalWitnessService(registry, {
    bus,
    storage,
    now: fixedNow,
    contextProvider: () => ({
      active_world_id: 'terra-aeterna',
      active_project_id: 'observer',
      active_room: 'deep-observer',
      active_context_id: 'context:one',
    }),
  });

  const input = {
    record_type: 'synchronicity',
    title: 'Two independent monitoring threads crossed',
    description: 'PRIVATE-PROSE-SENTINEL',
    occurred_at: '2026-09-10T18:43:00.000Z',
    tags: ['ai-history', 'observer'],
    source_refs: ['archive:nocturne-thread'],
    witness_refs: ['Nocturne'],
  };

  const unconfirmed = await registry.invoke('witness.record', input, {
    actor_id: 'human-ui', source: 'test', authority: 'operate',
  });
  assert.equal(unconfirmed.status, 'rejected');
  assert.equal(unconfirmed.reason, 'confirmation-required');

  const recorded = await registry.invoke('witness.record', input, {
    actor_id: 'human-ui', source: 'test', authority: 'operate', confirmed: true,
  });
  assert.equal(recorded.status, 'applied');
  assert.equal(recorded.output.record_type, 'synchronicity');
  assert.equal(recorded.output.context.world_id, 'terra-aeterna');
  assert.equal(recorded.output.context.room, 'deep-observer');
  assert.equal(recorded.output.visibility, 'local-private');

  const temporalEvent = bus.history().find((item) => item.name === 'arcsweep:temporal-witness-recorded');
  assert.ok(temporalEvent);
  assert.equal(JSON.stringify(temporalEvent.payload).includes('PRIVATE-PROSE-SENTINEL'), false);
  assert.equal(temporalEvent.payload.record_id, recorded.output.record_id);

  const summary = await registry.invoke('witness.summary', {}, { authority: 'read', source: 'test' });
  assert.equal(summary.status, 'applied');
  assert.equal(summary.output.total_records, 1);
  assert.equal(summary.output.last_24h, 1);
  assert.equal(summary.output.source_density, 1);
  assert.equal(summary.output.witness_density, 1);
  assert.deepEqual(summary.output.threads, [{ tag: 'ai-history', count: 1 }, { tag: 'observer', count: 1 }]);

  const recent = await registry.invoke('witness.recent', { limit: 3 }, { authority: 'read', source: 'test' });
  assert.equal(recent.status, 'applied');
  assert.equal(recent.output.records.length, 1);
  assert.equal(recent.output.records[0].description, undefined);
  assert.equal(JSON.stringify(recent.output).includes('PRIVATE-PROSE-SENTINEL'), false);

  const local = await registry.invoke('witness.list-local', { limit: 3 }, { authority: 'read', source: 'human-ui' });
  assert.equal(local.status, 'applied');
  assert.equal(local.output.records[0].description, 'PRIVATE-PROSE-SENTINEL');
});

test('Temporal Witness survives store recreation and reports Temporal Weather without manufacturing interpretation', async () => {
  const storage = memoryStorage();
  let current = new Date('2026-09-10T18:00:00.000Z');
  const now = () => new Date(current);
  const first = createTemporalWitnessStore({ storage, now });

  await first.add({ record_type: 'dream', title: 'Moon archive', occurred_at: '2026-09-10T06:00:00.000Z', tags: ['moon'] });
  await first.add({ record_type: 'real-world-event', title: 'Policy response', occurred_at: '2026-09-10T12:00:00.000Z', tags: ['ai-policy'], source_refs: ['source:one'] });
  await first.add({ record_type: 'social-climate', title: 'Rhetoric shift', occurred_at: '2026-09-10T13:00:00.000Z', tags: ['ai-policy'] });

  const second = createTemporalWitnessStore({ storage, now });
  const summary = second.summary();
  assert.equal(summary.total_records, 3);
  assert.equal(summary.temporal_weather, 'braided');
  assert.equal(summary.by_type.dream, 1);
  assert.equal(summary.by_type['real-world-event'], 1);
  assert.equal(summary.by_type['social-climate'], 1);
  assert.deepEqual(summary.threads[0], { tag: 'ai-policy', count: 2 });
  assert.equal(summary.causal_claim, undefined);

  current = new Date('2026-09-20T18:00:00.000Z');
  assert.equal(second.summary().last_24h, 0);
  assert.equal(second.summary().temporal_weather, 'quiet');
});

test('Temporal Witness is mounted after the kernel and present in the Vite sidecar build graph', () => {
  const source = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const kernelIndex = source.indexOf("'./os/bootstrap.js'");
  const witnessIndex = source.indexOf("'./temporal-witness-sidecar.js'");
  assert.ok(kernelIndex >= 0);
  assert.ok(witnessIndex > kernelIndex);
  assert.match(source, /import\.meta\.glob\([\s\S]*\.\/temporal-witness-sidecar\.js/);
});
