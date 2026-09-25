export const CODEX_RELATIONSHIP_RESIDUE_SCHEMA = 'hearthweave.codex-relationship-residue/v0.1';

function pairKey(a, b) {
  return [String(a || ''), String(b || '')].filter(Boolean).sort().join(':');
}

export function codexRelationshipResidue(growthSnapshot = {}) {
  const pairs = new Map();
  for (const profile of Object.values(growthSnapshot.profiles || {})) {
    for (const collaborator of profile.collaborators || []) {
      if (!collaborator?.aspectId || !collaborator.recurring) continue;
      const key = pairKey(profile.aspectId, collaborator.aspectId);
      if (!key || pairs.has(key)) continue;
      const aspectIds = key.split(':');
      const traceCount = Number(collaborator.traceCount || 0);
      const turns = Number(collaborator.turns || 0);
      pairs.set(key, Object.freeze({
        schema: CODEX_RELATIONSHIP_RESIDUE_SCHEMA,
        id: `relationship:${key}`,
        aspectIds: Object.freeze(aspectIds),
        traceCount,
        turns,
        // Thickness is visual recurrence only. It is not a claim about affection, preference, or status.
        braidWeight: traceCount >= 8 ? 'deep' : traceCount >= 4 ? 'established' : 'new',
        lineWeight: Math.min(3, 0.75 + Math.log2(Math.max(1, traceCount + turns / 4)) * 0.45),
        lastAt: collaborator.lastAt || '',
        meaning: 'repeated-collaboration',
      }));
    }
  }
  return Object.freeze([...pairs.values()].sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt))));
}

export function relationshipResidueForAspect(growthSnapshot, aspectId) {
  const id = String(aspectId || '');
  return Object.freeze(codexRelationshipResidue(growthSnapshot).filter((row) => row.aspectIds.includes(id)));
}
