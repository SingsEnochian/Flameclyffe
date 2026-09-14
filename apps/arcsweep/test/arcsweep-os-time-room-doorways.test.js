import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createGuideShell } from '../src/os/guide-shell.js';
import { registerTimeRoomDoorwayService } from '../src/os/time-room-doorway-service.js';
import {
  TIME_ROOM_DOORWAY_RECEIPT_SCHEMA,
  TIME_ROOM_DOORWAY_SET_SCHEMA,
  createTimeRoomDoorwaySet,
} from '../src/os/time-room-doorways.js';

function snapshot({
  universe_id = 'taveren-vaen',
  state = 'converging',
  room = 'portal',
} = {}) {
  return {
    schema: 'arcsweep.time-room-snapshot/v1',
    generated_at: '2026-09-14T17:00:00.000Z',
    room_id: 'time-room',
    universe_id,
    title: universe_id,
    chamber: 'Test Chamber',
    time_law: 'Test time.',
    question: 'What hour is it in this universe, and what can happen now?',
    context: { world_id: universe_id, project_id: 'project:one', scene_id: null, document_id: null, room, context_id: 'context:before' },
    readiness: { schema: 'arcsweep.time-room-readiness/v1', state, pressure: 'crossing', reason: 'test' },
    temporal_weather: 'braided',
    clocks: [],
    entry_questions: [],
    can_happen: ['story entry', 'continuity review'],
    arrival_signals: ['threshold glimmer'],
  };
}

test('Time Room recommends deterministic doors but does not autonomously enter them', () => {
  const set = createTimeRoomDoorwaySet(snapshot());
  assert.equal(set.schema, TIME_ROOM_DOORWAY_SET_SCHEMA);
  assert.equal(set.universe_id, 'taveren-vaen');
  assert.equal(set.autonomous_entry, false);
  assert.equal(set.selection_policy, 'human-confirmed-only');
  assert.equal(set.doorways[0].destination_room, 'scripts');
  assert.equal(set.doorways[0].recommended, true);
  assert.equal(set.doorways[0].enterable, true);
  assert.equal(set.doorways[0].requires_confirmation, true);
});

test('resting and waiting readings keep doorways visible but held', () => {
  for (const state of ['resting', 'waiting']) {
    const set = createTimeRoomDoorwaySet(snapshot({ state }));
    assert.equal(set.readiness.held, true);
    assert.ok(set.doorways.length > 0);
    assert.ok(set.doorways.every((doorway) => doorway.enterable === false));
    assert.ok(set.doorways.every((doorway) => doorway.held_reason));
  }
});

test('human-confirmed doorway entry routes through OS navigation and returns context-capsule evidence', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus, now: () => new Date('2026-09-14T17:01:00.000Z') });
  const navigations = [];

  registerTimeRoomDoorwayService(registry, {
    bus,
    snapshotProvider: async () => snapshot(),
    contextProvider: () => ({
      active_world_id: 'taveren-vaen',
      active_project_id: 'project:one',
      active_room: 'portal',
      presence_mode: 'companion',
    }),
    navigateProvider: async (room, patch) => {
      navigations.push({ room, patch });
      return {
        schema: 'arcsweep.os-capability-receipt/v1',
        call_id: 'capability-call:navigate-one',
        capability_id: 'os.navigate',
        service_id: 'arcsweep-os-kernel',
        status: 'applied',
        output: { ok: true, status: 'navigated', target: room, observed_room: room, context_capsule_id: 'context:door-one' },
      };
    },
    now: () => new Date('2026-09-14T17:02:00.000Z'),
  });

  const doors = await registry.invoke('time-room.doorways', { universe_id: 'taveren-vaen' }, { authority: 'read', source: 'test' });
  assert.equal(doors.status, 'applied');
  const doorway = doors.output.doorways[0];

  const unconfirmed = await registry.invoke('time-room.enter-doorway', {
    doorway_id: doorway.doorway_id,
    universe_id: 'taveren-vaen',
  }, { authority: 'operate', source: 'test' });
  assert.equal(unconfirmed.status, 'rejected');
  assert.equal(unconfirmed.reason, 'confirmation-required');
  assert.equal(navigations.length, 0);

  const entered = await registry.invoke('time-room.enter-doorway', {
    doorway_id: doorway.doorway_id,
    universe_id: 'taveren-vaen',
  }, { authority: 'operate', confirmed: true, source: 'test' });

  assert.equal(entered.status, 'applied');
  assert.equal(entered.output.schema, TIME_ROOM_DOORWAY_RECEIPT_SCHEMA);
  assert.equal(entered.output.status, 'entered');
  assert.equal(entered.output.destination_room, 'scripts');
  assert.equal(entered.output.context_capsule_id, 'context:door-one');
  assert.equal(entered.output.navigation_call_id, 'capability-call:navigate-one');
  assert.equal(entered.output.human_confirmed, true);
  assert.equal(entered.output.autonomous_entry, false);
  assert.equal(navigations.length, 1);
  assert.equal(navigations[0].room, 'scripts');
  assert.equal(navigations[0].patch.world_id, 'taveren-vaen');
  assert.equal(navigations[0].patch.project_id, 'project:one');
  assert.equal(navigations[0].patch.authority_boundary.human_confirmation_required, true);

  const event = bus.history().find((item) => item.name === 'arcsweep:time-room-doorway-entered');
  assert.ok(event);
  assert.equal(event.payload.schema, TIME_ROOM_DOORWAY_RECEIPT_SCHEMA);
  assert.equal(event.payload.context_capsule_id, 'context:door-one');
});

test('held doorway entry fails even when confirmation is supplied', async () => {
  const registry = createCapabilityRegistry();
  let navigated = false;
  registerTimeRoomDoorwayService(registry, {
    snapshotProvider: async () => snapshot({ state: 'resting' }),
    contextProvider: () => ({ active_world_id: 'taveren-vaen', active_room: 'portal' }),
    navigateProvider: async () => { navigated = true; return { status: 'applied', output: { ok: true } }; },
  });
  const set = await registry.invoke('time-room.doorways', {}, { authority: 'read' });
  const attempt = await registry.invoke('time-room.enter-doorway', {
    doorway_id: set.output.doorways[0].doorway_id,
  }, { authority: 'operate', confirmed: true });
  assert.equal(attempt.status, 'failed');
  assert.match(attempt.error, /door stays visible|does not permit/i);
  assert.equal(navigated, false);
});

test('Guide may inspect doorways but cannot invoke the human-confirmed doorway entry capability', async () => {
  const calls = [];
  const guide = createGuideShell({
    invoke: async (capabilityId, input, context) => {
      calls.push({ capabilityId, input, context });
      return { status: 'applied', capability_id: capabilityId };
    },
  });

  const allowed = guide.allowedCapabilities().map((item) => item.capability_id);
  assert.ok(allowed.includes('time-room.doorways'));
  assert.equal(allowed.includes('time-room.enter-doorway'), false);

  const read = await guide.request('time-room.doorways', { universe_id: 'terra-aeterna', body_state: { note: 'private' } });
  assert.equal(read.status, 'applied');
  assert.deepEqual(calls[0].input, { universe_id: 'terra-aeterna' });

  const enter = await guide.request('time-room.enter-doorway', { doorway_id: 'doorway:terra-aeterna:worlds' }, { confirmed: true });
  assert.equal(enter.status, 'rejected');
  assert.equal(enter.reason, 'guide-capability-not-allowed');
});

test('Time Room surface and manifest expose doorways as human-confirmed infrastructure', () => {
  const surface = readFileSync(new URL('../src/os/time-room-surface.js', import.meta.url), 'utf8');
  assert.match(surface, /data-time-room-surface.*v0\.2/s);
  assert.match(surface, /time-room\.doorways/);
  assert.match(surface, /time-room\.enter-doorway/);
  assert.match(surface, /Open door/);
  assert.match(surface, /Opened only by your hand/);

  const sidecar = readFileSync(new URL('../src/time-room-sidecar.js', import.meta.url), 'utf8');
  assert.match(sidecar, /registerTimeRoomDoorwayService/);
  assert.match(sidecar, /time-room-doorway-dom-bridge/);

  const manifest = readFileSync(new URL('../src/os/version.js', import.meta.url), 'utf8');
  assert.match(manifest, /timeRoomDoorways: true/);
  assert.match(manifest, /timeRoomDoorwayEntry: 'human-confirmed-only'/);
  assert.match(manifest, /timeRoomDoorwayAutonomousEntry: false/);
  assert.match(manifest, /timeRoomDoorwayReceipt: 'arcsweep\.time-room-doorway-receipt\/v1'/);
});
