import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('Praxeum Pad preserves branch uncertainty and incomplete-memory boundaries', async () => {
  const reference = await load('../skills/sources/drive/praxeum-pad-reference.v0.1.json');
  assert.equal(reference.canon_status, 'reference-only');
  assert.match(reference.universal_codex_translation.timeline_rule, /preserve branch ancestry/);
  assert.match(reference.universal_codex_translation.arrival_rule, /must not be filled by system inference/);
});

test('Portents and Dreams keeps mutable dream scenery distinct from scene class', async () => {
  const reference = await load('../skills/sources/drive/portents-and-dreams-reference.v0.1.json');
  assert.equal(reference.canon_status, 'reference-only');
  assert.equal(reference.universal_codex_translation.scene_class, 'dream');
  assert.match(reference.universal_codex_translation.dream_scene_rule, /provenance, participant identity, and scene class remain anchored/);
  assert.match(reference.universal_codex_translation.epistemic_rule, /do not silently promote/);
});

test('Praxeum Musebox treats failure as a training receipt and supports adaptive teaching', async () => {
  const reference = await load('../skills/sources/drive/praxeum-musebox-reference.v0.1.json');
  assert.equal(reference.canon_status, 'reference-only');
  assert.match(reference.universal_codex_translation.failure_rule, /not a verdict on capability/);
  assert.deepEqual(reference.universal_codex_translation.adaptive_sequence, [
    'observe',
    'attempt',
    'detect friction',
    'change representation',
    'retry',
    'stabilise success',
    'record the working method',
  ]);
});
