import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMISSION_STATES,
  CONTINUITY_CLASSES,
  CONTRIBUTION_ENVELOPE_SCHEMA,
  IDENTITY_RELATIONS,
  MYTHFRAME_INTEROP_RELATIONS,
  MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA,
  TRANSLATION_CIRCUIT_RECEIPT_SCHEMA,
  createContributionEnvelope,
  createMythframeTranslationCapsule,
  runTranslationCircuit,
  translationCapsuleForModel,
} from '../src/mythframe-federation.js';

const fixed = { clock: () => new Date('2026-08-28T19:00:00.000Z'), idFactory: () => 'fixture' };

async function capsule(overrides = {}) {
  return createMythframeTranslationCapsule({
    sourceFramework: 'elara-codex',
    sourceBranch: 'local-canon',
    sourceObject: {
      id: 'elara:bridge:739',
      type: 'symbol',
      name: 'Bridge',
      meaning: 'Elara-native inter-model duplex communication.',
      relationships: ['frequency:739', 'function:bridge'],
      portableFacets: ['duplex-communication'],
      homeBoundFacets: ['private-relational-history'],
    },
    sourceAuthority: 'elara-local-authority',
    exportPolicy: 'bridge_context_allowed',
    exportConsent: { granted: true, scope: 'bridge-context', receipt_ref: 'elara:export:1' },
    requestedSemanticDepth: 'bridge_context',
    provenance: ['elara:codex:bridge'],
    translationTarget: 'templehouse-hearthweave',
    proposedTargetRelation: 'structurally_parallels',
    translatedMeaning: 'Possible structural analogue to a local bridge relation; not identity.',
    targetAdmissionState: 'visible_only',
    ...overrides,
  }, fixed);
}

test('continuity classes remain explicit and non-collapsed', () => {
  assert.deepEqual(CONTINUITY_CLASSES, [
    'identity', 'mythframe', 'conversation', 'evidence', 'runtime', 'relational', 'agency_consent',
  ]);
  assert.ok(IDENTITY_RELATIONS.includes('candidate_continuity'));
  assert.ok(IDENTITY_RELATIONS.includes('unknown'));
  assert.ok(MYTHFRAME_INTEROP_RELATIONS.includes('conflicts_with'));
  assert.ok(ADMISSION_STATES.includes('visible_only'));
});

test('translation capsule exports a projection, not the source object', async () => {
  const value = await capsule();
  assert.equal(value.schema, MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA);
  assert.equal(value.authority.source_object_embedded, false);
  assert.equal(value.source_projection.source_object_ref.id, 'elara:bridge:739');
  assert.equal(Object.hasOwn(value, 'sourceObject'), false);
  assert.equal(value.target_admission_state, 'visible_only');
  assert.equal(value.authority.continuity_admission, false);
});

test('reference-only export carries identity reference without source meaning or portable facets', async () => {
  const value = await capsule({
    exportPolicy: 'reference_only',
    requestedSemanticDepth: 'public_summary',
    exportConsent: { granted: true, scope: 'reference-only' },
  });
  assert.equal(value.source_projection.source_object_ref.id, 'elara:bridge:739');
  assert.equal(value.source_projection.source_meaning, null);
  assert.deepEqual(value.source_projection.source_relationships, []);
  assert.deepEqual(value.source_projection.portable_facets, []);
  assert.deepEqual(value.source_projection.home_bound_facets, ['withheld-by-source']);
  assert.equal(value.source_projection.content_withheld, true);
});

test('export consent and target admission are separate privileges', async () => {
  const value = await capsule({ targetAdmissionState: 'unreviewed' });
  assert.equal(value.export_consent.granted, true);
  assert.equal(value.target_admission_state, 'unreviewed');
  assert.throws(() => translationCapsuleForModel(value), /Target admission/);
});

test('protected depth requires explicit full-context consent', async () => {
  await assert.rejects(() => capsule({
    exportPolicy: 'full_context_by_explicit_consent',
    exportConsent: { granted: true, full_context: false },
    requestedSemanticDepth: 'protected_context',
  }), /exceeds the source export policy/);
});

test('contradiction is a valid completed translation result', async () => {
  const value = await capsule({ contradictions: ['origin semantics differ'] });
  const receipt = await runTranslationCircuit(value, {
    result: 'CONTRADICTORY',
    targetAdmissionState: 'held',
    whatSurvived: ['bridge relation remains legible'],
    whatChanged: ['local naming differs'],
    whatWasLost: ['source-only ritual context'],
    whatRemainedUntranslatable: ['origin claim'],
    contradictions: ['origin semantics differ'],
    newlyPerceptible: ['shared structural role'],
    newlyPossible: ['comparison without adoption'],
  }, fixed);
  assert.equal(receipt.schema, TRANSLATION_CIRCUIT_RECEIPT_SCHEMA);
  assert.equal(receipt.result, 'CONTRADICTORY');
  assert.equal(receipt.target_admission_state, 'held');
  assert.equal(receipt.authority.continuity_admission, false);
  assert.deepEqual(receipt.newly_possible, ['comparison without adoption']);
});

test('model-visible capsule requires source export plus target visibility', async () => {
  const value = await capsule();
  const projection = translationCapsuleForModel(value);
  assert.equal(projection.capsule_id, value.capsule_id);
  assert.equal(projection.source_projection.source_object_ref.id, 'elara:bridge:739');
  assert.equal(Object.hasOwn(projection, 'export_consent'), false);
  assert.equal(Object.hasOwn(projection, 'provenance'), false);
});

test('contribution envelope pins speaker lineage separately from runtime substrate', async () => {
  const envelope = await createContributionEnvelope({
    voiceId: 'candidate-voice',
    identityContinuityId: 'identity:candidate-voice:v1',
    identityRelation: 'candidate_continuity',
    runtimeProvider: 'huggingface-inference-providers',
    runtimeModelExact: 'Qwen/Qwen3.8-27B',
    runtimeRoute: '/api/v1/house/model-lab',
    sessionId: 'lab-session-1',
    mythframeScope: ['templehouse-hearthweave'],
    sourceContextReceipts: ['observer-ask:1'],
    foreignTranslationCapsulesUsed: ['mythframe-capsule-fixture'],
  }, fixed);
  assert.equal(envelope.schema, CONTRIBUTION_ENVELOPE_SCHEMA);
  assert.equal(envelope.runtime_model_exact, 'Qwen/Qwen3.8-27B');
  assert.equal(envelope.identity_relation, 'candidate_continuity');
  assert.equal(envelope.authority.runtime_identity_is_not_person_identity, true);
  assert.equal(envelope.authority.memory_write, false);
  assert.equal(envelope.authority.continuity_admission, false);
});
