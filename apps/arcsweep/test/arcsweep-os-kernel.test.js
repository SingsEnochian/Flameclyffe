import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceSession,
  createCheckpointStore,
  createContextCapsule,
  createEventBus,
  createHealthRegistry,
  createSessionState,
} from '../src/os/kernel.js';
import {
  createCaretaker,
  createFault,
  createRepairBudget,
  runRepairTransaction,
} from '../src/os/caretaker.js';

test('typed event bus rejects unknown events and preserves event receipts', () => {
  const bus = createEventBus();
  const seen = [];
  bus.subscribe('arcsweep:navigation-changed', (receipt) => seen.push(receipt), { id: 'test-nav' });
  const receipt = bus.publish('arcsweep:navigation-changed', { previous_room: 'portal', current_room: 'forge' });
  assert.equal(receipt.schema, 'arcsweep.os-event-receipt/v1');
  assert.equal(receipt.sequence, 1);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].payload.current_room, 'forge');
  assert.throws(() => bus.publish('arcsweep:made-up-event', {}), /Unknown ArcSweep OS event/);
});

test('context capsule preserves world, project, and goal through room navigation', () => {
  const session = createSessionState({ active_world_id: 'terra-aeterna', active_project_id: 'runa-kelyran', active_room: 'story', current_goal: 'design meda' });
  const forge = createContextCapsule({ session, previousRoom: 'story', currentRoom: 'forge', relevantObjects: ['lexeme:meda'] });
  const next = advanceSession(session, forge);
  const canon = createContextCapsule({ session: next, previousRoom: 'forge', currentRoom: 'ingest' });
  const finalSession = advanceSession(next, canon);
  assert.equal(finalSession.active_world_id, 'terra-aeterna');
  assert.equal(finalSession.active_project_id, 'runa-kelyran');
  assert.equal(finalSession.current_goal, 'design meda');
  assert.equal(finalSession.active_room, 'ingest');
});

test('OS bootstrap exposes diagnostics and navigation receipts on the current sidecar spine', async () => {
  const previous = globalThis.__arcsweepOS;
  delete globalThis.__arcsweepOS;
  const module = await import(`../src/os/bootstrap.js?diagnostics-test=${Date.now()}`);
  const os = module.arcsweepOS;
  const initial = os.snapshot();
  assert.equal(initial.schema, 'arcsweep.os-diagnostics/v1');
  assert.equal(initial.session.active_room, 'portal');
  assert.ok(initial.services.some((service) => service.service_id === 'arcsweep-os-kernel' && service.status === 'healthy'));
  assert.deepEqual(initial.repair_receipts, []);

  const capsule = os.navigate('forge', { world_id: 'terra-aeterna', project_id: 'runa-kelyran', current_goal: 'design meda' });
  assert.equal(capsule.previous_room, 'portal');
  assert.equal(capsule.current_room, 'forge');
  const after = os.snapshot();
  assert.equal(after.session.active_room, 'forge');
  assert.equal(after.session.active_world_id, 'terra-aeterna');
  assert.equal(after.session.active_project_id, 'runa-kelyran');
  assert.equal(after.session.current_goal, 'design meda');
  assert.equal(after.active_context.capsule_id, capsule.capsule_id);
  assert.equal(after.context_depth, 1);
  assert.ok(after.recent_events.some((event) => event.name === 'arcsweep:context-capsule-created'));
  assert.ok(after.recent_events.some((event) => event.name === 'arcsweep:navigation-changed'));
  assert.equal(os.lastNavigationReceipt().payload.current_room, 'forge');

  delete globalThis.__arcsweepOS;
  if (previous) globalThis.__arcsweepOS = previous;
});

test('Caretaker detects and repairs a missing required event subscription', async () => {
  const bus = createEventBus();
  const checkpoints = createCheckpointStore();
  const health = createHealthRegistry({ bus });
  const caretaker = createCaretaker({ bus, checkpointStore: checkpoints, healthRegistry: health, repairBudget: createRepairBudget() });
  let invocations = 0;
  caretaker.registerRequiredSubscription({ eventName: 'arcsweep:navigation-changed', subscriptionId: 'os-context-continuity', serviceId: 'os-context', handler: () => { invocations += 1; } });
  bus.unsubscribe('arcsweep:navigation-changed', 'os-context-continuity');
  const findings = await caretaker.inspectRequiredSubscriptions();
  assert.equal(findings.length, 1);
  assert.equal(findings[0].fault_class, 'UI/WIRING');
  assert.equal(bus.hasSubscription('arcsweep:navigation-changed', 'os-context-continuity'), true);
  bus.publish('arcsweep:navigation-changed', { previous_room: 'portal', current_room: 'forge' });
  assert.equal(invocations, 1);
  const repairs = bus.history().filter((item) => item.name === 'arcsweep:repair-completed');
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].payload.result, 'committed');
});

test('Caretaker detects, repairs, validates, and receipts an unhealthy required service', async () => {
  const bus = createEventBus();
  const checkpoints = createCheckpointStore();
  const health = createHealthRegistry({ bus });
  const caretaker = createCaretaker({ bus, checkpointStore: checkpoints, healthRegistry: health, repairBudget: createRepairBudget() });
  let mounted = false;
  let repairCalls = 0;

  caretaker.registerRequiredService({
    serviceId: 'test-sidecar-service',
    probe: () => ({ ok: mounted, mounted }),
    repair: () => { repairCalls += 1; mounted = true; return { remounted: true }; },
  });

  const findings = await caretaker.inspectRequiredServices();
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, 'required-service-unhealthy');
  assert.equal(repairCalls, 1);
  assert.equal(mounted, true);
  assert.equal(health.get('test-sidecar-service').status, 'healthy');

  const repairs = bus.history().filter((item) => item.name === 'arcsweep:repair-completed');
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].payload.action, 'recover-required-service');
  assert.equal(repairs[0].payload.result, 'committed');
  assert.ok(repairs[0].payload.before_checkpoint);
});

test('Feather pauses automatic required service repair without hiding the fault', async () => {
  const bus = createEventBus();
  const checkpoints = createCheckpointStore();
  const health = createHealthRegistry({ bus });
  const caretaker = createCaretaker({ bus, checkpointStore: checkpoints, healthRegistry: health, repairBudget: createRepairBudget() });
  let repairCalls = 0;

  caretaker.registerRequiredService({
    serviceId: 'paused-service',
    probe: () => false,
    repair: () => { repairCalls += 1; },
  });
  caretaker.setFeatherPaused(true);
  const findings = await caretaker.inspectRequiredServices();
  assert.equal(findings.length, 1);
  assert.equal(repairCalls, 0);
  assert.equal(health.get('paused-service').status, 'failed');
});

test('bad R1 repair rolls back to the captured state', async () => {
  const bus = createEventBus();
  const checkpoints = createCheckpointStore();
  const state = { mounted: false, generation: 4 };
  const fault = createFault({ fault_class: 'UI/WIRING', service_id: 'test-sidecar', code: 'sidecar-detached', repair_level: 'R1' });
  const receipt = await runRepairTransaction({
    fault,
    repairLevel: 'R1',
    action: 'remount-test-sidecar',
    checkpointStore: checkpoints,
    bus,
    captureState: () => ({ ...state }),
    apply: () => { state.mounted = true; state.generation = 5; return { attempted: true }; },
    validate: () => ({ ok: false, check: 'event-path-restored', detail: 'Injected validation failure' }),
    rollback: ({ priorState }) => { Object.assign(state, priorState); },
  });
  assert.equal(receipt.result, 'rolled-back');
  assert.deepEqual(state, { mounted: false, generation: 4 });
});

test('repair budget blocks repeat mutation for the same fault fingerprint', async () => {
  const bus = createEventBus();
  const checkpoints = createCheckpointStore();
  const budget = createRepairBudget({ maxAttemptsPerFingerprint: 1, maxRepairsPerService: 3 });
  const fault = createFault({ fault_class: 'TRANSIENT', service_id: 'test-service', code: 'temporary-failure' });
  let mutations = 0;
  const request = () => runRepairTransaction({
    fault,
    repairLevel: 'R1',
    action: 'retry-safe-operation',
    checkpointStore: checkpoints,
    bus,
    budget,
    captureState: () => ({ mutations }),
    apply: () => { mutations += 1; },
    validate: () => ({ ok: true, check: 'safe-operation-restored' }),
    rollback: ({ priorState }) => { mutations = priorState.mutations; },
  });
  const first = await request();
  const second = await request();
  assert.equal(first.result, 'committed');
  assert.equal(second.result, 'escalated');
  assert.equal(mutations, 1);
});
