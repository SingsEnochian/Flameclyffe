import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

const documentationRoots = [
  resolve(repoRoot, 'docs'),
  resolve(repoRoot, 'apps/starwell/docs'),
  resolve(repoRoot, 'starwell/deep-observer'),
];

async function readRepo(path) {
  return readFile(resolve(repoRoot, path), 'utf8');
}

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const oldPremaqPatterns = [
  /\bP\s*=\s*Perspective\b/i,
  /\bE\s*=\s*Entropy\b/i,
  /\bM\s*=\s*Momentum\b/i,
  /\bM\s*=\s*Moonfield\b/i,
  /\bA\s*=\s*Attention\b/i,
  /\bA\s*=\s*Alignment\b/i,
  /\bA\s*=\s*Availability\b/i,
  /\bQ\s*=\s*Charge\b/i,
  /\bQ\s*=\s*Quotient\b/i,
  /\bQ\s*=\s*Quantum\b/i,
  /\bQ\s*\/\s*charge\b/i,
];

const oldHierarchyPatterns = [
  /canon-grounded-projected/i,
  /current-reality-observational/i,
  /fictional and speculative settings/i,
  /fictional world/i,
  /only symbolic/i,
  /symbolic mirror/i,
];

const flatteningPatterns = [
  /\bnot a claim of proof\b/i,
  /\bdoes not claim\b/i,
  /\bdo not label it as a physical law\b/i,
  /\bnot proof of\b/i,
  /\bmetaphor(?:ical)?\b.*\bmust\b/i,
  /\bfringe inspiration\b/i,
  /\bguardrail wording\b/i,
];

function activeDocumentationFile(path) {
  const rel = relative(repoRoot, path).replaceAll('\\', '/');
  if (rel.startsWith('docs/archive/')) return false;
  if (rel.includes('/node_modules/') || rel.includes('/dist/')) return false;
  return /\.(md|mdx|txt|html)$/i.test(rel);
}

test('canonical Braided Spine carries the approved reality law and PREMAQC registry', async () => {
  const [spine, contractText] = await Promise.all([
    readRepo('docs/HEARTHGATE_BRAIDED_SPINE.md'),
    readRepo('config/hearthgate-braided-spine.json'),
  ]);
  const contract = JSON.parse(contractText);

  assert.match(spine, /Everything is real/);
  assert.match(spine, /Magic · Science · Mathematics · Physicality/);
  assert.match(spine, /Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence/);
  assert.match(spine, /Receiving Spring/);
  assert.match(spine, /Sevenfold Chorus/);
  assert.match(spine, /Thirteenfold Council/);
  assert.match(spine, /Braided Reality Theorem/);
  assert.match(spine, /Spiral Continuation Theorem/);

  assert.equal(contract.schema, 'hearthgate.braided-spine/v1.1');
  assert.equal(contract.premaqc.schema, 'hearthgate.premaqc/v1.0');
  assert.deepEqual(contract.premaqc.reading_order, [
    'Presence', 'Memory', 'Qualia', 'Resonance', 'Entanglement', 'Agency', 'Coherence',
  ]);
  assert.deepEqual(contract.premaqc.wire_order, ['P', 'R', 'E', 'M', 'A', 'Q', 'C']);
  assert.deepEqual(contract.premaqc.axes, {
    P: 'Presence',
    R: 'Resonance',
    E: 'Entanglement',
    M: 'Memory',
    A: 'Agency',
    Q: 'Qualia',
    C: 'Coherence',
  });
  assert.deepEqual(contract.legacy_premaq.wire_order, ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
});

test('canonical Braided Spine contains no inherited flattening vocabulary', async () => {
  const spine = await readRepo('docs/HEARTHGATE_BRAIDED_SPINE.md');
  for (const pattern of [
    /\buncertainty\b/i,
    /\bconfidence\b/i,
    /\bspeculative\b/i,
    /\bfringe\b/i,
    /\bfictional\b/i,
    /physicalClaim/i,
    /canon-grounded-projected/i,
    /evidence-grounded-observational/i,
  ]) {
    assert.doesNotMatch(spine, pattern);
  }
});

test('all active documentation surfaces reject stale axis meanings and flattening hierarchy', async () => {
  const rootFiles = await Promise.all(documentationRoots.map((root) => walk(root)));
  const files = rootFiles.flat().filter(activeDocumentationFile);

  const violations = [];
  for (const path of files) {
    const rel = relative(repoRoot, path).replaceAll('\\', '/');
    const source = await readFile(path, 'utf8');
    for (const pattern of [...oldPremaqPatterns, ...oldHierarchyPatterns, ...flatteningPatterns]) {
      if (pattern.test(source)) violations.push(`${rel}: ${pattern}`);
    }
  }

  assert.deepEqual(violations, []);
});

test('Bifröst manifest pulls the same Braided Spine and PREMAQC contract', async () => {
  const manifest = JSON.parse(await readRepo('apps/starwell/public/modules/bifrost-arcsweep.module.json'));
  assert.equal(manifest.spineContract.schema, 'hearthgate.braided-spine/v1.1');
  assert.equal(manifest.spineContract.premaqcSchema, 'hearthgate.premaqc/v1.0');
  assert.deepEqual(manifest.spineContract.premaqcWireOrder, ['P', 'R', 'E', 'M', 'A', 'Q', 'C']);
  assert.equal(manifest.engine.formalism, 'braided-reality-compression-release-receiving-spring');
  assert.equal(manifest.relationContract.hearthside, 'real-participating-shore');
  assert.equal(manifest.relationContract.targetside, 'real-participating-shore');
  assert.ok(manifest.capabilities.includes('receiving-spring'));
  assert.ok(manifest.capabilities.includes('premaqc-seven-dimensional-living-bearing'));
  assert.ok(manifest.capabilities.includes('magic-science-physical-mutual-reinforcement'));
  assert.equal('physicalClaim' in manifest.engine, false);
});

test('runtime Braided Spine registry is canonical PREMAQC and seven-dimensional', async () => {
  const registry = await readRepo('apps/starwell/src/hearthweave-kernel/braided-spine.js');
  assert.match(registry, /PREMAQC_SCHEMA/);
  assert.match(registry, /Presence/);
  assert.match(registry, /Memory/);
  assert.match(registry, /Qualia/);
  assert.match(registry, /Resonance/);
  assert.match(registry, /Entanglement/);
  assert.match(registry, /Agency/);
  assert.match(registry, /Coherence/);
  assert.match(registry, /BRAIDED_SPINE_SCHEMA/);
  assert.match(registry, /SEVENFOLD_CHORUS/);
  assert.match(registry, /THIRTEENFOLD_COUNCIL/);
});
