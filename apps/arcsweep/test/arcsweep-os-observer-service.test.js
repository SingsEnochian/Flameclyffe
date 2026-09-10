import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerObserverService } from '../src/os/observer-service.js';

test('Observer joins the OS as a read-only service with receipted status, source, and DEEP reads', async () => {
  const previousBridge = globalThis.__arcsweepObserverBridge;
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  const snapshot = { schema: 'hearthgate.observer.premaq/v1', field: { P: 0.7, C: 0.6, R: 0.5, E: 0.4, M: 0.3, A: 0.8, Q: 0.2 } };

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
        field: snapshot.field,
        raw_field: snapshot.field,
        transformation_receipts: [],
      };
    },
  });

  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerObserverService(registry);

  const status = await registry.invoke('observer.status', {}, { authority: 'read' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.connected, true);

  const source = await registry.invoke('observer.snapshot', {}, { authority: 'read' });
  assert.equal(source.status, 'applied');
  assert.equal(source.output.field.A, 0.8);

  const deep = await registry.invoke('observer.deep-current', {}, { authority: 'read' });
  assert.equal(deep.status, 'applied');
  assert.equal(deep.output.schema, 'hearthgate.deep-current/v1');
  assert.deepEqual(deep.output.raw_field, snapshot.field);

  const descriptors = registry.capabilities().filter((item) => item.service_id === 'observer-deep');
  assert.ok(descriptors.length >= 3);
  assert.ok(descriptors.every((item) => item.authority === 'read'));

  if (previousBridge === undefined) delete globalThis.__arcsweepObserverBridge;
  else globalThis.__arcsweepObserverBridge = previousBridge;
  if (previousFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = previousFetch;
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
});
