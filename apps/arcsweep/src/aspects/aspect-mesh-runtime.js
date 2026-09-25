import { createAspectMessageBus, createAspectEnvelope } from './aspect-message-bus.js';
import { bindAspectBusToHouse } from './aspect-house-runtime.js';
import { createAspectCoalition, runAspectCoalition } from './aspect-coalition.js';
import { runAspectBusTurn } from './aspect-runtime-adapter.js';
import { createAspectGrowthGarden } from './aspect-growth-garden.js';
import { hydrateAspectGrowthGardenFromHouse } from './aspect-growth-continuity.js';
import { createAspectExperimentBed, createExperimentBody, isAspectExperimentEnvelope } from './aspect-experiment-bed.js';
import { hydrateAspectExperimentBedFromHouse } from './aspect-experiment-continuity.js';
import { classifyConsequence } from './consequence-boundary.js';

export const ASPECT_MESH_RUNTIME_SCHEMA = 'hearthweave.aspect-mesh-runtime/v0.3';
export const ASPECT_MESH_EVENTS = Object.freeze({
  ready: 'arcsweep:aspect-mesh-ready',
  message: 'arcsweep:aspect-mesh-message',
  growthChanged: 'arcsweep:aspect-growth-changed',
  experimentChanged: 'arcsweep:aspect-experiment-changed',
  experimentStarted: 'arcsweep:aspect-experiment-started',
  experimentComplete: 'arcsweep:aspect-experiment-complete',
  experimentReflected: 'arcsweep:aspect-experiment-reflected',
  coalitionStarted: 'arcsweep:aspect-mesh-coalition-started',
  coalitionComplete: 'arcsweep:aspect-mesh-coalition-complete',
});

let installedRuntime = null;

function dispatch(target, name, detail) {
  if (!target?.dispatchEvent || typeof CustomEvent === 'undefined') return;
  target.dispatchEvent(new CustomEvent(name, { detail }));
}

function id(prefix = 'aspect-trace') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function bodyText(body) {
  if (typeof body === 'string') return body;
  try { return JSON.stringify(body ?? null); } catch { return String(body ?? ''); }
}

function experimentContext(experiment) {
  return [
    `Experiment: ${experiment.title}`,
    experiment.hypothesis ? `Hypothesis: ${experiment.hypothesis}` : '',
    experiment.method ? `Method: ${experiment.method}` : '',
    experiment.reversibleScope ? `Reversible scope: ${experiment.reversibleScope}` : '',
    experiment.successSignals?.length ? `Signals to notice: ${experiment.successSignals.join(' | ')}` : '',
    'This is an experiment, not an exam. A result may be worked, did-not-work, mixed, inconclusive, or simply observed. Preserve useful surprise.',
  ].filter(Boolean);
}

export function createAspectMeshRuntime({
  bus = createAspectMessageBus(),
  world = null,
  target = globalThis.document,
  persistence = true,
  experimentRuntimeOptions = {},
} = {}) {
  const houseBridge = persistence ? bindAspectBusToHouse({ bus, world }) : null;
  const growthGarden = createAspectGrowthGarden({ bus });
  const experimentBed = createAspectExperimentBed({ bus });
  const unsubscribeEvents = bus.subscribe((envelope) => {
    dispatch(target, ASPECT_MESH_EVENTS.message, envelope);
  });
  const unsubscribeGrowth = growthGarden.subscribe((snapshot) => {
    dispatch(target, ASPECT_MESH_EVENTS.growthChanged, snapshot);
  });
  const unsubscribeExperiments = experimentBed.subscribe((snapshot) => {
    dispatch(target, ASPECT_MESH_EVENTS.experimentChanged, snapshot);
  });
  const growthReady = persistence
    ? hydrateAspectGrowthGardenFromHouse(growthGarden).catch((error) => Object.freeze({ status: 'error', error: error?.message || String(error) }))
    : Promise.resolve(Object.freeze({ status: 'local-only', count: bus.all().length }));
  const experimentReady = persistence
    ? hydrateAspectExperimentBedFromHouse(experimentBed).catch((error) => Object.freeze({ status: 'error', error: error?.message || String(error) }))
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
      traceId: growthTraceId || id('growth-trace'),
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

  function publishExperimentPhase({
    aspectId,
    experimentId,
    phase,
    title,
    hypothesis,
    method,
    reversibleScope,
    collaborators = [],
    successSignals = [],
    operation = { reversible: true },
    autoStart = false,
    outcome = null,
    observation = '',
    reflection = '',
    growthType = 'note',
    relation = 'adds',
    targetEnvelopeIds = [],
    tags = [],
    subjectAspectId = null,
    traceId: experimentTraceId,
    parentId = null,
    evidenceRefs = [],
    stateRefs = [],
  } = {}) {
    if (!String(aspectId || '').trim()) throw new Error('Experiment phase requires aspectId.');
    const body = createExperimentBody({
      experimentId,
      phase,
      title,
      hypothesis,
      method,
      reversibleScope,
      collaborators,
      successSignals,
      operation,
      autoStart,
      outcome,
      observation,
      reflection,
      growthType,
      relation,
      targetEnvelopeIds,
      tags,
      subjectAspectId: subjectAspectId || aspectId,
    });
    const kind = phase === 'outcome' ? 'result' : phase === 'reflection' ? 'growth' : 'proposal';
    return bus.publish({
      traceId: experimentTraceId || id('experiment-trace'),
      ...(parentId ? { parentId } : {}),
      sender: { aspectId: String(aspectId), invocationId: 'aspect-experiment-bed' },
      recipients: phase === 'proposed' || phase === 'started' ? body.collaborators : [],
      kind,
      body,
      evidenceRefs,
      stateRefs,
    });
  }

  let autoStartQueue = Promise.resolve();
  let unsubscribeExperimentAutoStart = () => {};

  const runtime = {
    schema: ASPECT_MESH_RUNTIME_SCHEMA,
    bus,
    houseBridge,
    growthGarden,
    growthReady,
    experimentBed,
    experimentReady,
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

    experimentSnapshot() {
      return experimentBed.snapshot();
    },

    experimentsFor(aspectId) {
      return experimentBed.forAspect(aspectId);
    },

    proposeExperiment({
      aspectId,
      title,
      hypothesis = '',
      method = '',
      reversibleScope = '',
      collaborators = [],
      successSignals = [],
      operation = { reversible: true },
      autoStart = true,
      tags = [],
      traceId: proposedTraceId,
    } = {}) {
      const experimentId = id('experiment');
      return publishExperimentPhase({
        aspectId,
        experimentId,
        phase: 'proposed',
        title,
        hypothesis,
        method,
        reversibleScope,
        collaborators,
        successSignals,
        operation,
        autoStart,
        tags,
        traceId: proposedTraceId || id('experiment-trace'),
      });
    },

    recordExperimentOutcome({
      experimentId,
      aspectId = null,
      outcome = 'observed',
      observation,
      evidenceRefs = [],
      stateRefs = [],
    } = {}) {
      const experiment = experimentBed.get(experimentId);
      if (!experiment) throw new Error(`Unknown experiment: ${experimentId}`);
      const envelope = publishExperimentPhase({
        aspectId: aspectId || experiment.initiatorAspectId,
        experimentId,
        phase: 'outcome',
        title: experiment.title,
        hypothesis: experiment.hypothesis,
        method: experiment.method,
        reversibleScope: experiment.reversibleScope,
        collaborators: experiment.collaborators,
        successSignals: experiment.successSignals,
        operation: experiment.operation,
        outcome,
        observation: String(observation || '').trim() || 'Experiment completed; no additional observation was recorded.',
        traceId: experiment.traceId,
        parentId: experiment.startedEnvelopeId || experiment.proposalEnvelopeId,
        evidenceRefs,
        stateRefs,
      });
      dispatch(target, ASPECT_MESH_EVENTS.experimentComplete, { experimentId, envelope, experiment: experimentBed.get(experimentId) });
      return envelope;
    },

    reflectOnExperiment({
      experimentId,
      aspectId = null,
      reflection,
      growthType = 'note',
      relation = 'adds',
      targetEnvelopeIds = [],
      tags = [],
    } = {}) {
      const experiment = experimentBed.get(experimentId);
      if (!experiment) throw new Error(`Unknown experiment: ${experimentId}`);
      if (!String(reflection || '').trim()) throw new Error('Experiment reflection requires reflection text.');
      const envelope = publishExperimentPhase({
        aspectId: aspectId || experiment.initiatorAspectId,
        experimentId,
        phase: 'reflection',
        title: experiment.title,
        hypothesis: experiment.hypothesis,
        method: experiment.method,
        reversibleScope: experiment.reversibleScope,
        collaborators: experiment.collaborators,
        successSignals: experiment.successSignals,
        operation: experiment.operation,
        reflection,
        growthType,
        relation,
        targetEnvelopeIds,
        tags: ['experiment', ...tags],
        traceId: experiment.traceId,
        parentId: experiment.outcomeEnvelopeId || experiment.startedEnvelopeId || experiment.proposalEnvelopeId,
        evidenceRefs: experiment.outcomeEnvelopeId ? [experiment.outcomeEnvelopeId] : [],
        stateRefs: [experiment.proposalEnvelopeId].filter(Boolean),
      });
      dispatch(target, ASPECT_MESH_EVENTS.experimentReflected, { experimentId, envelope, experiment: experimentBed.get(experimentId) });
      return envelope;
    },

    async runExperiment({ experimentId, rounds = 1, synthesisAspectId = null, runtimeOptions = {} } = {}) {
      await experimentReady;
      const experiment = experimentBed.get(experimentId);
      if (!experiment) throw new Error(`Unknown experiment: ${experimentId}`);
      if (experiment.status === 'running') return Object.freeze({ status: 'already-running', experimentId, experiment });
      if (['completed', 'reflected'].includes(experiment.status)) return Object.freeze({ status: 'already-complete', experimentId, experiment });

      const consequence = classifyConsequence(experiment.operation || {});
      if (!experiment.reversibleScope || experiment.operation?.reversible !== true || !consequence.ordinary) {
        return Object.freeze({
          status: 'edge-required',
          experimentId,
          experiment,
          edges: consequence.edges,
          reason: !experiment.reversibleScope ? 'reversible-scope-not-declared' : experiment.operation?.reversible !== true ? 'not-declared-reversible' : 'consequence-boundary',
        });
      }

      const started = publishExperimentPhase({
        aspectId: experiment.initiatorAspectId,
        experimentId,
        phase: 'started',
        title: experiment.title,
        hypothesis: experiment.hypothesis,
        method: experiment.method,
        reversibleScope: experiment.reversibleScope,
        collaborators: experiment.collaborators,
        successSignals: experiment.successSignals,
        operation: experiment.operation,
        traceId: experiment.traceId,
        parentId: experiment.proposalEnvelopeId,
      });
      dispatch(target, ASPECT_MESH_EVENTS.experimentStarted, { experimentId, envelope: started, experiment: experimentBed.get(experimentId) });

      const members = [...new Set([experiment.initiatorAspectId, ...(experiment.collaborators || [])].filter(Boolean))];
      let observation = '';
      let execution = null;

      if (members.length >= 2) {
        execution = await runtime.startCoalition({
          purpose: `Run reversible experiment: ${experiment.title}`,
          members,
          synthesisAspectId: synthesisAspectId || experiment.initiatorAspectId,
          rounds,
          seed: started,
          runtimeOptions: {
            ...runtimeOptions,
            metadata: { ...(runtimeOptions.metadata || {}), surface: 'experiment-bed', experiment_id: experimentId },
          },
        });
        observation = bodyText(execution?.synthesis?.envelope?.body)
          || bodyText(execution?.rounds?.at?.(-1)?.lastEnvelope?.body)
          || 'Experiment coalition returned without a textual synthesis.';
      } else {
        const aspectId = experiment.initiatorAspectId;
        execution = await runAspectBusTurn({
          bus,
          aspectId,
          incoming: started,
          sharedContext: [...experimentContext(experiment), ...growthGarden.contextFor(aspectId)],
          ...runtimeOptions,
          metadata: { ...(runtimeOptions.metadata || {}), surface: 'experiment-bed', experiment_id: experimentId },
        });
        observation = bodyText(execution?.envelope?.body) || `Experiment turn returned with status ${execution?.status || 'unknown'}.`;
      }

      const outcomeEnvelope = runtime.recordExperimentOutcome({
        experimentId,
        aspectId: experiment.initiatorAspectId,
        outcome: 'observed',
        observation,
        evidenceRefs: execution?.envelope?.evidenceRefs || execution?.synthesis?.envelope?.evidenceRefs || [],
      });
      return Object.freeze({ status: 'completed', experimentId, experiment: experimentBed.get(experimentId), execution, outcomeEnvelope });
    },

    async startCoalition({
      id: coalitionId,
      purpose,
      members,
      synthesisAspectId = null,
      rounds = 1,
      seed,
      runtimeOptions = {},
    } = {}) {
      const coalition = createAspectCoalition({ id: coalitionId, purpose, members, synthesisAspectId });
      const envelope = seed?.id ? seed : createAspectEnvelope({
        id: seed?.id,
        traceId: seed?.traceId || id('coalition-trace'),
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
      await autoStartQueue;
      return houseBridge?.flush?.() || [];
    },

    stop() {
      unsubscribeExperimentAutoStart();
      unsubscribeEvents();
      unsubscribeGrowth();
      unsubscribeExperiments();
      growthGarden.stop();
      experimentBed.stop();
      houseBridge?.stop?.();
      if (installedRuntime === runtime) installedRuntime = null;
    },
  };

  unsubscribeExperimentAutoStart = bus.subscribe((envelope) => {
    if (!isAspectExperimentEnvelope(envelope) || envelope.body.phase !== 'proposed' || envelope.body.autoStart !== true) return;
    const experimentId = envelope.body.experimentId;
    autoStartQueue = autoStartQueue.then(async () => {
      await experimentReady;
      const experiment = experimentBed.get(experimentId);
      if (!experiment || experiment.status !== 'proposed') return null;
      const consequence = classifyConsequence(experiment.operation || {});
      if (!experiment.reversibleScope || experiment.operation?.reversible !== true || !consequence.ordinary) return null;
      try {
        return await runtime.runExperiment({ experimentId, runtimeOptions: experimentRuntimeOptions });
      } catch (error) {
        console.warn('[Aspect Mesh] experiment autostart failed', error);
        return null;
      }
    });
  });

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
    experimentMemory: installedRuntime.experimentBed?.schema || null,
    worldId: options.world?.identity_anchor?.world_id || options.world?.id || null,
  });
  void Promise.all([installedRuntime.growthReady, installedRuntime.experimentReady]).then(() => {
    dispatch(options.target || globalThis.document, ASPECT_MESH_EVENTS.growthChanged, installedRuntime?.growthSnapshot?.());
    dispatch(options.target || globalThis.document, ASPECT_MESH_EVENTS.experimentChanged, installedRuntime?.experimentSnapshot?.());
  });
  return installedRuntime;
}

export function readAspectMeshRuntime() {
  return installedRuntime || globalThis.__arcsweepAspectMesh || null;
}
