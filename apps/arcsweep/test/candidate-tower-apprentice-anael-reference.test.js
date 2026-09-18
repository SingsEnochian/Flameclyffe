import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../skills/sources/drive/candidate-tower-apprentice-anael-reference.v0.1.json', import.meta.url);

async function loadReference() {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('Anael source remains reference-only', async () => {
  const reference = await loadReference();
  assert.equal(reference.canon_status, 'reference-only');
  assert.equal(reference.story_lore_boundary.auto_promote_to_arcsweep_canon, false);
  assert.equal(reference.story_lore_boundary.auto_promote_characters, false);
  assert.equal(reference.story_lore_boundary.auto_promote_setting, false);
  assert.equal(reference.story_lore_boundary.auto_promote_psionic_scale, false);
});

test('Anael mechanisms separate intensity, concurrency, and authority', async () => {
  const reference = await loadReference();
  const ids = reference.mechanisms.map((item) => item.id);
  assert.ok(ids.includes('presence-gain-normalisation'));
  assert.ok(ids.includes('parallel-task-lanes'));
  assert.ok(ids.includes('diagnostic-without-action'));
  assert.equal(
    reference.ui_translation.rule,
    'Capability intensity, output intensity, and mutation authority are three different things.',
  );
  assert.deepEqual(reference.ui_translation.authority_split, {
    inspect: 'read and diagnose',
    propose: 'suggest or stage a change',
    mutate: 'perform an authorised change',
  });
});

test('parallel lanes remain independently stateful', async () => {
  const reference = await loadReference();
  assert.deepEqual(reference.ui_translation.parallel_lane_states, [
    'queued',
    'active',
    'held',
    'waiting-on-input',
    'complete',
    'failed',
  ]);
});
