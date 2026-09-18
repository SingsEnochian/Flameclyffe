import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../skills/sources/drive/circles-reference.v0.1.json', import.meta.url);

async function loadReference() {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('Circles remains reference-only and does not auto-promote story lore', async () => {
  const reference = await loadReference();
  assert.equal(reference.canon_status, 'reference-only');
  assert.equal(reference.story_lore_boundary.auto_promote_to_arcsweep_canon, false);
  assert.equal(reference.story_lore_boundary.auto_promote_characters, false);
  assert.equal(reference.story_lore_boundary.auto_promote_plot, false);
});

test('Circles preserves distinct projection and scene classes', async () => {
  const reference = await loadReference();
  assert.deepEqual(reference.ui_translation.projection_states, [
    'signal', 'voice', 'flicker', 'coalescing', 'stable', 'fading', 'absent',
  ]);
  assert.ok(reference.ui_translation.scene_classes.includes('dream'));
  assert.ok(reference.ui_translation.scene_classes.includes('memory'));
  assert.ok(reference.ui_translation.scene_classes.includes('remote-presence'));
  assert.equal(reference.ui_translation.rule, 'The projection may become vivid without changing the epistemic class of the underlying source.');
});
