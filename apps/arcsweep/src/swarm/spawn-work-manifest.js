export const SPAWN_WORK_MANIFEST_SCHEMA = 'hearthweave.spawn-work-manifest/v0.1';

const DEFAULT_LANES = Object.freeze([
  Object.freeze({ id: 'systems', label: 'Systems', aspects: ['mapper', 'critic'], purpose: 'Architecture, interfaces, dependencies, and failure modes.' }),
  Object.freeze({ id: 'implementation', label: 'Implementation', aspects: ['maker', 'mapper'], purpose: 'Smallest reversible implementation path and concrete artefacts.' }),
  Object.freeze({ id: 'verification', label: 'Verification', aspects: ['critic', 'witness'], purpose: 'Tests, edge cases, evidence, and regression checks.' }),
  Object.freeze({ id: 'narrative', label: 'Narrative', aspects: ['narrative', 'continuity'], purpose: 'Human-facing explanation, continuity, and Codex presentation.' }),
]);

function text(value) {
  return String(value ?? '').trim();
}

function unique(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function id(prefix = 'spawn') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function normaliseSpawnLane(input = {}) {
  const laneId = text(input.id);
  if (!laneId) throw new TypeError('Spawn lane requires an id.');
  const aspects = unique(input.aspects);
  const agentIds = unique(input.agentIds || input.aiosAgentIds);
  return Object.freeze({
    id: laneId,
    label: text(input.label) || laneId,
    purpose: text(input.purpose),
    aspects: Object.freeze(aspects),
    agentIds: Object.freeze(agentIds),
    expectedReturn: text(input.expectedReturn) || 'Return findings, evidence, proposed artefacts, open questions, and any consequential edge encountered.',
    reversibleScope: text(input.reversibleScope) || 'analysis, proposals, tests, and reversible implementation only',
    rounds: Math.max(1, Math.min(4, Number(input.rounds) || 1)),
  });
}

export function createSpawnWorkManifest({
  title,
  objective,
  traceId = null,
  lanes = DEFAULT_LANES,
  constraints = [],
  context = [],
  synthesisAspectId = 'mapper',
  aios = { enabled: true },
} = {}) {
  const workTitle = text(title) || 'Spawned work';
  const workObjective = text(objective);
  if (!workObjective) throw new TypeError('Spawn work manifest requires an objective.');
  const manifestId = id('spawn-manifest');
  return Object.freeze({
    schema: SPAWN_WORK_MANIFEST_SCHEMA,
    manifestId,
    traceId: text(traceId) || id('spawn-trace'),
    title: workTitle,
    objective: workObjective,
    constraints: Object.freeze(unique(constraints)),
    context: Object.freeze(unique(context)),
    lanes: Object.freeze((Array.isArray(lanes) ? lanes : []).map(normaliseSpawnLane)),
    synthesisAspectId: text(synthesisAspectId) || 'mapper',
    aios: Object.freeze({
      enabled: aios?.enabled !== false,
      requireConfiguredAgent: aios?.requireConfiguredAgent !== false,
    }),
    authority: Object.freeze({
      canon: 'propose-only',
      identity: 'no-authority',
      continuity: 'House remains canonical',
      implementation: 'reversible lane-scoped work only',
    }),
    createdAt: new Date().toISOString(),
  });
}

export function earthGateFiveDaySpawnManifest(overrides = {}) {
  return createSpawnWorkManifest({
    title: 'Earth Gate Bridge Protocol v0.1',
    objective: 'Build the five-day Earth Gate prototype: session contract and sealed targets, deterministic Runa transmission packet, Codex capture surface, correspondence scoring, and an end-to-end verification path.',
    constraints: [
      'Record before interpretation; never rewrite captured evidence after reveal.',
      'Reuse Aspect Mesh, House continuity, Universal Codex, Runa, PREMAQC, and AIOS rather than duplicating them.',
      'Blind target commitment and reveal must be independently verifiable.',
      'Controls and sham conditions are first-class protocol states.',
      'Agent outputs remain proposals or reversible artefacts until integrated and verified.',
    ],
    context: [
      'AIOS schedules and serves; Hearthweave remembers and becomes; Universal Codex makes both legible.',
      'The Gate may interpret after recording. It may never rewrite what was recorded.',
    ],
    lanes: [
      { id: 'protocol', label: 'Protocol', aspects: ['mapper', 'critic'], purpose: 'Session schema, hidden-target commitment, evidence ledger, controls, and state machine.', expectedReturn: 'Contract schemas, invariants, edge cases, and implementation-ready interfaces.' },
      { id: 'runa', label: 'Runa', aspects: ['maker', 'mapper'], purpose: 'Crossing Packet compiler, deterministic playback timeline, receipt format, and configuration seam.', expectedReturn: 'Transmission config and timing contract plus smallest implementation route.' },
      { id: 'codex', label: 'Codex', aspects: ['narrative', 'maker'], purpose: 'Living two-page transmission/reception UI, fast raw capture, artefact motion semantics, and reveal presentation.', expectedReturn: 'UI component map, interaction states, and reversible implementation patch plan.' },
      { id: 'scoring', label: 'Scoring', aspects: ['critic', 'witness'], purpose: 'Deterministic correspondence scorer, provenance categories, reveal discipline, and control comparison.', expectedReturn: 'Scoring rules, fixtures, tests, and explicit separation of exact, synonym, semantic candidate, and human interpretation.' },
      { id: 'verification', label: 'Verification', aspects: ['witness', 'continuity'], purpose: 'End-to-end receipts, replay, failure injection, persistence, and five-day definition-of-done checks.', expectedReturn: 'Acceptance suite, failure matrix, evidence checklist, and handoff-ready verification plan.' },
    ],
    synthesisAspectId: 'mapper',
    ...overrides,
  });
}
