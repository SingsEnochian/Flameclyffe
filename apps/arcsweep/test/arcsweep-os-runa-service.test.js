import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerRunaService } from '../src/os/runa-service.js';

function plan() {
  return {
    schema: 'arcsweep.runa-preview-plan/v1',
    plan_id: 'plan:test',
    plan_fingerprint: 'fingerprint:test',
    world: { id: 'terra-aeterna' },
    source: { renderer_review_id: 'review:1', renderer_candidate_id: 'candidate:1', suggestion_id: 'suggestion:1', palette_id: null, palette_fingerprint: null },
    preview: {
      duration_ms: 1800,
      waveform: 'triangle',
      base_hz: 220,
      target_hz: 221,
      bus: 'tones',
      keyboard_harmonics: { assigned: false },
      environmental_soundscape: { assigned: false },
      haptic: false,
      midi: false,
      soundfont: false,
    },
    authority: {
      requires_explicit_user_launch: true,
      autoplay_authorized: false,
      persistent_world_root_mutable: false,
    },
  };
}

test('Runa sensory service is inspectable and launch remains confirmation-gated', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  let launches = 0;
  registerRunaService(registry, {
    bus,
    isPreviewActive: () => false,
    audioContextProvider: () => function AudioContext() {},
    launchPreview: async () => {
      launches += 1;
      return {
        audio: true,
        bus: 'temporary-preview-output',
        waveform: 'triangle',
        root_hz_before: 220,
        root_hz_after: 220,
        actual_duration_ms: 1800,
        started_at: '2026-09-10T00:00:00.000Z',
        completed_at: '2026-09-10T00:00:01.800Z',
        keyboard_harmonics: false,
        environmental_soundscape: false,
        stopped_early: false,
        haptic: false,
        midi: false,
        soundfont: false,
      };
    },
    renderReceipt: async ({ plan: received, launchedBy }) => ({
      schema: 'arcsweep.runa-preview-render/v1',
      plan_id: received.plan_id,
      launched_by: launchedBy,
    }),
  });

  const status = await registry.invoke('runa.status', {}, { authority: 'read', actor_id: 'guide:test' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.web_audio_available, true);

  const inspected = await registry.invoke('runa.inspect-preview-plan', { plan: plan() }, { authority: 'read', actor_id: 'guide:test' });
  assert.equal(inspected.status, 'applied');
  assert.equal(inspected.output.world_id, 'terra-aeterna');

  const blocked = await registry.invoke('runa.launch-preview', { plan: plan() }, { authority: 'operate', actor_id: 'human:test' });
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.reason, 'confirmation-required');
  assert.equal(launches, 0);

  const launched = await registry.invoke('runa.launch-preview', { plan: plan() }, { authority: 'operate', actor_id: 'human:test', confirmed: true });
  assert.equal(launched.status, 'applied');
  assert.equal(launches, 1);
  assert.equal(launched.output.schema, 'arcsweep.runa-preview-render/v1');
});

test('Feather stops an active Runa preview through the OS event spine', () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const reasons = [];
  registerRunaService(registry, { bus, stopPreview: (reason) => { reasons.push(reason); return true; } });
  bus.publish('arcsweep:feather-paused', { paused: true, source: 'test' });
  assert.deepEqual(reasons, ['Feather']);
});
