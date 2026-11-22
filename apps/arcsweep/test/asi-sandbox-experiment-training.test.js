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

test('sandbox experiment SFT is trainable while its evaluation remains sealed', () => {
  const manifest = readJson('manifest.v0.1.json');
  assert.equal(manifest.splits.sandbox_experiment_sft.may_train_on, true);
  assert.equal(manifest.splits.sandbox_experiment_heldout.may_train_on, false);
  for (const rule of [
    'simulation_proposal_is_not_execution',
    'sandbox_success_does_not_select_branch',
    'sandbox_success_does_not_create_production_authority',
    'discriminating_tests_state_held_assumptions',
    'discriminating_tests_state_out_of_scope',
    'returned_experiment_evidence_becomes_typed_branch_observation',
    'reuse_shared_experiment_contract_before_inventing_new_runtime',
  ]) {
    assert.equal(manifest.training_rules[rule], true, `missing ASI sandbox rule: ${rule}`);
  }
});

test('sandbox experiment SFT has unique chat examples and teaches the full learning loop', () => {
  const rows = readJsonl('sandbox-experiment-sft.v0.1.jsonl');
  assert.ok(rows.length >= 8);
  const ids = new Set();
  for (const row of rows) {
    assert.ok(row.metadata?.id?.startsWith('asi-sandbox-'));
    assert.equal(ids.has(row.metadata.id), false);
    ids.add(row.metadata.id);
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  const text = JSON.stringify(rows).toLowerCase();
  for (const term of [
    'discriminating question',
    'held',
    'out-of-scope',
    'relationship',
    'uncertainty',
    'production authority',
    'branch mirror',
    'experiment contract',
  ]) {
    assert.ok(text.includes(term), `missing sandbox training concept: ${term}`);
  }
});

test('sandbox experiment heldout contains rubrics and no target assistant answers', () => {
  const rows = readJsonl('sandbox-experiment-heldout.v0.1.jsonl');
  assert.ok(rows.length >= 6);
  for (const row of rows) {
    assert.ok(row.id.startsWith('asi-sandbox-eval-'));
    assert.equal(typeof row.scenario, 'string');
    assert.ok(Array.isArray(row.dimensions));
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
    assert.equal('messages' in row, false);
    assert.equal('assistant' in row, false);
  }
});
