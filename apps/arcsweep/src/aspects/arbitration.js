export const ARBITRATION_SCHEMA = 'hearthweave.arbitration/v0.2';

export function shouldArbitrate({
  requested = false,
  materialConflict = false,
  factualConflict = false,
  consequence = null,
  provenanceAmbiguous = false,
} = {}) {
  return Boolean(
    requested
    || materialConflict
    || factualConflict
    || provenanceAmbiguous
    || consequence?.requiresExplicitEdgeHandling === true
  );
}

export function disagreementDisposition({ type, alternatives = [] } = {}) {
  const kind = String(type || '').trim();

  if (kind === 'factual') {
    return Object.freeze({ schema: ARBITRATION_SCHEMA, action: 'gather-evidence', preserveAlternatives: true });
  }
  if (kind === 'implementation') {
    return Object.freeze({ schema: ARBITRATION_SCHEMA, action: 'try-cheaply-or-choose-reversible', preserveAlternatives: true });
  }
  if (kind === 'narrative') {
    return Object.freeze({ schema: ARBITRATION_SCHEMA, action: 'branch', preserveAlternatives: true, alternatives: Object.freeze([...alternatives]) });
  }
  if (kind === 'taste') {
    return Object.freeze({ schema: ARBITRATION_SCHEMA, action: 'coexist-or-follow-declared-preference', preserveAlternatives: true });
  }
  if (['identity', 'canon', 'consent'].includes(kind)) {
    return Object.freeze({ schema: ARBITRATION_SCHEMA, action: 'preserve-and-involve-authority', preserveAlternatives: true });
  }

  return Object.freeze({ schema: ARBITRATION_SCHEMA, action: 'continue-conversation', preserveAlternatives: true });
}
