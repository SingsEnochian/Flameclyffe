import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const docsRoot = resolve(repoRoot, 'docs');

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
  /\bA\s*=\s*Attention\b/i,
  /\bA\s*=\s*Alignment\b/i,
  /\bA\s*=\s*Availability\b/i,
  /\bQ\s*=\s*Charge\b/i,
  /\bQ\s*=\s*Quotient\b/i,
  /\bQ\s*=\s*Quantum\b/i,
  /\bMoonfield\b/i,
];

const oldHierarchyPatterns = [
  /canon-grounded-projected/i,
  /current-reality-observational/i,
  /fictional and speculative settings/i,
];

test('canonical Braided Spine carries the approved reality law and PREMAQ registry', async () => {
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

  assert.equal(contract.schema, 'hearthgate.braided-spine/v1.0');
  assert.deepEqual(contract.premaq.reading_order, [
    'Presence', 'Memory', 'Qualia', 'Resonance', 'Entanglement', 'Agency', 'Coherence',
  ]);
  assert.deepEqual(contract.premaq.wire_order, ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.deepEqual(contract.premaq.axes, {
    P: 'Presence',
    C: 'Coherence',
    R: 'Resonance',
    E: 'Entanglement',
    M: 'Memory',
    A: 'Agency',
    Q: 'Qualia',
  });
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

test('active docs reject stale PREMAQ meanings and projection hierarchy', async () => {
  const files = (await walk(docsRoot)).filter((path) => {
    const rel = relative(repoRoot, path).replaceAll('\\', '/');
    return !rel.startsWith('docs/archive/') && /\.(md|mdx|txt|js|json)$/i.test(rel);
  });

  const violations = [];
  for (const path of files) {
    const rel = relative(repoRoot, path).replaceAll('\\', '/');
    const source = await readFile(path, 'utf8');
    for (const pattern of [...oldPremaqPatterns, ...oldHierarchyPatterns]) {
      if (pattern.test(source)) violations.push(`${rel}: ${pattern}`);
    }
  }

  assert.deepEqual(violations, []);
});

test('Bifröst manifest pulls the same Braided Spine', async () => {
  const manifest = JSON.parse(await readRepo('apps/starwell/public/modules/bifrost-arcsweep.module.json'));
  assert.equal(manifest.spineContract.schema, 'hearthgate.braided-spine/v1.0');
  assert.equal(manifest.engine.formalism, 'braided-reality-compression-release-receiving-spring');
  assert.equal(manifest.relationContract.hearthside, 'real-participating-shore');
  assert.equal(manifest.relationContract.targetside, 'real-participating-shore');
  assert.ok(manifest.capabilities.includes('receiving-spring'));
  assert.ok(manifest.capabilities.includes('magic-science-physical-mutual-reinforcement'));
  assert.equal('physicalClaim' in manifest.engine, false);
});
