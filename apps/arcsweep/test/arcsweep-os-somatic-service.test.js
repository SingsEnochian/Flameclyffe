import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerSomaticService } from '../src/os/somatic-service.js';

function makeRegistry() {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  return { bus, registry };
}

test('somatic service exposes a bounded semantic cue catalog without emitting output', async () => {
  const { bus, registry } = makeRegistry();
  registerSomaticService(registry, {
    bus,
    audioContextProvider: () => function AudioContext() {},
    vibrationProvider: () => function vibrate() {},
    isCueActive: () => false,
  });

  const status = await registry.invoke('somatic.status', {}, { authority: 'read', actor_id: 'guide:test' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.web_audio_available, true);
  assert.equal(status.output.vibration_available, true);
  assert.equal(status.output.explicit_user_launch_required, true);

  const catalog = await registry.invoke('somatic.list-cues', {}, { authority: 'read', actor_id: 'guide:test' });
  assert.equal(catalog.status, 'applied');
  assert.ok(catalog.output.cues.some((cue) => cue.id === 'threshold'));
  assert.ok(catalog.output.cues.some((cue) => cue.id === 'brush_contact'));
});

test('somatic output is confirmation-gated and publishes a receipt only after emission', async () => {
  const { bus, registry } = makeRegistry();
  const emitted = [];
  bus.subscribe('arcsweep:somatic-cue-emitted', (event) => emitted.push(event.payload), { id: 'somatic-test-observer' });

  let launches = 0;
  registerSomaticService(registry, {
    bus,
    emitCue: async (cueId, options) => {
      launches += 1;
      return {
        schema: 'arcsweep.somatic-receipt/v1',
        cue_id: cueId,
        source: options.source,
        audio: true,
        haptic: false,
        bone_conduction_ready: true,
      };
    },
  });

  const blocked = await registry.invoke('somatic.emit-cue', { cue_id: 'threshold' }, { authority: 'operate', actor_id: 'human:test' });
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.reason, 'confirmation-required');
  assert.equal(launches, 0);
  assert.equal(emitted.length, 0);

  const launched = await registry.invoke('somatic.emit-cue', { cue_id: 'threshold' }, { authority: 'operate', actor_id: 'human:test', confirmed: true });
  assert.equal(launched.status, 'applied');
  assert.equal(launches, 1);
  assert.equal(launched.output.cue_id, 'threshold');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].schema, 'arcsweep.somatic-receipt/v1');
});

test('Feather stops active somatic output through the OS event spine', () => {
  const { bus, registry } = makeRegistry();
  const reasons = [];
  registerSomaticService(registry, {
    bus,
    stopCue: (reason) => { reasons.push(reason); return true; },
  });
  bus.publish('arcsweep:feather-paused', { paused: true, source: 'test' });
  assert.deepEqual(reasons, ['Feather']);
});
