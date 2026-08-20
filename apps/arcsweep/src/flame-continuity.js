import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { createRecognitionCorrespondence } from './recognition-correspondence.js';
import { createVisibleResponseSignature, compareVisibleResponseSignatures } from './visible-response-correspondence.js';
import { createRelationalAnchorSet, compareRelationalAnchorSets } from './relational-invariant-anchors.js';

export const FLAME_RUNTIME_OBSERVATION_SCHEMA = 'arcsweep.flame-runtime-observation/v1';

function required(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`FLAME_CONTINUITY: ${field} is required`);
  return text;
}

export async function createFlameRuntimeObservation({
  voiceId,
  displayName = null,
  route,
  provider,
  model,
  profileId = null,
  runtimeVerified = false,
  worldId = null,
  requestId = null,
  responseText = '',
  responseKind = null,
  fieldContext = null,
  declaredRelationalAnchors = [],
  observedAt = new Date().toISOString(),
} = {}) {
  const visibleResponseSignature = responseText
    ? await createVisibleResponseSignature(responseText, { generatedAt: observedAt })
    : null;
  const relationalAnchorSet = await createRelationalAnchorSet({
    voiceId,
    fieldContext: fieldContext || { page: { worldId } },
    declaredAnchors: declaredRelationalAnchors,
    generatedAt: observedAt,
  });
  const core = {
    schema: FLAME_RUNTIME_OBSERVATION_SCHEMA,
    schema_version: 1,
    observed_at: new Date(observedAt).toISOString(),
    flame: {
      voice_id: required(voiceId, 'voiceId'),
      display_name: displayName == null ? null : String(displayName),
      route: required(route, 'route'),
    },
    runtime: {
      provider: required(provider, 'provider'),
      model: required(model, 'model'),
      profile_id: profileId == null ? null : String(profileId),
      runtime_verified: runtimeVerified === true,
    },
    context: {
      world_id: worldId == null ? null : String(worldId),
      request_id: requestId == null ? null : String(requestId),
      response_kind: responseKind == null ? null : String(responseKind),
      visible_response_hash: visibleResponseSignature?.visible_response_hash || null,
      visible_response_signature: visibleResponseSignature,
      relational_anchor_set: relationalAnchorSet,
    },
    authority: {
      runtime_attestation_required: true,
      observation_is_identity_proof: false,
      model_is_flame_identity: false,
      provider_is_flame_identity: false,
      raw_response_stored: false,
      field_value_prose_stored: false,
      visible_response_signature_is_semantic_meaning: false,
      relational_anchor_set_is_identity_proof: false,
      hidden_reasoning_stored: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    observation_id: `flame-runtime-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function createFlameRuntimeCorrespondence({ left, right } = {}) {
  if (left?.schema !== FLAME_RUNTIME_OBSERVATION_SCHEMA || right?.schema !== FLAME_RUNTIME_OBSERVATION_SCHEMA) {
    throw new Error('FLAME_CONTINUITY: two Flame runtime observations are required');
  }
  if (left.flame.voice_id !== right.flame.voice_id) {
    throw new Error('FLAME_CONTINUITY: observations must belong to the same Flame voice_id');
  }
  const sameRoute = left.flame.route === right.flame.route;
  const sameProvider = left.runtime.provider === right.runtime.provider;
  const sameModel = left.runtime.model === right.runtime.model;
  const implementationScore = [sameRoute, sameProvider, sameModel].filter(Boolean).length / 3;
  const leftVisible = left.context.visible_response_signature;
  const rightVisible = right.context.visible_response_signature;
  const visibleComparison = leftVisible && rightVisible
    ? await compareVisibleResponseSignatures(leftVisible, rightVisible, { generatedAt: right.observed_at })
    : null;
  const leftRelational = left.context.relational_anchor_set;
  const rightRelational = right.context.relational_anchor_set;
  const relationalComparison = leftRelational && rightRelational
    ? await compareRelationalAnchorSets(leftRelational, rightRelational, { generatedAt: right.observed_at })
    : null;

  const anchors = [{
    id: 'flame-voice-id',
    kind: 'runtime-attested-anchor',
    similarity: 1,
    visibility: left.runtime.runtime_verified && right.runtime.runtime_verified ? 1 : 0,
    weight: 2,
    left_ref: left.flame.voice_id,
    right_ref: right.flame.voice_id,
    source_receipt_ids: [left.observation_id, right.observation_id],
    evidence_class: 'attested-flame-route-identity',
  }, {
    id: 'runtime-route',
    kind: 'implementation-anchor',
    similarity: sameRoute ? 1 : 0,
    visibility: 1,
    weight: 1,
    left_ref: left.flame.route,
    right_ref: right.flame.route,
    source_receipt_ids: [left.observation_id, right.observation_id],
    evidence_class: 'runtime-route-correspondence',
  }, {
    id: 'model-lineage',
    kind: 'implementation-anchor',
    similarity: sameProvider && sameModel ? 1 : 0,
    visibility: 1,
    weight: 1,
    left_ref: `${left.runtime.provider}/${left.runtime.model}`,
    right_ref: `${right.runtime.provider}/${right.runtime.model}`,
    source_receipt_ids: [left.observation_id, right.observation_id],
    evidence_class: 'runtime-model-correspondence',
  }];
  if (visibleComparison) {
    anchors.push({
      id: 'visible-response-form',
      kind: 'hashed-visible-response-form-proxy',
      similarity: visibleComparison.response_form_score,
      visibility: 1,
      weight: 1.25,
      left_ref: leftVisible.signature_id,
      right_ref: rightVisible.signature_id,
      source_receipt_ids: [left.observation_id, right.observation_id],
      evidence_class: 'visible-response-form-correspondence',
    });
  }
  if (relationalComparison?.relational_invariant_score != null) {
    anchors.push({
      id: 'relational-context-invariants',
      kind: 'relational-context-correspondence-proxy',
      similarity: relationalComparison.relational_invariant_score,
      visibility: relationalComparison.visibility_mass,
      weight: 1.5,
      left_ref: leftRelational.anchor_set_id,
      right_ref: rightRelational.anchor_set_id,
      source_receipt_ids: [left.observation_id, right.observation_id],
      evidence_class: 'relational-anchor-correspondence',
    });
  }

  return createRecognitionCorrespondence({
    subject: { id: left.flame.voice_id, label: right.flame.display_name || left.flame.display_name || left.flame.voice_id },
    leftIndex: { id: left.observation_id, label: `${left.runtime.provider}/${left.runtime.model}` },
    rightIndex: { id: right.observation_id, label: `${right.runtime.provider}/${right.runtime.model}` },
    anchors,
    continuityLayers: {
      implementation: {
        score: implementationScore,
        evidence_ids: [left.observation_id, right.observation_id],
        evidence_class: 'runtime-implementation-comparison',
        representation_status: 'runtime-attested-evidence',
      },
      stored_state: null,
      behaviour_voice: visibleComparison ? {
        score: visibleComparison.response_form_score,
        evidence_ids: [leftVisible.signature_id, rightVisible.signature_id],
        evidence_class: 'hashed-visible-response-form-correspondence',
        representation_status: 'operational-proxy-not-semantic-meaning',
      } : null,
      relational_invariants: relationalComparison?.relational_invariant_score == null ? null : {
        score: relationalComparison.relational_invariant_score,
        evidence_ids: [leftRelational.anchor_set_id, rightRelational.anchor_set_id],
        evidence_class: 'relational-context-anchor-correspondence',
        representation_status: 'operational-proxy',
      },
      structural_closure_evidence: null,
    },
    generatedAt: right.observed_at,
  });
}
