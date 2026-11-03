import test from 'node:test';
import assert from 'node:assert/strict';
import { createInstrumentBus, instrumentSnapshot, INSTRUMENTS } from '../src/instrument-bus.js';

test('all eight instruments share one bounded evidence bus', () => {
  const bus = createInstrumentBus({ limit: 3 });
  const seen = [];
  const unsubscribe = bus.subscribe(record => seen.push(record.kind));
  for (const kind of INSTRUMENTS) bus.publish(kind, { source: 'test', description: kind });
  assert.equal(seen.length, 8);
  assert.equal(bus.recent().length, 3);
  unsubscribe();
  bus.publish('Wonder', { description: 'after unsubscribe' });
  assert.equal(seen.length, 8);
});
test('unconnected adapters are never presented as measured observations', () => {
  const bus = createInstrumentBus();
  const initial = instrumentSnapshot(bus, 2);
  assert.equal(initial.length, 8);
  assert.equal(initial.find(item => item.kind === 'Cosmology').status, 'unconnected');
  assert.equal(initial.find(item => item.kind === 'Observation').description, '2 visible conversation turns');
  bus.publish('Continuity', { source: 'kernel-leave', reference: 'stop:test', description: 'stopped' });
  assert.equal(instrumentSnapshot(bus, 2).find(item => item.kind === 'Continuity').reference, 'stop:test');
  assert.throws(() => bus.publish('Unauthorized'), /Unknown instrument/);
});
