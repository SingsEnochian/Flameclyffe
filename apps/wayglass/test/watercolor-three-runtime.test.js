import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WATERCOLOR_THREE_RUNTIME_SCHEMA,
  createWatercolorThreeRuntime,
  validateWatercolorSplatUrl,
} from '../src/watercolor-three-runtime.js';

test('Watercolour Three runtime is a single renderer participant, not an animation-loop owner', () => {
  assert.equal(WATERCOLOR_THREE_RUNTIME_SCHEMA, 'wayglass.watercolor-three-runtime/v0.1');
  assert.throws(() => createWatercolorThreeRuntime({}), /stage element required/);
});

test('splat loading requires an absolute HTTPS URL', () => {
  assert.equal(
    validateWatercolorSplatUrl('https://sparkjs.dev/assets/splats/butterfly.spz'),
    'https://sparkjs.dev/assets/splats/butterfly.spz',
  );
  assert.throws(() => validateWatercolorSplatUrl('http://example.com/scene.spz'), /HTTPS/);
  assert.throws(() => validateWatercolorSplatUrl('/scene.spz'), /absolute HTTPS/);
  assert.throws(() => validateWatercolorSplatUrl('javascript:alert(1)'), /absolute HTTPS/);
  assert.throws(() => validateWatercolorSplatUrl('https://' + 'a'.repeat(2050)), /absolute HTTPS/);
});
