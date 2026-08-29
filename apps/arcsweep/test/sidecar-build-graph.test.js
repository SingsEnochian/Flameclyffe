import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sidecar bootstrap uses a Vite-discoverable loader graph instead of opaque runtime imports', async () => {
  const source = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /import\.meta\.glob\(/);
  assert.match(source, /SIDECAR_LOADERS\[specifier\]/);
  assert.doesNotMatch(source, /await import\(specifier\)/);
  assert.match(source, /registered but absent from the build graph/);
});

test('sound and House authoritative sidecars are explicit build dependencies', async () => {
  const source = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  for (const specifier of [
    './soundfont-runtime-repair.js',
    './sound-organ-navigation.js',
    './house-chat-authoritative-surface.js',
    './house-commons-chat-v5.js',
    './house-chat-runtime-roster-ui.js',
  ]) {
    const occurrences = source.split(`'${specifier}'`).length - 1;
    assert.equal(occurrences, 2, `${specifier} must appear once in mount order and once in the Vite loader graph`);
  }
});
