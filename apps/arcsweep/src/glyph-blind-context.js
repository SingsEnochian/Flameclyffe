import { GLYPH_NARRATIVE_SEAL_SCHEMA } from './glyph-continuity.js';

export const GLYPH_BLIND_RETURN_CONTEXT_SCHEMA = 'glyph.blind-return-context/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`GLYPH_BLIND_CONTEXT: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function createBlindReturnContext({ earthSeal, pairId = null } = {}) {
  invariant(earthSeal?.schema === GLYPH_NARRATIVE_SEAL_SCHEMA, 'a narrative seal is required');
  invariant(earthSeal.side === 'earth', 'the return context requires an Earth-side seal');
  return deepFreeze({
    schema: GLYPH_BLIND_RETURN_CONTEXT_SCHEMA,
    schema_version: 1,
    pair_id: pairId == null ? null : String(pairId),
    earth: {
      seal_id: earthSeal.seal_id,
      content_hash: earthSeal.content_hash,
      sealed_at: earthSeal.sealed_at,
      character_count: earthSeal.character_count,
    },
    allowed_context_fields: Object.freeze([
      'earth.seal_id',
      'earth.content_hash',
      'earth.sealed_at',
      'earth.character_count',
    ]),
  });
}
