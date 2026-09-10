import {
  advanceSession,
  createCheckpointStore,
  createContextCapsule,
  createEventBus,
  createHealthRegistry,
  createSessionState,
} from './kernel.js';
import { createCaretaker } from './caretaker.js';
import { createCapabilityRegistry } from './capabilities.js';
import { createContextPersistence } from './context-persistence.js';
import { registerSidecarService } from './sidecar-service.js';
import { registerObserverService } from './observer-service.js';
import { ARCSWEEP_OS_MANIFEST } from './version.js';

const GLOBAL_KEY = '__arcsweepOS';
const MAX_CAPSULES = 64;
const MAX_DIAGNOSTIC_EVENTS = 32;

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function dispatchDomEvent(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function inferRoomFromTrigger(target) {
  return target?.closest?.('[data-room]')?.dataset?.room || null;
}

function resolveSessionStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function installArcSweepOS() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];

  const bus = createEventBus();
  const checkpointStore = createCheckpointStore();
  const healthRegistry = createHealthRegistry({ bus });
  const capabilityRegistry = createCapabilityRegistry({ bus });
  const contextPersistence = createContextPersistence({ storage: resolveSessionStorage() });
  const restored = contextPersistence.load();
  let session = restored?.session || createSessionState({ active_room: 'portal' });
  const capsules = restored?.capsules ? restored.capsules.slice(-MAX_CAPSULES) : [];
  let lastNavigationReceipt = null;

  const caretaker = createCaretaker({ bus, checkpointStore, healthRegistry });

  caretaker.registerRequiredSubscription({
    eventName: 'arcsweep:navigation-changed',
    subscriptionId: 'os-context-continuity',
    serviceId: 'arcsweep-os-kernel',
    handler: (receipt) => { lastNavigationReceipt = receipt; },
  });

  function persistContext() {
    return contextPersistence.save({ session, capsules });
  }

  function navigate(currentRoom, patch = {}) {
    const room = String(currentRoom || '').trim();
    if (!room || room === session.active_room) return null;
    const previousRoom = session.active_room;
    const capsule = createContextCapsule({
      session,
      previousRoom,
      currentRoom: room,
      patch,
      relevantObjects: patch.relevant_objects || [],
      openWork: patch.open_work || [],
      authorityBoundary: patch.authority_boundary || null,
      receiptIds: patch.receipt_ids || [],
    });
    capsules.push(capsule);
    if (capsules.length > MAX_CAPSULES) capsules.splice(0, capsules.length - MAX_CAPSULES);
    session = advanceSession(session, capsule);
    const capsuleReceipt = bus.publish('arcsweep:context-capsule-created', capsule, { source: 'os-bootstrap' });
    const navigationReceipt = bus.publish('arcsweep:navigation-changed', {
      previous_room: previousRoom,
      current_room: room,
      context_capsule_id: capsule.capsule_id,
      context_event_id: capsuleReceipt.event_id,
    }, { source: 'os-bootstrap' });
    const persisted = persistContext();
    dispatchDomEvent('arcsweep:os-navigation', { capsule, navigation_receipt: navigationReceipt, persisted, diagnostics: snapshot() });
    return capsule;
  }

  capabilityRegistry.registerService({
    service_id: 'arcsweep-os-kernel',
    label: 'ArcSweep OS Kernel',
    authority_boundary: { browser_state: 'hearthfire', orchestration: 'arcsweep-os-kernel', source_mutation: 'forbidden' },
    consumes: ['arcsweep:feather'],
    emits: ['arcsweep:navigation-changed', 'arcsweep:context-capsule-created'],
  });

  capabilityRegistry.registerCapability({
    capability_id: 'os.navigate',
    service_id: 'arcsweep-os-kernel',
    description: 'Move the active ArcSweep room while preserving the current context capsule.',
    authority: 'operate',
    requires_confirmation: false,
    input_schema: { required: ['room'] },
    validate: (input) => Boolean(String(input?.room || '').trim()),
    execute: (input) => navigate(input.room, input.patch || {}),
  });

  registerSidecarService(capabilityRegistry);
  registerObserverService(capabilityRegistry);

  function snapshot() {
    const events = bus.history();
    const repairReceipts = events.filter((item) => item.name === 'arcsweep:repair-completed').map((item) => item.payload);
    const capabilityReceipts = events.filter((item) => item.name === 'arcsweep:capability-invoked').map((item) => item.payload);
    return Object.freeze({
      schema: 'arcsweep.os-diagnostics/v1',
      manifest: clone(ARCSWEEP_OS_MANIFEST),
      session: clone(session),
      active_context: capsules.length ? clone(capsules[capsules.length - 1]) : null,
      context_depth: capsules.length,
      context_persistence: { available: contextPersistence.available(), restored: Boolean(restored), storage_key: contextPersistence.key },
      recent_events: events.slice(-MAX_DIAGNOSTIC_EVENTS).map(clone),
      services: healthRegistry.snapshot(),
      service_registry: capabilityRegistry.services(),
      capabilities: capabilityRegistry.capabilities(),
      capability_receipts: capabilityReceipts.slice(-MAX_DIAGNOSTIC_EVENTS).map(clone),
      repair_receipts: repairReceipts.slice(-MAX_DIAGNOSTIC_EVENTS).map(clone),
      repair_budget: caretaker.repairBudget(),
      captured_at: new Date().toISOString(),
    });
  }

  async function inspect() {
    const subscriptionFindings = await caretaker.inspectRequiredSubscriptions();
    const serviceFindings = await caretaker.inspectRequiredServices();
    const findings = [...subscriptionFindings, ...serviceFindings];
    const diagnostics = snapshot();
    if (findings.length) dispatchDomEvent('arcsweep:caretaker-findings', { findings, diagnostics });
    dispatchDomEvent('arcsweep:os-diagnostics', diagnostics);
    return findings;
  }

  function setFeatherPaused(paused = true) { return caretaker.setFeatherPaused(paused); }
  function clearPersistedContext() { return contextPersistence.clear(); }

  const api = Object.freeze({
    manifest: ARCSWEEP_OS_MANIFEST,
    bus,
    caretaker,
    capabilities: capabilityRegistry,
    checkpoints: checkpointStore,
    health: healthRegistry,
    persistence: contextPersistence,
    session: () => clone(session),
    capsules: () => capsules.map(clone),
    lastNavigationReceipt: () => lastNavigationReceipt ? clone(lastNavigationReceipt) : null,
    snapshot,
    navigate,
    inspect,
    setFeatherPaused,
    clearPersistedContext,
  });

  globalThis[GLOBAL_KEY] = api;

  healthRegistry.set({
    service_id: 'arcsweep-os-kernel',
    status: 'healthy',
    version: ARCSWEEP_OS_MANIFEST.version,
    last_success_at: new Date().toISOString(),
    dependencies: ['hearthfire', 'house-runtime'],
    recoverable: true,
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
      const room = inferRoomFromTrigger(event.target);
      if (room) queueMicrotask(() => navigate(room));
    }, true);
    globalThis.addEventListener?.('arcsweep:caretaker-inspect', () => { void inspect(); });
    globalThis.addEventListener?.('arcsweep:os-inspect', () => dispatchDomEvent('arcsweep:os-diagnostics', snapshot()));
    globalThis.addEventListener?.('arcsweep:feather', () => setFeatherPaused(true));
    const inspectionTimer = setInterval(() => { void inspect(); }, 12000);
    globalThis.addEventListener?.('beforeunload', () => clearInterval(inspectionTimer), { once: true });
  }

  dispatchDomEvent('arcsweep:os-ready', {
    schema: ARCSWEEP_OS_MANIFEST.schema,
    version: ARCSWEEP_OS_MANIFEST.version,
    stage: ARCSWEEP_OS_MANIFEST.stage,
    restored_context: Boolean(restored),
    diagnostics: snapshot(),
  });

  return api;
}

export const arcsweepOS = installArcSweepOS();
export { installArcSweepOS };
