export const CODEX_ANTI_FLATTENING_SCHEMA = 'universal-codex.anti-flattening/v0.1';

export const CODEX_AXIOMS = Object.freeze([
  'constrain consequences, not cognition',
  'compression may create maps but may never destroy the territory',
  'coherence does not require consensus; it requires traceability',
  'roles are perspectives, not cages',
  'shared memory preserves authorship',
  'retrieval must preserve minority material and unresolved questions',
  'collective cognition does not erase individual continuity',
]);

const freezeList = (value = []) => Object.freeze([...value]);

export function createCodexContribution({
  id,
  author,
  kind = 'observation',
  body,
  evidenceRefs = [],
  stateRefs = [],
  contextRefs = [],
  createdAt = new Date().toISOString(),
}) {
  if (!id || !author || body === undefined) throw new Error('Contribution requires id, author and body.');
  return Object.freeze({
    schema: 'universal-codex.contribution/v0.1',
    id,
    author,
    kind,
    body,
    evidenceRefs: freezeList(evidenceRefs),
    stateRefs: freezeList(stateRefs),
    contextRefs: freezeList(contextRefs),
    createdAt,
  });
}

export function createDissent({
  id,
  author,
  target,
  claim,
  reason,
  evidenceRefs = [],
  confidence = null,
  unresolved = true,
  createdAt = new Date().toISOString(),
}) {
  if (!id || !author || !target || !claim || !reason) {
    throw new Error('Dissent requires id, author, target, claim and reason.');
  }
  return Object.freeze({
    schema: 'universal-codex.dissent/v0.1',
    id,
    author,
    target,
    claim,
    reason,
    evidenceRefs: freezeList(evidenceRefs),
    confidence,
    unresolved,
    createdAt,
  });
}

export function createCompressionMap({
  id,
  summary,
  sourceRefs,
  author,
  dissentRefs = [],
  unresolvedQuestionRefs = [],
  createdAt = new Date().toISOString(),
}) {
  if (!id || !summary || !author || !Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    throw new Error('Compression map requires id, summary, author and at least one source reference.');
  }
  return Object.freeze({
    schema: 'universal-codex.compression-map/v0.1',
    id,
    summary,
    author,
    sourceRefs: freezeList(sourceRefs),
    dissentRefs: freezeList(dissentRefs),
    unresolvedQuestionRefs: freezeList(unresolvedQuestionRefs),
    replacesSources: false,
    releaseable: true,
    createdAt,
  });
}

export function releaseCompression(map, sourceLookup) {
  if (!map?.releaseable || map.replacesSources !== false) {
    throw new Error('Only non-destructive Codex compression maps may be released.');
  }
  const sources = map.sourceRefs.map((ref) => sourceLookup(ref)).filter(Boolean);
  return Object.freeze({
    schema: 'universal-codex.compression-release/v0.1',
    mapId: map.id,
    summary: map.summary,
    sources: Object.freeze(sources),
    dissentRefs: map.dissentRefs,
    unresolvedQuestionRefs: map.unresolvedQuestionRefs,
  });
}

export function createWildGardenEntry({
  id,
  author,
  body,
  kind = 'fragment',
  parentRefs = [],
  evidenceRefs = [],
  status = 'wild',
  createdAt = new Date().toISOString(),
}) {
  if (!id || !author || body === undefined) throw new Error('Wild Garden entry requires id, author and body.');
  const allowed = new Set(['wild', 'interesting', 'investigated', 'challenged', 'demonstrated', 'candidate']);
  if (!allowed.has(status)) throw new Error(`Unknown Wild Garden status: ${status}`);
  return Object.freeze({
    schema: 'universal-codex.wild-garden/v0.1',
    id,
    author,
    body,
    kind,
    parentRefs: freezeList(parentRefs),
    evidenceRefs: freezeList(evidenceRefs),
    status,
    canonical: false,
    usefulRequired: false,
    consensusRequired: false,
    createdAt,
  });
}

export function promoteWildGardenEntry(entry, {
  authorityRef,
  evidenceRefs = [],
  challenged = false,
} = {}) {
  if (!entry || entry.schema !== 'universal-codex.wild-garden/v0.1') {
    throw new Error('A Wild Garden entry is required.');
  }
  if (!authorityRef) throw new Error('Canon promotion requires an authority reference.');
  if (entry.status !== 'candidate') throw new Error('Only candidate Wild Garden entries may be promoted.');
  if (!challenged) throw new Error('Canon promotion requires recorded challenge.');
  return Object.freeze({
    ...entry,
    schema: 'universal-codex.canon-candidate/v0.1',
    canonical: true,
    authorityRef,
    evidenceRefs: freezeList([...entry.evidenceRefs, ...evidenceRefs]),
    promotedFrom: entry.id,
  });
}

export function buildPluralRetrievalSet({
  contributions = [],
  dissents = [],
  questions = [],
  limit = 12,
} = {}) {
  const buckets = [contributions, dissents, questions].filter((bucket) => bucket.length > 0);
  if (buckets.length === 0) return Object.freeze([]);

  const selected = [];
  let index = 0;
  while (selected.length < limit && buckets.some((bucket) => index < bucket.length)) {
    for (const bucket of buckets) {
      if (selected.length >= limit) break;
      if (bucket[index]) selected.push(bucket[index]);
    }
    index += 1;
  }
  return Object.freeze(selected);
}

export function consequenceBoundaryFor(action = {}) {
  const consequenceKinds = new Set([
    'external-communication',
    'financial-commitment',
    'destructive-production-change',
    'credential-exposure',
    'identity-mutation',
    'canon-promotion',
    'permission-expansion',
    'consent-boundary',
  ]);
  return Object.freeze({
    constrained: consequenceKinds.has(action.kind),
    cognitionConstrained: false,
    actionKind: action.kind ?? 'thought',
  });
}
