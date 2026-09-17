import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerObserverService } from '../src/os/observer-service.js';

test('Observer joins the OS as a read-only service with semantic status, source, DEEP, narrative, ledger, and safe timeline reads', async () => {
  const previousBridge = globalThis.__arcsweepObserverBridge;
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  const snapshot = {
    schema: 'hearthgate.observer.premaq/v1',
    generated_at: '2026-09-17T17:00:00.000Z',
    field: { P: 0.7, C: 0.6, R: 0.5, E: 0.4, M: 0.3, A: 0.8, Q: 0.2 },
    narrative_state: {
      phase: 'inspection',
      claims: [{ id: 'claim-1', text: 'Candidate pattern', evidence_refs: ['evidence-1'] }],
      evidence: [{ id: 'evidence-1', text: 'Observed sample', epistemic_status: 'observed' }],
      mechanism_edges: [{ id: 'edge-1', from: 'evidence-1', to: 'claim-1', relation: 'supports', epistemic_status: 'inferred' }],
    },
  };

  globalThis.__arcsweepObserverBridge = {
    schema: 'hearthgate.observer.premaq/v1',
    storageKey: 'observer-test',
    connected: true,
  };
  globalThis.localStorage = {
    getItem(key) { return key === 'observer-test' ? JSON.stringify(snapshot) : null; },
  };
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        schema: 'hearthgate.deep-current/v1',
        generated_at: snapshot.generated_at,
        field: snapshot.field,
        raw_field: snapshot.field,
        transformation_receipts: [],
      };
    },
  });

  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerObserverService(registry, { bus });

  const status = await registry.invoke('observer.status', {}, { authority: 'read' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.connected, true);
  assert.equal(status.output.availability.state, 'available');
  assert.equal(status.output.integration_health.state, 'healthy');
  assert.equal(status.output.runtime_state.state, 'unknown');
  assert.equal(status.output.data_health.state, 'healthy');
  assert.equal(status.output.provenance.unknowns_preserved, true);

  const source = await registry.invoke('observer.snapshot', {}, { authority: 'read' });
  assert.equal(source.status, 'applied');
  assert.equal(source.output.field.A, 0.8);

  const deep = await registry.invoke('observer.deep-current', {}, { authority: 'read' });
  assert.equal(deep.status, 'applied');
  assert.equal(deep.output.schema, 'hearthgate.deep-current/v1');
  assert.deepEqual(deep.output.raw_field, snapshot.field);

  const narrative = await registry.invoke('observer.narrative-state', {}, { authority: 'read' });
  assert.equal(narrative.status, 'applied');
  assert.equal(narrative.output.status, 'present');
  assert.equal(narrative.output.claims.length, 1);
  assert.equal(narrative.output.evidence.length, 1);
  assert.equal(narrative.output.boundaries.claim_is_fact, false);

  const ledger = await registry.invoke('observer.epistemic-ledger', {}, { authority: 'read' });
  assert.equal(ledger.status, 'applied');
  assert.equal(ledger.output.schema, 'arcsweep.epistemic-ledger/v1');
  assert.equal(ledger.output.counts.claims, 1);
  assert.equal(ledger.output.counts.evidence, 1);
  assert.equal(ledger.output.mechanism_edges[0].epistemic_status, 'inferred');
  assert.equal(ledger.output.boundaries.transport_ack_not_semantic_acceptance, true);

  bus.publish('arcsweep:caretaker-alert', { message: 'secret payload should stay out of timeline' }, { source: 'test-suite' });
  const timeline = await registry.invoke('observer.timeline', {}, { authority: 'read' });
  assert.equal(timeline.status, 'applied');
  assert.equal(timeline.output.schema, 'arcsweep.observer-os-timeline/v1');
  const latest = timeline.output.events.at(-1);
  assert.equal(latest.name, 'arcsweep:caretaker-alert');
  assert.equal(latest.source, 'test-suite');
  assert.equal(latest.payload, undefined);
  assert.equal(JSON.stringify(timeline.output).includes('secret payload'), false);

  const descriptors = registry.capabilities().filter((item) => item.service_id === 'observer-deep');
  assert.ok(descriptors.length >= 6);
  assert.ok(descriptors.every((item) => item.authority === 'read'));

  if (previousBridge === undefined) delete globalThis.__arcsweepObserverBridge;
  else globalThis.__arcsweepObserverBridge = previousBridge;
  if (previousFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = previousFetch;
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
});
