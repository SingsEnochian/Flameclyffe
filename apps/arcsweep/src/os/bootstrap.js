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
import { createRoomNavigation } from './room-navigation.js';
import { registerContextCacheService } from './context-cache-service.js';
import { createWorkspaceContext } from './workspace-context.js';
import { createContextPersistence, normaliseContextState } from './context-persistence.js';
import { createWorkspaceContextStore } from './workspace-context.js';
import { createSafeDiagnostics } from './diagnostics.js';
import { createGuideShell } from './guide-shell.js';
import { createGuideRuntime } from './guide-runtime.js';
import { createStewardApprovalQueue } from './steward-approval.js';
import { installStewardApprovalSurface } from './steward-approval-surface.js';
import { installArcSweepOSShell } from './shell-surface.js';
import { registerSidecarService } from './sidecar-service.js';
import { registerObserverService } from './observer-service.js';
import { registerCybersecurityIntelligenceService } from './cybersecurity-service.js';
import { registerGlyphForgeService } from './glyphforge-service.js';
import { registerRunaService } from './runa-service.js';
import { registerDeviceProvingService } from './device-proving.js';
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
  try { return globalThis.sessionStorage || null; } catch { return null; }
}

function resolveLocalStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function installArcSweepOS({ navigation = createRoomNavigation(), workspace = typeof document !== 'undefined' ? createWorkspaceContext() : null, storage = resolveSessionStorage() } = {}) {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];

  const bus = createEventBus();
  const bootLifecycle = createBootLifecycle({ bus });
  const checkpointStore = createCheckpointStore();
  const healthRegistry = createHealthRegistry({ bus });
  const contextPersistence = createContextPersistence({ storage });
  const workspaceContext = createWorkspaceContextStore({ storage: resolveLocalStorage() });
  let restored = contextPersistence.load();
  let session = restored?.session || createSessionState({ active_room: 'portal' });
  const capsules = restored?.capsules ? restored.capsules.slice(-MAX_CAPSULES) : [];
  let lastNavigationReceipt = null;
  let receipts = restored?.receipts || [];
  let persistenceStatus = { status: 'not-yet-stored', cloud_verified: false };
  let persistQueue = Promise.resolve();
  let navigationQueue = Promise.resolve();
  let guideNavigating = false;
  let restoration = null;
  let ready;
  let workspaceRestoreBlocked = false;
  const currentState = () => ({ schema: 'arcsweep.os-context-state/v1', session: clone(session), capsules: capsules.map(clone), receipts: receipts.map(clone), saved_at: new Date().toISOString() });

  const durable = workspaceContext.load();
  let stewardSurface = null;
  let osShellSurface = null;

  const caretaker = createCaretaker({ bus, checkpointStore, healthRegistry });
  const capabilityFirewall = createCapabilityFirewall({ bus, featherPaused: () => caretaker.featherPaused() });
  const authorityBroker = createAuthorityBroker();
  const capabilityRegistry = createCapabilityRegistry({
    bus,
    policy: capabilityFirewall,
    authorityResolver: ({ capability, context }) => {
      const claimed = context.authority || 'read';
      if (UNPRIVILEGED_AUTHORITY.has(claimed)) return { authority: claimed };
      const actorId = context.actor_id || context.source || 'unknown';
      const lease = authorityBroker.resolve({ token: context.authority_lease, actor_id: actorId, capability_id: capability.capability_id });
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

  function persistContext({ mirror = true } = {}) {
    const state = currentState();
    const cached = mirror ? contextPersistence.save(state) : null;
    if (mirror) workspaceContext.save(session);
    if (!workspace) {
      persistenceStatus = { cached, status: 'session-only', cloud_verified: false };
      return Promise.resolve(clone(persistenceStatus));
    }
    if (workspaceRestoreBlocked) return Promise.resolve(clone(persistenceStatus));
    persistQueue = persistQueue.then(async () => {
      try {
        const result = await workspace.write(state);
        persistenceStatus = { ...result, status: 'workspace-readback-verified' };
      } catch (error) {
        persistenceStatus = { status: 'failed', error: error?.message || String(error), cloud_verified: false };
      }
      return clone(persistenceStatus);
    });
    return persistQueue;
  }

  function rememberReceipt(event) {
    receipts = [...receipts, clone(event.payload)].slice(-MAX_DIAGNOSTIC_EVENTS);
    void persistContext({ mirror: false });
  }

  function workspaceMatchesSession() {
    if (!workspaceContext.available()) return { ok: true, unavailable: true };
    const current = workspaceContext.load();
    if (!current) return { ok: false, reason: 'workspace-missing' };
    const keys = ['active_world_id','active_project_id','active_scene_id','active_document_id','active_room','current_goal','presence_mode'];
    return { ok: keys.every((key) => (current[key] ?? null) === (session[key] ?? null)) };
  }

  caretaker.registerRequiredDerivedState({
    stateId: 'workspace-context-mirror',
    serviceId: 'arcsweep-os-kernel',
    probe: workspaceMatchesSession,
    captureState: () => workspaceContext.load(),
    repair: () => workspaceContext.save(session),
    rollback: ({ priorState }) => workspaceContext.restore(priorState),
    verifyRollback: ({ priorState }) => JSON.stringify(workspaceContext.load()) === JSON.stringify(priorState),
  });

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

  function recordNavigation(currentRoom, patch = {}) {
    const room = String(currentRoom || '').trim();
    if (!room) return null;
    if (room === session.active_room && !Object.keys(patch).length) return null;
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
    void persistContext();
    dispatchDomEvent('arcsweep:os-navigation', { capsule, navigation_receipt: navigationReceipt, diagnostics: snapshot() });
    return capsule;
  }

  function navigate(room, patch = {}) {
    const operation = navigationQueue.catch(() => {}).then(async () => {
      await ready;
      if (caretaker.featherPaused()) throw new Error('feather-paused');
      if (!navigation.hasRoom(room)) throw new Error(`Unknown or unavailable room: ${room}`);
      const active = workspace ? await workspace.activeContext() : {};
      // Active workspace world wins over an old or model-supplied world ID.
      const mergedPatch = { ...patch, ...active };
      if (caretaker.featherPaused()) throw new Error('feather-paused');
      guideNavigating = true;
      try {
        const observed = await navigation.navigate(room);
        if (observed?.ok !== true || observed.observed_room !== room) throw new Error(`Room navigation was not observed: ${room}`);
        const capsule = recordNavigation(room, mergedPatch);
        await persistQueue;
        return { ...observed, context_capsule_id: capsule?.capsule_id || capsules.at(-1)?.capsule_id || null, persistence: clone(persistenceStatus) };
      } finally { guideNavigating = false; }
    });
    navigationQueue = operation;
    return operation;
  }

  capabilityRegistry.registerService({
    service_id: 'arcsweep-os-kernel',
    label: 'ArcSweep OS Kernel',
    authority_boundary: { browser_state: 'hearthfire', orchestration: 'arcsweep-os-kernel', source_mutation: 'forbidden' },
    consumes: ['arcsweep:feather'],
    emits: ['arcsweep:navigation-changed', 'arcsweep:context-capsule-created', 'arcsweep:os-boot-state'],
  });

  capabilityRegistry.registerCapability({ capability_id: 'os.boot', service_id: 'arcsweep-os-kernel', description: 'Read the current ArcSweep OS boot lifecycle state.', authority: 'read', execute: () => bootLifecycle.snapshot() });
  capabilityRegistry.registerCapability({ capability_id: 'os.context', service_id: 'arcsweep-os-kernel', description: 'Read a bounded summary of the active ArcSweep session and context lineage.', authority: 'read', execute: () => contextSummary() });
  capabilityRegistry.registerCapability({
    capability_id: 'os.navigate', service_id: 'arcsweep-os-kernel', description: 'Move the active ArcSweep room while preserving the current context capsule.', authority: 'operate', requires_confirmation: false,
    input_schema: { required: ['room'] }, validate: (input) => typeof input?.room === 'string' && navigation.hasRoom(input.room), execute: (input) => navigate(input.room, input.patch || {}),
  });

  function requestNavigation(room, patch = {}, { actor_id = 'human-ui', source = 'os-ui' } = {}) {
    return capabilityRegistry.invoke('os.navigate', { room, patch }, { actor_id, source, authority: 'operate', expected_authority: 'operate' });
  }

  registerSidecarService(capabilityRegistry);
  registerObserverService(capabilityRegistry, { bus });
  registerCybersecurityIntelligenceService(capabilityRegistry);
  registerGlyphForgeService(capabilityRegistry);
  registerRunaService(capabilityRegistry, { bus });
  registerDeviceProvingService(capabilityRegistry);

  capabilityRegistry.registerService({
    service_id: 'arcsweep-guide', label: 'ArcSweep Guide',
    authority_boundary: { direct_organ_access: false, privileged_authority: false, capability_requests_only: true },
    consumes: ['arcsweep:guide-query'], emits: ['arcsweep:guide-response'],
  });
  capabilityRegistry.registerService({
    service_id: 'steward-gate', label: 'ArcSweep Steward Gate',
    authority_boundary: { human_trusted_action_required: true, privileged_lease_tokens_exposed: false, model_self_approval: false },
    consumes: ['arcsweep:steward-approval-requested'], emits: ['arcsweep:steward-approval-resolved'],
  });

  const stewardApprovals = createStewardApprovalQueue({
    broker: authorityBroker,
    invoke: (capabilityId, input, context) => capabilityRegistry.invoke(capabilityId, input, context),
    getCapability: (capabilityId) => capabilityRegistry.getCapability(capabilityId),
    bus,
  });
  const guideShell = createGuideShell({
    invoke: async (capabilityId, input, context) => {
      await ready;
      const receipt = await capabilityRegistry.invoke(capabilityId, input, context);
      await persistQueue;
      return receipt;
    },
  });

  bus.subscribe('arcsweep:capability-invoked', rememberReceipt, { id: 'os-capability-replay' });
  bus.subscribe('arcsweep:repair-completed', rememberReceipt, { id: 'os-repair-replay' });


  const guideRuntime = createGuideRuntime({ shell: guideShell, contextProvider: () => contextSummary() });

  function installStewardSurface() {
    if (stewardSurface || typeof document === 'undefined' || !document.body) return stewardSurface;
    stewardSurface = installStewardApprovalSurface({ approvals: stewardApprovals.publicApi, resolveTrusted: stewardApprovals.resolveTrusted, bus });
    return stewardSurface;
  }

  function snapshot() {
    const events = bus.history();
    const repairReceipts = receipts.filter((item) => item.schema === 'arcsweep.repair-receipt/v1');
    const capabilityReceipts = receipts.filter((item) => item.schema === 'arcsweep.os-capability-receipt/v1');
    return Object.freeze({ workspace_persistence: { status: persistenceStatus.status, cloud_verified: false },
      restoration: restoration ? { ok: restoration.ok === true, status: restoration.status || null } : null,
      ...createSafeDiagnostics({
      manifest: ARCSWEEP_OS_MANIFEST,
      boot: bootLifecycle.snapshot(),
      session,
      activeContext: capsules.length ? capsules[capsules.length - 1] : null,
      contextDepth: capsules.length,
      contextPersistence: {
        available: contextPersistence.available(),
        restored: Boolean(restored || durable),
        storage_key: contextPersistence.key,
      },
      events,
      health: healthRegistry.snapshot(),
      services: capabilityRegistry.services(),
      capabilities: capabilityRegistry.capabilities(),
      guide: { actor_id: guideShell.actor_id, voice_id: guideRuntime.voiceId(), allowed_capabilities: guideShell.allowedCapabilities() },
      stewardPending: stewardApprovals.publicApi.pendingCount(),
      stewardRecent: stewardApprovals.publicApi.list(),
      capabilityReceipts,
      securityTripwires: capabilityFirewall.snapshot(),
      authorityLeases: authorityBroker.snapshot(),
      repairReceipts,
      repairBudget: caretaker.repairBudget(),
      featherPaused: caretaker.featherPaused(),
      maxEvents: MAX_DIAGNOSTIC_EVENTS,
    }) });
  }

  async function inspectOnce() {
    await ready;
    const subscriptionFindings = await caretaker.inspectRequiredSubscriptions();
    const serviceFindings = await caretaker.inspectRequiredServices();
    const derivedFindings = await caretaker.inspectRequiredDerivedState();
    const findings = [...subscriptionFindings, ...serviceFindings, ...derivedFindings];
    if (findings.length && bootLifecycle.state() === 'READY') bootLifecycle.transition('DEGRADED', { reason: 'caretaker-findings', details: { count: findings.length } });
    else if (!findings.length && bootLifecycle.state() === 'DEGRADED') bootLifecycle.transition('READY', { reason: 'caretaker-clear' });
    const diagnostics = snapshot();
    if (findings.length) dispatchDomEvent('arcsweep:caretaker-findings', { findings, diagnostics });
    dispatchDomEvent('arcsweep:os-diagnostics', diagnostics);
    return findings;
  }

  let inspection = null;
  function inspect() {
    if (!inspection) inspection = inspectOnce().finally(() => { inspection = null; });
    return inspection;
  }
  function setFeatherPaused(paused = true) {
    session = { ...session, feather_paused: Boolean(paused) };
    const next = caretaker.setFeatherPaused(paused);
    void persistContext();
    if (next && bootLifecycle.state() !== 'PAUSED') bootLifecycle.transition('PAUSED', { reason: 'feather' });
    if (!next && bootLifecycle.state() === 'PAUSED') bootLifecycle.transition('READY', { reason: 'feather-cleared' });
    return next;
  }

  function clearPersistedContext() {
    return { session: contextPersistence.clear(), workspace: workspaceContext.clear(), durable_context_retained: true };
  }

  ready = (async () => {
    if (workspace) {
      try {
        const raw = await workspace.read();
        const saved = normaliseContextState(raw);
        if (raw !== null && raw !== undefined && !saved) throw new Error('Stored OS context is invalid; preserving it for recovery.');
        if (saved && (!restored || Date.parse(saved.saved_at) >= Date.parse(restored.saved_at || 0))) restored = saved;
      } catch (error) {
        workspaceRestoreBlocked = true;
        persistenceStatus = { status: 'restore-failed', error: error.message, cloud_verified: false };
      }
    }
    if (!restored && durable) {
      session = createSessionState(durable);
      restored = { session, capsules: [], receipts: [] };
    }
    if (restored) {
      session = clone(restored.session);
      capsules.splice(0, capsules.length, ...restored.capsules);
      receipts = clone(restored.receipts || []);
      caretaker.setFeatherPaused(session.feather_paused === true);
      if (session.feather_paused === true && bootLifecycle.state() !== 'PAUSED') bootLifecycle.transition('PAUSED', { reason: 'restored-feather' });
      guideNavigating = true;
      try {
        const target = session.active_room;
        restoration = caretaker.featherPaused()
          ? { ok: false, status: 'feather-paused', target }
          : await navigation.navigate(target);
        if (!restoration?.ok) session = { ...session, active_room: navigation.activeRoom() || 'portal' };
      } catch (error) {
        restoration = { ok: false, status: 'failed', error: error.message };
        session = { ...session, active_room: navigation.activeRoom() || 'portal' };
      } finally { guideNavigating = false; }
    } else {
      session = { ...session, active_room: navigation.activeRoom() || 'portal' };
    }
    // Cache only at boot; do not overwrite the workspace on a failed restore.
    contextPersistence.save(currentState());
    workspaceContext.save(session);
    return restoration;
  })();
  registerContextCacheService({ caretaker, persistence: contextPersistence, state: currentState, ready });

  const api = Object.freeze({
    ready,
    flush: () => persistQueue,
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
    workspace: workspaceContext,
    session: () => clone(session),
    capsules: () => capsules.map(clone),
    lastNavigationReceipt: () => lastNavigationReceipt ? clone(lastNavigationReceipt) : null,
    snapshot,
    navigate: (room, patch = {}) => requestNavigation(room, patch, { actor_id: 'human-ui', source: 'os-api' }),
    inspect,
    setFeatherPaused,
    clearPersistedContext,
  });

  globalThis[GLOBAL_KEY] = api;

  healthRegistry.set({ service_id: 'arcsweep-os-kernel', status: 'healthy', version: ARCSWEEP_OS_MANIFEST.version, last_success_at: new Date().toISOString(), dependencies: ['hearthfire', 'house-runtime'], recoverable: true });
  healthRegistry.set({ service_id: 'steward-gate', status: 'healthy', version: ARCSWEEP_OS_MANIFEST.version, last_success_at: new Date().toISOString(), dependencies: ['arcsweep-os-kernel'], recoverable: false });
  healthRegistry.set({ service_id: 'arcsweep-guide', status: 'healthy', version: ARCSWEEP_OS_MANIFEST.version, last_success_at: new Date().toISOString(), dependencies: ['arcsweep-os-kernel', 'house-runtime'], recoverable: true });
  healthRegistry.set({ service_id: 'runa-sensory', status: 'healthy', version: ARCSWEEP_OS_MANIFEST.version, last_success_at: new Date().toISOString(), dependencies: ['arcsweep-os-kernel'], recoverable: true });
  healthRegistry.set({ service_id: 'device-proving', status: 'healthy', version: ARCSWEEP_OS_MANIFEST.version, last_success_at: new Date().toISOString(), dependencies: ['arcsweep-os-kernel'], recoverable: true });

  if (typeof document !== 'undefined') {
    const installSurfaces = () => {
      installStewardSurface();
      if (!osShellSurface) osShellSurface = installArcSweepOSShell({ os: api });
    };
    if (document.body) installSurfaces();
    else document.addEventListener('DOMContentLoaded', installSurfaces, { once: true });
    document.addEventListener('click', (event) => {
      const room = inferRoomFromTrigger(event.target);
      if (room && !guideNavigating) {
        void (async () => {
          await ready;
          await navigation.settle();
          if (guideNavigating || navigation.activeRoom() !== room) return;
          const patch = workspace ? await workspace.activeContext() : {};
          recordNavigation(room, patch);
        })().catch((error) => bus.publish('arcsweep:caretaker-alert', { message: error.message }));
      }
    }, true);
    globalThis.addEventListener?.('arcsweep:caretaker-inspect', () => { void inspect().catch(() => {}); });
    globalThis.addEventListener?.('arcsweep:os-inspect', () => dispatchDomEvent('arcsweep:os-diagnostics', snapshot()));
    globalThis.addEventListener?.('arcsweep:feather', () => setFeatherPaused(true));
    globalThis.addEventListener?.('arcsweep:guide-query', (event) => {
      const detail = event?.detail || {};
      const requestId = detail.request_id || `guide-request:${Date.now()}`;
      void guideRuntime.turn(detail.utterance || detail.message, { voice_id: detail.voice_id || null })
        .then((turn) => dispatchDomEvent('arcsweep:guide-response', { request_id: requestId, turn }))
        .catch((error) => dispatchDomEvent('arcsweep:guide-response', { request_id: requestId, turn: { schema: 'arcsweep.guide-turn/v1', status: 'failed', say: error?.message || String(error) } }));
    });
    const inspectionTimer = setInterval(() => { void inspect().catch(() => {}); }, 12000);
    globalThis.addEventListener?.('beforeunload', () => clearInterval(inspectionTimer), { once: true });
  }

  bootLifecycle.transition('READY', { reason: 'kernel-services-registered', details: { restored_context: Boolean(restored || durable) } });
  dispatchDomEvent('arcsweep:os-ready', {
    schema: ARCSWEEP_OS_MANIFEST.schema,
    version: ARCSWEEP_OS_MANIFEST.version,
    stage: ARCSWEEP_OS_MANIFEST.stage,
    restored_context: Boolean(restored || durable),
    boot: bootLifecycle.snapshot(),
    diagnostics: snapshot(),
  });

  return api;
}

export const arcsweepOS = installArcSweepOS();
export { installArcSweepOS };
