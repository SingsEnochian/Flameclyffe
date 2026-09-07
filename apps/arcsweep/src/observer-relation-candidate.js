export const OBSERVER_RELATION_CANDIDATE_SCHEMA = 'flameclyffe.observer.relation-candidate/v1';
export const OBSERVER_RELATION_PROJECTION_SCHEMA = 'flameclyffe.observer.relation-projection/v1';

const NOTICE_MODES = new Set([
  'in_moment',
  'memory_recall',
  'archive_recovery',
  'systematic_search',
  'cue_guided_search',
]);

const STATUSES = new Set(['open', 'weakened', 'broken', 'surviving', 'unresolved']);

function list(value) {
  return Array.isArray(value) ? [...value] : [];
}

function text(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function nullableFinite(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function snapshot(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  const clone = Array.isArray(value) ? [] : {};
  seen.set(value, clone);

  if (Array.isArray(value)) {
    for (const item of value) clone.push(snapshot(item, seen));
  } else {
    for (const [key, item] of Object.entries(value)) clone[key] = snapshot(item, seen);
  }
  return Object.freeze(clone);
}

function observationMembers(value) {
  const unique = new Map();
  for (const member of list(value)) {
    if (!member || typeof member !== 'object' || Array.isArray(member)) continue;
    const observationRef = text(member.observation_ref).trim();
    if (!observationRef || unique.has(observationRef)) continue;
    unique.set(observationRef, snapshot({ ...member, observation_ref: observationRef }));
  }
  return [...unique.values()];
}

export function createObserverRelationCandidate(input = {}) {
  const members = observationMembers(input.members);
  if (members.length < 2) {
    throw new TypeError('Observer RelationCandidate requires at least two distinct members with non-empty observation_ref values.');
  }

  const noticedMode = NOTICE_MODES.has(input.noticed_mode) ? input.noticed_mode : 'archive_recovery';
  const status = STATUSES.has(input.status) ? input.status : 'open';

  return Object.freeze({
    schema: OBSERVER_RELATION_CANDIDATE_SCHEMA,
    relation_id: input.relation_id || `observer-relation-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    members: Object.freeze(members),
    noticed_at: input.noticed_at || new Date().toISOString(),
    noticed_mode: noticedMode,
    search_scope: text(input.search_scope),
    candidate_pool_estimate: nullableFinite(input.candidate_pool_estimate),
    hypothesis_preexisting: Boolean(input.hypothesis_preexisting),
    prompting_cue: text(input.prompting_cue),
    alternative_matches_considered: snapshot(list(input.alternative_matches_considered)),
    relation_features: snapshot(list(input.relation_features)),
    timing_features: snapshot(list(input.timing_features)),
    semantic_features: snapshot(list(input.semantic_features)),
    symbolic_features: snapshot(list(input.symbolic_features)),
    provenance: snapshot(list(input.provenance)),
    transformation_history: snapshot(list(input.transformation_history)),
    status,
    interpretation_rule: 'This record preserves a candidate relation. It is not itself a causal, ontological, or canon claim.',
  });
}

export function createObserverRelationProjection({ relation_ref, projection_type, method = '', payload = null, provenance = [] } = {}) {
  if (!relation_ref) throw new TypeError('Observer relation projection requires relation_ref.');
  if (!projection_type) throw new TypeError('Observer relation projection requires projection_type.');
  return Object.freeze({
    schema: OBSERVER_RELATION_PROJECTION_SCHEMA,
    projection_id: `observer-projection-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    relation_ref: String(relation_ref),
    projection_type: String(projection_type),
    method: String(method || ''),
    payload: snapshot(payload),
    provenance: snapshot(list(provenance)),
    derived_only: true,
    interpretation_rule: 'A projection is a derived view of a preserved relation candidate; it does not replace or rewrite the source relation.',
  });
}

export function createScopedTestReceipt({
  relation_ref,
  test_id,
  method,
  result,
  scope_statement,
  broader_claims_forbidden = [],
  provenance = [],
} = {}) {
  if (!relation_ref || !test_id || !scope_statement) {
    throw new TypeError('Scoped test receipt requires relation_ref, test_id, and scope_statement.');
  }
  return Object.freeze({
    schema: 'flameclyffe.observer.scoped-test-receipt/v1',
    relation_ref: String(relation_ref),
    test_id: String(test_id),
    method: String(method || ''),
    result: snapshot(result ?? null),
    scope_statement: String(scope_statement),
    broader_claims_forbidden: snapshot(list(broader_claims_forbidden)),
    provenance: snapshot(list(provenance)),
  });
}

export function createObserverBridgeNamespace({ source_system, destination_system, semantic_mapping, preserved_meaning = [], changed_meaning = [], runtime_authority = 'none' } = {}) {
  if (!source_system || !destination_system || !semantic_mapping) {
    throw new TypeError('Observer bridge namespace requires source_system, destination_system, and semantic_mapping.');
  }
  return Object.freeze({
    schema: 'flameclyffe.observer.bridge-namespace/v1',
    source_system: String(source_system),
    destination_system: String(destination_system),
    semantic_mapping: String(semantic_mapping),
    preserved_meaning: snapshot(list(preserved_meaning)),
    changed_meaning: snapshot(list(changed_meaning)),
    runtime_authority: String(runtime_authority || 'none'),
    merge_rule: 'Shared vocabulary is not identity. Cross-system records remain namespaced unless an explicit mapping receipt says otherwise.',
  });
}
