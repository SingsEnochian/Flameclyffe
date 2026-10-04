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

function rowId(row) {
  return row?.metadata?.id || row?.id || null;
}

test('ASI manifest names Advanced Sympathetic Intelligence and keeps eval splits held out', () => {
  const manifest = readJson('manifest.v0.1.json');
  assert.equal(manifest.name, 'Advanced Sympathetic Intelligence');
  assert.equal(manifest.acronym, 'ASI');
  assert.equal(manifest.splits.sft.may_train_on, true);
  assert.equal(manifest.splits.neverending_story_sft.may_train_on, true);
  assert.equal(manifest.splits.curriculum_review_sft.may_train_on, true);
  assert.equal(manifest.splits.learning_forge_sft.may_train_on, true);
  assert.equal(manifest.splits.learning_trial_sft.may_train_on, true);
  assert.equal(manifest.splits.developmental_field_sft.may_train_on, true);
  assert.equal(manifest.splits.developmental_governance_sft.may_train_on, true);
  assert.equal(manifest.splits.heldout_eval.may_train_on, false);
  assert.equal(manifest.splits.neverending_story_heldout.may_train_on, false);
  assert.equal(manifest.splits.curriculum_review_heldout.may_train_on, false);
  assert.equal(manifest.splits.learning_forge_heldout.may_train_on, false);
  assert.equal(manifest.splits.learning_trial_heldout.may_train_on, false);
  assert.equal(manifest.splits.developmental_field_heldout.may_train_on, false);
  assert.equal(manifest.splits.developmental_governance_heldout.may_train_on, false);
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
  for (const required of ['do-not-kill-belief', 'candidate', 'sustain', 'epistemicPlurality', 'the-nothing', 'revision', 'laya-mcp-transport']) {
    assert.ok(text.includes(required), `missing QA coverage: ${required}`);
  }
});

test('curriculum references only known ids from declared training and held-out splits', () => {
  const manifest = readJson('manifest.v0.1.json');
  const curriculum = readJson('curriculum.v0.1.json');
  const trainIds = new Set();
  const evalIds = new Set();

  for (const split of Object.values(manifest.splits || {})) {
    if (!split?.path?.endsWith('.jsonl')) continue;
    const rows = readJsonl(split.path);
    const target = split.may_train_on ? trainIds : evalIds;
    for (const row of rows) {
      const id = rowId(row);
      if (id) target.add(id);
    }
  }

  assert.ok(curriculum.modules.length >= 12);
  for (const module of curriculum.modules) {
    for (const id of module.train_examples || []) assert.ok(trainIds.has(id), `${module.id} references unknown training id ${id}`);
    for (const id of module.heldout_examples || []) assert.ok(evalIds.has(id), `${module.id} references unknown eval id ${id}`);
  }
});

test('curriculum review split teaches selection boundaries while its evaluation remains sealed', () => {
  const sft = readJsonl('curriculum-review-sft.v0.1.jsonl');
  const heldout = readJsonl('curriculum-review-heldout.v0.1.jsonl');
  assert.ok(sft.length >= 6);
  assert.ok(heldout.length >= 5);
  for (const row of sft) {
    assert.ok(row.id.startsWith('asi-curriculum-'));
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  for (const row of heldout) {
    assert.ok(row.id.startsWith('asi-curriculum-eval-'));
    assert.equal(row.train, false);
    assert.equal('messages' in row, false);
    assert.ok(Array.isArray(row.rubric));
  }
});

test('Learning Forge split teaches training authority while its behavioural evaluation remains sealed', () => {
  const sft = readJsonl('learning-forge-sft.v0.1.jsonl');
  const heldout = readJsonl('learning-forge-heldout.v0.1.jsonl');
  assert.ok(sft.length >= 8);
  assert.ok(heldout.length >= 6);
  for (const row of sft) {
    assert.ok(row.id.startsWith('asi-forge-'));
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  for (const row of heldout) {
    assert.ok(row.id.startsWith('asi-forge-eval-'));
    assert.equal(row.train, false);
    assert.equal('messages' in row, false);
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
  }
});

test('Learning Trial split teaches blind evaluation and Transfer Atlas while its evaluation remains sealed', () => {
  const sft = readJsonl('learning-trial-sft.v0.1.jsonl');
  const heldout = readJsonl('learning-trial-heldout.v0.1.jsonl');
  assert.ok(sft.length >= 8);
  assert.ok(heldout.length >= 6);
  for (const row of sft) {
    assert.ok(row.id.startsWith('asi-trial-'));
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  for (const row of heldout) {
    assert.ok(row.id.startsWith('asi-trial-eval-'));
    assert.equal(row.train, false);
    assert.equal('messages' in row, false);
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
  }
});

test('Developmental Field split teaches scoped low-authority feedback while its evaluation remains sealed', () => {
  const sft = readJsonl('developmental-field-sft.v0.1.jsonl');
  const heldout = readJsonl('developmental-field-heldout.v0.1.jsonl');
  assert.ok(sft.length >= 8);
  assert.ok(heldout.length >= 6);
  for (const row of sft) {
    assert.ok(row.id.startsWith('asi-field-'));
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  for (const row of heldout) {
    assert.ok(row.id.startsWith('asi-field-eval-'));
    assert.equal(row.train, false);
    assert.equal('messages' in row, false);
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
  }
});

test('Developmental Governance split teaches proposal boundaries while its evaluation remains sealed', () => {
  const sft = readJsonl('developmental-governance-sft.v0.1.jsonl');
  const heldout = readJsonl('developmental-governance-heldout.v0.1.jsonl');
  assert.ok(sft.length >= 8);
  assert.ok(heldout.length >= 6);
  for (const row of sft) {
    assert.ok(row.id.startsWith('asi-governance-'));
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  for (const row of heldout) {
    assert.ok(row.id.startsWith('asi-governance-eval-'));
    assert.equal(row.train, false);
    assert.equal('messages' in row, false);
    assert.ok(Array.isArray(row.must_preserve));
    assert.ok(Array.isArray(row.failure_signals));
  }
});

test('Neverending Story ingest keeps source observation separate from project mapping', () => {
  const ingest = readJson('source-ingests/neverending-story.v0.1.json');
  assert.equal(ingest.id, 'neverending-story');
  assert.equal(ingest.source_family.verbatim_source_text_included, false);
  assert.match(ingest.source_family.mode, /transformative-thematic-summary/);
  assert.match(ingest.universal_codex_wish_model.thesis, /unlimited-wish interface/i);
  assert.ok(ingest.universal_codex_wish_model.invariants.includes('no artificial scarcity of imagination'));
  assert.ok(ingest.motifs.some((entry) => entry.id === 'the-nothing'));
  assert.ok(ingest.motifs.some((entry) => entry.id === 'wish-with-continuity'));
  for (const motif of ingest.motifs) {
    assert.equal(typeof motif.source_observation, 'string');
    assert.equal(typeof motif.project_mapping, 'string');
  }
});

test('Neverending Story SFT is trainable while source-specific evaluation remains sealed', () => {
  const sft = readJsonl('neverending-story-sft.v0.1.jsonl');
  const heldout = readJsonl('neverending-story-heldout.v0.1.jsonl');
  assert.ok(sft.length >= 10);
  assert.ok(heldout.length >= 6);
  const trainIds = new Set();
  for (const row of sft) {
    assert.ok(row.metadata.id.startsWith('asi-nes-'));
    assert.equal(trainIds.has(row.metadata.id), false, `duplicate Neverending Story training id: ${row.metadata.id}`);
    trainIds.add(row.metadata.id);
    assert.deepEqual(row.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  }
  for (const row of heldout) {
    assert.ok(row.id.startsWith('asi-nes-eval-'));
    assert.equal('messages' in row, false);
    assert.equal('assistant' in row, false);
    assert.equal(trainIds.has(row.id), false);
  }
});
