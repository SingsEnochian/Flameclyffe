import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

const runtimeRoots = [
  'apps/starwell/src',
  'apps/starwell/bifrost',
  'starwell/deep-observer',
  'assets',
  'pytorch-labs/observer-math-registry-v0',
  'ml-lab/src',
].map((entry) => resolve(repoRoot, entry));

// Exact predecessor seams. They remain readable so old receipts and archived
// DualAspectPacket v1 data can be migrated into the canonical PREMAQC Braid
// Packet. braidPacket.test.js verifies that migration. New runtime work may not
// inherit their vocabulary.
const legacyCompatibility = new Set([
  'apps/starwell/src/hearthweave-kernel/braided-spine.js',
  'apps/starwell/src/hearthweave-kernel/dual-aspect.js',
  'starwell/deep-observer/schemas/dual-aspect-packet-v1.schema.json',
]);

// Semantic violations only. Instrument/source metadata such as a field named
// physical_claim records what a particular renderer or receipt measured or
// asserted. It is separate from the ontology carried by the Braided Spine.
const patterns = [
  /\bE\s*:\s*['"]Entropy['"]/i,
  /\bM\s*:\s*['"]Momentum['"]/i,
  /\bM\s*:\s*['"]Moonfield['"]/i,
  /\bA\s*:\s*['"]Attention['"]/i,
  /\bA\s*:\s*['"]Alignment['"]/i,
  /\bA\s*:\s*['"]Availability['"]/i,
  /\bQ\s*:\s*['"]Charge['"]/i,
  /\bQ\s*:\s*['"]Quantum['"]/i,
  /canon-grounded-projected/i,
  /current-reality-observational/i,
  /evidence-grounded-observational/i,
  /source_class\s*:\s*['"]projected['"]/i,
];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'archive', '__pycache__'].includes(entry.name)) continue;
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function isRuntimeFile(path) {
  const rel = relative(repoRoot, path).replaceAll('\\', '/');
  if (legacyCompatibility.has(rel)) return false;
  if (rel.includes('/test/') || rel.includes('/tests/')) return false;
  return /\.(?:js|mjs|jsx|ts|tsx|json|py)$/i.test(rel);
}

test('active runtime carries canonical PREMAQC and real-shore Braided Spine semantics', async () => {
  const groups = await Promise.all(runtimeRoots.map(async (root) => {
    try {
      const info = await stat(root);
      return info.isDirectory() ? walk(root) : [];
    } catch {
      return [];
    }
  }));

  const violations = [];
  for (const path of groups.flat().filter(isRuntimeFile)) {
    const rel = relative(repoRoot, path).replaceAll('\\', '/');
    const source = await readFile(path, 'utf8');
    for (const pattern of patterns) {
      if (pattern.test(source)) violations.push(`${rel}: ${pattern}`);
    }
  }

  assert.deepEqual(violations, []);
});
