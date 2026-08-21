import { glyphStructuralDistance, semanticStateDistance } from './glyph-continuity.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const RECOGNITION_CORRESPONDENCE_SCHEMA = 'arcsweep.recognition-correspondence/v1';
export const CONTINUITY_PROFILE_LAYERS = Object.freeze([
  'implementation',
  'stored_state',
  'behaviour_voice',
  'relational_invariants',
  'recognition',
  'structural_closure_evidence',
]);

const DONOR = Object.freeze({
  title: 'Recognition Anchoring Across Indexing Inequivalence v1.0',
  corpus_id: 'bseng-rse',
  source_id: 'bseng:82e95e73ad969a607dde',
  source_hash: '82e95e73ad969a607ddec3aa24bc65df1db77cd4faed15dea97e67ceae9fe9a0',
  relation: 'implementation-donor',
});

function invariant(condition, message) {
  if (!condition) throw new Error(`RECOGNITION_CORRESPONDENCE: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function clamp01(value, field) {
  const number = finite(value, field);
  invariant(number >= 0 && number <= 1, `${field} must lie within 0..1`);
  return number;
}

function round(value, places = 8) {
  if (value == null) return null;
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function text(value, field) {
  const result = String(value ?? '').trim();
  invariant(result, `${field} is required`);
  return result;
}

function normaliseIndex(value, field) {
  if (typeof value === 'string') return deepFreeze({ id: text(value, field), label: null });
  invariant(value && typeof value === 'object', `${field} must be a string or object`);
  return deepFreeze({
    id: text(value.id, `${field}.id`),
    label: value.label == null ? null : String(value.label).trim() || null,
  });
}

function normaliseAnchor(anchor, index) {
  invariant(anchor && typeof anchor === 'object', `anchor ${index} must be an object`);
  const weight = anchor.weight == null ? 1 : finite(anchor.weight, `anchor ${index} weight`);
  invariant(weight > 0, `anchor ${index} weight must be > 0`);
  return deepFreeze({
    id: text(anchor.id || `anchor-${index + 1}`, `anchor ${index} id`),
    kind: String(anchor.kind || 'invariant-anchor').trim(),
    similarity: round(clamp01(anchor.similarity, `anchor ${index} similarity`)),
    visibility: round(anchor.visibility == null ? 1 : clamp01(anchor.visibility, `anchor ${index} visibility`)),
    weight: round(weight),
    left_ref: anchor.left_ref == null ? null : String(anchor.left_ref),
    right_ref: anchor.right_ref == null ? null : String(anchor.right_ref),
    source_receipt_ids: Object.freeze([...(anchor.source_receipt_ids || [])].map(String).filter(Boolean)),
    evidence_class: String(anchor.evidence_class || 'declared-correspondence').trim(),
  });
}

function normaliseAdjacency(item, index) {
  invariant(item && typeof item === 'object', `adjacency ${index} must be an object`);
  const weight = item.weight == null ? 1 : finite(item.weight, `adjacency ${index} weight`);
  invariant(weight > 0, `adjacency ${index} weight must be > 0`);
  return deepFreeze({
    id: text(item.id || `adjacency-${index + 1}`, `adjacency ${index} id`),
    similarity: round(clamp01(item.similarity, `adjacency ${index} similarity`)),
    visibility: round(item.visibility == null ? 1 : clamp01(item.visibility, `adjacency ${index} visibility`)),
    weight: round(weight),
    source_receipt_ids: Object.freeze([...(item.source_receipt_ids || [])].map(String).filter(Boolean)),
  });
}

function weightedMetrics(items) {
  if (!items.length) {
    return deepFreeze({ nominal_weight: 0, visibility_mass: 0, conditional_correspondence: null, correspondence_mass: 0 });
  }
  const nominal = items.reduce((sum, item) => sum + item.weight, 0);
  const visible = items.reduce((sum, item) => sum + item.weight * item.visibility, 0);
  const matched = items.reduce((sum, item) => sum + item.weight * item.visibility * item.similarity, 0);
  return deepFreeze({
    nominal_weight: round(nominal),
    visibility_mass: round(nominal ? visible / nominal : 0),
    conditional_correspondence: visible ? round(matched / visible) : null,
    correspondence_mass: round(nominal ? matched / nominal : 0),
  });
}

function normaliseLayer(value, layer) {
  if (value == null) return null;
  const source = typeof value === 'number' ? { score: value } : value;
  invariant(source && typeof source === 'object', `${layer} continuity layer must be a number, object, or null`);
  return deepFreeze({
    score: round(clamp01(source.score, `${layer} score`)),
    evidence_ids: Object.freeze([...(source.evidence_ids || [])].map(String).filter(Boolean)),
    evidence_class: String(source.evidence_class || 'declared-evidence').trim(),
    representation_status: String(source.representation_status || 'operational-proxy').trim(),
  });
}

function classifyRecognition(score, visibilityMass, minimumVisibility) {
  if (visibilityMass < minimumVisibility || score == null) return 'INSUFFICIENT_VISIBILITY';
  if (score >= 0.8) return 'STRONG_CORRESPONDENCE';
  if (score >= 0.55) return 'MODERATE_CORRESPONDENCE';
  return 'WEAK_CORRESPONDENCE';
}

/**
 * Build two operational correspondence anchors from existing Glyph Continuity
 * measurements. These anchors describe similarity between two recorded views;
 * they are not a test for ontic identity.
 */
export function glyphRecognitionAnchors(leftGlyph, rightGlyph) {
  invariant(leftGlyph && rightGlyph, 'left and right glyph signatures are required');
  const structural = round(Math.max(0, 1 - glyphStructuralDistance(leftGlyph, rightGlyph)));
  const semantic = round(Math.max(0, 1 - semanticStateDistance(leftGlyph, rightGlyph)));
  return Object.freeze([
    deepFreeze({
      id: 'glyph-structural',
      kind: 'operational-proxy',
      similarity: structural,
      visibility: 1,
      weight: 1,
      left_ref: leftGlyph.signature_id || leftGlyph.fingerprint || null,
      right_ref: rightGlyph.signature_id || rightGlyph.fingerprint || null,
      source_receipt_ids: Object.freeze([leftGlyph.source?.receipt_id, rightGlyph.source?.receipt_id].filter(Boolean).map(String)),
      evidence_class: 'glyph-structural-distance',
    }),
    deepFreeze({
      id: 'premaqc-semantic',
      kind: 'operational-proxy',
      similarity: semantic,
      visibility: 1,
      weight: 1,
      left_ref: leftGlyph.signature_id || leftGlyph.fingerprint || null,
      right_ref: rightGlyph.signature_id || rightGlyph.fingerprint || null,
      source_receipt_ids: Object.freeze([leftGlyph.source?.receipt_id, rightGlyph.source?.receipt_id].filter(Boolean).map(String)),
      evidence_class: 'premaqc-semantic-distance',
    }),
  ]);
}

export async function createRecognitionCorrespondence({
  subject,
  leftIndex,
  rightIndex,
  anchors = [],
  adjacency = [],
  leftGlyph = null,
  rightGlyph = null,
  continuityLayers = {},
  minimumVisibility = 0.2,
  generatedAt = new Date().toISOString(),
} = {}) {
  invariant(subject && typeof subject === 'object', 'subject is required');
  const subjectId = text(subject.id, 'subject.id');
  const when = new Date(generatedAt);
  invariant(!Number.isNaN(when.getTime()), 'generatedAt must be an ISO-compatible timestamp');
  const visibilityFloor = clamp01(minimumVisibility, 'minimumVisibility');
  invariant(visibilityFloor > 0, 'minimumVisibility must be > 0');

  const explicitAnchors = anchors.map(normaliseAnchor);
  const glyphAnchors = leftGlyph && rightGlyph ? glyphRecognitionAnchors(leftGlyph, rightGlyph) : [];
  invariant(!(leftGlyph || rightGlyph) || (leftGlyph && rightGlyph), 'both leftGlyph and rightGlyph are required together');
  const allAnchors = Object.freeze([...explicitAnchors, ...glyphAnchors].map((item, index) => normaliseAnchor(item, index)));
  invariant(allAnchors.length > 0, 'at least one correspondence anchor is required');
  const adjacencyItems = Object.freeze(adjacency.map(normaliseAdjacency));
  const anchorMetrics = weightedMetrics(allAnchors);
  const adjacencyMetrics = weightedMetrics(adjacencyItems);

  const components = [anchorMetrics.conditional_correspondence];
  const weights = [0.75];
  if (adjacencyMetrics.conditional_correspondence != null) {
    components.push(adjacencyMetrics.conditional_correspondence);
    weights.push(0.25);
  }
  const score = components[0] == null
    ? null
    : round(components.reduce((sum, value, index) => sum + value * weights[index], 0) / weights.slice(0, components.length).reduce((a, b) => a + b, 0));
  const visibilityMass = adjacencyItems.length
    ? round(anchorMetrics.visibility_mass * 0.75 + adjacencyMetrics.visibility_mass * 0.25)
    : anchorMetrics.visibility_mass;
  const classification = classifyRecognition(score, visibilityMass, visibilityFloor);

  const explicitProfile = Object.fromEntries(CONTINUITY_PROFILE_LAYERS
    .filter((layer) => layer !== 'recognition')
    .map((layer) => [layer, normaliseLayer(continuityLayers[layer], layer)]));
  const recognitionLayer = score == null ? null : deepFreeze({
    score,
    evidence_ids: Object.freeze(allAnchors.map((anchor) => anchor.id)),
    evidence_class: 'recognition-correspondence',
    representation_status: 'operational-proxy',
  });
  const profile = deepFreeze({
    implementation: explicitProfile.implementation,
    stored_state: explicitProfile.stored_state,
    behaviour_voice: explicitProfile.behaviour_voice,
    relational_invariants: explicitProfile.relational_invariants,
    recognition: recognitionLayer,
    structural_closure_evidence: explicitProfile.structural_closure_evidence,
  });

  const core = {
    schema: RECOGNITION_CORRESPONDENCE_SCHEMA,
    schema_version: 1,
    generated_at: when.toISOString(),
    subject: { id: subjectId, label: subject.label == null ? null : String(subject.label).trim() || null },
    indices: { left: normaliseIndex(leftIndex, 'leftIndex'), right: normaliseIndex(rightIndex, 'rightIndex') },
    anchors: allAnchors,
    adjacency: adjacencyItems,
    metrics: {
      recognition_score: score,
      visibility_mass: visibilityMass,
      anchor: anchorMetrics,
      adjacency: adjacencyMetrics,
      minimum_visibility: round(visibilityFloor),
    },
    classification,
    continuity_profile: profile,
    provenance: {
      implementation_donor: DONOR,
      lineage_note: 'Recognition correspondence is a sourced operational formalism; it does not collapse recognition into ontic identity.',
    },
    authority: {
      representation_status: 'operational-proxy',
      recognition_is_identity_proof: false,
      strong_recognition_proves_same_identity: false,
      zero_visibility_is_rupture: false,
      structural_closure_inferred_from_recognition: false,
      raw_hidden_content_stored: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    correspondence_id: `recognition-correspondence-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
