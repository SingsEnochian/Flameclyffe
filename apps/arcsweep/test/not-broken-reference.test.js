import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('../skills/sources/drive/not-broken-reference.v0.1.json', import.meta.url);
const ingest = JSON.parse(fs.readFileSync(path, 'utf8'));

test('Not Broken remains reference-only', () => {
  assert.equal(ingest.canon_policy.auto_promote, false);
  assert.equal(ingest.canon_policy.story_lore_transfer, false);
  assert.equal(ingest.canon_policy.mechanism_transfer, true);
});

test('durability grammar distinguishes degradation from failure', () => {
  assert.ok(ingest.laws.includes('degraded != failed'));
  assert.ok(ingest.laws.includes('dirty != corrupted'));
  assert.ok(ingest.laws.includes('repaired != history-erased'));
});

test('maintenance is represented as an explicit state transition', () => {
  assert.deepEqual(ingest.candidate_state_machine, [
    'active-operation',
    'residue',
    'maintenance',
    'repaired-weathered',
    'ready',
  ]);
});

test('intimate source material does not transfer into the mechanism layer', () => {
  assert.ok(ingest.prohibitions.some((rule) => rule.includes('intimate source content')));
  assert.ok(ingest.prohibitions.some((rule) => rule.includes('Mass Effect story canon')));
});
