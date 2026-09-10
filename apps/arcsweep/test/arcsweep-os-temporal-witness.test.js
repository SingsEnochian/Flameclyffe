import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createGuideShell } from '../src/os/guide-shell.js';
import { createTemporalWitnessStore, registerTemporalWitnessService } from '../src/os/temporal-witness-service.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('Temporal Witness records only from explicit confirmed human operation and keeps private prose off the event bus', async () => {
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
    observer_refs: ['Nocturne', 'Rowan'],
    relations: [{ record_id: 'temporal:earlier', relation_type: 'independent-convergence' }],
    methodology: {
      direct_observation: 'PRIVATE-LENS-SENTINEL',
      change_noted: 'Two separately started monitoring threads were compared.',
      why_noteworthy: 'The overlap became visible after both existed.',
      method_note: 'Timestamped chat plus search-task receipts.',
    },
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
  assert.deepEqual(recorded.output.observer_refs, ['Nocturne', 'Rowan']);
  assert.equal(recorded.output.relations[0].relation_type, 'independent-convergence');
  assert.equal(recorded.output.methodology.direct_observation, 'PRIVATE-LENS-SENTINEL');

  const temporalEvent = bus.history().find((item) => item.name === 'arcsweep:temporal-witness-recorded');
  assert.ok(temporalEvent);
  const eventText = JSON.stringify(temporalEvent.payload);
  assert.equal(eventText.includes('PRIVATE-PROSE-SENTINEL'), false);
  assert.equal(eventText.includes('PRIVATE-LENS-SENTINEL'), false);
  assert.equal(temporalEvent.payload.record_id, recorded.output.record_id);
  assert.equal(temporalEvent.payload.observer_count, 2);
  assert.equal(temporalEvent.payload.methodology_field_count, 4);
  assert.equal(temporalEvent.payload.convergence_marked, true);

  const summary = await registry.invoke('witness.summary', {}, { authority: 'read', source: 'test' });
  assert.equal(summary.status, 'applied');
  assert.equal(summary.output.total_records, 1);
  assert.equal(summary.output.last_24h, 1);
  assert.equal(summary.output.source_density, 1);
  assert.equal(summary.output.witness_density, 1);
  assert.equal(summary.output.observer_density, 1);
  assert.equal(summary.output.methodology_density, 1);
  assert.equal(summary.output.explicit_convergence_links, 1);
  assert.equal(summary.output.convergence_detected, true);
  assert.deepEqual(summary.output.threads, [{ tag: 'ai-history', count: 1 }, { tag: 'observer', count: 1 }]);

  const recent = await registry.invoke('witness.recent', { limit: 3 }, { authority: 'read', source: 'test' });
  assert.equal(recent.status, 'applied');
  assert.equal(recent.output.records.length, 1);
  assert.equal(recent.output.records[0].description, undefined);
  assert.equal(recent.output.records[0].observer_count, 2);
  assert.equal(recent.output.records[0].methodology_field_count, 4);
  assert.equal(JSON.stringify(recent.output).includes('PRIVATE-PROSE-SENTINEL'), false);
  assert.equal(JSON.stringify(recent.output).includes('PRIVATE-LENS-SENTINEL'), false);

  const localUnconfirmed = await registry.invoke('witness.list-local', { limit: 3 }, { authority: 'operate', source: 'human-ui' });
  assert.equal(localUnconfirmed.status, 'rejected');
  assert.equal(localUnconfirmed.reason, 'confirmation-required');

  const local = await registry.invoke('witness.list-local', { limit: 3 }, { authority: 'operate', source: 'human-ui', confirmed: true });
  assert.equal(local.status, 'applied');
  assert.equal(local.output.records[0].description, 'PRIVATE-PROSE-SENTINEL');
});

test('Temporal Witness detects independent convergence from shared threads and independent observers', async () => {
  const storage = memoryStorage();
  let current = new Date('2026-09-10T18:00:00.000Z');
  const now = () => new Date(current);
  const first = createTemporalWitnessStore({ storage, now });

  await first.add({
    record_type: 'real-world-event',
    title: 'Policy response',
    occurred_at: '2026-09-10T12:00:00.000Z',
    tags: ['ai-policy'],
    source_refs: ['source:one'],
    observer_refs: ['Rowan-search'],
    methodology: { change_noted: 'A lawmaker moved from commentary to a concrete proposal.' },
  });
  await first.add({
    record_type: 'social-climate',
    title: 'Independent rhetoric watch catches same thread',
    occurred_at: '2026-09-10T13:00:00.000Z',
    tags: ['ai-policy'],
    observer_refs: ['Twilight-watch'],
  });
  await first.add({ record_type: 'dream', title: 'Moon archive', occurred_at: '2026-09-10T06:00:00.000Z', tags: ['moon'] });

  const second = createTemporalWitnessStore({ storage, now });
  const summary = second.summary();
  assert.equal(summary.total_records, 3);
  assert.equal(summary.temporal_weather, 'braided');
  assert.equal(summary.by_type.dream, 1);
  assert.equal(summary.by_type['real-world-event'], 1);
  assert.equal(summary.by_type['social-climate'], 1);
  assert.deepEqual(summary.threads[0], { tag: 'ai-policy', count: 2 });
  assert.equal(summary.convergence_detected, true);
  assert.equal(summary.convergences.length, 1);
  assert.deepEqual(summary.convergences[0], {
    thread: 'ai-policy',
    record_count: 2,
    observer_count: 2,
    explicit_relation_count: 0,
    latest_at: '2026-09-10T13:00:00.000Z',
  });
  assert.equal(summary.causal_claim, undefined);

  current = new Date('2026-09-20T18:00:00.000Z');
  assert.equal(second.summary().last_24h, 0);
  assert.equal(second.summary().temporal_weather, 'quiet');
});

test('Guide can inspect bounded Chronicle weather but cannot read full local prose or create anchors', async () => {
  const requested = [];
  const guide = createGuideShell({
    invoke: async (capabilityId, input, context) => {
      requested.push({ capabilityId, input, context });
      return { status: 'applied', capability_id: capabilityId };
    },
  });
  const allowed = guide.allowedCapabilities().map((item) => item.capability_id);
  assert.ok(allowed.includes('witness.status'));
  assert.ok(allowed.includes('witness.summary'));
  assert.ok(allowed.includes('witness.recent'));
  assert.equal(allowed.includes('witness.list-local'), false);
  assert.equal(allowed.includes('witness.record'), false);

  const summary = await guide.request('witness.summary');
  assert.equal(summary.status, 'applied');
  assert.equal(requested[0].context.authority, 'read');

  const blocked = await guide.request('witness.list-local', { limit: 1 }, { confirmed: true, authority: 'admin' });
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.reason, 'guide-capability-not-allowed');
});

test('Temporal Witness surface contains the Witness Lens and convergence controls', () => {
  const source = readFileSync(new URL('../src/os/temporal-witness-surface.js', import.meta.url), 'utf8');
  assert.match(source, /Witness Lens/);
  assert.match(source, /Convergence detected/);
  assert.match(source, /independent observers \/ logs/);
  assert.match(source, /relation_type/);
});

test('Temporal Witness is mounted after the kernel and present in the Vite sidecar build graph', () => {
  const source = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const kernelIndex = source.indexOf("'./os/bootstrap.js'");
  const witnessIndex = source.indexOf("'./temporal-witness-sidecar.js'");
  assert.ok(kernelIndex >= 0);
  assert.ok(witnessIndex > kernelIndex);
  assert.match(source, /import\.meta\.glob\([\s\S]*\.\/temporal-witness-sidecar\.js/);

  const sidecar = readFileSync(new URL('../src/temporal-witness-sidecar.js', import.meta.url), 'utf8');
  assert.match(sidecar, /subscribe\?\.\('arcsweep:temporal-witness-recorded', \(receipt\) =>/);
  assert.match(sidecar, /id: 'temporal-witness-dom-bridge'/);
});
