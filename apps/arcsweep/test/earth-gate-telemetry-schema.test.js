import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const schemaPath = fileURLToPath(new URL('../../../starwell/deep-observer/schemas/earth-gate-telemetry-v1.schema.json', import.meta.url));
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

test('Earth Gate telemetry schema inherits canonical Hearthgate math spine', () => {
  assert.equal(schema.properties.schema.const, 'hearthgate.earth-gate-telemetry/v1');
  assert.equal(schema.properties.math_spine.const, 'hearthgate.math-spine/v1.8');
  assert.equal(schema.properties.physical_claim.const, false);
  assert.equal(schema.properties.medical_claim.const, false);
});

test('Earth Gate telemetry PREMAQC bearing preserves canonical seven-axis vocabulary', () => {
  const axes = schema.properties.premaqc_bearing.properties.axes;
  assert.deepEqual(axes.required, ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.equal(Object.hasOwn(axes.properties, 'AQC'), false);
  assert.deepEqual(schema.properties.premaqc_bearing.properties.dynamic_axes.const, ['P', 'C', 'R', 'E', 'M', 'A']);
  assert.deepEqual(schema.properties.premaqc_bearing.properties.context_only_axes.const, ['Q']);
});

test('Q remains firsthand-only and non-inferred', () => {
  const q = schema.properties.premaqc_bearing.properties.axes.properties.Q.properties;
  assert.equal(q.inferred.const, false);
  assert.equal(q.authority.const, 'firsthand-only');
  assert.equal(q.derivative.const, 0);
  assert.deepEqual(q.value.enum, [0, 1]);
});
