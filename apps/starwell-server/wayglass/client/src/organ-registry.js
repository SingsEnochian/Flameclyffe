export const WAYGLASS_ORGAN_SCHEMA = 'wayglass.organ/v0.1';

const MATURITY = new Set(['ENVISIONED', 'SPECIFIED', 'MOCKED', 'PARTIAL', 'FUNCTIONAL', 'VERIFIED', 'RELEASED']);
const FORBIDDEN_AUTHORITY = new Set([
  'identity-mutation',
  'relationship-mutation',
  'canon-commit',
  'canon-promotion',
  'authority-grant',
  'world-redefinition',
  'participant-redefinition',
  'continuation-redefinition',
]);

const organs = new Map();

function text(value) {
  return String(value ?? '').trim();
}

function cleanList(value, field) {
  if (!Array.isArray(value)) throw new Error(`WAYGLASS_ORGAN: ${field} must be an array.`);
  return Object.freeze([...new Set(value.map(text).filter(Boolean))]);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function createWayglassOrgan({
  organ_id,
  lineage = [],
  maturity,
  capabilities = [],
  authority_ceiling = [],
  routes = [],
  receipt_schemas = [],
  dependencies = [],
  continuity_hooks = [],
  embodiment_hooks = [],
  evidence = [],
  adapter = null,
} = {}) {
  const id = text(organ_id);
  if (!id.startsWith('wayglass.organ.')) throw new Error('WAYGLASS_ORGAN: organ_id must use wayglass.organ.* namespace.');
  if (!MATURITY.has(maturity)) throw new Error(`WAYGLASS_ORGAN: unsupported maturity '${text(maturity) || 'UNKNOWN'}'.`);
  const sourceLineage = cleanList(lineage, 'lineage');
  if (!sourceLineage.length || sourceLineage.some((item) => !item.includes(':'))) {
    throw new Error('WAYGLASS_ORGAN: lineage requires provenance-qualified source references.');
  }
  const ceiling = cleanList(authority_ceiling, 'authority_ceiling');
  const forbidden = ceiling.find((item) => FORBIDDEN_AUTHORITY.has(item));
  if (forbidden) throw new Error(`WAYGLASS_ORGAN: authority ceiling cannot grant vessel authority '${forbidden}'.`);
  if (adapter != null && typeof adapter !== 'object') throw new Error('WAYGLASS_ORGAN: adapter must be an object when supplied.');

  return freeze({
    schema: WAYGLASS_ORGAN_SCHEMA,
    version: 1,
    organ_id: id,
    lineage: sourceLineage,
    maturity,
    capabilities: cleanList(capabilities, 'capabilities'),
    authority_ceiling: ceiling,
    routes: cleanList(routes, 'routes'),
    receipt_schemas: cleanList(receipt_schemas, 'receipt_schemas'),
    dependencies: cleanList(dependencies, 'dependencies'),
    continuity_hooks: cleanList(continuity_hooks, 'continuity_hooks'),
    embodiment_hooks: cleanList(embodiment_hooks, 'embodiment_hooks'),
    evidence: cleanList(evidence, 'evidence'),
    adapter: adapter ? freeze({ ...adapter }) : null,
  });
}

export function registerWayglassOrgan(definition) {
  const organ = definition?.schema === WAYGLASS_ORGAN_SCHEMA ? definition : createWayglassOrgan(definition);
  if (organs.has(organ.organ_id)) throw new Error(`WAYGLASS_ORGAN: duplicate organ_id '${organ.organ_id}'.`);
  organs.set(organ.organ_id, organ);
  return organ;
}

export function wayglassOrganById(organId) {
  return organs.get(text(organId)) || null;
}

export function listWayglassOrgans() {
  return Object.freeze([...organs.values()]);
}

export function clearWayglassOrgansForTest() {
  organs.clear();
}
