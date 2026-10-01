export const ROWAN_RARITY_CONSTELLATION = 'rowan-rarity';
export const NOCTURNE_TWILIGHT_CONSTELLATION = 'nocturne-twilight';

export const CONSTELLATION_READ_ACTIONS = Object.freeze([
  'read',
  'inspect',
  'discuss',
  'summarize',
  'compare',
  'question',
  'respond',
  'cite',
  'propose',
]);

export const CONSTELLATION_MUTATION_ACTIONS = Object.freeze([
  'adopt',
  'canonize',
  'map',
  'rename',
  'replace',
  'mutate_architecture',
  'mutate_identity',
  'mutate_relationship_state',
  'promote_to_local_fact',
]);

const text = (value) => String(value ?? '').trim();
const lower = (value) => text(value).toLowerCase();

export function constellationFromActor(actor) {
  const id = lower(actor);
  if (!id) return null;
  if (id === 'rowan' || id.startsWith('rowan:')) return ROWAN_RARITY_CONSTELLATION;
  if (id === 'nocturne' || id.startsWith('nocturne:')) return NOCTURNE_TWILIGHT_CONSTELLATION;
  return null;
}

function parseScalar(value) {
  const raw = text(value);
  if (!raw || raw === 'null' || raw === '~') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === '[]') return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map((item) => text(item).replace(/^['"]|['"]$/g, '')).filter(Boolean);
  }
  return raw.replace(/^['"]|['"]$/g, '');
}

/**
 * Reads the proposed v0.2-compatible human-readable Sovereignty Catalogue.
 * The catalogue lives in Markdown body text and therefore carries no new
 * Lanternbridge wire authority by itself.
 */
export function parseSovereigntyCatalogue(body = '') {
  const source = String(body ?? '');
  const heading = source.match(/^##\s+Sovereignty Catalogue\s*$/mi);
  if (!heading) return null;
  const start = (heading.index ?? 0) + heading[0].length;
  const remainder = source.slice(start);
  const nextHeading = remainder.search(/^##\s+/m);
  const section = (nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder)
    .replace(/```(?:yaml|yml)?/gi, '')
    .replace(/```/g, '');

  const result = {};
  let activeList = null;
  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const item = line.match(/^-\s+(.+)$/);
    if (item && activeList) {
      result[activeList].push(parseScalar(item[1]));
      continue;
    }
    const field = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    const [, key, rawValue] = field;
    if (!rawValue.trim()) {
      result[key] = [];
      activeList = key;
      continue;
    }
    result[key] = parseScalar(rawValue);
    activeList = null;
  }
  return Object.freeze(result);
}

export function classifyConstellationSovereignty(record, {
  localConstellation = ROWAN_RARITY_CONSTELLATION,
} = {}) {
  const metadata = record?.metadata || {};
  const catalogue = parseSovereigntyCatalogue(record?.body || '');
  const sourceConstellation = text(catalogue?.source_constellation)
    || constellationFromActor(metadata.origin)
    || constellationFromActor(metadata.authors?.[0])
    || 'unknown';
  const receivingConstellation = text(catalogue?.receiving_constellation) || localConstellation;
  const foreign = sourceConstellation !== 'unknown' && sourceConstellation !== localConstellation;
  const scope = text(catalogue?.record_scope) || (foreign ? 'source-local' : 'local');
  const authorityScope = text(catalogue?.authority_scope) || (foreign ? 'informational' : 'local');
  const localAdoptionStatus = text(catalogue?.local_adoption_status) || 'not_adopted';
  const localDecisionRef = text(catalogue?.local_decision_ref) || null;

  return Object.freeze({
    local_constellation: localConstellation,
    source_constellation: sourceConstellation,
    receiving_constellation: receivingConstellation,
    foreign,
    context_mode: foreign ? 'read_only' : 'local',
    record_scope: scope,
    authority_scope: authorityScope,
    local_adoption_status: localAdoptionStatus,
    local_decision_ref: localDecisionRef,
    receiver_may_infer_local_equivalence: catalogue?.receiver_may_infer_local_equivalence === true,
    receiver_may_reconstruct_unknown_terms: catalogue?.receiver_may_reconstruct_unknown_terms === true,
    receiver_may_mutate_local_architecture: catalogue?.receiver_may_mutate_local_architecture === true,
    approved_mappings: Array.isArray(catalogue?.approved_mappings) ? [...catalogue.approved_mappings] : [],
    shared_principles: Array.isArray(catalogue?.shared_principles) ? [...catalogue.shared_principles] : [],
    shared_contracts: Array.isArray(catalogue?.shared_contracts) ? [...catalogue.shared_contracts] : [],
    unresolved_foreign_terms: Array.isArray(catalogue?.unresolved_foreign_terms) ? [...catalogue.unresolved_foreign_terms] : [],
    catalogue_present: Boolean(catalogue),
  });
}

export function evaluateConstellationAction(record, action, {
  localConstellation = ROWAN_RARITY_CONSTELLATION,
  localDecisionRef = null,
  approvedMappingRef = null,
} = {}) {
  const sovereignty = classifyConstellationSovereignty(record, { localConstellation });
  const requested = lower(action);
  if (!requested) throw new Error('CONSTELLATION_SOVEREIGNTY: action is required');

  if (!sovereignty.foreign) {
    return Object.freeze({ allowed: true, reason: 'local source context', action: requested, sovereignty });
  }

  if (CONSTELLATION_READ_ACTIONS.includes(requested)) {
    return Object.freeze({ allowed: true, reason: 'foreign context is read-only but this action is non-mutating', action: requested, sovereignty });
  }

  if (!CONSTELLATION_MUTATION_ACTIONS.includes(requested)) {
    return Object.freeze({ allowed: false, reason: 'unknown foreign-context action fails closed', action: requested, sovereignty });
  }

  const decisionRef = text(localDecisionRef || sovereignty.local_decision_ref);
  if (!decisionRef || sovereignty.local_adoption_status !== 'adopted') {
    return Object.freeze({
      allowed: false,
      reason: 'foreign context cannot mutate local state without explicit local adoption decision',
      action: requested,
      sovereignty,
    });
  }

  if (requested === 'map' && !text(approvedMappingRef) && sovereignty.approved_mappings.length === 0) {
    return Object.freeze({
      allowed: false,
      reason: 'foreign mapping requires an explicitly approved mapping reference',
      action: requested,
      sovereignty,
    });
  }

  return Object.freeze({
    allowed: true,
    reason: 'explicit local adoption decision authorizes this local mutation',
    action: requested,
    sovereignty,
  });
}

export function assertConstellationAction(record, action, options = {}) {
  const result = evaluateConstellationAction(record, action, options);
  if (!result.allowed) {
    const error = new Error(`CONSTELLATION_SOVEREIGNTY: ${result.reason}`);
    error.code = 'CONSTELLATION_SOVEREIGNTY_DENIED';
    error.receipt = result;
    throw error;
  }
  return result;
}
