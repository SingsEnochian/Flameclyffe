import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createBootLifecycle } from '../src/os/boot-lifecycle.js';

test('boot lifecycle exposes explicit legal transitions and receipts them', () => {
  const bus = createEventBus();
  const boot = createBootLifecycle({ bus });
  assert.equal(boot.state(), 'BOOTING');
  const ready = boot.transition('READY', { reason: 'services-registered' });
  assert.equal(ready.previous_state, 'BOOTING');
  assert.equal(boot.state(), 'READY');
  boot.transition('PAUSED', { reason: 'feather' });
  assert.equal(boot.state(), 'PAUSED');
  boot.transition('READY', { reason: 'feather-cleared' });
  assert.equal(boot.state(), 'READY');
  const receipts = bus.history().filter((item) => item.name === 'arcsweep:os-boot-state');
  assert.equal(receipts.length, 3);
  assert.equal(receipts.at(-1).payload.state, 'READY');
});

test('boot lifecycle rejects impossible transitions rather than inventing state', () => {
  const boot = createBootLifecycle();
  assert.throws(() => boot.transition('BOOTING'), /Invalid ArcSweep boot transition/);
  boot.transition('ERROR', { reason: 'fatal-startup' });
  assert.throws(() => boot.transition('READY'), /Invalid ArcSweep boot transition/);
  boot.transition('BOOTING', { reason: 'explicit-retry' });
  assert.equal(boot.state(), 'BOOTING');
});
