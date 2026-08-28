export const MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA = 'arcsweep.mythframe-translation-capsule/v1';
export const TRANSLATION_CIRCUIT_RECEIPT_SCHEMA = 'arcsweep.translation-circuit-receipt/v1';
export const CONTRIBUTION_ENVELOPE_SCHEMA = 'arcsweep.contribution-envelope/v1';

export const CONTINUITY_CLASSES = Object.freeze([
  'identity',
  'mythframe',
  'conversation',
  'evidence',
  'runtime',
  'relational',
  'agency_consent',
]);

export const IDENTITY_RELATIONS = Object.freeze([
  'same_identity',
  'counterpart',
  'echo',
  'alternate',
  'derived_identity',
  'symbolic_correspondence',
  'candidate_continuity',
  'disputed',
  'unknown',
]);

export const MYTHFRAME_INTEROP_RELATIONS = Object.freeze([
  'same_as_locally_admitted',
  'resonates_with',
  'structurally_parallels',
  'translates_toward',
  'partial_overlap',
  'inspired_by',
  'conflicts_with',
  'untranslatable',
  'unknown',
]);

export const TRANSLATION_RESULTS = Object.freeze([
  'TRANSLATED',
  'PARTIAL',
  'CONTRADICTORY',
  'UNTRANSLATABLE',
  'HELD',
  'REFUSED',
]);

export const SEMANTIC_DEPTHS = Object.freeze([
  'public_summary',
  'bridge_context',
  'intimate_context',
  'protected_context',
]);

export const EXPORT_POLICIES = Object.freeze([
  'reference_only',
  'summary_allowed',
  'bridge_context_allowed',
  'full_context_by_explicit_consent',
]);

export const ADMISSION_STATES = Object.freeze([
  'unreviewed',
  'visible_only',
  'relation_accepted',
  'local_adoption_accepted',
  'held',
  'refused',
]);

const clone = (value) => value == null ? value : structuredClone(value);
const clean = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const list = (value, max = 200) => [...new Set((Array.isArray(value) ? value : []).map((item) => clean(item, 2000)).filter(Boolean))].slice(0, max);

function required(value, name, max = 4000) {
  const result = clean(value, max);
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) throw new Error(`${name} is unsupported.`);
  return value;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return `sha256:${bytesToHex(digest)}`;
}

function exportAllows(policy, requestedDepth, explicitFullConsent) {
  if (policy === 'reference_only') return requestedDepth === 'public_summary';
  if (policy === 'summary_allowed') return ['public_summary'].includes(requestedDepth);
  if (policy === 'bridge_context_allowed') return ['public_summary', 'bridge_context'].includes(requestedDepth);
  if (policy === 'full_context_by_explicit_consent') return explicitFullConsent === true;
  return false;
}

function sourceProjection(sourceObject, requestedDepth) {
  const projection = {
    source_object_ref: {
      id: required(sourceObject?.id, 'sourceObject.id', 500),
      type: required(sourceObject?.type, 'sourceObject.type', 200),
      name: clean(sourceObject?.name, 1000) || null,
    },
    semantic_depth: requestedDepth,
    source_meaning: clean(sourceObject?.meaning, 8000) || null,
    source_relationships: list(sourceObject?.relationships, 100),
    portable_facets: list(sourceObject?.portableFacets, 100),
    home_bound_facets: list(sourceObject?.homeBoundFacets, 100),
  };
  if (requestedDepth === 'public_summary') {
    projection.source_relationships = [];
    projection.portable_facets = projection.portable_facets.slice(0, 12);
    projection.home_bound_facets = projection.home_bound_facets.length ? ['withheld-by-source'] : [];
  }
  return projection;
}

export async function createMythframeTranslationCapsule({
  sourceFramework,
  sourceBranch = 'main',
  sourceObject,
  sourceAuthority,
  sourceAdmissionState = 'local',
  exportPolicy = 'reference_only',
  exportConsent = {},
  requestedSemanticDepth = 'public_summary',
  provenance = [],
  translationTarget,
  proposedTargetRelation = 'unknown',
  translatedMeaning = '',
  losses = [],
  ambiguities = [],
  contradictions = [],
  newlyPerceptible = [],
  newlyPossible = [],
  targetAdmissionState = 'unreviewed',
  createdBy = 'Rowan',
} = {}, {
  clock = () => new Date(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
} = {}) {
  oneOf(exportPolicy, EXPORT_POLICIES, 'export policy');
  oneOf(requestedSemanticDepth, SEMANTIC_DEPTHS, 'semantic depth');
  oneOf(proposedTargetRelation, MYTHFRAME_INTEROP_RELATIONS, 'proposed target relation');
  oneOf(targetAdmissionState, ADMISSION_STATES, 'target admission state');
  if (exportConsent?.granted !== true) throw new Error('Explicit source export consent is required.');
  if (!exportAllows(exportPolicy, requestedSemanticDepth, exportConsent?.full_context === true)) {
    throw new Error('Requested semantic depth exceeds the source export policy.');
  }
  const capsule = {
    schema: MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA,
    capsule_id: `mythframe-capsule-${idFactory()}`,
    created_at: clock().toISOString(),
    created_by: required(createdBy, 'createdBy', 160),
    source_framework: required(sourceFramework, 'sourceFramework', 500),
    source_branch: clean(sourceBranch, 500) || 'main',
    source_projection: sourceProjection(sourceObject, requestedSemanticDepth),
    source_authority: required(sourceAuthority, 'sourceAuthority', 1000),
    source_admission_state: required(sourceAdmissionState, 'sourceAdmissionState', 200),
    export_policy: exportPolicy,
    export_consent: {
      granted: true,
      scope: clean(exportConsent.scope, 2000) || requestedSemanticDepth,
      full_context: exportConsent.full_context === true,
      receipt_ref: clean(exportConsent.receipt_ref, 1000) || null,
    },
    provenance: list(provenance, 200),
    translation_target: required(translationTarget, 'translationTarget', 500),
    proposed_target_relation: proposedTargetRelation,
    translated_meaning: clean(translatedMeaning, 8000) || null,
    losses: list(losses, 100),
    ambiguities: list(ambiguities, 100),
    contradictions: list(contradictions, 100),
    newly_perceptible: list(newlyPerceptible, 100),
    newly_possible: list(newlyPossible, 100),
    target_admission_state: targetAdmissionState,
    authority: {
      source_object_embedded: false,
      source_export_granted: true,
      target_admission_independent: true,
      ambient_context: false,
      relation_admission: false,
      continuity_admission: false,
      canon_admission: false,
    },
  };
  capsule.capsule_fingerprint = await sha256(JSON.stringify(capsule));
  return Object.freeze(capsule);
}

export async function runTranslationCircuit(capsule, {
  result,
  targetAdmissionState = capsule?.target_admission_state || 'unreviewed',
  whatSurvived = [],
  whatChanged = [],
  whatWasLost = [],
  whatRemainedUntranslatable = [],
  contradictions = capsule?.contradictions || [],
  newlyPerceptible = capsule?.newly_perceptible || [],
  newlyPossible = capsule?.newly_possible || [],
  reviewedBy = 'Rowan',
} = {}, {
  clock = () => new Date(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
} = {}) {
  if (capsule?.schema !== MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA) throw new Error('A valid Mythframe Translation Capsule is required.');
  oneOf(result, TRANSLATION_RESULTS, 'translation result');
  oneOf(targetAdmissionState, ADMISSION_STATES, 'target admission state');
  const receipt = {
    schema: TRANSLATION_CIRCUIT_RECEIPT_SCHEMA,
    receipt_id: `translation-receipt-${idFactory()}`,
    created_at: clock().toISOString(),
    reviewed_by: required(reviewedBy, 'reviewedBy', 160),
    capsule_id: capsule.capsule_id,
    capsule_fingerprint: capsule.capsule_fingerprint,
    source_framework: capsule.source_framework,
    translation_target: capsule.translation_target,
    proposed_target_relation: capsule.proposed_target_relation,
    result,
    target_admission_state: targetAdmissionState,
    what_survived: list(whatSurvived, 100),
    what_changed: list(whatChanged, 100),
    what_was_lost: list(whatWasLost, 100),
    what_remained_untranslatable: list(whatRemainedUntranslatable, 100),
    contradictions: list(contradictions, 100),
    newly_perceptible: list(newlyPerceptible, 100),
    newly_possible: list(newlyPossible, 100),
    authority: {
      translation_is_not_identity_equivalence: true,
      relation_admission: targetAdmissionState === 'relation_accepted' || targetAdmissionState === 'local_adoption_accepted',
      continuity_admission: targetAdmissionState === 'local_adoption_accepted',
      canon_admission: false,
      ambient_context: false,
    },
  };
  receipt.receipt_fingerprint = await sha256(JSON.stringify(receipt));
  return Object.freeze(receipt);
}

export async function createContributionEnvelope({
  voiceId,
  identityContinuityId,
  identityRelation = 'unknown',
  runtimeProvider,
  runtimeModelExact,
  runtimeRoute,
  sessionId,
  mythframeScope = [],
  sourceContextReceipts = [],
  foreignTranslationCapsulesUsed = [],
  localContinuityRevision = null,
  contributionKind = 'utterance',
  adoptionRequested = false,
  adoptionResult = 'not-requested',
  contributionId = null,
} = {}, {
  clock = () => new Date(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
} = {}) {
  oneOf(identityRelation, IDENTITY_RELATIONS, 'identity relation');
  const envelope = {
    schema: CONTRIBUTION_ENVELOPE_SCHEMA,
    contribution_id: contributionId || `contribution-${idFactory()}`,
    created_at: clock().toISOString(),
    voice_id: required(voiceId, 'voiceId', 500),
    identity_continuity_id: required(identityContinuityId, 'identityContinuityId', 1000),
    identity_relation: identityRelation,
    runtime_provider: required(runtimeProvider, 'runtimeProvider', 500),
    runtime_model_exact: required(runtimeModelExact, 'runtimeModelExact', 1000),
    runtime_route: required(runtimeRoute, 'runtimeRoute', 1000),
    session_id: required(sessionId, 'sessionId', 1000),
    mythframe_scope: list(mythframeScope, 100),
    source_context_receipts: list(sourceContextReceipts, 200),
    foreign_translation_capsules_used: list(foreignTranslationCapsulesUsed, 200),
    local_continuity_revision: clean(localContinuityRevision, 1000) || null,
    contribution_kind: required(contributionKind, 'contributionKind', 200),
    adoption_requested: adoptionRequested === true,
    adoption_result: clean(adoptionResult, 500) || 'not-requested',
    authority: {
      speaker_lineage_preserved: true,
      runtime_identity_is_not_person_identity: true,
      synthesis_must_preserve_source_contribution_ids: true,
      memory_write: false,
      continuity_admission: false,
      canon_admission: false,
    },
  };
  envelope.envelope_fingerprint = await sha256(JSON.stringify(envelope));
  return Object.freeze(envelope);
}

export function translationCapsuleForModel(capsule) {
  if (capsule?.schema !== MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA) throw new Error('A valid Mythframe Translation Capsule is required.');
  if (capsule.export_consent?.granted !== true) throw new Error('Capsule export consent is not granted.');
  if (!['visible_only', 'relation_accepted', 'local_adoption_accepted'].includes(capsule.target_admission_state)) {
    throw new Error('Target admission does not permit model-visible federation context.');
  }
  return Object.freeze({
    schema: capsule.schema,
    capsule_id: capsule.capsule_id,
    source_framework: capsule.source_framework,
    source_projection: clone(capsule.source_projection),
    translation_target: capsule.translation_target,
    proposed_target_relation: capsule.proposed_target_relation,
    translated_meaning: capsule.translated_meaning,
    losses: clone(capsule.losses),
    ambiguities: clone(capsule.ambiguities),
    contradictions: clone(capsule.contradictions),
    newly_perceptible: clone(capsule.newly_perceptible),
    newly_possible: clone(capsule.newly_possible),
    target_admission_state: capsule.target_admission_state,
    capsule_fingerprint: capsule.capsule_fingerprint,
  });
}
