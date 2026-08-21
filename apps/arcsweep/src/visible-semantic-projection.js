import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const VISIBLE_SEMANTIC_PROJECTION_SCHEMA = 'arcsweep.visible-semantic-projection/v1';
export const VISIBLE_SEMANTIC_CORRESPONDENCE_SCHEMA = 'arcsweep.visible-semantic-correspondence/v1';

function round(value, places = 8) {
  if (value == null) return null;
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, number));
}

function label(value, max = 72) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

function normaliseTag(value) {
  return label(value, 64).toLocaleLowerCase('en');
}

function tagSet(values = [], limit = 12) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(normaliseTag)
    .filter(Boolean))]
    .slice(0, limit);
}

function setSimilarity(left = [], right = []) {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  if (!union.size) return null;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return round(overlap / union.size);
}

function exactSimilarity(left, right) {
  if (!left && !right) return null;
  if (!left || !right) return 0;
  return left === right ? 1 : 0;
}

function ratioSimilarity(left, right) {
  if (left == null && right == null) return null;
  if (left == null || right == null) return 0;
  return round(1 - Math.abs(left - right));
}

function weightedAverage(parts = []) {
  const available = parts.filter((item) => item.value != null && item.weight > 0);
  if (!available.length) return null;
  const total = available.reduce((sum, item) => sum + item.weight, 0);
  return round(available.reduce((sum, item) => sum + item.value * item.weight, 0) / total);
}

function classify(score) {
  if (score == null) return 'INSUFFICIENT_PROJECTED_MEANING';
  if (score >= 0.8) return 'HIGH_PROJECTED_SEMANTIC_CORRESPONDENCE';
  if (score >= 0.55) return 'MODERATE_PROJECTED_SEMANTIC_CORRESPONDENCE';
  return 'LOW_PROJECTED_SEMANTIC_CORRESPONDENCE';
}

export function normaliseSemanticEnvelope(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.freeze({
    intent: normaliseTag(source.intent),
    concepts: Object.freeze(tagSet(source.concepts, 10)),
    stance: normaliseTag(source.stance),
    affect: Object.freeze(tagSet(source.affect, 6)),
    uncertainty: clamp01(source.uncertainty),
  });
}

export async function createVisibleSemanticProjection({
  visibleResponseHash,
  envelope,
  evaluator = {},
  voiceId = null,
  requestId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const responseHash = String(visibleResponseHash || '').trim();
  if (!responseHash) throw new Error('VISIBLE_SEMANTIC_PROJECTION: visibleResponseHash is required');
  const projection = normaliseSemanticEnvelope(envelope);
  const evaluatorMode = label(evaluator.mode || 'self-described', 40) || 'self-described';
  const core = {
    schema: VISIBLE_SEMANTIC_PROJECTION_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: voiceId == null ? null : String(voiceId),
    request_id: requestId == null ? null : String(requestId),
    visible_response_hash: responseHash,
    projection,
    evaluator: {
      mode: evaluatorMode,
      voice_id: evaluator.voiceId == null ? null : String(evaluator.voiceId),
      provider: evaluator.provider == null ? null : String(evaluator.provider),
      model: evaluator.model == null ? null : String(evaluator.model),
    },
    authority: {
      representation_status: 'model-mediated-semantic-projection',
      raw_response_stored: false,
      hidden_reasoning_stored: false,
      projection_is_semantic_ground_truth: false,
      self_description_is_independent_evaluation: evaluatorMode !== 'self-described',
      identity_distance_measured: false,
      identity_proof: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    projection_id: `visible-semantic-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function compareVisibleSemanticProjections(left, right, { generatedAt = new Date().toISOString() } = {}) {
  if (left?.schema !== VISIBLE_SEMANTIC_PROJECTION_SCHEMA || right?.schema !== VISIBLE_SEMANTIC_PROJECTION_SCHEMA) {
    throw new Error('VISIBLE_SEMANTIC_CORRESPONDENCE: two semantic projections are required');
  }
  const conceptSimilarity = setSimilarity(left.projection.concepts, right.projection.concepts);
  const intentSimilarity = exactSimilarity(left.projection.intent, right.projection.intent);
  const stanceSimilarity = exactSimilarity(left.projection.stance, right.projection.stance);
  const affectSimilarity = setSimilarity(left.projection.affect, right.projection.affect);
  const uncertaintySimilarity = ratioSimilarity(left.projection.uncertainty, right.projection.uncertainty);
  const score = weightedAverage([
    { value: conceptSimilarity, weight: 0.5 },
    { value: intentSimilarity, weight: 0.2 },
    { value: stanceSimilarity, weight: 0.15 },
    { value: affectSimilarity, weight: 0.1 },
    { value: uncertaintySimilarity, weight: 0.05 },
  ]);
  const core = {
    schema: VISIBLE_SEMANTIC_CORRESPONDENCE_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    left_projection_id: left.projection_id,
    right_projection_id: right.projection_id,
    metrics: {
      projected_semantic_correspondence: score,
      concept_similarity: conceptSimilarity,
      intent_similarity: intentSimilarity,
      stance_similarity: stanceSimilarity,
      affect_similarity: affectSimilarity,
      uncertainty_similarity: uncertaintySimilarity,
    },
    classification: classify(score),
    authority: {
      representation_status: 'comparison-of-model-mediated-semantic-projections',
      semantic_projection_compared: true,
      semantic_ground_truth_measured: false,
      independent_evaluator_required_for_independent_confirmation: true,
      identity_distance_measured: false,
      identity_proof: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    correspondence_id: `visible-semantic-correspondence-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
