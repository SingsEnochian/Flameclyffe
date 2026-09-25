import { INITIAL_ASPECTS } from '../aspects/aspect-contract.js';
import { isAspectExperimentEnvelope } from '../aspects/aspect-experiment-bed.js';
import { createCodexManifestation } from './codex-manifestation-registry.js';

export const CODEX_SEMANTIC_PROJECTION_SCHEMA = 'hearthweave.codex-semantic-projection/v0.1';

const knownAspects = new Set(INITIAL_ASPECTS.map((aspect) => aspect.id));
const branchDomains = new Set(['narrative', 'roleplay', 'counterfactual']);

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function bodyText(body) {
  if (typeof body === 'string') return body.trim();
  if (body == null) return '';
  const value = object(body);
  return String(value.statement || value.reflection || value.observation || value.text || value.title || '').trim();
}

function aspectIds(message) {
  const values = [message?.sender?.aspectId, ...(message?.recipients || [])]
    .map((value) => String(value || '').trim())
    .filter((value) => knownAspects.has(value));
  return [...new Set(values)];
}

function experimentKind(message) {
  if (!isAspectExperimentEnvelope(message)) return null;
  const phase = message.body.phase;
  if (phase === 'proposed') return 'experimentProposed';
  if (phase === 'started') return 'experimentRunning';
  if (phase === 'outcome') return 'experimentOutcome';
  if (phase === 'reflection') return 'experimentReflection';
  return 'experimentProposed';
}

export function codexKindForEnvelope(message = {}) {
  if (!knownAspects.has(String(message?.sender?.aspectId || ''))) return null;
  const experiment = experimentKind(message);
  if (experiment) return experiment;

  const kind = String(message.kind || 'thought');
  const body = object(message.body);
  if (kind === 'growth') {
    if (body.relation === 'supersedes') return 'growthRevision';
    if (body.relation === 'contradicts') return 'growthContradiction';
    if (body.relation === 'retires') return 'growthRetired';
    return 'growthClaim';
  }
  if (kind === 'proposal' && (body.mode === 'exploration' || branchDomains.has(String(body.domain || '')))) return 'narrativeBranch';
  if (kind === 'proposal') return 'proposal';
  if (kind === 'question') return 'question';
  if (kind === 'pause') return 'pause';
  if (kind === 'refusal') return 'refusal';
  if (['observation', 'reply', 'challenge', 'result', 'verification', 'thought'].includes(kind)) return 'observation';
  return 'observation';
}

export function manifestationFromEnvelope(message = {}) {
  const kind = codexKindForEnvelope(message);
  if (!kind) return null;
  const body = object(message.body);
  return createCodexManifestation({
    kind,
    id: `envelope:${message.id}`,
    traceId: message.traceId || null,
    aspectIds: aspectIds(message),
    text: bodyText(message.body),
    createdAt: message.createdAt || '',
    state: {
      sourceKind: message.kind || 'thought',
      domain: body.domain || null,
      experimentId: body.experimentId || null,
      experimentPhase: body.phase || null,
      growthRelation: body.relation || null,
      targetEnvelopeIds: body.targetEnvelopeIds || body.target_envelope_ids || [],
      tags: body.tags || [],
    },
    provenance: [message.id, ...(message.evidenceRefs || []), ...(message.stateRefs || [])],
  });
}

function experimentManifestations(snapshot = {}) {
  return (snapshot.experiments || []).map((experiment) => {
    let kind = 'experimentProposed';
    if (experiment.status === 'running') kind = 'experimentRunning';
    else if (experiment.status === 'completed') kind = 'experimentOutcome';
    else if (experiment.status === 'reflected') kind = 'experimentReflection';
    return createCodexManifestation({
      kind,
      id: `experiment:${experiment.experimentId}:${experiment.status}`,
      traceId: experiment.traceId || null,
      aspectIds: [experiment.initiatorAspectId, ...(experiment.collaborators || [])].filter(Boolean),
      text: experiment.reflection || experiment.observation || experiment.title || '',
      createdAt: experiment.updatedAt || experiment.createdAt || '',
      state: {
        experimentId: experiment.experimentId,
        status: experiment.status,
        outcome: experiment.outcome || null,
        tags: ['experiment'],
      },
      provenance: [
        experiment.proposalEnvelopeId,
        experiment.startedEnvelopeId,
        experiment.outcomeEnvelopeId,
        experiment.reflectionEnvelopeId,
      ].filter(Boolean),
    });
  });
}

function growthManifestations(snapshot = {}) {
  const rows = [];
  const seenCollaborations = new Set();
  for (const profile of Object.values(snapshot.profiles || {})) {
    for (const thread of profile.openThreads || []) {
      rows.push(createCodexManifestation({
        kind: 'unfinishedThread',
        id: `thread:${thread.traceId}:${profile.aspectId}`,
        traceId: thread.traceId,
        aspectIds: thread.aspects || [profile.aspectId],
        text: thread.text || '',
        createdAt: thread.lastAt || '',
        state: { tags: ['unfinished', 'return'], openedBy: thread.openedBy || null },
        provenance: [thread.traceId],
      }));
    }
    for (const collaborator of profile.collaborators || []) {
      if (!collaborator.recurring) continue;
      const pair = [profile.aspectId, collaborator.aspectId].sort();
      const key = pair.join(':');
      if (seenCollaborations.has(key)) continue;
      seenCollaborations.add(key);
      rows.push(createCodexManifestation({
        kind: 'recurringCollaboration',
        id: `collaboration:${key}`,
        aspectIds: pair,
        text: `${pair.join(' + ')} · ${collaborator.turns} turns across ${collaborator.traceCount} traces`,
        createdAt: collaborator.lastAt || '',
        state: { tags: ['relationship', 'recurring'], turns: collaborator.turns, traceCount: collaborator.traceCount },
        provenance: [],
      }));
    }
  }
  return rows;
}

function coalitionManifestation(coalition = null) {
  if (!coalition?.members?.length) return null;
  return createCodexManifestation({
    kind: coalition.state === 'returned' ? 'coalitionReturned' : 'coalitionWorking',
    id: `coalition:${coalition.id || coalition.traceId || 'open'}:${coalition.state || 'working'}`,
    traceId: coalition.traceId || coalition.id || null,
    aspectIds: coalition.members,
    text: coalition.purpose || 'Working together',
    createdAt: coalition.createdAt || '',
    state: { tags: ['coalition'], state: coalition.state || 'working' },
    provenance: [coalition.id, coalition.traceId].filter(Boolean),
  });
}

export function projectUniversalCodex({
  messages = [],
  growthSnapshot = null,
  experimentSnapshot = null,
  coalition = null,
} = {}) {
  const byId = new Map();
  const add = (manifestation) => { if (manifestation?.id) byId.set(manifestation.id, manifestation); };
  for (const message of Array.isArray(messages) ? messages : []) add(manifestationFromEnvelope(message));
  for (const manifestation of growthManifestations(growthSnapshot || {})) add(manifestation);
  for (const manifestation of experimentManifestations(experimentSnapshot || {})) add(manifestation);
  add(coalitionManifestation(coalition));

  const manifestations = [...byId.values()].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return Object.freeze({
    schema: CODEX_SEMANTIC_PROJECTION_SCHEMA,
    quiet: manifestations.length === 0,
    manifestations: Object.freeze(manifestations),
  });
}
