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

test('RelationCandidate requires two distinct valid observation references', () => {
  assert.throws(() => createObserverRelationCandidate({
    members: [{ observation_ref: 'a' }, { observation_ref: 'a' }, {}, 'b'],
  }), /two distinct members/i);

  const relation = createObserverRelationCandidate({
    members: [{ observation_ref: ' a ' }, { observation_ref: 'b' }, { observation_ref: 'b' }],
  });
  assert.deepEqual(relation.members.map((member) => member.observation_ref), ['a', 'b']);
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

test('unknown discovery provenance remains unknown rather than being invented', () => {
  const relation = createObserverRelationCandidate({
    members: [{ observation_ref: 'a' }, { observation_ref: 'b' }],
  });
  assert.equal(relation.noticed_mode, 'unrecorded');
  assert.equal(relation.hypothesis_preexisting, null);
});

test('projection is derived and cannot replace the source relation', () => {
  const payload = { simplex: { dimension: 3 } };
  const projection = createObserverRelationProjection({
    relation_ref: 'observer-relation-1',
    projection_type: 'hypergraph',
    method: 'fixture',
    payload,
  });
  payload.simplex.dimension = 99;
  assert.equal(projection.derived_only, true);
  assert.equal(projection.relation_ref, 'observer-relation-1');
  assert.equal(projection.payload.simplex.dimension, 3);
  assert.equal(Object.isFrozen(projection.payload.simplex), true);
});

test('scoped test receipt carries a mechanically narrow immutable conclusion', () => {
  const result = { feature_survived: false, details: { score: 0.25 } };
  const receipt = createScopedTestReceipt({
    relation_ref: 'observer-relation-1',
    test_id: 'T0-time-shuffle',
    method: 'shuffle observed order',
    result,
    scope_statement: 'This feature depended on this temporal ordering under this method.',
    broader_claims_forbidden: ['history matters nowhere', 'Hidden Runtime globally loses'],
  });
  result.feature_survived = true;
  result.details.score = 1;
  assert.match(receipt.scope_statement, /this temporal ordering/i);
  assert.equal(receipt.broader_claims_forbidden.length, 2);
  assert.equal(receipt.result.feature_survived, false);
  assert.equal(receipt.result.details.score, 0.25);
  assert.equal(Object.isFrozen(receipt.result.details), true);
});

test('cross-system Observer records require explicit namespace mapping', () => {
  const mapping = createObserverBridgeNamespace({
    source_system: 'uh-observer',
    destination_system: 'flameclyffe-observer',
    semantic_mapping: 'DEEPTheory pattern candidate -> external analytical source',
    preserved_meaning: ['provenance', 'candidate status'],
    changed_meaning: ['runtime authority'],
    omitted_meaning: ['source-only UI state'],
    provenance: ['lanternbridge-receipt-1'],
  });
  assert.equal(mapping.runtime_authority, 'none');
  assert.deepEqual(mapping.omitted_meaning, ['source-only UI state']);
  assert.deepEqual(mapping.provenance, ['lanternbridge-receipt-1']);
  assert.match(mapping.merge_rule, /Shared vocabulary is not identity/);
});
