import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../skills/sources/drive/the-rifts-in-the-night-reference.v0.1.json', import.meta.url);

async function loadReference() {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('Rifts in the Night remains reference-only', async () => {
  const reference = await loadReference();
  assert.equal(reference.canon_status, 'reference-only');
  assert.equal(reference.story_lore_boundary.auto_promote_to_arcsweep_canon, false);
  assert.equal(reference.story_lore_boundary.auto_promote_characters, false);
  assert.equal(reference.story_lore_boundary.auto_promote_plot, false);
});

test('Rifts reference preserves progressive threshold and separate intake assessment', async () => {
  const reference = await loadReference();
  assert.deepEqual(reference.mechanism_extract.rift_cycle, [
    'dormant_or_baseline',
    'pitch_change',
    'flicker_or_fluctuation',
    'pressure_build',
    'crack_or_threshold_event',
    'materialisation_window',
    'stabilisation',
    'aftermath',
  ]);
  assert.match(reference.universal_codex_translation.intake_rule, /Arrival and assessment are separate states/);
  assert.match(reference.universal_codex_translation.animation_rule, /accumulate cues before materialisation/);
});
