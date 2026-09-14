import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerGlyphForgeService } from '../src/os/glyphforge-service.js';
import { registerRunaService } from '../src/os/runa-service.js';
import {
  KELYRAN_SOMATIC_PROFILE,
  SOMATIC_CARTOGRAPHY_RECEIPT_SCHEMA,
  calculateSomaticCourse,
  createSomaticState,
  createSomaticTarget,
} from '../src/os/somatic-cartography.js';
import { registerSomaticCartographyService } from '../src/os/somatic-cartography-service.js';

function memoryEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, handler) {
      const bucket = listeners.get(name) || new Set();
      bucket.add(handler);
      listeners.set(name, bucket);
    },
    removeEventListener(name, handler) { listeners.get(name)?.delete(handler); },
    dispatchEvent(event) {
      const bucket = listeners.get(event.type) || new Set();
      for (const handler of bucket) handler(event);
      return bucket.size > 0;
    },
    listenerCount(name) { return listeners.get(name)?.size || 0; },
  };
}

function makeStateAndTarget() {
  const state = createSomaticState({
    world_id: 'kelyran',
    observed_at: '2026-09-14T15:50:00.000Z',
    channels: { posture: { mode: 'receptive' }, movement: { cadence_bpm: 48 } },
    provenance: { source: 'test' },
  });
  const target = createSomaticTarget({
    target_id: 'target:meda',
    label: 'Meda embodied glyph',
    desired: { gesture_id: 'glyph.meda', posture: 'writing', rhythm_bpm: 55 },
    arrival_conditions: ['embodied-glyph', 'breath-softened'],
  });
  return { state, target };
}

test('Somatic Cartography plans Kelyran meda as a body-to-glyph course', () => {
  const { state, target } = makeStateAndTarget();
  const course = calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: () => new Date('2026-09-14T15:51:00.000Z') });

  assert.equal(course.schema, 'arcsweep.somatic-course/v1');
  assert.equal(course.world_id, 'kelyran');
  assert.ok(course.steps.some((step) => step.capabilities.includes('runa.haptic.start')));
  assert.ok(course.steps.some((step) => step.capabilities.includes('somatic.cue')));
  assert.ok(course.steps.some((step) => step.capabilities.includes('glyphforge.gesture.cue')));
  assert.ok(course.steps.some((step) => step.capabilities.includes('glyphforge.trace.arm')));
  assert.ok(course.steps.some((step) => step.capabilities.includes('somatic.observe-hold')));
});

test('Cue capabilities do not claim presentation when no cue surface is mounted', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const eventTarget = memoryEventTarget();
  registerRunaService(registry, { bus });
  registerGlyphForgeService(registry, { eventTarget, presentCue: () => ({ applied: false, supported: false, awaiting_presentation: true }) });
  registerSomaticCartographyService(registry, {
    bus,
    eventTarget,
    dispatchCue: () => ({ applied: false, supported: false, awaiting_presentation: true }),
    now: () => new Date('2026-09-14T15:52:00.000Z'),
  });

  const { state, target } = makeStateAndTarget();
  const plan = await registry.invoke('somatic.plan', { state, target }, { authority: 'read', source: 'test' });
  const executed = await registry.invoke('somatic.execute-course', { course: plan.output }, { authority: 'operate', confirmed: true, source: 'test' });

  assert.equal(executed.status, 'applied');
  assert.equal(executed.output.status, 'awaiting-observation');
  assert.ok(executed.output.receipts.some((receipt) => receipt.status === 'pending'));
  assert.ok(executed.output.pending.length >= 1);
});

test('Glyph stroke observations cross the app boundary and close only the correlated armed trace', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const eventTarget = memoryEventTarget();
  registerRunaService(registry, { bus });
  registerGlyphForgeService(registry, { eventTarget, presentCue: () => ({ applied: true, supported: true, cue_presented: true }) });
  registerSomaticCartographyService(registry, {
    bus,
    eventTarget,
    dispatchCue: () => ({ applied: true, supported: true, cue_presented: true }),
    now: () => new Date('2026-09-14T15:53:00.000Z'),
  });

  const { state, target } = makeStateAndTarget();
  const plan = await registry.invoke('somatic.plan', { state, target }, { authority: 'read', source: 'test' });
  const executed = await registry.invoke('somatic.execute-course', { course: plan.output }, { authority: 'operate', confirmed: true, source: 'test' });
  assert.equal(executed.output.status, 'awaiting-observation');

  const trace = (await registry.invoke('glyphforge.trace.pending', {}, { authority: 'read', source: 'test' })).output.pending[0];
  assert.ok(trace.trace_id);

  const observed = await registry.invoke('glyphforge.trace.observe', {
    stroke: { schema: 'starwell.glyph-stroke-receipt/v1', trace_id: trace.trace_id, stroke_id: 'stroke:one', glyph_id: 'glyph.meda', point_count: 7 },
  }, { authority: 'operate', source: 'test' });
  assert.equal(observed.output.observed, true);

  const status = await registry.invoke('somatic.cartography.status', {}, { authority: 'read', source: 'test' });
  assert.equal(status.output.pending.some((item) => item.pending_id === trace.trace_id), false);
  assert.ok(status.output.store.receipts.some((receipt) => receipt.schema === SOMATIC_CARTOGRAPHY_RECEIPT_SCHEMA && receipt.status === 'observed'));
});

test('Concurrent trace arms are rejected until explicit correlation exists', async () => {
  const registry = createCapabilityRegistry();
  registerGlyphForgeService(registry, { eventTarget: memoryEventTarget(), presentCue: () => ({ applied: true, supported: true }) });

  const first = await registry.invoke('glyphforge.trace.arm', { course_id: 'course:one', step: 1, glyph_id: 'glyph.meda' }, { authority: 'operate', source: 'test' });
  assert.equal(first.status, 'applied');

  const second = await registry.invoke('glyphforge.trace.arm', { course_id: 'course:two', step: 1, glyph_id: 'glyph.meda' }, { authority: 'operate', source: 'test' });
  assert.equal(second.status, 'failed');
  assert.match(second.error, /concurrent trace arms are rejected/);
});

test('Somatic Cartography is build-visible, has a distinct receipt schema, and relays Glyph Studio postMessage events', () => {
  const sidecar = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const somaticIndex = sidecar.indexOf("'./somatic-sidecar.js'");
  const cartographyIndex = sidecar.indexOf("'./somatic-cartography-sidecar.js'");
  assert.ok(somaticIndex >= 0);
  assert.ok(cartographyIndex > somaticIndex);
  assert.match(sidecar, /import\.meta\.glob\([\s\S]*\.\/somatic-cartography-sidecar\.js/);

  const service = readFileSync(new URL('../src/os/somatic-cartography-service.js', import.meta.url), 'utf8');
  assert.match(service, /arcsweep\.somatic-cartography-receipt\/v1/);
  assert.doesNotMatch(service, /arcsweep\.somatic-receipt\/v1/);
  assert.match(service, /observation_only_conditions_remain_pending: true/);
  assert.match(service, /cue_presentation_surface_required: true/);

  const glyphForge = readFileSync(new URL('../src/os/glyphforge-service.js', import.meta.url), 'utf8');
  assert.match(glyphForge, /message/);
  assert.match(glyphForge, /starwell\.glyph-studio-event-message\/v1/);
  assert.match(glyphForge, /same-origin-postmessage/);

  const glyphStudio = readFileSync(new URL('../../starwell/src/components/glyph-studio/GlyphStudio.jsx', import.meta.url), 'utf8');
  assert.match(glyphStudio, /postMessage/);
  assert.match(glyphStudio, /starwell\.glyph-studio-event-message\/v1/);

  const manifest = readFileSync(new URL('../src/os/version.js', import.meta.url), 'utf8');
  assert.match(manifest, /somaticCartography: true/);
  assert.match(manifest, /somaticCartographyReceipt: 'arcsweep\.somatic-cartography-receipt\/v1'/);
});
