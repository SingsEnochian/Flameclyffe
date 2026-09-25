import { createAspectMessageBus } from './aspect-message-bus.js';
import { bindAspectBusToHouse } from './aspect-house-runtime.js';
import { createAspectCoalition, runAspectCoalition } from './aspect-coalition.js';
import { createAspectEnvelope } from './aspect-message-bus.js';

export const ASPECT_MESH_RUNTIME_SCHEMA = 'hearthweave.aspect-mesh-runtime/v0.2';
export const ASPECT_MESH_EVENTS = Object.freeze({
  ready: 'arcsweep:aspect-mesh-ready',
  message: 'arcsweep:aspect-mesh-message',
  coalitionStarted: 'arcsweep:aspect-mesh-coalition-started',
  coalitionComplete: 'arcsweep:aspect-mesh-coalition-complete',
});

let installedRuntime = null;

function dispatch(target, name, detail) {
  if (!target?.dispatchEvent || typeof CustomEvent === 'undefined') return;
  target.dispatchEvent(new CustomEvent(name, { detail }));
}

function traceId(prefix = 'aspect-trace') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createAspectMeshRuntime({
  bus = createAspectMessageBus(),
  world = null,
  target = globalThis.document,
  persistence = true,
} = {}) {
  const houseBridge = persistence ? bindAspectBusToHouse({ bus, world }) : null;
  const unsubscribeEvents = bus.subscribe((envelope) => {
    dispatch(target, ASPECT_MESH_EVENTS.message, envelope);
  });

  const runtime = {
    schema: ASPECT_MESH_RUNTIME_SCHEMA,
    bus,
    houseBridge,
    world,

    publish(input) {
      return bus.publish(input);
    },

    async startCoalition({
      id,
      purpose,
      members,
      synthesisAspectId = null,
      rounds = 1,
      seed,
      runtimeOptions = {},
    } = {}) {
      const coalition = createAspectCoalition({ id, purpose, members, synthesisAspectId });
      const envelope = seed?.id ? seed : createAspectEnvelope({
        id: seed?.id,
        traceId: seed?.traceId || traceId('coalition-trace'),
        sender: seed?.sender || { aspectId: 'steward', invocationId: 'aspect-mesh-runtime' },
        recipients: seed?.recipients || coalition.members,
        kind: seed?.kind || 'proposal',
        body: seed?.body ?? purpose,
        evidenceRefs: seed?.evidenceRefs || [],
        stateRefs: seed?.stateRefs || [],
      });
      dispatch(target, ASPECT_MESH_EVENTS.coalitionStarted, {
        coalition,
        traceId: envelope.traceId,
        seedEnvelopeId: envelope.id,
      });
      const result = await runAspectCoalition({
        coalition,
        seed: envelope,
        rounds,
        bus,
        runtimeOptions,
      });
      dispatch(target, ASPECT_MESH_EVENTS.coalitionComplete, {
        coalition: result.coalition,
        synthesis: result.synthesis,
        traceId: envelope.traceId,
      });
      return result;
    },

    async flushPersistence() {
      return houseBridge?.flush?.() || [];
    },

    stop() {
      unsubscribeEvents();
      houseBridge?.stop?.();
      if (installedRuntime === runtime) installedRuntime = null;
    },
  };

  return Object.freeze(runtime);
}

export function installAspectMeshRuntime(options = {}) {
  if (installedRuntime) return installedRuntime;
  installedRuntime = createAspectMeshRuntime(options);
  globalThis.__arcsweepAspectMesh = installedRuntime;
  dispatch(options.target || globalThis.document, ASPECT_MESH_EVENTS.ready, {
    schema: installedRuntime.schema,
    persistence: Boolean(installedRuntime.houseBridge),
    worldId: options.world?.identity_anchor?.world_id || options.world?.id || null,
  });
  return installedRuntime;
}

export function readAspectMeshRuntime() {
  return installedRuntime || globalThis.__arcsweepAspectMesh || null;
}
