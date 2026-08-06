import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const schema = readJson('../../../starwell/deep-observer/schemas/spiral-state.schema.json');
const envelopeSchema = readJson('../../../starwell/deep-observer/schemas/observation-envelope.schema.json');

test('Spiral State schema identity and version', () => {
  assert.equal(schema.title, 'Hearthgate Spiral State');
  assert.equal(schema.properties.schema.const, 'hearthgate/spiral-state/v1');
});

test('phase enum contains compression, release, transition — no collapse language', () => {
  const phases = schema.properties.phase.enum;
  assert.ok(phases.includes('compression'));
  assert.ok(phases.includes('release'));
  assert.ok(phases.includes('transition'));
  assert.ok(!phases.includes('collapse'));
  assert.ok(!phases.includes('descending'));
});

test('direction enum uses gathering not descending', () => {
  const directions = schema.properties.direction.enum;
  assert.ok(directions.includes('ascending'));
  assert.ok(directions.includes('gathering'));
  assert.ok(directions.includes('stable'));
  assert.ok(directions.includes('pivoting'));
  assert.ok(!directions.includes('descending'));
  assert.ok(!directions.includes('collapse'));
});

test('confidence is bounded [0, 1]', () => {
  assert.equal(schema.properties.confidence.minimum, 0);
  assert.equal(schema.properties.confidence.maximum, 1);
});

test('supporting_receipts carries IDs only, not source records', () => {
  assert.equal(schema.properties.source_integrity.properties.references_only.const, true);
  const receipts = schema.$defs.supportingReceipts.properties;
  assert.ok('story' in receipts);
  assert.ok('time' in receipts);
  assert.ok('theory' in receipts);
  assert.equal(receipts.story.type, 'array');
  assert.equal(receipts.time.type, 'array');
  assert.equal(receipts.theory.type, 'array');
});

test('suggested_actions require token, weight, reason_code', () => {
  const required = schema.$defs.suggestedAction.required;
  assert.ok(required.includes('token'));
  assert.ok(required.includes('weight'));
  assert.ok(required.includes('reason_code'));
});

test('subsystem_contexts has llm, audio, glyph, ui, haptic, replay slots', () => {
  const contexts = schema.$defs.subsystemContexts.properties;
  assert.ok('llm' in contexts);
  assert.ok('audio' in contexts);
  assert.ok('glyph' in contexts);
  assert.ok('ui' in contexts);
  assert.ok('haptic' in contexts);
  assert.ok('replay' in contexts);
});

test('observation envelope schema rejects destination_datasets from sources', () => {
  assert.ok(envelopeSchema.not, 'Schema must have a not clause rejecting destination_datasets');
  assert.ok(
    envelopeSchema.not.required.includes('destination_datasets'),
    'not.required must include destination_datasets'
  );
});

test('observation envelope schema is versioned correctly', () => {
  assert.equal(envelopeSchema.properties.schema.const, 'hearthgate/observation-envelope/v1');
});

test('Spiral State is the harmonic_state — description confirms this', () => {
  assert.ok(
    schema.description.includes('harmonic_state'),
    'Spiral State schema must declare its role as harmonic_state in DualAspectPacket'
  );
});
