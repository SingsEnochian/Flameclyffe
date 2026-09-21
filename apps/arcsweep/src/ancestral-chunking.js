import { ANCESTRAL_SOURCE_BINDING_SCHEMA } from './ancestral-corpus.js';

export const ANCESTRAL_PRIVATE_CHUNK_SCHEMA = 'arcsweep.ancestral-private-chunk/v0.1';
export const ANCESTRAL_PUBLIC_CHUNK_REF_SCHEMA = 'arcsweep.ancestral-public-chunk-ref/v0.1';

const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '');

function normaliseChunkSize(value, fallback, minimum) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(minimum, number) : fallback;
}

export function chunkPrivateAncestralText({
  binding,
  sourceText,
  chunkSize = 1800,
  overlap = 180,
  tags = [],
} = {}) {
  if (!binding || binding.schema !== ANCESTRAL_SOURCE_BINDING_SCHEMA) {
    throw new TypeError('A valid private ancestral source binding is required.');
  }
  const prose = text(sourceText);
  if (!prose.trim()) return Object.freeze([]);
  const size = normaliseChunkSize(chunkSize, 1800, 240);
  const requestedOverlap = normaliseChunkSize(overlap, 180, 0);
  const overlapSize = Math.min(requestedOverlap, Math.max(0, size - 1));
  const step = Math.max(1, size - overlapSize);
  const chunks = [];

  for (let start = 0, index = 0; start < prose.length; start += step, index += 1) {
    const end = Math.min(prose.length, start + size);
    chunks.push(Object.freeze({
      schema: ANCESTRAL_PRIVATE_CHUNK_SCHEMA,
      chunk_id: `${binding.root_id}:${String(index).padStart(4, '0')}`,
      root_id: binding.root_id,
      source_ref: binding.source_ref,
      privacy_class: binding.privacy_class,
      position: Object.freeze({ start_char: start, end_char: end }),
      text: prose.slice(start, end),
      tags: Object.freeze([...new Set((tags || []).map((value) => String(value).trim()).filter(Boolean))]),
      publication_authority: false,
    }));
    if (end >= prose.length) break;
  }
  return Object.freeze(chunks);
}

export function redactAncestralChunk(chunk, {
  summary = null,
  fingerprints = [],
} = {}) {
  if (!chunk || chunk.schema !== ANCESTRAL_PRIVATE_CHUNK_SCHEMA) throw new TypeError('A private ancestral chunk is required.');
  return Object.freeze({
    schema: ANCESTRAL_PUBLIC_CHUNK_REF_SCHEMA,
    chunk_id: chunk.chunk_id,
    root_id: chunk.root_id,
    privacy_class: chunk.privacy_class,
    position: clone(chunk.position),
    summary: summary == null ? null : String(summary).trim(),
    fingerprints: Object.freeze([...new Set((fingerprints || []).map((value) => String(value).trim()).filter(Boolean))]),
    source_ref: null,
    manuscript_text_present: false,
    publication_authority: false,
  });
}

export function ancestralChunkReceipt({
  rootId,
  chunkCount,
  sourceHash = null,
  chunkedAt = new Date().toISOString(),
} = {}) {
  return Object.freeze({
    schema: 'arcsweep.ancestral-chunk-receipt/v0.1',
    root_id: String(rootId ?? '').trim() || null,
    chunk_count: Math.max(0, Number(chunkCount) || 0),
    source_hash: sourceHash == null ? null : String(sourceHash).trim(),
    chunked_at: chunkedAt,
    raw_text_published: false,
    canon_promoted: false,
  });
}
