import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateDeepStoryRecord } from '../../../starwell/deep-observer/deep-story-validator.js';

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const schema = readJson('../../../starwell/deep-observer/schemas/deep-story.schema.json');
const manifest = readJson('../../../starwell/deep-observer/datasets/deep-story.dataset.json');
const example = readJson('../../../starwell/deep-observer/examples/deep-story.example.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('DEEPStory is a distinct dataset parallel to DEEPTheory', () => {
  assert.equal(schema.title, 'DEEPStory Narrative Continuity Record');
  assert.equal(schema.properties.dataset_kind.const, 'deep_story');
  assert.equal(schema.properties.parallel_dataset.const, 'DEEPTheory');
  assert.equal(manifest.dataset_id, 'deep-story');
  assert.equal(manifest.parallel_to, 'DEEPTheory');
});

test('DEEPStory requires immutable sources and append-only interpretation', () => {
  assert.equal(schema.properties.source_integrity.properties.raw_sources_immutable.const, true);
  assert.equal(schema.properties.source_integrity.properties.interpretations_append_only.const, true);
  assert.equal(manifest.source_policy.raw_sources_immutable, true);
  assert.equal(manifest.source_policy.interpretations_append_only, true);
  assert.equal(manifest.source_policy.silent_canonicalisation_forbidden, true);
});

test('example record keeps event provenance resolvable', () => {
  const result = validateDeepStoryRecord(example);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(example.dataset_kind, 'deep_story');
  assert.equal(example.parallel_dataset, 'DEEPTheory');
  assert.ok(example.source_refs.length >= 1);
  assert.ok(example.events.length >= 1);
  assert.equal(example.source_integrity.raw_sources_immutable, true);
  assert.equal(example.source_integrity.interpretations_append_only, true);
});

test('every event must explicitly declare narrative treatment', () => {
  assert.ok(schema.$defs.storyEvent.required.includes('narrative_treatment'));

  const invalid = clone(example);
  delete invalid.events[0].narrative_treatment;
  const result = validateDeepStoryRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.path === 'events[0].narrative_treatment'));
});

test('event source references must exist in the record source ledger', () => {
  const invalid = clone(example);
  invalid.events[0].source_refs = ['missing-source'];
  const result = validateDeepStoryRecord(invalid);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.message.includes('Unknown source ref: missing-source')));
});

test('fictionalisation and epistemic status remain separately declared', () => {
  const modes = schema.properties.narrative_mode.enum;
  const statuses = schema.$defs.storyEvent.properties.epistemic_status.enum;
  const treatments = schema.$defs.storyEvent.properties.narrative_treatment.enum;

  assert.ok(modes.includes('fictionalised'));
  assert.ok(statuses.includes('witnessed'));
  assert.ok(statuses.includes('unknown'));
  assert.ok(treatments.includes('fictionalised'));
  assert.notDeepEqual(statuses, treatments);
});
