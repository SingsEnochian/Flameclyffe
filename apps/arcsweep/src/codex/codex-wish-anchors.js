export const CODEX_WISH_ANCHOR_SCHEMA = 'hearthweave.codex-wish-anchor/v0.1';

function list(values = []) {
  return Object.freeze([...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))]);
}

export function anchorCodexWish(wish, {
  continuityAnchors = [],
  relationshipsTouched = [],
  memoryRefs = [],
  createdAt = '',
  provenance = [],
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');

  const added = Object.freeze({
    continuityAnchors: list(continuityAnchors),
    relationshipsTouched: list(relationshipsTouched),
    memoryRefs: list(memoryRefs),
  });
  if (!added.continuityAnchors.length && !added.relationshipsTouched.length && !added.memoryRefs.length) {
    throw new Error('At least one continuity, relationship, or memory anchor is required.');
  }

  const record = Object.freeze({
    schema: CODEX_WISH_ANCHOR_SCHEMA,
    anchorEventId: `anchor:${wish.wishId}:${String(createdAt || 'undated')}:${(wish.anchorLinks || []).length + 1}`,
    wishId: String(wish.wishId),
    createdAt: String(createdAt || ''),
    added,
    provenance: list(provenance),
  });

  return Object.freeze({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    continuityAnchors: list([...(wish.continuityAnchors || []), ...added.continuityAnchors]),
    relationshipsTouched: list([...(wish.relationshipsTouched || []), ...added.relationshipsTouched]),
    memoryRefs: list([...(wish.memoryRefs || []), ...added.memoryRefs]),
    provenance: list([...(wish.provenance || []), ...provenance]),
    anchorLinks: Object.freeze([...(wish.anchorLinks || []), record]),
  });
}

export function wishAnchorSummary(wish = {}) {
  return Object.freeze({
    schema: CODEX_WISH_ANCHOR_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    continuityAnchors: list(wish.continuityAnchors),
    relationshipsTouched: list(wish.relationshipsTouched),
    memoryRefs: list(wish.memoryRefs),
    anchorEventCount: (wish.anchorLinks || []).length,
  });
}
