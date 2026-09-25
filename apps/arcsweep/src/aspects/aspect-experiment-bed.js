import { INITIAL_ASPECTS } from './aspect-contract.js';

export const ASPECT_EXPERIMENT_SCHEMA = 'hearthweave.aspect-experiment/v0.2';
export const ASPECT_EXPERIMENT_BED_SCHEMA = 'hearthweave.aspect-experiment-bed/v0.2';
export const ASPECT_EXPERIMENT_OUTCOMES = Object.freeze(['observed', 'worked', 'did-not-work', 'mixed', 'inconclusive']);

const knownAspectIds = new Set(INITIAL_ASPECTS.map((aspect) => aspect.id));

function text(value, max = 1400) {
  return String(value ?? '').trim().slice(0, max);
}

function strings(values, max = 120) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => text(value, max))
    .filter(Boolean))];
}

function mergeMessages(...sources) {
  const byId = new Map();
  for (const source of sources) {
    for (const message of Array.isArray(source) ? source : []) {
      if (message?.id) byId.set(String(message.id), message);
    }
  }
  return [...byId.values()].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

function operationShape(operation = {}) {
  const source = operation && typeof operation === 'object' && !Array.isArray(operation) ? operation : {};
  return Object.freeze({
    reversible: source.reversible !== false,
    external: source.external === true,
    externallyBinding: source.externallyBinding === true,
    financial: source.financial === true,
    destructive: source.destructive === true,
    exposesCredentials: source.exposesCredentials === true,
    exposesSecrets: source.exposesSecrets === true,
    identityMutation: source.identityMutation || null,
    canonPromotion: source.canonPromotion || null,
    permissionExpansion: source.permissionExpansion === true,
    consentBoundary: source.consentBoundary === true,
    production: source.production === true,
    practicalRecovery: source.practicalRecovery !== false,
  });
}

export function isAspectExperimentBody(body) {
  return Boolean(body && typeof body === 'object' && !Array.isArray(body)
    && (body.schema === ASPECT_EXPERIMENT_SCHEMA || body.mode === 'experiment')
    && body.experimentId);
}

export function isAspectExperimentEnvelope(envelope) {
  return Boolean(envelope?.id && isAspectExperimentBody(envelope.body));
}

export function createExperimentBody({
  experimentId,
  phase = 'proposed',
  title,
  hypothesis = '',
  method = '',
  reversibleScope = '',
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
} = {}) {
  const id = text(experimentId, 180);
  if (!id) throw new Error('Experiment body requires experimentId.');
  return Object.freeze({
    schema: ASPECT_EXPERIMENT_SCHEMA,
    mode: 'experiment',
    experimentId: id,
    phase: text(phase || 'proposed', 40),
    title: text(title || 'Untitled experiment', 240),
    hypothesis: text(hypothesis, 1200),
    method: text(method, 1600),
    reversibleScope: text(reversibleScope, 1000),
    collaborators: Object.freeze(strings(collaborators).filter((id) => knownAspectIds.has(id))),
    successSignals: Object.freeze(strings(successSignals, 300)),
    operation: operationShape(operation),
    autoStart: autoStart === true,
    ...(outcome ? { outcome: ASPECT_EXPERIMENT_OUTCOMES.includes(String(outcome)) ? String(outcome) : 'observed' } : {}),
    ...(observation ? { observation: text(observation, 2400) } : {}),
    ...(reflection ? { reflection: text(reflection, 1800) } : {}),
    ...(phase === 'reflection' ? {
      type: text(growthType || 'note', 40),
      statement: text(reflection || observation, 1400),
      relation: text(relation || 'adds', 40),
      targetEnvelopeIds: Object.freeze(strings(targetEnvelopeIds, 180)),
      tags: Object.freeze(strings(tags, 80)),
      ...(subjectAspectId ? { subjectAspectId: text(subjectAspectId, 80) } : {}),
    } : {}),
  });
}

function experimentRows(messages) {
  const rows = new Map();
  for (const message of messages.filter(isAspectExperimentEnvelope)) {
    const body = message.body;
    const id = body.experimentId;
    const row = rows.get(id) || {
      experimentId: id,
      title: body.title || 'Untitled experiment',
      hypothesis: '',
      method: '',
      reversibleScope: '',
      collaborators: [],
      successSignals: [],
      operation: operationShape(body.operation),
      autoStart: body.autoStart === true,
      initiatorAspectId: null,
      traceId: message.traceId || null,
      status: 'proposed',
      proposalEnvelopeId: null,
      startedEnvelopeId: null,
      outcomeEnvelopeId: null,
      reflectionEnvelopeId: null,
      outcome: null,
      observation: '',
      reflection: '',
      createdAt: message.createdAt || '',
      updatedAt: message.createdAt || '',
    };

    row.updatedAt = message.createdAt || row.updatedAt;
    row.traceId = message.traceId || row.traceId;
    row.title = body.title || row.title;
    row.hypothesis = body.hypothesis || row.hypothesis;
    row.method = body.method || row.method;
    row.reversibleScope = body.reversibleScope || row.reversibleScope;
    row.collaborators = body.collaborators?.length ? [...body.collaborators] : row.collaborators;
    row.successSignals = body.successSignals?.length ? [...body.successSignals] : row.successSignals;
    row.operation = operationShape(body.operation || row.operation);
    if (body.phase === 'proposed') row.autoStart = body.autoStart === true;

    if (body.phase === 'proposed') {
      row.initiatorAspectId = message.sender?.aspectId || row.initiatorAspectId;
      row.proposalEnvelopeId = message.id;
      row.status = row.status === 'proposed' ? 'proposed' : row.status;
    } else if (body.phase === 'started') {
      row.startedEnvelopeId = message.id;
      row.status = 'running';
    } else if (body.phase === 'outcome') {
      row.outcomeEnvelopeId = message.id;
      row.outcome = body.outcome || 'observed';
      row.observation = body.observation || '';
      row.status = 'completed';
    } else if (body.phase === 'reflection') {
      row.reflectionEnvelopeId = message.id;
      row.reflection = body.reflection || body.statement || '';
      row.status = 'reflected';
    }
    rows.set(id, row);
  }

  return [...rows.values()]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map((row) => Object.freeze({
      ...row,
      collaborators: Object.freeze([...row.collaborators]),
      successSignals: Object.freeze([...row.successSignals]),
      operation: Object.freeze({ ...row.operation }),
    }));
}

export function buildAspectExperimentSnapshot(messages = []) {
  const experiments = experimentRows(mergeMessages(messages));
  const byAspect = {};
  for (const aspect of INITIAL_ASPECTS) {
    byAspect[aspect.id] = Object.freeze(experiments.filter((experiment) =>
      experiment.initiatorAspectId === aspect.id || experiment.collaborators.includes(aspect.id)));
  }
  return Object.freeze({
    schema: ASPECT_EXPERIMENT_BED_SCHEMA,
    experiments: Object.freeze(experiments),
    open: Object.freeze(experiments.filter((experiment) => ['proposed', 'running'].includes(experiment.status))),
    completed: Object.freeze(experiments.filter((experiment) => ['completed', 'reflected'].includes(experiment.status))),
    byAspect: Object.freeze(byAspect),
  });
}

export function createAspectExperimentBed({ bus = null, history = [] } = {}) {
  let carried = mergeMessages(history);
  let snapshot = buildAspectExperimentSnapshot(mergeMessages(carried, bus?.all?.() || []));
  const subscribers = new Set();

  function refresh() {
    snapshot = buildAspectExperimentSnapshot(mergeMessages(carried, bus?.all?.() || []));
    for (const listener of subscribers) listener(snapshot);
    return snapshot;
  }

  const unsubscribeBus = bus?.subscribe?.((message) => {
    if (isAspectExperimentEnvelope(message)) refresh();
  }) || (() => {});

  return Object.freeze({
    schema: ASPECT_EXPERIMENT_BED_SCHEMA,
    snapshot: () => snapshot,
    get(experimentId) {
      return snapshot.experiments.find((experiment) => experiment.experimentId === String(experimentId || '')) || null;
    },
    forAspect(aspectId) {
      return snapshot.byAspect?.[String(aspectId || '')] || Object.freeze([]);
    },
    hydrate(messages = []) {
      carried = mergeMessages(carried, messages);
      return refresh();
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Experiment Bed subscriber must be a function.');
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    stop() {
      unsubscribeBus();
      subscribers.clear();
    },
  });
}
