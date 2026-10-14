import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVisualProjectionReceipt,
  lerpScenePosition,
  projectSceneTarget,
  spectrometerLevels,
} from '../src/hearthgate-visual-projection.js';

test('canonical divergence vector maps directly into scene space when under radius cap', () => {
  const projection = projectSceneTarget([0.9, 0.95, 1.0]);
  assert.deepEqual(projection.raw_coordinates, [0.9, 0.95, 1]);
  assert.equal(projection.raw_magnitude, 1.646967);
  assert.equal(projection.radial_scale, 1);
  assert.equal(projection.capped, false);
  assert.deepEqual(projection.target_coordinates, [0.9, 0.95, 1]);
});

test('vectors beyond radius 2.6 are radially capped without changing direction', () => {
  const projection = projectSceneTarget([3, 4, 0]);
  assert.equal(projection.raw_magnitude, 5);
  assert.equal(projection.radial_scale, 0.52);
  assert.deepEqual(projection.target_coordinates, [1.56, 2.08, 0]);
  assert.equal(projection.capped, true);
});

test('frame easing advances 12 percent toward the target', () => {
  assert.deepEqual(
    lerpScenePosition([0, 0, 0], [0.9, 0.95, 1]),
    [0.108, 0.114, 0.12],
  );
});

test('spectrometer uses relative absolute amplitude with four percent visual floor', () => {
  const levels = spectrometerLevels([0.9, 0.95, 1], { count: 4 });
  assert.deepEqual(levels.map((entry) => entry.height_percent), [90, 95, 100, 4]);
});

test('visual receipt states that adaptive quality does not directly control position', () => {
  const receipt = buildVisualProjectionReceipt([0.9, 0.95, 1]);
  assert.equal(receipt.animation.lerp_alpha_per_frame, 0.12);
  assert.equal(receipt.semantics.adaptive_quality_directly_controls_position, false);
});
