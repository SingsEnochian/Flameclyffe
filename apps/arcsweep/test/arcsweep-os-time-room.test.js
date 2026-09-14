import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createGuideShell } from '../src/os/guide-shell.js';
import { createTimeRoomSnapshot, createUniverseTimeRegistry, registerTimeRoomService } from '../src/os/time-room-service.js';

test('Time Room snapshot gives Ta’veren Vaen state-time with Pattern clocks', async () => {
  const fixedNow = () => new Date('2026-09-14T11:12:00.000Z');
  const snapshot = await createTimeRoomSnapshot({
    universe_id: "Ta'veren Vaen",
    body_state: { energy: 'low-clear', attention: 'threaded', pain: 'neck flare', gesture: 'still hand before weave' },
    story_state: { active_thread: 'Kestrelle studies Stones timing', ripe_signal: 'Pattern tugged at the board' },
  }, {
    now: fixedNow,
    contextProvider: () => ({ active_world_id: 'taveren-vaen', active_room: 'timeline', active_context_id: 'capsule:one' }),
    witnessProvider: () => ({ temporal_weather: 'braided', total_records: 3, last_24h: 2, convergence_detected: true }),
  });

  assert.equal(snapshot.schema, 'arcsweep.time-room-snapshot/v1');
  assert.equal(snapshot.universe_id, 'taveren-vaen');
  assert.equal(snapshot.title, 'Ta’veren Vaen');
  assert.equal(snapshot.context.world_id, 'taveren-vaen');
  assert.equal(snapshot.context.room, 'timeline');
  assert.equal(snapshot.temporal_weather, 'braided');
  assert.equal(snapshot.readiness.state, 'converging');
  assert.equal(snapshot.question, 'What hour is it in this universe, and what can happen now?');
  assert.ok(snapshot.can_happen.includes('Stones logic'));
  assert.ok(snapshot.arrival_signals.includes('Pattern tug receipt'));

  const layers = snapshot.clocks.map((item) => item.layer);
  assert.ok(layers.includes('system-time'));
  assert.ok(layers.includes('body-time'));
  assert.ok(layers.includes('story-time'));
  assert.ok(layers.includes('witness-time'));
  assert.ok(layers.includes('pattern-time'));
  assert.ok(layers.includes('dream-time'));
  assert.ok(layers.includes('stones-time'));
});

test('Time Room registers bounded read capabilities and keeps private body prose off capability receipts and observed events', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerTimeRoomService(registry, {
    bus,
    now: () => new Date('2026-09-14T11:12:00.000Z'),
    contextProvider: () => ({ active_world_id: 'bluebird-grove', active_room: 'portal' }),
    witnessProvider: () => ({ temporal_weather: 'dense', total_records: 7, last_24h: 5, convergence_detected: true }),
  });

  const status = await registry.invoke('time-room.status', {}, { authority: 'read', source: 'test' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.universe_count, createUniverseTimeRegistry().universes.length);

  const registryReceipt = await registry.invoke('time-room.universes', {}, { authority: 'read', source: 'test' });
  assert.equal(registryReceipt.status, 'applied');
  assert.ok(registryReceipt.output.universes.some((item) => item.universe_id === 'time-room'));
  assert.ok(registryReceipt.output.universes.some((item) => item.universe_id === 'bluebird-grove'));

  const receipt = await registry.invoke('time-room.snapshot', {
    body_state: { note: 'PRIVATE-BODY-SENTINEL', pain: 'PRIVATE-PAIN-SENTINEL', sleep: 'PRIVATE-SLEEP-SENTINEL', available: true },
    story_state: { blocked_by: 'PRIVATE-STORY-SENTINEL' },
  }, { authority: 'read', source: 'test' });
  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.output.universe_id, 'bluebird-grove');
  assert.equal(receipt.output.private_time_inputs, 'redacted-from-capability-receipts');
  assert.equal(JSON.stringify(receipt.output).includes('PRIVATE-BODY-SENTINEL'), false);
  assert.equal(JSON.stringify(receipt.output).includes('PRIVATE-PAIN-SENTINEL'), false);
  assert.equal(JSON.stringify(receipt.output).includes('PRIVATE-SLEEP-SENTINEL'), false);
  assert.equal(JSON.stringify(receipt.output).includes('PRIVATE-STORY-SENTINEL'), false);

  const observed = bus.history().find((item) => item.name === 'arcsweep:time-room-observed');
  assert.ok(observed);
  assert.equal(observed.payload.schema, 'arcsweep.time-room-event/v1');
  assert.equal(observed.payload.universe_id, 'bluebird-grove');
  assert.equal(observed.payload.temporal_weather, 'dense');
  assert.equal(JSON.stringify(bus.history()).includes('PRIVATE-BODY-SENTINEL'), false);
  assert.equal(JSON.stringify(bus.history()).includes('PRIVATE-STORY-SENTINEL'), false);
});

test('Guide can read the Time Room but cannot invent body/story state or a privileged entry action', async () => {
  const requested = [];
  const guide = createGuideShell({
    invoke: async (capabilityId, input, context) => {
      requested.push({ capabilityId, input, context });
      return { status: 'applied', capability_id: capabilityId };
    },
  });

  const allowed = guide.allowedCapabilities().map((item) => item.capability_id);
  assert.ok(allowed.includes('time-room.status'));
  assert.ok(allowed.includes('time-room.universes'));
  assert.ok(allowed.includes('time-room.snapshot'));

  const snapshot = await guide.request('time-room.snapshot', {
    universe_id: 'taveren-vaen',
    body_state: { available: false, note: 'model cannot supply this' },
    story_state: { ripe_signal: 'model cannot supply this either' },
  }, { authority: 'admin', confirmed: true });
  assert.equal(snapshot.status, 'applied');
  assert.deepEqual(requested[0].input, { universe_id: 'taveren-vaen' });
  assert.equal(requested[0].context.authority, 'read');
  assert.equal(requested[0].context.confirmed, undefined);

  const blocked = await guide.request('time-room.enter', { universe_id: 'taveren-vaen' });
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.reason, 'guide-capability-not-allowed');
});

test('Time Room is mounted after Temporal Witness and present in the Vite sidecar graph', () => {
  const source = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const witnessIndex = source.indexOf("'./temporal-witness-sidecar.js'");
  const timeRoomIndex = source.indexOf("'./time-room-sidecar.js'");
  assert.ok(witnessIndex >= 0);
  assert.ok(timeRoomIndex > witnessIndex);
  assert.match(source, /import\.meta\.glob\([\s\S]*\.\/time-room-sidecar\.js/);

  const sidecar = readFileSync(new URL('../src/time-room-sidecar.js', import.meta.url), 'utf8');
  assert.match(sidecar, /registerTimeRoomService/);
  assert.match(sidecar, /id: 'time-room-dom-bridge'/);
  assert.match(sidecar, /witness\.summary/);
});

test('Time Room surface and manifest declare the Universe Clock law and preserve custom active worlds', () => {
  const surface = readFileSync(new URL('../src/os/time-room-surface.js', import.meta.url), 'utf8');
  assert.match(surface, /Universe Clock/);
  assert.match(surface, /What hour is it in this universe, and what can happen now\?/);
  assert.match(surface, /Time Room/);
  assert.match(surface, /activeUnregisteredWorld/);
  assert.match(surface, /Active world:/);

  const manifest = readFileSync(new URL('../src/os/version.js', import.meta.url), 'utf8');
  assert.match(manifest, /timeRoom: true/);
  assert.match(manifest, /universeTimeRegistry: true/);
  assert.match(manifest, /timeRoomSnapshot: 'arcsweep\.time-room-snapshot\/v1'/);
});
