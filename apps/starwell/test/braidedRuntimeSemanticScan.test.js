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

const exclude = new Set([
  'apps/starwell/src/hearthweave-kernel/braided-spine.js',
]);

const patterns = [
  /\bE\s*:\s*['"]Entropy['"]/i,
  /\bM\s*:\s*['"]Momentum['"]/i,
  /\bM\s*:\s*['"]Moonfield['"]/i,
  /\bA\s*:\s*['"]Attention['"]/i,
  /\bA\s*:\s*['"]Alignment['"]/i,
  /\bA\s*:\s*['"]Availability['"]/i,
  /\bQ\s*:\s*['"]Charge['"]/i,
  /\bQ\s*:\s*['"]Quantum['"]/i,
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
  if (exclude.has(rel)) return false;
  if (rel.includes('/test/') || rel.includes('/tests/')) return false;
  return /\.(?:js|mjs|jsx|ts|tsx|json|py)$/i.test(rel);
}

test('active runtime carries canonical PREMAQ and real-shore Braided Spine semantics', async () => {
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
