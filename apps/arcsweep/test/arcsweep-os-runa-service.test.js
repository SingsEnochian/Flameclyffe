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

function fakeManifestation() {
  const calls = [];
  return {
    calls,
    status: () => ({ native_haptics_available: true, glyph_sonification_enabled: false }),
    startWorldHum: async (input) => { calls.push(['world-hum-start', input]); return { kind: 'world-hum-start' }; },
    stopWorldHum: (reason) => { calls.push(['world-hum-stop', reason]); return { kind: 'world-hum-stop' }; },
    startSafeGateway: async (input) => { calls.push(['safe-gateway-start', input]); return { kind: 'safe-gateway-start' }; },
    stopSafeGateway: (reason) => { calls.push(['safe-gateway-stop', reason]); return { kind: 'safe-gateway-stop' }; },
    setGlyphSonification: async (input) => { calls.push(['glyph-setting', input]); return { kind: 'glyph-sonification-setting' }; },
    observeGlyphStroke: (stroke, meta) => { calls.push(['stroke', stroke, meta]); return { kind: 'glyph-stroke' }; },
    pulseHaptic: (input) => { calls.push(['haptic-pulse', input]); return { kind: 'haptic-pulse' }; },
    feather: (reason) => { calls.push(['feather', reason]); return { kind: 'feather' }; },
  };
}

class MemoryTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(handler);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type, detail) { for (const handler of this.listeners.get(type) || []) handler({ type, detail }); }
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

test('Runa manifestation capabilities are registered, human-gated, and drive one adapter', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const manifestation = fakeManifestation();
  const target = new MemoryTarget();
  registerRunaService(registry, { bus, manifestation, eventTarget: target });

  for (const capability of [
    'runa.manifestation.status',
    'runa.world-hum.start',
    'runa.world-hum.stop',
    'runa.safe-gateway.start',
    'runa.safe-gateway.stop',
    'runa.glyph-sonification.set',
    'runa.haptic.pulse',
    'runa.feather',
  ]) {
    assert.ok(registry.getCapability(capability), `${capability} is not registered`);
  }

  const blocked = await registry.invoke('runa.world-hum.start', { world_id: 'terra-aeterna' }, { authority: 'operate', actor_id: 'human:test' });
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.reason, 'confirmation-required');

  const started = await registry.invoke('runa.world-hum.start', { world_id: 'terra-aeterna' }, { authority: 'operate', actor_id: 'human:test', confirmed: true });
  assert.equal(started.status, 'applied');
  assert.equal(manifestation.calls[0][0], 'world-hum-start');

  const gateway = await registry.invoke('runa.safe-gateway.start', { hold: true }, { authority: 'operate', actor_id: 'human:test', confirmed: true });
  assert.equal(gateway.status, 'applied');
  assert.equal(manifestation.calls.at(-1)[0], 'safe-gateway-start');

  const haptic = await registry.invoke('runa.haptic.pulse', { pattern: [18, 24, 34] }, { authority: 'operate', actor_id: 'human:test', confirmed: true });
  assert.equal(haptic.status, 'applied');
  assert.equal(manifestation.calls.at(-1)[0], 'haptic-pulse');
});

test('Glyph Forge committed strokes feed Runa through the service event seam', () => {
  const registry = createCapabilityRegistry();
  const manifestation = fakeManifestation();
  const target = new MemoryTarget();
  const service = registerRunaService(registry, { manifestation, eventTarget: target });

  target.emit('starwell:glyph-stroke-committed', {
    schema: 'starwell.glyph-stroke-receipt/v1',
    stroke_id: 'stroke:test',
    glyph_id: 'glyph:test',
  });

  const strokeCall = manifestation.calls.find((entry) => entry[0] === 'stroke');
  assert.equal(strokeCall[1].stroke_id, 'stroke:test');
  assert.equal(strokeCall[2].source, 'glyph-forge-local');
  service.destroy();
});

test('Feather stops preview and manifestation output through the OS event spine', () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const reasons = [];
  const manifestation = fakeManifestation();
  registerRunaService(registry, {
    bus,
    manifestation,
    stopPreview: (reason) => { reasons.push(reason); return true; },
  });
  bus.publish('arcsweep:feather-paused', { paused: true, source: 'test' });
  assert.deepEqual(reasons, ['Feather']);
  assert.deepEqual(manifestation.calls.at(-1), ['feather', 'Feather']);
});
