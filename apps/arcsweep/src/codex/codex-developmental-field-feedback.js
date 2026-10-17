export const CODEX_DEVELOPMENTAL_FIELD_FEEDBACK_SCHEMA = 'hearthweave.codex-developmental-field-feedback/v0.1';

function list(values = []) {
  const source = Array.isArray(values) ? values : [values];
  return Object.freeze([...new Set(source.map((value) => String(value || '').trim()).filter(Boolean))]);
}

function text(value) {
  const result = String(value || '').trim();
  return result || null;
}

function ringSummary(ring = {}) {
  const lines = [];
  if (typeof ring.whatChanged === 'string' && ring.whatChanged.trim()) lines.push(`Observed change: ${ring.whatChanged.trim()}`);
  if (ring.whatChanged && typeof ring.whatChanged === 'object' && !Array.isArray(ring.whatChanged)) {
    for (const [label, values] of Object.entries(ring.whatChanged)) {
      const rows = list(values);
      if (rows.length) lines.push(`${label}: ${rows.join(' · ')}`);
    }
  }
  const unresolved = list(ring.remainedUnresolved || ring.unresolved);
  const transferred = list(ring.transferredTo);
  const partial = list(ring.partialTransfer);
  const failed = list(ring.failedToGeneralise);
  const unknown = list(ring.unknownTransfer);
  const surprises = list(ring.surprises);
  if (unresolved.length) lines.push(`Unresolved: ${unresolved.join(' · ')}`);
  if (transferred.length) lines.push(`Transferred: ${transferred.join(' · ')}`);
  if (partial.length) lines.push(`Partial transfer: ${partial.join(' · ')}`);
  if (failed.length) lines.push(`Failed to generalise: ${failed.join(' · ')}`);
  if (unknown.length) lines.push(`Transfer unknown: ${unknown.join(' · ')}`);
  if (surprises.length) lines.push(`Surprise: ${surprises.join(' · ')}`);
  return lines.join('. ') || 'Developmental evidence exists, but no compact change summary was recorded.';
}

function scopedBranches(lineage = {}, { wishIds = [], branchIds = [], allowAll = false } = {}) {
  const allowedWishes = new Set(list(wishIds));
  const allowedBranches = new Set(list(branchIds));
  if (!allowAll && !allowedWishes.size && !allowedBranches.size) return [];

  const rows = [];
  for (const wish of lineage.wishes || []) {
    const wishAllowed = allowAll || allowedWishes.has(String(wish.wishId || ''));
    for (const branch of wish.possibilityBranches || []) {
      const branchAllowed = allowAll || allowedBranches.has(String(branch.branchId || ''));
      if (!wishAllowed && !branchAllowed) continue;
      rows.push({ wish, branch });
    }
  }
  return rows;
}

export function projectDevelopmentalMemoryToFieldContext(lineage = {}, {
  wishIds = [],
  branchIds = [],
  allowAll = false,
  limit = 8,
} = {}) {
  const max = Math.max(0, Math.min(Number(limit) || 0, 32));
  if (!max) return Object.freeze([]);

  const candidates = [];
  for (const { wish, branch } of scopedBranches(lineage, { wishIds, branchIds, allowAll })) {
    for (const ring of branch.developmentalMemory || []) {
      if (ring?.grantsAuthority === true || ring?.productionEffects === true) continue;
      candidates.push({ wish, branch, ring });
    }
  }

  candidates.sort((a, b) => {
    const byTime = String(b.ring.createdAt || '').localeCompare(String(a.ring.createdAt || ''));
    if (byTime) return byTime;
    return String(a.ring.ringId || '').localeCompare(String(b.ring.ringId || ''));
  });

  return Object.freeze(candidates.slice(0, max).map(({ wish, branch, ring }) => Object.freeze({
    schema: CODEX_DEVELOPMENTAL_FIELD_FEEDBACK_SCHEMA,
    ref: `developmental://${encodeURIComponent(String(wish.wishId || 'wish'))}/${encodeURIComponent(String(branch.branchId || 'branch'))}/${encodeURIComponent(String(ring.ringId || 'ring'))}`,
    id: text(ring.ringId),
    title: `Developmental evidence · ${text(ring.memoryClass) || 'cognitive-change'}`,
    summary: ringSummary(ring),
    sourceKind: 'developmental-memory',
    signalClass: 'low-authority-developmental-context',
    wishId: text(wish.wishId),
    branchId: text(branch.branchId),
    sourceRingId: text(ring.ringId),
    memoryClass: text(ring.memoryClass),
    provenance: list(ring.provenance),
    scopeBound: true,
    recentSelectionIsNotImportance: true,
    developmentalMemoryIsNotIdentityLaw: true,
    fieldInfluenceIsNotAuthority: true,
    directModelPrompt: false,
    canonicalTruth: false,
    grantsAuthority: false,
    productionEffects: false,
  })));
}

export function createCodexDevelopmentalContextRetriever({
  snapshot,
  selectScope,
  limit = 8,
} = {}) {
  if (typeof snapshot !== 'function') throw new Error('Developmental context retriever requires a snapshot function.');
  if (typeof selectScope !== 'function') {
    return async () => Object.freeze([]);
  }

  return async ({ runtime, input, symbolicState } = {}) => {
    const scope = await selectScope({
      runtime,
      input,
      symbolicState,
      continuityNamespace: runtime?.continuity?.namespace || null,
    });
    if (!scope || (!scope.allowAll && !list(scope.wishIds).length && !list(scope.branchIds).length)) return Object.freeze([]);
    return projectDevelopmentalMemoryToFieldContext(snapshot(), { ...scope, limit });
  };
}

export function developmentalFieldFeedbackSummary(entries = []) {
  const rows = Array.isArray(entries) ? entries : [];
  return Object.freeze({
    schema: CODEX_DEVELOPMENTAL_FIELD_FEEDBACK_SCHEMA,
    entryCount: rows.length,
    doctrine: Object.freeze({
      developmentalMemoryIsNotIdentityLaw: true,
      developmentalEvidenceIsNotDirectModelPrompt: true,
      fieldInfluenceIsNotAuthority: true,
      recentSelectionIsNotImportance: true,
      crossRuntimeMemoryIsNotSharedMemory: true,
    }),
  });
}
