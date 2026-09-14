import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCanonicalSpine, detectCanonicalLabelCollisions } from '../lib/canonical-spine-core.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_SPINE_PATH = resolve(REPO_ROOT, 'data/canonical-spine.seed.json');
export const validateCanonicalSpine = auditCanonicalSpine;
export const detectLabelCollisions = detectCanonicalLabelCollisions;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function readRootSpine() {
  const raw = await readFile(ROOT_SPINE_PATH, 'utf8');
  return { raw, graph: JSON.parse(raw), fingerprint: `sha256:${sha256(raw)}` };
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
  if (command !== 'verify') throw new Error(`Unknown canonical-spine command: ${command}`);
  const { graph, fingerprint } = await readRootSpine();
  const audit = auditCanonicalSpine(graph);
  printAudit(audit);
  if (!audit.errors.length) console.log(`Canonical Spine valid · ${graph.nodes.length} nodes · ${graph.edges.length} edges · ${fingerprint}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
