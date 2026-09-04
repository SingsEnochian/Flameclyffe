export const TRUTH_PROVENANCE_SCHEMA = 'arcsweep.truth-provenance/v1';
export const WORLD_COMPLETION_SCHEMA = 'arcsweep.world-completion/v1';
export const HYDRATION_RECEIPT_SCHEMA = 'arcsweep.world-hydration-receipt/v1';

export const PROVENANCE_CLASSES = Object.freeze({
  observation: Object.freeze({ label: 'Observed', authority: 'direct-observation', tone: 'observed' }),
  'scientific-consensus': Object.freeze({ label: 'Scientific consensus', authority: 'evidence-synthesis', tone: 'consensus' }),
  'scientific-reconstruction': Object.freeze({ label: 'Scientific reconstruction', authority: 'evidence-reconstruction', tone: 'reconstruction' }),
  'strong-inference': Object.freeze({ label: 'Strong inference', authority: 'inference', tone: 'inference' }),
  'debated-reconstruction': Object.freeze({ label: 'Debated reconstruction', authority: 'contested-reconstruction', tone: 'debated' }),
  'project-record': Object.freeze({ label: 'Project record', authority: 'project-history', tone: 'project' }),
  'project-canon-boundary': Object.freeze({ label: 'Project canon boundary', authority: 'project-canon', tone: 'canon' }),
  hypothesis: Object.freeze({ label: 'Hypothesis', authority: 'hypothesis', tone: 'hypothesis' }),
  'hypothesis-boundary': Object.freeze({ label: 'Hypothesis boundary', authority: 'boundary', tone: 'boundary' }),
  'world-canon': Object.freeze({ label: 'World canon', authority: 'steward-reviewed-canon', tone: 'canon' }),
  'model-inference': Object.freeze({ label: 'Model inference', authority: 'non-authoritative-inference', tone: 'model' }),
  unknown: Object.freeze({ label: 'Unknown', authority: 'none', tone: 'unknown' }),
});

const UNKNOWN_RX = /^(?:not yet specified|unknown|unset|not applicable unless explicitly configured|no default companion|no default role)/i;

export function provenanceClass(id) {
  return PROVENANCE_CLASSES[id] || PROVENANCE_CLASSES.unknown;
}

export function fieldCompletion(value, { intentionalBlank = false } = {}) {
  if (intentionalBlank) return 'intentionally-blank';
  if (value === undefined || value === null) return 'unknown';
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return 'unknown';
    if (UNKNOWN_RX.test(text)) return 'unknown';
    return 'complete';
  }
  if (Array.isArray(value)) return value.length ? 'complete' : 'unknown';
  if (typeof value === 'object') return Object.keys(value).length ? 'complete' : 'unknown';
  return 'complete';
}

function leafEntries(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) return leafEntries(child, path);
    return [[path, child]];
  });
}

export function worldCompletionReport(world) {
  const watched = {
    description: world?.description,
    history: world?.history,
    rules: world?.rules,
    surface: world?.surface,
    time: world?.time,
    arrival: world?.arrival,
    identity: world?.identity,
    competencies: world?.competencies,
    safetyWeave: world?.safetyWeave,
    recall: world?.recall,
    companion: world?.companion,
    knowledgeAtlas: world?.knowledgeAtlas,
  };
  const fields = leafEntries(watched).map(([path, value]) => ({ path, state: fieldCompletion(value) }));
  const counts = fields.reduce((acc, field) => ({ ...acc, [field.state]: (acc[field.state] || 0) + 1 }), {});
  const total = fields.length || 1;
  return Object.freeze({
    schema: WORLD_COMPLETION_SCHEMA,
    worldId: world?.id || null,
    worldName: world?.name || null,
    fields,
    counts,
    completionRatio: (counts.complete || 0) / total,
  });
}

function plainLeafMap(value) {
  return new Map(leafEntries(value).map(([path, item]) => [path, item]));
}

function ignorableHydrationPath(path) {
  return path === 'updatedAt'
    || path === 'knowledgeAtlas.revisedAt'
    || path.includes('hydrationReceipt')
    || path.includes('completionReport');
}

export function buildHydrationReceipt(beforeWorld, afterWorld, hydratedAt = new Date().toISOString()) {
  const before = plainLeafMap(beforeWorld || {});
  const after = plainLeafMap(afterWorld || {});
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const added = [];
  const changed = [];
  const preserved = [];
  const unknown = [];
  for (const path of paths) {
    if (ignorableHydrationPath(path)) continue;
    const left = before.get(path);
    const right = after.get(path);
    const leftEmpty = fieldCompletion(left) === 'unknown';
    const rightState = fieldCompletion(right);
    if (left === undefined && right !== undefined) added.push(path);
    else if (leftEmpty && rightState === 'complete' && left !== right) added.push(path);
    else if (JSON.stringify(left) !== JSON.stringify(right)) changed.push(path);
    else if (rightState === 'unknown') unknown.push(path);
    else preserved.push(path);
  }
  return Object.freeze({
    schema: HYDRATION_RECEIPT_SCHEMA,
    worldId: afterWorld?.id || beforeWorld?.id || null,
    worldName: afterWorld?.name || beforeWorld?.name || null,
    hydratedAt,
    added,
    changed,
    preserved,
    unknown,
    summary: Object.freeze({ added: added.length, changed: changed.length, preserved: preserved.length, unknown: unknown.length }),
  });
}

export const TEMPORAL_SCALES = Object.freeze([
  Object.freeze({ id: 'cosmic', label: 'Cosmic', minYearsAgo: 1e9, maxYearsAgo: 1.4e10 }),
  Object.freeze({ id: 'planetary', label: 'Solar & planetary', minYearsAgo: 1e8, maxYearsAgo: 5e9 }),
  Object.freeze({ id: 'geological', label: 'Geological', minYearsAgo: 1e6, maxYearsAgo: 4.6e9 }),
  Object.freeze({ id: 'biological', label: 'Biological', minYearsAgo: 1e4, maxYearsAgo: 4e9 }),
  Object.freeze({ id: 'human', label: 'Human', minYearsAgo: 1, maxYearsAgo: 1e7 }),
  Object.freeze({ id: 'house', label: 'House', minYearsAgo: 0, maxYearsAgo: 10 }),
]);

export function logarithmicTimePosition(yearsAgo, maxYearsAgo = 1.4e10) {
  const years = Math.max(0, Number(yearsAgo) || 0);
  const max = Math.max(1, Number(maxYearsAgo) || 1);
  if (!years) return 1;
  return Math.max(0, Math.min(1, 1 - (Math.log10(years + 1) / Math.log10(max + 1))));
}
