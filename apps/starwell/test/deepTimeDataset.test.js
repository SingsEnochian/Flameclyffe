import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateDeepTimeRecord } from '../../../starwell/deep-observer/deep-time-validator.js';

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const schema = readJson('../../../starwell/deep-observer/schemas/deep-time.schema.json');
const manifest = readJson('../../../starwell/deep-observer/datasets/deep-time.dataset.json');
const example = readJson('../../../starwell/deep-observer/examples/deep-time.example.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('DEEPTime is a distinct dataset parallel to DEEPTheory and DEEPStory', () => {
  assert.equal(schema.title, 'DEEPTime Temporal Sequence Record');
  assert.equal(schema.properties.dataset_kind.const, 'deep_time');
  assert.ok(schema.properties.parallel_datasets.items.enum.includes('DEEPTheory'));
  assert.ok(schema.properties.parallel_datasets.items.enum.includes('DEEPStory'));
  assert.equal(manifest.dataset_id, 'deep-time');
  assert.ok(manifest.parallel_to.includes('DEEPTheory'));
  assert.ok(manifest.parallel_to.includes('DEEPStory'));
});

test('DEEPTime requires immutable sources and append-only sequences', () => {
  assert.equal(schema.properties.source_integrity.properties.raw_sources_immutable.const, true);
  assert.equal(schema.properties.source_integrity.properties.sequences_append_only.const, true);
  assert.equal(manifest.source_policy.raw_sources_immutable, true);
  assert.equal(manifest.source_policy.sequences_append_only, true);
  assert.equal(manifest.source_policy.step_index_must_be_monotone, true);
  assert.equal(manifest.source_policy.spiral_radius_must_not_decrease, true);
});

test('example record keeps temporal sequence provenance resolvable', () => {
  const result = validateDeepTimeRecord(example);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(example.dataset_kind, 'deep_time');
  assert.ok(example.source_refs.length >= 1);
  assert.ok(example.snapshots.length >= 1);
  assert.equal(example.source_integrity.raw_sources_immutable, true);
  assert.equal(example.source_integrity.sequences_append_only, true);
});

test('every snapshot must carry all seven PREMAQ axes', () => {
  const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
  for (const axis of AXES) {
    assert.ok(schema.$defs.premaqSnapshot.required.includes(axis), `Schema must require axis ${axis}`);
  }

  const invalid = clone(example);
  delete invalid.snapshots[0].premaq_state.Q;
  const result = validateDeepTimeRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.path.includes('premaq_state.Q')));
});

test('step sequence must be monotonically increasing', () => {
  const invalid = clone(example);
  invalid.snapshots[1].step = 0;
  const result = validateDeepTimeRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.path.includes('step')));
});

test('spiral radius must not decrease in forward execution', () => {
  const invalid = clone(example);
  invalid.snapshots[1].spiral.radius = 0.5;
  const result = validateDeepTimeRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.path.includes('spiral.radius')));
});

test('snapshot source_ref must resolve to a declared source', () => {
  const invalid = clone(example);
  invalid.snapshots[0].source_ref = 'source-that-does-not-exist';
  const result = validateDeepTimeRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.message.includes('source-that-does-not-exist')));
});

test('UNKNOWN axis must carry null value', () => {
  const invalid = clone(example);
  invalid.snapshots[1].premaq_state.Q.value = 0.5;
  const result = validateDeepTimeRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.path.includes('premaq_state.Q.value')));
});

test('axis names are Agency and Qualia for A and Q', () => {
  assert.equal(manifest.axis_names.A, 'Agency');
  assert.equal(manifest.axis_names.Q, 'Qualia');
});
