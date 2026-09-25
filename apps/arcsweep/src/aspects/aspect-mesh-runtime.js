import { createAspectMessageBus, createAspectEnvelope } from './aspect-message-bus.js';
import { bindAspectBusToHouse } from './aspect-house-runtime.js';
import { createAspectCoalition, runAspectCoalition } from './aspect-coalition.js';
import { createAspectGrowthGarden } from './aspect-growth-garden.js';
import { hydrateAspectGrowthGardenFromHouse } from './aspect-growth-continuity.js';

export const ASPECT_MESH_RUNTIME_SCHEMA = 'hearthweave.aspect-mesh-runtime/v0.2';
export const ASPECT_MESH_EVENTS = Object.freeze({
  ready: 'arcsweep:aspect-mesh-ready',
  message: 'arcsweep:aspect-mesh-message',
  growthChanged: 'arcsweep:aspect-growth-changed',
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
  const growthGarden = createAspectGrowthGarden({ bus });
  const unsubscribeEvents = bus.subscribe((envelope) => {
    dispatch(target, ASPECT_MESH_EVENTS.message, envelope);
  });
  const unsubscribeGrowth = growthGarden.subscribe((snapshot) => {
    dispatch(target, ASPECT_MESH_EVENTS.growthChanged, snapshot);
  });
  const growthReady = persistence
    ? hydrateAspectGrowthGardenFromHouse(growthGarden).catch((error) => Object.freeze({ status: 'error', error: error?.message || String(error) }))
    : Promise.resolve(Object.freeze({ status: 'local-only', count: bus.all().length }));

  function publishGrowth({
    aspectId,
    subjectAspectId = aspectId,
    type = 'note',
    statement,
    relation = 'adds',
    targetEnvelopeIds = [],
    tags = [],
    traceId: growthTraceId,
    parentId = null,
    evidenceRefs = [],
    stateRefs = [],
  } = {}) {
    if (!String(aspectId || '').trim()) throw new Error('Growth note requires aspectId.');
    if (!String(statement || '').trim()) throw new Error('Growth note requires a statement.');
    return bus.publish({
      traceId: growthTraceId || traceId('growth-trace'),
      ...(parentId ? { parentId } : {}),
      sender: { aspectId: String(aspectId), invocationId: 'aspect-growth-garden' },
      recipients: [],
      kind: 'growth',
      body: {
        type: String(type || 'note'),
        subjectAspectId: String(subjectAspectId || aspectId),
        statement: String(statement).trim(),
        relation: String(relation || 'adds'),
        targetEnvelopeIds: Array.isArray(targetEnvelopeIds) ? targetEnvelopeIds : [],
        tags: Array.isArray(tags) ? tags : [],
      },
      evidenceRefs,
      stateRefs,
    });
  }

  const runtime = {
    schema: ASPECT_MESH_RUNTIME_SCHEMA,
    bus,
    houseBridge,
    growthGarden,
    growthReady,
    world,

    publish(input) {
      return bus.publish(input);
    },

    recordGrowth(input = {}) {
      return publishGrowth({ ...input, relation: input.relation || 'adds' });
    },

    reviseGrowth({ targetEnvelopeId, ...input } = {}) {
      if (!String(targetEnvelopeId || '').trim()) throw new Error('Growth revision requires targetEnvelopeId.');
      return publishGrowth({ ...input, relation: 'supersedes', targetEnvelopeIds: [targetEnvelopeId] });
    },

    contradictGrowth({ targetEnvelopeId, ...input } = {}) {
      if (!String(targetEnvelopeId || '').trim()) throw new Error('Growth contradiction requires targetEnvelopeId.');
      return publishGrowth({ ...input, relation: 'contradicts', targetEnvelopeIds: [targetEnvelopeId] });
    },

    retireGrowth({ targetEnvelopeId, ...input } = {}) {
      if (!String(targetEnvelopeId || '').trim()) throw new Error('Growth retirement requires targetEnvelopeId.');
      return publishGrowth({ ...input, relation: 'retires', targetEnvelopeIds: [targetEnvelopeId] });
    },

    affirmGrowth({ targetEnvelopeId, ...input } = {}) {
      if (!String(targetEnvelopeId || '').trim()) throw new Error('Growth affirmation requires targetEnvelopeId.');
      return publishGrowth({ ...input, relation: 'affirms', targetEnvelopeIds: [targetEnvelopeId] });
    },

    growthSnapshot() {
      return growthGarden.snapshot();
    },

    growthFor(aspectId) {
      return growthGarden.forAspect(aspectId);
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
        runtimeOptions: { ...runtimeOptions, growthGarden },
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
      unsubscribeGrowth();
      growthGarden.stop();
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
    growthMemory: installedRuntime.growthGarden?.schema || null,
    worldId: options.world?.identity_anchor?.world_id || options.world?.id || null,
  });
  void installedRuntime.growthReady.then(() => {
    dispatch(options.target || globalThis.document, ASPECT_MESH_EVENTS.growthChanged, installedRuntime?.growthSnapshot?.());
  });
  return installedRuntime;
}

export function readAspectMeshRuntime() {
  return installedRuntime || globalThis.__arcsweepAspectMesh || null;
}
