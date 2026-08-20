const WORLD_ID_GROUPS = Object.freeze([
  Object.freeze(['equestria-starsong', 'starsong-friendship-is-magic', 'starsong']),
  Object.freeze(['taveren-vaen', 'taaveren-vaen']),
  Object.freeze(['terra-aeterna']),
  Object.freeze(['luna']),
  Object.freeze(['feather-and-flame']),
]);

const ALIAS_INDEX = new Map();
for (const group of WORLD_ID_GROUPS) {
  for (const id of group) ALIAS_INDEX.set(id, group);
}

export function normaliseWorldId(value) {
  const id = String(value || '').trim().toLowerCase();
  if (!id) return null;
  return ALIAS_INDEX.get(id)?.[0] || id;
}

export function expandWorldIds(value) {
  const id = String(value || '').trim().toLowerCase();
  if (!id) return [];
  return [...(ALIAS_INDEX.get(id) || [id])];
}

export function worldIdsEquivalent(a, b) {
  const left = new Set(expandWorldIds(a));
  return expandWorldIds(b).some((id) => left.has(id));
}

export const WORLD_ID_ALIAS_GROUPS = WORLD_ID_GROUPS;
