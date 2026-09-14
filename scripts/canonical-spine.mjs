import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_SPINE_PATH = resolve(REPO_ROOT, 'data/canonical-spine.seed.json');
export const MIRROR_SPINE_PATH = resolve(REPO_ROOT, 'apps/arcsweep/public/canonical-spine.seed.json');
export const EXPECTED_SCHEMA = 'flameclyffe.canonical-spine.v0.1';

const CANON_STATES = new Set(['canonical', 'experimental', 'planned', 'deprecated', 'scrapped', 'external']);
const IMPLEMENTATION_STATES = new Set(['implemented', 'partial', 'stub', 'blocked', 'not-started', 'planned', 'retired']);
const VISIBILITY_STATES = new Set(['shared', 'private', 'restricted', 'source-protected']);
const CONFIDENCE_STATES = new Set(['low', 'medium', 'high']);
const EDGE_TYPES = new Set([
  'owns', 'contains', 'depends_on', 'implements', 'observes', 'describes_state_of',
  'compiles_state_for', 'routes_to', 'inherits_from', 'supersedes', 'conflicts_with',
  'equivalent_to', 'related_to', 'knows_about', 'restricted_by',
]);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function normaliseLabel(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(record, field, path, errors) {
  if (typeof record?.[field] !== 'string' || !record[field].trim()) errors.push(`${path}.${field} must be a non-empty string`);
}

function requireStringArray(record, field, path, errors) {
  if (!Array.isArray(record?.[field]) || record[field].some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push(`${path}.${field} must be an array of non-empty strings`);
  }
}

function allowed(record, field, values, path, errors) {
  if (!values.has(record?.[field])) errors.push(`${path}.${field} has unsupported value ${JSON.stringify(record?.[field])}`);
}

export function detectLabelCollisions(graph) {
  const byLabel = new Map();
  for (const node of graph.nodes || []) {
    const key = normaliseLabel(node.name);
    if (!key) continue;
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key).push(node);
  }
  const explicitPairs = new Set();
  for (const edge of graph.edges || []) {
    if (!['equivalent_to', 'supersedes', 'conflicts_with'].includes(edge.type)) continue;
    explicitPairs.add([edge.from, edge.to].sort().join('::'));
  }
  return [...byLabel.entries()]
    .filter(([, nodes]) => nodes.length > 1)
    .map(([label, nodes]) => ({
      label,
      nodeIds: nodes.map((node) => node.id),
      unresolvedPairs: nodes.flatMap((node, index) => nodes.slice(index + 1).map((other) => [node.id, other.id]))
        .filter(([a, b]) => !explicitPairs.has([a, b].sort().join('::'))),
    }))
    .filter((collision) => collision.unresolvedPairs.length > 0);
}

export function validateCanonicalSpine(graph) {
  const errors = [];
  const warnings = [];
  if (!isObject(graph)) return { errors: ['root must be an object'], warnings, collisions: [] };
  if (graph.schema !== EXPECTED_SCHEMA) errors.push(`schema must equal ${EXPECTED_SCHEMA}`);
  requireString(graph, 'updatedAt', 'root', errors);
  requireString(graph, 'architecturalRule', 'root', errors);
  if (!Array.isArray(graph.nodes)) errors.push('root.nodes must be an array');
  if (!Array.isArray(graph.edges)) errors.push('root.edges must be an array');
  if (!Array.isArray(graph.knowledgeBoundaries)) errors.push('root.knowledgeBoundaries must be an array');
  if (!Array.isArray(graph.receipts)) errors.push('root.receipts must be an array');

  const ids = new Set();
  for (const [index, node] of (graph.nodes || []).entries()) {
    const path = `nodes[${index}]`;
    if (!isObject(node)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['id', 'name', 'kind', 'summary', 'owner']) requireString(node, field, path, errors);
    requireStringArray(node, 'sourceRefs', path, errors);
    requireStringArray(node, 'tags', path, errors);
    allowed(node, 'canonStatus', CANON_STATES, path, errors);
    allowed(node, 'implementationStatus', IMPLEMENTATION_STATES, path, errors);
    allowed(node, 'visibility', VISIBILITY_STATES, path, errors);
    if (ids.has(node.id)) errors.push(`${path}.id duplicates ${node.id}`);
    ids.add(node.id);
    if (!node.createdAt) warnings.push(`${path} (${node.id}) has no createdAt`);
    if (!node.updatedAt) warnings.push(`${path} (${node.id}) has no updatedAt`);
  }

  for (const [index, node] of (graph.nodes || []).entries()) {
    if (node.owner && !ids.has(node.owner)) warnings.push(`nodes[${index}] (${node.id}) owner ${node.owner} is not a graph node`);
  }

  const edgeKeys = new Set();
  for (const [index, edge] of (graph.edges || []).entries()) {
    const path = `edges[${index}]`;
    if (!isObject(edge)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['from', 'to', 'type', 'meaning']) requireString(edge, field, path, errors);
    requireStringArray(edge, 'sourceRefs', path, errors);
    if (!EDGE_TYPES.has(edge.type)) errors.push(`${path}.type has unsupported value ${JSON.stringify(edge.type)}`);
    allowed(edge, 'confidence', CONFIDENCE_STATES, path, errors);
    if (edge.from && !ids.has(edge.from)) errors.push(`${path}.from references missing node ${edge.from}`);
    if (edge.to && !ids.has(edge.to)) errors.push(`${path}.to references missing node ${edge.to}`);
    const key = `${edge.from}::${edge.type}::${edge.to}`;
    if (edgeKeys.has(key)) errors.push(`${path} duplicates relationship ${key}`);
    edgeKeys.add(key);
    if (!edge.createdAt) warnings.push(`${path} (${key}) has no createdAt`);
    if (!edge.updatedAt) warnings.push(`${path} (${key}) has no updatedAt`);
  }

  const boundaryIds = new Set();
  for (const [index, boundary] of (graph.knowledgeBoundaries || []).entries()) {
    const path = `knowledgeBoundaries[${index}]`;
    if (!isObject(boundary)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['id', 'holder', 'affectedTopic', 'sourceCategory', 'restrictionReason']) requireString(boundary, field, path, errors);
    if (typeof boundary.actionable !== 'boolean') errors.push(`${path}.actionable must be boolean`);
    allowed(boundary, 'confidence', CONFIDENCE_STATES, path, errors);
    if (boundary.visibility) allowed(boundary, 'visibility', VISIBILITY_STATES, path, errors);
    if (boundaryIds.has(boundary.id)) errors.push(`${path}.id duplicates ${boundary.id}`);
    boundaryIds.add(boundary.id);
    if ('protectedContent' in boundary || 'content' in boundary || 'secret' in boundary) {
      errors.push(`${path} contains a protected-content field; boundary records describe topology only`);
    }
  }

  const receiptIds = new Set();
  for (const [index, receipt] of (graph.receipts || []).entries()) {
    const path = `receipts[${index}]`;
    if (!isObject(receipt)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ['id', 'actor', 'timestamp', 'operation', 'target', 'reason']) requireString(receipt, field, path, errors);
    if (receiptIds.has(receipt.id)) errors.push(`${path}.id duplicates ${receipt.id}`);
    receiptIds.add(receipt.id);
    if (!isObject(receipt.provenance)) errors.push(`${path}.provenance must be an object`);
    if (!isObject(receipt.validationResult)) errors.push(`${path}.validationResult must be an object`);
  }

  const collisions = detectLabelCollisions(graph);
  for (const collision of collisions) {
    warnings.push(`unresolved semantic label collision "${collision.label}": ${collision.nodeIds.join(', ')}`);
  }

  return { errors, warnings, collisions };
}

export async function readRootSpine() {
  const raw = await readFile(ROOT_SPINE_PATH, 'utf8');
  return { raw, graph: JSON.parse(raw), fingerprint: `sha256:${sha256(raw)}` };
}

export async function readMirrorSpine() {
  const raw = await readFile(MIRROR_SPINE_PATH, 'utf8');
  return { raw, graph: JSON.parse(raw) };
}

export function createMirror(graph, sourceFingerprint) {
  const mirror = structuredClone(graph);
  mirror._mirror = {
    source: 'data/canonical-spine.seed.json',
    sourceFingerprint,
    authority: 'read-only generated ArcSweep mirror; never edit this file directly',
    generatedBy: 'scripts/canonical-spine.mjs',
  };
  return mirror;
}

export async function syncMirror() {
  const { graph, fingerprint } = await readRootSpine();
  const audit = validateCanonicalSpine(graph);
  if (audit.errors.length) throw new Error(`Canonical Spine invalid:\n- ${audit.errors.join('\n- ')}`);
  const mirror = createMirror(graph, fingerprint);
  await writeFile(MIRROR_SPINE_PATH, `${JSON.stringify(mirror, null, 2)}\n`, 'utf8');
  return { fingerprint, audit };
}

export async function checkMirror() {
  const { fingerprint } = await readRootSpine();
  const { graph: mirror } = await readMirrorSpine();
  const actual = mirror?._mirror?.sourceFingerprint;
  return { ok: actual === fingerprint, expected: fingerprint, actual: actual || null };
}

function printAudit(audit) {
  for (const warning of audit.warnings) console.warn(`WARN canonical-spine: ${warning}`);
  if (audit.errors.length) {
    for (const error of audit.errors) console.error(`ERROR canonical-spine: ${error}`);
    process.exitCode = 1;
  }
}

async function main() {
  const command = process.argv[2] || 'verify';
  if (command === 'verify') {
    const { graph, fingerprint } = await readRootSpine();
    const audit = validateCanonicalSpine(graph);
    printAudit(audit);
    if (!audit.errors.length) console.log(`Canonical Spine valid · ${graph.nodes.length} nodes · ${graph.edges.length} edges · ${fingerprint}`);
    return;
  }
  if (command === 'sync') {
    const result = await syncMirror();
    printAudit(result.audit);
    if (!result.audit.errors.length) console.log(`Canonical Spine mirror synced · ${result.fingerprint}`);
    return;
  }
  if (command === 'check') {
    const result = await checkMirror();
    if (!result.ok) {
      console.error(`ERROR canonical-spine: mirror stale · expected ${result.expected} · found ${result.actual || 'none'}`);
      process.exitCode = 1;
    } else console.log(`Canonical Spine mirror current · ${result.expected}`);
    return;
  }
  throw new Error(`Unknown canonical-spine command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
