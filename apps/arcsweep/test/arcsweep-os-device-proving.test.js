import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createDeviceProbe, registerDeviceProvingService } from '../src/os/device-proving.js';

test('device probe records pointer capability evidence without coordinates or content', () => {
  const probe = createDeviceProbe({ now: () => new Date('2026-09-10T18:10:00.000Z') });
  const proof = probe.observePointer({ pointerType: 'pen', pressure: 0.54, tiltX: 18, tiltY: 0, twist: 22, clientX: 999, clientY: 888, target: { value: 'secret text' } });
  assert.equal(proof.pointer_type, 'pen');
  assert.equal(proof.pressure_observed, true);
  assert.equal(proof.tilt_observed, true);
  assert.equal(proof.twist_observed, true);
  const encoded = JSON.stringify(proof);
  assert.equal(encoded.includes('999'), false);
  assert.equal(encoded.includes('secret text'), false);
});

test('device proving service is read-only and never triggers vibration or audio', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const probe = createDeviceProbe();
  probe.observePointer({ pointerType: 'touch', pressure: 0.2 });
  registerDeviceProvingService(registry, { probe });
  const status = await registry.invoke('device.status', {}, { authority: 'read' });
  const proof = await registry.invoke('device.input-proof', {}, { authority: 'read' });
  assert.equal(status.status, 'applied');
  assert.equal(proof.output.pointer_type, 'touch');
  const descriptors = registry.capabilities().filter((item) => item.service_id === 'device-proving');
  assert.ok(descriptors.every((item) => item.authority === 'read'));
});
