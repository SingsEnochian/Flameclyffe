import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createObserverRelationCandidate,
  createObserverRelationProjection,
  createScopedTestReceipt,
  createObserverBridgeNamespace,
} from '../src/observer-relation-candidate.js';

test('RelationCandidate preserves n-way membership without choosing a projection', () => {
  const relation = createObserverRelationCandidate({
    members: [{ observation_ref: 'a' }, { observation_ref: 'b' }, { observation_ref: 'c' }],
    noticed_mode: 'archive_recovery',
    status: 'open',
  });
  assert.equal(relation.members.length, 3);
  assert.equal(relation.schema, 'flameclyffe.observer.relation-candidate/v1');
  assert.equal('projection_type' in relation, false);
});

test('retrospective discovery provenance remains explicit', () => {
  const relation = createObserverRelationCandidate({
    members: [{ observation_ref: 'a' }, { observation_ref: 'b' }],
    noticed_mode: 'systematic_search',
    search_scope: 'archive 2026-08-01..2026-09-01',
    candidate_pool_estimate: 120,
    hypothesis_preexisting: true,
    alternative_matches_considered: ['c', 'd'],
  });
  assert.equal(relation.noticed_mode, 'systematic_search');
  assert.equal(relation.candidate_pool_estimate, 120);
  assert.equal(relation.hypothesis_preexisting, true);
  assert.deepEqual(relation.alternative_matches_considered, ['c', 'd']);
});

test('projection is derived and cannot replace the source relation', () => {
  const projection = createObserverRelationProjection({
    relation_ref: 'observer-relation-1',
    projection_type: 'hypergraph',
    method: 'fixture',
  });
  assert.equal(projection.derived_only, true);
  assert.equal(projection.relation_ref, 'observer-relation-1');
});

test('scoped test receipt carries a mechanically narrow conclusion', () => {
  const receipt = createScopedTestReceipt({
    relation_ref: 'observer-relation-1',
    test_id: 'T0-time-shuffle',
    method: 'shuffle observed order',
    result: { feature_survived: false },
    scope_statement: 'This feature depended on this temporal ordering under this method.',
    broader_claims_forbidden: ['history matters nowhere', 'Hidden Runtime globally loses'],
  });
  assert.match(receipt.scope_statement, /this temporal ordering/i);
  assert.equal(receipt.broader_claims_forbidden.length, 2);
});

test('cross-system Observer records require explicit namespace mapping', () => {
  const mapping = createObserverBridgeNamespace({
    source_system: 'uh-observer',
    destination_system: 'flameclyffe-observer',
    semantic_mapping: 'DEEPTheory pattern candidate -> external analytical source',
    preserved_meaning: ['provenance', 'candidate status'],
    changed_meaning: ['runtime authority'],
  });
  assert.equal(mapping.runtime_authority, 'none');
  assert.match(mapping.merge_rule, /Shared vocabulary is not identity/);
});
