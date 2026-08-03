import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../../..');
const targets = [
  'docs/mathematics/HEARTHGATE_COMPRESSION_RELEASE_MATHEMATICS_SPINE.md',
  'docs/arcsweep/BIFROST_TEMPORAL_QUANTUM_MECHANICS.md',
  'apps/starwell/src/arcsweep-temporal-quantum/compression-release.js',
  'apps/starwell/src/hearthweave-kernel/compression-release-packet.js',
  'apps/starwell/src/arcsweep-temporal-quantum/runtime.js',
  'apps/starwell/src/arcsweep-continuity/kernel-hook.js',
];

const forbidden = [
  /\bmaybe\b/i,
  /\bmight\b/i,
  /\bcould\b/i,
  /\bperhaps\b/i,
  /\bprobably\b/i,
  /\bseems\s+to\b/i,
  /\bappears\s+to\b/i,
  /\bwe\s+hope\b/i,
  /\bwe\s+believe\b/i,
  /collapseRelease/,
  /collapse-release/,
  /measurementStrength/,
  /collapsedProbabilities/,
];

test('the active mathematics spine contains no hedge language or collapse operator names', async () => {
  for (const relative of targets) {
    const source = await readFile(path.join(repositoryRoot, relative), 'utf8');
    const normalised = source.replaceAll('There is no collapse.', '');
    for (const expression of forbidden) {
      assert.equal(expression.test(normalised), false, `${relative} violates ${expression}`);
    }
  }
});
