import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCanonicalSpine, detectCanonicalLabelCollisions } from '../lib/canonical-spine-core.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_SPINE_PATH = resolve(REPO_ROOT, 'data/canonical-spine.seed.json');
export const MIRROR_SPINE_PATH = resolve(REPO_ROOT, 'apps/arcsweep/public/canonical-spine.seed.json');
export const validateCanonicalSpine = auditCanonicalSpine;
export const detectLabelCollisions = detectCanonicalLabelCollisions;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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
  const audit = auditCanonicalSpine(graph);
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
    const audit = auditCanonicalSpine(graph);
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
