import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const VISIBLE_RESPONSE_SIGNATURE_SCHEMA = 'arcsweep.visible-response-signature/v1';
export const VISIBLE_RESPONSE_CORRESPONDENCE_SCHEMA = 'arcsweep.visible-response-correspondence/v1';
const DIMENSIONS = 32;

function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function round(value, places = 8) { const scale = 10 ** places; return Math.round(Number(value) * scale) / scale; }

function normalise(text = '') {
  return String(text).normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

function hash32(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function projection(text) {
  const vector = Array(DIMENSIONS).fill(0);
  if (!text) return vector;
  const padded = `  ${text}  `;
  for (let i = 0; i <= padded.length - 3; i += 1) {
    const gram = padded.slice(i, i + 3);
    const h = hash32(gram);
    const index = h % DIMENSIONS;
    const sign = (h & 0x80000000) ? -1 : 1;
    vector[index] += sign;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => round(value / norm));
}

function cosine(left, right) {
  if (!left?.length || !right?.length || left.length !== right.length) return null;
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const ln = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rn = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  if (!ln || !rn) return null;
  return round(clamp01((dot / (ln * rn) + 1) / 2));
}

function ratioSimilarity(a, b) {
  const left = Number(a) || 0;
  const right = Number(b) || 0;
  if (left === 0 && right === 0) return 1;
  const max = Math.max(left, right);
  return round(max ? 1 - Math.abs(left - right) / max : 1);
}

export async function createVisibleResponseSignature(text, { generatedAt = new Date().toISOString() } = {}) {
  const raw = String(text || '');
  const clean = normalise(raw);
  const tokens = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const core = {
    schema: VISIBLE_RESPONSE_SIGNATURE_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    visible_response_hash: raw ? await sha256Hex(raw) : null,
    shape: {
      character_count: raw.length,
      token_count: tokens.length,
      sentence_count: (raw.match(/[.!?]+(?:\s|$)/g) || []).length,
      paragraph_count: raw.trim() ? raw.split(/\n\s*\n/).filter((item) => item.trim()).length : 0,
      question_count: (raw.match(/\?/g) || []).length,
      exclamation_count: (raw.match(/!/g) || []).length,
      line_break_count: (raw.match(/\n/g) || []).length,
    },
    hashed_trigram_projection: projection(clean),
    authority: {
      raw_response_stored: false,
      hidden_reasoning_stored: false,
      semantic_meaning_inferred: false,
      identity_proof: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, signature_id: `visible-response-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function compareVisibleResponseSignatures(left, right, { generatedAt = new Date().toISOString() } = {}) {
  if (left?.schema !== VISIBLE_RESPONSE_SIGNATURE_SCHEMA || right?.schema !== VISIBLE_RESPONSE_SIGNATURE_SCHEMA) {
    throw new Error('VISIBLE_RESPONSE_CORRESPONDENCE: two visible response signatures are required');
  }
  const projectionSimilarity = cosine(left.hashed_trigram_projection, right.hashed_trigram_projection);
  const shapeParts = [
    ratioSimilarity(left.shape.character_count, right.shape.character_count),
    ratioSimilarity(left.shape.token_count, right.shape.token_count),
    ratioSimilarity(left.shape.sentence_count, right.shape.sentence_count),
    ratioSimilarity(left.shape.paragraph_count, right.shape.paragraph_count),
  ];
  const shapeSimilarity = round(shapeParts.reduce((sum, value) => sum + value, 0) / shapeParts.length);
  const responseFormScore = projectionSimilarity == null
    ? shapeSimilarity
    : round(projectionSimilarity * 0.72 + shapeSimilarity * 0.28);
  const core = {
    schema: VISIBLE_RESPONSE_CORRESPONDENCE_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    left_signature_id: left.signature_id,
    right_signature_id: right.signature_id,
    projection_similarity: projectionSimilarity,
    shape_similarity: shapeSimilarity,
    response_form_score: responseFormScore,
    authority: {
      representation_status: 'hashed-visible-response-form-proxy',
      raw_response_stored: false,
      semantic_divergence_measured: false,
      identity_distance_measured: false,
      identity_proof: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, correspondence_id: `visible-response-correspondence-${fingerprint.slice(0, 24)}`, fingerprint });
}
