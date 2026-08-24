import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RUNA_SURFACE_HAPTIC_ADAPTER_RENDER_SCHEMA,
  RUNA_SURFACE_HAPTIC_ADAPTER_SCHEMA,
  createBrowserSurfaceHapticAdapter,
} from '../src/runa-surface-haptic-adapter.js';

test('browser surface haptic adapter reports timing-only capability truthfully', async () => {
  const calls = [];
  const navigatorObject = { vibrate(value) { calls.push(value); return true; } };
  const adapter = createBrowserSurfaceHapticAdapter({ navigatorObject });

  assert.equal(adapter.schema, RUNA_SURFACE_HAPTIC_ADAPTER_SCHEMA);
  assert.equal(adapter.adapter_id, 'browser-vibration');
  assert.equal(adapter.carrier, 'surface_haptic');
  assert.equal(adapter.execution, 'browser-vibration');
  assert.equal(adapter.isSupported(), true);
  assert.equal(adapter.capabilities.timing_control, true);
  assert.equal(adapter.capabilities.frequency_control, false);
  assert.equal(adapter.capabilities.intensity_control, false);
  assert.equal(adapter.capabilities.medical_device_control, false);
  assert.equal(adapter.capabilities.external_bone_audio, false);
  assert.equal(adapter.capabilities.implant_bone_audio, false);

  const receipt = await adapter.render({
    carrier: 'surface_haptic',
    pattern_ms: [100, 50],
    duration_ms: 320,
  });

  assert.equal(receipt.schema, RUNA_SURFACE_HAPTIC_ADAPTER_RENDER_SCHEMA);
  assert.equal(receipt.supported, true);
  assert.equal(receipt.rendered, true);
  assert.deepEqual(receipt.requested_pattern_ms, [100, 50, 100, 50, 20]);
  assert.equal(receipt.authority.timing_only, true);
  assert.equal(receipt.authority.actuator_frequency_claimed, false);
  assert.equal(receipt.authority.intensity_control_claimed, false);
  assert.equal(receipt.authority.medical_device_control_used, false);
  assert.equal(receipt.authority.bone_audio_claimed, false);
  assert.deepEqual(calls[0], [100, 50, 100, 50, 20]);

  assert.equal(adapter.stop(), true);
  assert.equal(calls.at(-1), 0);
});

test('browser surface haptic adapter receipts unsupported environments without counterfeiting output', async () => {
  const adapter = createBrowserSurfaceHapticAdapter({ navigatorObject: {} });
  assert.equal(adapter.isSupported(), false);

  const receipt = await adapter.render({
    carrier: 'surface_haptic',
    pattern_ms: [120, 80],
    duration_ms: 400,
  });

  assert.equal(receipt.supported, false);
  assert.equal(receipt.rendered, false);
  assert.equal(receipt.authority.actuator_frequency_claimed, false);
  assert.equal(receipt.authority.medical_device_control_used, false);
  assert.equal(adapter.stop(), false);
});

test('browser surface haptic adapter refuses non-haptic carrier plans', async () => {
  const adapter = createBrowserSurfaceHapticAdapter({ navigatorObject: { vibrate: () => true } });
  await assert.rejects(
    adapter.render({ carrier: 'implant_bone_audio', pattern_ms: [100], duration_ms: 100 }),
    /surface_haptic carrier plan required/i,
  );
});
