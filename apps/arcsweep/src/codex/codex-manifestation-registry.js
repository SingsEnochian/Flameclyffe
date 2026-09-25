import { resolveCodexMaterial } from './codex-material-system.js';

export const CODEX_MANIFESTATION_SCHEMA = 'hearthweave.codex-manifestation/v0.1';

const entry = (id, material, physical, quiet = false) => Object.freeze({
  id,
  material: resolveCodexMaterial(material),
  physical,
  quiet,
});

export const CODEX_MANIFESTATIONS = Object.freeze({
  observation: entry('observation', 'living', 'marginal-note'),
  question: entry('question', 'living', 'open-margin-mark'),
  proposal: entry('proposal', 'possible', 'foldout'),
  alternateProposal: entry('alternate-proposal', 'liminal', 'alternate-leaf'),
  narrativeBranch: entry('narrative-branch', 'liminal', 'alternate-leaf'),
  coalitionWorking: entry('coalition-working', 'living', 'gathered-edge-marks'),
  coalitionReturned: entry('coalition-returned', 'organic', 'braided-trace'),
  experimentProposed: entry('experiment-proposed', 'possible', 'glass-slip'),
  experimentRunning: entry('experiment-running', 'living', 'refracting-glass-slip'),
  experimentOutcome: entry('experiment-outcome', 'continuity', 'settled-glass-slip'),
  experimentReflection: entry('experiment-reflection', 'enduring', 'gold-annotation'),
  growthClaim: entry('growth-claim', 'organic', 'growth-ring'),
  growthRevision: entry('growth-revision', 'organic', 'paired-growth-rings'),
  growthContradiction: entry('growth-contradiction', 'organic', 'cross-linked-rings'),
  growthRetired: entry('growth-retired', 'continuity', 'recessed-ring'),
  durableCanon: entry('durable-canon', 'enduring', 'gold-inscription'),
  activeTrace: entry('active-trace', 'living', 'trace-ribbon'),
  unfinishedThread: entry('unfinished-thread', 'continuity', 'persistent-ribbon'),
  recurringCollaboration: entry('recurring-collaboration', 'organic', 'braided-margin-line'),
  pause: entry('pause', 'quiet', 'quiet-mark', true),
  refusal: entry('refusal', 'continuity', 'closed-mark', true),
  returnPoint: entry('return-point', 'continuity', 'bookmark'),
  provenance: entry('provenance', 'continuity', 'receipt-underside'),
  quiet: entry('quiet', 'quiet', 'none', true),
});

export function codexManifestation(kind = 'quiet') {
  return CODEX_MANIFESTATIONS[kind] || CODEX_MANIFESTATIONS.quiet;
}

export function createCodexManifestation({
  kind,
  id,
  traceId = null,
  aspectIds = [],
  text = '',
  createdAt = '',
  state = {},
  provenance = [],
} = {}) {
  const definition = codexManifestation(kind);
  return Object.freeze({
    schema: CODEX_MANIFESTATION_SCHEMA,
    id: String(id || `${definition.id}:${traceId || createdAt || 'open'}`),
    kind: definition.id,
    physical: definition.physical,
    material: definition.material,
    quiet: definition.quiet,
    traceId: traceId ? String(traceId) : null,
    aspectIds: Object.freeze([...new Set((aspectIds || []).map(String).filter(Boolean))]),
    text: String(text || ''),
    createdAt: String(createdAt || ''),
    state: Object.freeze({ ...(state || {}) }),
    provenance: Object.freeze([...(provenance || []).map(String).filter(Boolean)]),
  });
}
