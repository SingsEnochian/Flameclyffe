import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const GLYPH_HEARTBEAT_SCHEMA = 'glyph.heartbeat/v1';
export const GLYPH_SIGNATURE_SCHEMA = 'glyph.signature/v1';
export const GLYPH_DRIFT_SCHEMA = 'glyph.drift-receipt/v1';
export const GLYPH_NARRATIVE_SEAL_SCHEMA = 'glyph.narrative-seal/v1';
export const GLYPH_BLIND_COMPARISON_SCHEMA = 'glyph.blind-comparison/v1';

export const GLYPH_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
export const GLYPH_DRIFT_CLASSES = Object.freeze([
  'STABLE',
  'LOCAL_VARIATION',
  'TREND_SHIFT',
  'STRUCTURAL_DRIFT',
  'DISCONTINUITY',
  'INSUFFICIENT_HISTORY',
]);

const TAU = Math.PI * 2;
const CENTER = 128;
const BASE_RADIUS = 24;
const VALUE_RADIUS = 88;

function invariant(condition, message) {
  if (!condition) throw new Error(`GLYPH_CONTINUITY: ${message}`);
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
  invariant(number >= 0 && number <= 1, `${field} must be within 0..1`);
  return number;
}

function round(value, places = 8) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function axisValue(input, axis) {
  const state = input?.state && typeof input.state === 'object' ? input.state : input;
  const raw = state?.[axis]?.value ?? state?.[axis];
  return clamp01(raw, axis);
}

function normalisePhase(value) {
  if (value == null || value === '') return null;
  const phase = finite(value, 'phase');
  return round(((phase % TAU) + TAU) % TAU);
}

function canonicalRelationship(value, index) {
  if (typeof value === 'string') {
    const id = value.trim();
    invariant(id, `relationship ${index} must not be empty`);
    return deepFreeze({ id, from: null, to: null, type: null, weight: 1 });
  }
  invariant(value && typeof value === 'object', `relationship ${index} must be an object or string`);
  const from = value.from == null ? null : String(value.from).trim();
  const to = value.to == null ? null : String(value.to).trim();
  const type = value.type == null ? null : String(value.type).trim();
  const id = String(value.id || [from, type, to].filter(Boolean).join(':') || `relationship-${index + 1}`).trim();
  const weight = value.weight == null ? 1 : clamp01(value.weight, `relationship ${index} weight`);
  return deepFreeze({ id, from, to, type, weight: round(weight) });
}

export function canonicaliseGlyphState(input = {}) {
  const axes = Object.fromEntries(GLYPH_AXES.map((axis) => [axis, round(axisValue(input, axis))]));
  const relationships = Array.isArray(input.relationships)
    ? input.relationships.map(canonicalRelationship).sort((left, right) => left.id.localeCompare(right.id))
    : [];
  const confidence = input.confidence == null ? 1 : clamp01(input.confidence, 'confidence');
  return deepFreeze({
    axes,
    relationships,
    confidence: round(confidence),
    phase: normalisePhase(input.phase),
  });
}

function renderGeometry(canonical) {
  const points = GLYPH_AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + index * (TAU / GLYPH_AXES.length);
    const radius = BASE_RADIUS + canonical.axes[axis] * VALUE_RADIUS;
    return deepFreeze({
      axis,
      value: canonical.axes[axis],
      angle: round(angle),
      x: round(CENTER + Math.cos(angle) * radius, 4),
      y: round(CENTER + Math.sin(angle) * radius, 4),
    });
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  const phase = canonical.phase == null ? null : deepFreeze({
    angle: canonical.phase,
    x: round(CENTER + Math.cos(canonical.phase - Math.PI / 2) * 116, 4),
    y: round(CENTER + Math.sin(canonical.phase - Math.PI / 2) * 116, 4),
  });
  return deepFreeze({
    view_box: '0 0 256 256',
    center: deepFreeze({ x: CENTER, y: CENTER }),
    points,
    polygon: path,
    phase_marker: phase,
  });
}

function structuralVector(canonical, geometry) {
  const coordinates = geometry.points.flatMap((point) => [
    round((point.x - CENTER) / VALUE_RADIUS),
    round((point.y - CENTER) / VALUE_RADIUS),
  ]);
  const phase = canonical.phase == null
    ? [0, 0, 0]
    : [1, round(Math.sin(canonical.phase)), round(Math.cos(canonical.phase))];
  return Object.freeze([...coordinates, round(canonical.confidence), ...phase]);
}

export async function createGlyphSignature({
  worldId,
  worldName = '',
  state,
  relationships = [],
  confidence = 1,
  phase = null,
  source = {},
} = {}) {
  invariant(String(worldId || '').trim(), 'worldId is required');
  const canonical = canonicaliseGlyphState({ ...state, relationships, confidence, phase });
  const render = renderGeometry(canonical);
  const vector = structuralVector(canonical, render);
  const core = {
    schema: GLYPH_SIGNATURE_SCHEMA,
    schema_version: 1,
    world: { id: String(worldId).trim(), name: String(worldName || '').trim() },
    axes: canonical.axes,
    topology: canonical.relationships,
    confidence: canonical.confidence,
    phase: canonical.phase,
    structural_vector: vector,
    render,
    source: {
      kind: String(source.kind || 'structured-state').trim(),
      receipt_id: source.receipt_id == null ? null : String(source.receipt_id),
      fingerprint: source.fingerprint == null ? null : String(source.fingerprint),
    },
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    signature_id: `glyph-signature-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

function signatureOf(value) {
  const signature = value?.heartbeat?.signature || value?.signature || value;
  invariant(signature?.schema === GLYPH_SIGNATURE_SCHEMA, 'a Glyph Continuity signature is required');
  return signature;
}

function rms(values) {
  if (!values.length) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
}

export function semanticStateDistance(leftInput, rightInput) {
  const left = signatureOf(leftInput);
  const right = signatureOf(rightInput);
  return round(rms(GLYPH_AXES.map((axis) => Number(left.axes[axis]) - Number(right.axes[axis]))));
}

function topologyDistance(left, right) {
  const leftIds = new Set((left.topology || []).map((item) => item.id));
  const rightIds = new Set((right.topology || []).map((item) => item.id));
  if (!leftIds.size && !rightIds.size) return 0;
  let intersection = 0;
  for (const id of leftIds) if (rightIds.has(id)) intersection += 1;
  const union = new Set([...leftIds, ...rightIds]).size;
  return union ? 1 - intersection / union : 0;
}

export function glyphStructuralDistance(leftInput, rightInput) {
  const left = signatureOf(leftInput);
  const right = signatureOf(rightInput);
  invariant(left.structural_vector.length === right.structural_vector.length, 'structural vectors must have equal length');
  const vectorDistance = rms(left.structural_vector.map((value, index) => Number(value) - Number(right.structural_vector[index])));
  const topology = topologyDistance(left, right);
  return round(Math.min(1, vectorDistance * 0.85 + topology * 0.15));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mad(values, center = median(values)) {
  return median(values.map((value) => Math.abs(value - center)));
}

function linearSlope(values) {
  if (values.length < 2) return 0;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < n; index += 1) {
    numerator += (index - meanX) * (values[index] - meanY);
    denominator += (index - meanX) ** 2;
  }
  return denominator ? numerator / denominator : 0;
}

export async function classifyGlyphDrift({
  history = [],
  current,
  minimumHistory = 5,
  stableThreshold = 0.03,
  localVariationThreshold = 0.07,
  structuralDriftThreshold = 0.16,
  discontinuityThreshold = 0.35,
  trendSlopeThreshold = 0.02,
  madMultiplier = 3,
  classifiedAt = new Date().toISOString(),
} = {}) {
  const signature = signatureOf(current);
  const prior = history.map(signatureOf);
  invariant(Number.isInteger(minimumHistory) && minimumHistory >= 2, 'minimumHistory must be an integer >= 2');
  invariant(!Number.isNaN(Date.parse(classifiedAt)), 'classifiedAt must be an ISO-compatible timestamp');

  const settings = deepFreeze({
    minimum_history: minimumHistory,
    stable_threshold: stableThreshold,
    local_variation_threshold: localVariationThreshold,
    structural_drift_threshold: structuralDriftThreshold,
    discontinuity_threshold: discontinuityThreshold,
    trend_slope_threshold: trendSlopeThreshold,
    mad_multiplier: madMultiplier,
  });

  if (prior.length < minimumHistory) {
    const core = {
      schema: GLYPH_DRIFT_SCHEMA,
      schema_version: 1,
      classified_at: new Date(classifiedAt).toISOString(),
      signature_id: signature.signature_id,
      classification: 'INSUFFICIENT_HISTORY',
      review_required: false,
      review_recommended: false,
      history_count: prior.length,
      metrics: null,
      settings,
    };
    const fingerprint = await sha256Hex(core);
    return deepFreeze({ ...core, drift_id: `glyph-drift-${fingerprint.slice(0, 24)}`, fingerprint });
  }

  const baseline = [];
  for (let index = 1; index < prior.length; index += 1) {
    baseline.push(glyphStructuralDistance(prior[index - 1], prior[index]));
  }
  const baselineMedian = median(baseline);
  const baselineMad = mad(baseline, baselineMedian);
  const robustEnvelope = Math.max(
    stableThreshold,
    baselineMedian + madMultiplier * Math.max(baselineMad, 0.005),
  );
  const previous = prior.at(-1);
  const currentStructural = glyphStructuralDistance(previous, signature);
  const currentSemantic = semanticStateDistance(previous, signature);
  const topology = round(topologyDistance(previous, signature));

  const trendWindow = [...prior.slice(-minimumHistory), signature];
  const trendAnchor = trendWindow[0];
  const trendDistances = trendWindow.map((item) => glyphStructuralDistance(trendAnchor, item));
  const trendSlope = round(linearSlope(trendDistances));
  const referenceDistance = round(trendDistances.at(-1));

  let classification = 'STABLE';
  if (topology >= 0.9 || currentStructural >= discontinuityThreshold) {
    classification = 'DISCONTINUITY';
  } else if (currentStructural >= Math.max(structuralDriftThreshold, robustEnvelope)) {
    classification = 'STRUCTURAL_DRIFT';
  } else if (trendSlope >= trendSlopeThreshold && referenceDistance >= localVariationThreshold) {
    classification = 'TREND_SHIFT';
  } else if (currentStructural > Math.max(stableThreshold, robustEnvelope) || currentSemantic >= localVariationThreshold) {
    classification = 'LOCAL_VARIATION';
  }

  const metrics = deepFreeze({
    structural_distance: currentStructural,
    semantic_distance: currentSemantic,
    topology_distance: topology,
    reference_distance: referenceDistance,
    trend_slope: trendSlope,
    baseline_median: round(baselineMedian),
    baseline_mad: round(baselineMad),
    robust_envelope: round(robustEnvelope),
    baseline_samples: Object.freeze(baseline.map((value) => round(value))),
  });
  const core = {
    schema: GLYPH_DRIFT_SCHEMA,
    schema_version: 1,
    classified_at: new Date(classifiedAt).toISOString(),
    signature_id: signature.signature_id,
    classification,
    review_required: ['STRUCTURAL_DRIFT', 'DISCONTINUITY'].includes(classification),
    review_recommended: ['TREND_SHIFT', 'STRUCTURAL_DRIFT', 'DISCONTINUITY'].includes(classification),
    history_count: prior.length,
    metrics,
    settings,
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({ ...core, drift_id: `glyph-drift-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function createGlyphHeartbeat({
  world,
  premaqc,
  relationships = [],
  confidence = 1,
  phase = null,
  observedAt = premaqc?.observed_at || new Date().toISOString(),
} = {}) {
  invariant(world?.id, 'world.id is required');
  invariant(premaqc?.state, 'a PREMAQC state is required');
  invariant(!Number.isNaN(Date.parse(observedAt)), 'observedAt must be an ISO-compatible timestamp');
  const signature = await createGlyphSignature({
    worldId: world.id,
    worldName: world.name,
    state: premaqc.state,
    relationships,
    confidence,
    phase,
    source: {
      kind: 'premaqc',
      receipt_id: premaqc.receipt_id || premaqc.id || null,
      fingerprint: premaqc.fingerprint || null,
    },
  });
  const core = {
    schema: GLYPH_HEARTBEAT_SCHEMA,
    schema_version: 1,
    observed_at: new Date(observedAt).toISOString(),
    world: { id: String(world.id), name: String(world.name || '') },
    source_receipt_id: premaqc.receipt_id || premaqc.id || null,
    signature,
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    heartbeat_id: `glyph-heartbeat-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

function normaliseNarrativeText(value) {
  return String(value ?? '').replaceAll('\r\n', '\n');
}

export async function sealNarrative({
  side,
  text,
  source = 'operator',
  sealedAt = new Date().toISOString(),
} = {}) {
  const normalisedSide = String(side || '').trim().toLowerCase();
  invariant(['earth', 'return'].includes(normalisedSide), 'side must be earth or return');
  const narrative = normaliseNarrativeText(text);
  invariant(narrative.trim().length > 0, 'narrative text is required');
  invariant(!Number.isNaN(Date.parse(sealedAt)), 'sealedAt must be an ISO-compatible timestamp');
  const contentHash = await sha256Hex(narrative);
  const core = {
    schema: GLYPH_NARRATIVE_SEAL_SCHEMA,
    schema_version: 1,
    side: normalisedSide,
    source: String(source || 'operator'),
    sealed_at: new Date(sealedAt).toISOString(),
    content_hash: contentHash,
    character_count: narrative.length,
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    seal_id: `glyph-narrative-seal-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function verifyNarrativeSeal(seal, text) {
  invariant(seal?.schema === GLYPH_NARRATIVE_SEAL_SCHEMA, 'a narrative seal is required');
  const narrative = normaliseNarrativeText(text);
  const contentHash = await sha256Hex(narrative);
  const core = {
    schema: GLYPH_NARRATIVE_SEAL_SCHEMA,
    schema_version: 1,
    side: seal.side,
    source: seal.source,
    sealed_at: seal.sealed_at,
    content_hash: contentHash,
    character_count: narrative.length,
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    matches: contentHash === seal.content_hash && fingerprint === seal.fingerprint,
    content_hash_matches: contentHash === seal.content_hash,
    seal_fingerprint_matches: fingerprint === seal.fingerprint,
  });
}

function tokens(text) {
  return new Set(normaliseNarrativeText(text).toLowerCase().match(/[\p{L}\p{N}']+/gu) || []);
}

function jaccard(left, right) {
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 1;
}

export async function compareBlindedNarratives({
  earthSeal,
  earthText,
  returnSeal,
  returnText,
  comparedAt = new Date().toISOString(),
} = {}) {
  invariant(earthSeal?.side === 'earth', 'earth narrative seal is required');
  invariant(returnSeal?.side === 'return', 'return narrative seal is required');
  invariant(!Number.isNaN(Date.parse(comparedAt)), 'comparedAt must be an ISO-compatible timestamp');
  const earthVerification = await verifyNarrativeSeal(earthSeal, earthText);
  const returnVerification = await verifyNarrativeSeal(returnSeal, returnText);
  invariant(earthVerification.matches, 'earth narrative no longer matches its seal');
  invariant(returnVerification.matches, 'return narrative no longer matches its seal');

  const leftTokens = tokens(earthText);
  const rightTokens = tokens(returnText);
  const lexicalOverlap = round(jaccard(leftTokens, rightTokens));
  const earthLength = normaliseNarrativeText(earthText).length;
  const returnLength = normaliseNarrativeText(returnText).length;
  const lengthRatio = Math.max(earthLength, returnLength)
    ? Math.min(earthLength, returnLength) / Math.max(earthLength, returnLength)
    : 1;
  const core = {
    schema: GLYPH_BLIND_COMPARISON_SCHEMA,
    schema_version: 1,
    compared_at: new Date(comparedAt).toISOString(),
    earth_seal_id: earthSeal.seal_id,
    earth_content_hash: earthSeal.content_hash,
    return_seal_id: returnSeal.seal_id,
    return_content_hash: returnSeal.content_hash,
    reveal_gate: 'both-sides-sealed',
    metrics: {
      lexical_jaccard: lexicalOverlap,
      length_ratio: round(lengthRatio),
      earth_token_count: leftTokens.size,
      return_token_count: rightTokens.size,
    },
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    comparison_id: `glyph-blind-comparison-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
