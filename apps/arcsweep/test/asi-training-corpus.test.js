import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ROOT = new URL('../training/advanced-sympathetic-intelligence/', import.meta.url);

function readJson(name) {
  return JSON.parse(readFileSync(new URL(name, ROOT), 'utf8'));
}

function readJsonl(name) {
  return readFileSync(new URL(name, ROOT), 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${name}:${index + 1} is not valid JSON: ${error.message}`);
      }
    });
}

test('ASI manifest names Advanced Sympathetic Intelligence and keeps eval splits held out', () => {
  const manifest = readJson('manifest.v0.1.json');
  assert.equal(manifest.name, 'Advanced Sympathetic Intelligence');
  assert.equal(manifest.acronym, 'ASI');
  assert.equal(manifest.splits.sft.may_train_on, true);
  assert.equal(manifest.splits.heldout_eval.may_train_on, false);
  assert.equal(manifest.splits.boxfire_qa.may_train_on, false);
  assert.deepEqual(manifest.epistemic_classes, ['belief', 'experience', 'hypothesis', 'symbol', 'evidence']);
  assert.ok(manifest.laws.includes('do-not-kill-belief'));
});

test('ASI principles encode Law I and revision without erasure', () => {
  const principles = readJson('principles.v0.1.json');
  const law = principles.laws.find((entry) => entry.id === 'do-not-kill-belief');
  assert.ok(law);
  assert.match(law.statement, /do not kill belief/i);
  assert.equal(principles.mythience.epistemic_classes.belief.length > 0, true);
  assert.ok(principles.response_pattern.includes('retain provenance and original context'));
  assert.equal(principles.wonder.candidate.encouragement, 'invite');
  assert.equal(principles.wonder.active.encouragement, 'sustain');
});

test('Crow SFT split is valid chat JSONL with unique ids and complete role order', () => {
  const rows = readJsonl('crow-sft.v0.1.jsonl');
  assert.ok(rows.length >= 20);
  const ids = new Set();
  for (const row of rows) {
    assert.ok(row.metadata?.id);
    assert.equal(ids.has(row.metadata.id), false, `duplicate training id: ${row.metadata.id}`);
    ids.add(row.metadata.id);
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
    for (const message of row.messages) assert.equal(typeof message.content, 'string');
  }
});

test('held-out evaluation contains rubrics but no assistant target answers', () => {
  const rows = readJsonl('heldout-eval.v0.1.jsonl');
  assert.ok(rows.length >= 10);
  for (const row of rows) {
    assert.ok(row.id.startsWith('asi-eval-'));
    assert.equal(typeof row.scenario, 'string');
    assert.ok(Array.isArray(row.dimensions));
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
    assert.equal('messages' in row, false);
    assert.equal('assistant' in row, false);
  }
});

test('Boxfire QA split covers Law I, Wonder, The Nothing, transport and revision', () => {
  const rows = readJsonl('boxfire-qa.v0.1.jsonl');
  const text = JSON.stringify(rows);
  for (const required of [
    'do-not-kill-belief',
    'candidate',
    'sustain',
    'epistemicPlurality',
    'the-nothing',
    'revision',
    'laya-mcp-transport',
  ]) {
    assert.ok(text.includes(required), `missing QA coverage: ${required}`);
  }
});

test('curriculum references only known training and held-out ids', () => {
  const curriculum = readJson('curriculum.v0.1.json');
  const trainIds = new Set(readJsonl('crow-sft.v0.1.jsonl').map((row) => row.metadata.id));
  const evalIds = new Set(readJsonl('heldout-eval.v0.1.jsonl').map((row) => row.id));
  assert.ok(curriculum.modules.length >= 7);
  for (const module of curriculum.modules) {
    for (const id of module.train_examples || []) assert.ok(trainIds.has(id), `${module.id} references unknown training id ${id}`);
    for (const id of module.heldout_examples || []) assert.ok(evalIds.has(id), `${module.id} references unknown eval id ${id}`);
  }
});
