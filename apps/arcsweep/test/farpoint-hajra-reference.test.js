import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('Farpoint Weyr reference keeps partial signals and evidence quality scoped', async () => {
  const ref = await load('../skills/sources/drive/farpoint-weyr-practice-pad-reference.v0.1.json');
  assert.equal(ref.source.canon_policy, 'reference-only');
  assert.equal(ref.boundaries.story_lore_auto_promotes, false);
  assert.ok(ref.mechanisms.some((item) => item.id === 'interrupted-signal-receipt'));
  assert.ok(ref.mechanisms.some((item) => item.id === 'evidence-weathering'));
  assert.ok(ref.laws.includes('Observed sequence is not inferred causation.'));
});

test('Hajra Child reference preserves continuity gaps and interpretation lineage', async () => {
  const ref = await load('../skills/sources/drive/the-hajra-child-reference.v0.1.json');
  assert.equal(ref.source.canon_policy, 'reference-only');
  assert.equal(ref.boundaries.story_lore_auto_promotes, false);
  assert.ok(ref.mechanisms.some((item) => item.id === 'raw-signal-vs-interpretation'));
  assert.ok(ref.mechanisms.some((item) => item.id === 'closed-memory-gap'));
  assert.ok(ref.laws.includes('A continuity gap is not permission to invent the missing interval.'));
  assert.ok(ref.laws.includes('Recovered identity does not retroactively explain an unknown transition.'));
});
