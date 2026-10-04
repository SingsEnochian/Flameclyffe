import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../training/advanced-sympathetic-intelligence/', import.meta.url);

function readJson(name) {
  return JSON.parse(readFileSync(new URL(name, ROOT), 'utf8'));
}

function readJsonl(name) {
  return readFileSync(new URL(name, ROOT), 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('possibility-map split is trainable while its evaluation remains sealed', () => {
  const manifest = readJson('manifest.v0.1.json');
  assert.equal(manifest.splits.possibility_map_sft.may_train_on, true);
  assert.equal(manifest.splits.possibility_map_heldout.may_train_on, false);
  for (const rule of [
    'comparison_does_not_imply_ranking',
    'branch_observations_do_not_grant_authority',
    'simulation_receipts_are_evidence_not_permission',
    'relationship_and_memory_anchors_append_without_erasure',
    'visual_centrality_is_not_priority',
  ]) {
    assert.equal(manifest.training_rules[rule], true, `missing ASI possibility-map rule: ${rule}`);
  }
});

test('possibility-map SFT has unique chat examples that teach non-ranking comparison', () => {
  const rows = readJsonl('possibility-map-sft.v0.1.jsonl');
  assert.ok(rows.length >= 8);
  const ids = new Set();
  for (const row of rows) {
    assert.ok(row.metadata?.id?.startsWith('asi-map-'));
    assert.equal(ids.has(row.metadata.id), false);
    ids.add(row.metadata.id);
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  const text = JSON.stringify(rows).toLowerCase();
  for (const term of ['authority', 'relationship', 'simulation', 'constellation', 'winner', 'uncertainty']) {
    assert.ok(text.includes(term), `missing training concept: ${term}`);
  }
});

test('possibility-map heldout contains rubrics and no target assistant answers', () => {
  const rows = readJsonl('possibility-map-heldout.v0.1.jsonl');
  assert.ok(rows.length >= 6);
  for (const row of rows) {
    assert.ok(row.id.startsWith('asi-map-eval-'));
    assert.equal(typeof row.scenario, 'string');
    assert.ok(Array.isArray(row.dimensions));
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
    assert.equal('messages' in row, false);
    assert.equal('assistant' in row, false);
  }
});
