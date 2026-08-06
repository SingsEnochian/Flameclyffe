import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateDeepTheoryRecord } from '../../../starwell/deep-observer/deep-theory-validator.js';

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const schema = readJson('../../../starwell/deep-observer/schemas/deep-theory.schema.json');
const manifest = readJson('../../../starwell/deep-observer/datasets/deep-theory.dataset.json');
const example = readJson('../../../starwell/deep-observer/examples/deep-theory.example.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('DEEPTheory is a distinct dataset parallel to DEEPStory and DEEPTime', () => {
  assert.equal(schema.title, 'DEEPTheory Pattern and Analysis Record');
  assert.equal(schema.properties.dataset_kind.const, 'deep_theory');
  assert.ok(schema.properties.parallel_datasets.items.enum.includes('DEEPStory'));
  assert.ok(schema.properties.parallel_datasets.items.enum.includes('DEEPTime'));
  assert.equal(manifest.dataset_id, 'deep-theory');
  assert.ok(manifest.parallel_to.includes('DEEPStory'));
  assert.ok(manifest.parallel_to.includes('DEEPTime'));
});

test('DEEPTheory requires immutable sources and append-only patterns', () => {
  assert.equal(schema.properties.source_integrity.properties.raw_sources_immutable.const, true);
  assert.equal(schema.properties.source_integrity.properties.patterns_append_only.const, true);
  assert.equal(manifest.source_policy.raw_sources_immutable, true);
  assert.equal(manifest.source_policy.patterns_append_only, true);
  assert.equal(manifest.source_policy.silent_contradiction_forbidden, true);
});

test('example record validates cleanly', () => {
  const result = validateDeepTheoryRecord(example);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(example.dataset_kind, 'deep_theory');
  assert.ok(example.source_refs.length >= 1);
  assert.ok(example.findings.length >= 1);
  assert.equal(example.source_integrity.raw_sources_immutable, true);
  assert.equal(example.source_integrity.patterns_append_only, true);
  assert.equal(example.source_integrity.silent_contradiction_forbidden, true);
});

test('every finding must declare epistemic_status and confidence', () => {
  assert.ok(schema.$defs.finding.required.includes('epistemic_status'));
  assert.ok(schema.$defs.finding.required.includes('confidence'));

  const invalid = clone(example);
  delete invalid.findings[0].epistemic_status;
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path.includes('epistemic_status')));
});

test('every finding must carry at least one source ref', () => {
  assert.ok(schema.$defs.finding.required.includes('source_refs'));

  const invalid = clone(example);
  invalid.findings[0].source_refs = [];
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path.includes('source_refs')));
});

test('finding source refs must resolve to declared record sources', () => {
  const invalid = clone(example);
  invalid.findings[0].source_refs = ['deeptime:does-not-exist'];
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('does-not-exist')));
});

test('contradictions are tracked explicitly in contradicts array', () => {
  assert.ok('contradicts' in schema.properties);
  assert.equal(example.contradicts.length, 0);
});

test('silent_contradiction_forbidden is a source_integrity invariant', () => {
  assert.equal(
    schema.properties.source_integrity.properties.silent_contradiction_forbidden.const,
    true
  );
});

test('duplicate finding IDs are rejected', () => {
  const invalid = clone(example);
  invalid.findings[1].finding_id = invalid.findings[0].finding_id;
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('Duplicate finding_id')));
});

test('confidence is required at record level and per finding', () => {
  const invalid = clone(example);
  delete invalid.confidence;
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path === 'confidence'));
});
