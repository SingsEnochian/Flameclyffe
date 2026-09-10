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
import { createCapabilityFirewall } from './capability-firewall.js';
import { createAuthorityBroker } from './authority-broker.js';
import { createBootLifecycle } from './boot-lifecycle.js';
import { createContextPersistence } from './context-persistence.js';
import { createGuideShell } from './guide-shell.js';
import { createGuideRuntime } from './guide-runtime.js';
import { createStewardApprovalQueue } from './steward-approval.js';
import { installStewardApprovalSurface } from './steward-approval-surface.js';
import { registerSidecarService } from './sidecar-service.js';
import { registerObserverService } from './observer-service.js';
import { registerCybersecurityIntelligenceService } from './cybersecurity-service.js';
import { ARCSWEEP_OS_MANIFEST } from './version.js';

const GLOBAL_KEY = '__arcsweepOS';
const MAX_CAPSULES = 64;
const MAX_DIAGNOSTIC_EVENTS = 32;
const UNPRIVILEGED_AUTHORITY = new Set(['read', 'operate']);

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
  const bootLifecycle = createBootLifecycle({ bus });
  const checkpointStore = createCheckpointStore();
  const healthRegistry = createHealthRegistry({ bus });
  const contextPersistence = createContextPersistence({ storage: resolveSessionStorage() });
  const restored = contextPersistence.load();
  let session = restored?.session || createSessionState({ active_room: 'portal' });
  const capsules = restored?.capsules ? restored.capsules.slice(-MAX_CAPSULES) : [];
  let lastNavigationReceipt = null;
  let stewardSurface = null;

  const caretaker = createCaretaker({ bus, checkpointStore, healthRegistry });
  const capabilityFirewall = createCapabilityFirewall({
    bus,
    featherPaused: () => caretaker.featherPaused(),
  });
  const authorityBroker = createAuthorityBroker();
  const capabilityRegistry = createCapabilityRegistry({
    bus,
    policy: capabilityFirewall,
    authorityResolver: ({ capability, context }) => {
      const claimed = context.authority || 'read';
      if (UNPRIVILEGED_AUTHORITY.has(claimed)) return { authority: claimed };
      const actorId = context.actor_id || context.source || 'unknown';
      const lease = authorityBroker.resolve({
        token: context.authority_lease,
        actor_id: actorId,
        capability_id: capability.capability_id,
      });
      if (!lease.valid) return { authority: 'operate', reason: `authority-lease-${lease.reason}` };
      return { authority: lease.authority };
    },
  });

  caretaker.registerRequiredSubscription({
    eventName: 'arcsweep:navigation-changed',
    subscriptionId: 'os-context-continuity',
    serviceId: 'arcsweep-os-kernel',
    handler: (receipt) => { lastNavigationReceipt = receipt; },
  });

  function persistContext() {
    return contextPersistence.save({ session, capsules });
  }

  function contextSummary() {
    const active = capsules.length ? capsules[capsules.length - 1] : null;
    return Object.freeze(clone({
      schema: 'arcsweep.os-context-summary/v1',
      session_id: session.session_id,
      active_world_id: session.active_world_id,
      active_project_id: session.active_project_id,
      active_scene_id: session.active_scene_id,
      active_document_id: session.active_document_id,
      active_room: session.active_room,
      current_goal: session.current_goal,
      presence_mode: session.presence_mode,
      feather_paused: caretaker.featherPaused(),
      active_context_id: active?.capsule_id || null,
      context_depth: capsules.length,
    }));
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
    emits: ['arcsweep:navigation-changed', 'arcsweep:context-capsule-created', 'arcsweep:os-boot-state'],
  });

  capabilityRegistry.registerCapability({
    capability_id: 'os.boot',
    service_id: 'arcsweep-os-kernel',
    description: 'Read the current ArcSweep OS boot lifecycle state.',
    authority: 'read',
    execute: () => bootLifecycle.snapshot(),
  });

  capabilityRegistry.registerCapability({
    capability_id: 'os.context',
    service_id: 'arcsweep-os-kernel',
    description: 'Read a bounded summary of the active ArcSweep session and context lineage.',
    authority: 'read',
    execute: () => contextSummary(),
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
  registerCybersecurityIntelligenceService(capabilityRegistry);

  capabilityRegistry.registerService({
    service_id: 'arcsweep-guide',
    label: 'ArcSweep Guide',
    authority_boundary: {
      direct_organ_access: false,
      privileged_authority: false,
      capability_requests_only: true,
    },
    consumes: ['arcsweep:guide-query'],
    emits: ['arcsweep:guide-response'],
  });

  capabilityRegistry.registerService({
    service_id: 'steward-gate',
    label: 'ArcSweep Steward Gate',
    authority_boundary: {
      human_trusted_action_required: true,
      privileged_lease_tokens_exposed: false,
      model_self_approval: false,
    },
    consumes: ['arcsweep:steward-approval-requested'],
    emits: ['arcsweep:steward-approval-resolved'],
  });

  const stewardApprovals = createStewardApprovalQueue({
    broker: authorityBroker,
    invoke: (capabilityId, input, context) => capabilityRegistry.invoke(capabilityId, input, context),
    getCapability: (capabilityId) => capabilityRegistry.getCapability(capabilityId),
    bus,
  });

  const guideShell = createGuideShell({
    invoke: (capabilityId, input, context) => capabilityRegistry.invoke(capabilityId, input, context),
  });
  const guideRuntime = createGuideRuntime({
    shell: guideShell,
    contextProvider: () => contextSummary(),
  });

  function installStewardSurface() {
    if (stewardSurface || typeof document === 'undefined' || !document.body) return stewardSurface;
    stewardSurface = installStewardApprovalSurface({
      approvals: stewardApprovals.publicApi,
      resolveTrusted: stewardApprovals.resolveTrusted,
      bus,
    });
    return stewardSurface;
  }

  function snapshot() {
    const events = bus.history();
    const repairReceipts = events.filter((item) => item.name === 'arcsweep:repair-completed').map((item) => item.payload);
    const capabilityReceipts = events.filter((item) => item.name === 'arcsweep:capability-invoked').map((item) => item.payload);
    return Object.freeze({
      schema: 'arcsweep.os-diagnostics/v1',
      manifest: clone(ARCSWEEP_OS_MANIFEST),
      boot: bootLifecycle.snapshot(),
      session: clone(session),
      active_context: capsules.length ? clone(capsules[capsules.length - 1]) : null,
      context_depth: capsules.length,
      context_persistence: { available: contextPersistence.available(), restored: Boolean(restored), storage_key: contextPersistence.key },
      recent_events: events.slice(-MAX_DIAGNOSTIC_EVENTS).map(clone),
      services: healthRegistry.snapshot(),
      service_registry: capabilityRegistry.services(),
      capabilities: capabilityRegistry.capabilities(),
      guide: {
        actor_id: guideShell.actor_id,
        voice_id: guideRuntime.voiceId(),
        allowed_capabilities: guideShell.allowedCapabilities(),
      },
      steward_gate: {
        pending: stewardApprovals.publicApi.pendingCount(),
        recent: stewardApprovals.publicApi.list().slice(-16),
      },
      capability_receipts: capabilityReceipts.slice(-MAX_DIAGNOSTIC_EVENTS).map(clone),
      security_tripwires: capabilityFirewall.snapshot().slice(-MAX_DIAGNOSTIC_EVENTS),
      authority_leases: authorityBroker.snapshot().slice(-MAX_DIAGNOSTIC_EVENTS),
      repair_receipts: repairReceipts.slice(-MAX_DIAGNOSTIC_EVENTS).map(clone),
      repair_budget: caretaker.repairBudget(),
      captured_at: new Date().toISOString(),
    });
  }

  async function inspect() {
    const subscriptionFindings = await caretaker.inspectRequiredSubscriptions();
    const serviceFindings = await caretaker.inspectRequiredServices();
    const findings = [...subscriptionFindings, ...serviceFindings];
    if (findings.length && bootLifecycle.state() === 'READY') {
      bootLifecycle.transition('DEGRADED', { reason: 'caretaker-findings', details: { count: findings.length } });
    } else if (!findings.length && bootLifecycle.state() === 'DEGRADED') {
      bootLifecycle.transition('READY', { reason: 'caretaker-clear' });
    }
    const diagnostics = snapshot();
    if (findings.length) dispatchDomEvent('arcsweep:caretaker-findings', { findings, diagnostics });
    dispatchDomEvent('arcsweep:os-diagnostics', diagnostics);
    return findings;
  }

  function setFeatherPaused(paused = true) {
    const next = caretaker.setFeatherPaused(paused);
    if (next && bootLifecycle.state() !== 'PAUSED') bootLifecycle.transition('PAUSED', { reason: 'feather' });
    if (!next && bootLifecycle.state() === 'PAUSED') bootLifecycle.transition('READY', { reason: 'feather-cleared' });
    return next;
  }
  function clearPersistedContext() { return contextPersistence.clear(); }

  const api = Object.freeze({
    manifest: ARCSWEEP_OS_MANIFEST,
    bus,
    boot: bootLifecycle,
    caretaker,
    firewall: capabilityFirewall,
    capabilities: capabilityRegistry,
    guide: guideShell,
    guideRuntime,
    steward: stewardApprovals.publicApi,
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
  healthRegistry.set({
    service_id: 'steward-gate',
    status: 'healthy',
    version: ARCSWEEP_OS_MANIFEST.version,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel'],
    recoverable: false,
  });
  healthRegistry.set({
    service_id: 'arcsweep-guide',
    status: 'healthy',
    version: ARCSWEEP_OS_MANIFEST.version,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'house-runtime'],
    recoverable: true,
  });

  if (typeof document !== 'undefined') {
    if (document.body) installStewardSurface();
    else document.addEventListener('DOMContentLoaded', installStewardSurface, { once: true });
    document.addEventListener('click', (event) => {
      const room = inferRoomFromTrigger(event.target);
      if (room) queueMicrotask(() => navigate(room));
    }, true);
    globalThis.addEventListener?.('arcsweep:caretaker-inspect', () => { void inspect(); });
    globalThis.addEventListener?.('arcsweep:os-inspect', () => dispatchDomEvent('arcsweep:os-diagnostics', snapshot()));
    globalThis.addEventListener?.('arcsweep:feather', () => setFeatherPaused(true));
    globalThis.addEventListener?.('arcsweep:guide-query', (event) => {
      const detail = event?.detail || {};
      const requestId = detail.request_id || `guide-request:${Date.now()}`;
      void guideRuntime.turn(detail.utterance || detail.message, { voice_id: detail.voice_id || null })
        .then((turn) => dispatchDomEvent('arcsweep:guide-response', { request_id: requestId, turn }))
        .catch((error) => dispatchDomEvent('arcsweep:guide-response', {
          request_id: requestId,
          turn: { schema: 'arcsweep.guide-turn/v1', status: 'failed', say: error?.message || String(error) },
        }));
    });
    const inspectionTimer = setInterval(() => { void inspect(); }, 12000);
    globalThis.addEventListener?.('beforeunload', () => clearInterval(inspectionTimer), { once: true });
  }

  bootLifecycle.transition('READY', {
    reason: 'kernel-services-registered',
    details: { restored_context: Boolean(restored) },
  });

  dispatchDomEvent('arcsweep:os-ready', {
    schema: ARCSWEEP_OS_MANIFEST.schema,
    version: ARCSWEEP_OS_MANIFEST.version,
    stage: ARCSWEEP_OS_MANIFEST.stage,
    restored_context: Boolean(restored),
    boot: bootLifecycle.snapshot(),
    diagnostics: snapshot(),
  });

  return api;
}

export const arcsweepOS = installArcSweepOS();
export { installArcSweepOS };
