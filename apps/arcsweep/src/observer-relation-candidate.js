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

export function createObserverRelationCandidate(input = {}) {
  const members = list(input.members).filter(Boolean);
  if (members.length < 2) throw new TypeError('Observer RelationCandidate requires at least two members.');

  const noticedMode = NOTICE_MODES.has(input.noticed_mode) ? input.noticed_mode : 'archive_recovery';
  const status = STATUSES.has(input.status) ? input.status : 'open';

  return Object.freeze({
    schema: OBSERVER_RELATION_CANDIDATE_SCHEMA,
    relation_id: input.relation_id || `observer-relation-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    members: Object.freeze(members.map((member) => Object.freeze({ ...member }))),
    noticed_at: input.noticed_at || new Date().toISOString(),
    noticed_mode: noticedMode,
    search_scope: text(input.search_scope),
    candidate_pool_estimate: nullableFinite(input.candidate_pool_estimate),
    hypothesis_preexisting: Boolean(input.hypothesis_preexisting),
    prompting_cue: text(input.prompting_cue),
    alternative_matches_considered: Object.freeze(list(input.alternative_matches_considered)),
    relation_features: Object.freeze(list(input.relation_features)),
    timing_features: Object.freeze(list(input.timing_features)),
    semantic_features: Object.freeze(list(input.semantic_features)),
    symbolic_features: Object.freeze(list(input.symbolic_features)),
    provenance: Object.freeze(list(input.provenance)),
    transformation_history: Object.freeze(list(input.transformation_history)),
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
    payload,
    provenance: Object.freeze(list(provenance)),
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
    result: result ?? null,
    scope_statement: String(scope_statement),
    broader_claims_forbidden: Object.freeze(list(broader_claims_forbidden)),
    provenance: Object.freeze(list(provenance)),
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
    preserved_meaning: Object.freeze(list(preserved_meaning)),
    changed_meaning: Object.freeze(list(changed_meaning)),
    runtime_authority: String(runtime_authority || 'none'),
    merge_rule: 'Shared vocabulary is not identity. Cross-system records remain namespaced unless an explicit mapping receipt says otherwise.',
  });
}
