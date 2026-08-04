import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TWO_SHORE_SPIRAL_SCHEMA,
  coilReleaseFrame,
  loopPlaybackEnabled,
  shokzOutputConfirmed,
} from '../src/two-shore-loop-shokz-spiral.js';

function root(values = {}) {
  return {
    getElementById(id) {
      return values[id] ?? null;
    },
  };
}

test('coil contracts, releases, and advances upward through 2025 to 2035', () => {
  const compressionStart = coilReleaseFrame(0, 0);
  const compressionEnd = coilReleaseFrame(0.04, 0.49);
  const releaseStart = coilReleaseFrame(0.05, 0.5);
  const releaseEnd = coilReleaseFrame(1, 0.99);

  assert.equal(compressionStart.schema, TWO_SHORE_SPIRAL_SCHEMA);
  assert.equal(compressionStart.phase, 'compression');
  assert.equal(compressionEnd.phase, 'compression');
  assert.ok(compressionEnd.coil_radius < compressionStart.coil_radius);
  assert.equal(releaseStart.phase, 'release');
  assert.equal(releaseEnd.phase, 'release');
  assert.ok(releaseEnd.coil_radius > releaseStart.coil_radius);
  assert.ok(releaseEnd.vertical_release > releaseStart.vertical_release);
  assert.ok(releaseEnd.upward_distance > compressionStart.upward_distance);
  assert.equal(compressionStart.year, 2025);
  assert.equal(releaseEnd.year, 2035);
  assert.equal(releaseEnd.next_operation, 'compression-of-release');
});

test('loop and Shokz confirmation controls are explicit and independent', () => {
  assert.equal(loopPlaybackEnabled(root({
    'two-shore-loop-playback': { checked: true },
  })), true);
  assert.equal(loopPlaybackEnabled(root({
    'two-shore-loop-playback': { checked: false },
  })), false);

  assert.equal(shokzOutputConfirmed(root({
    'two-shore-shokz-confirm': { checked: true },
    'premaq-shokz-confirm': { checked: false },
  })), true);
  assert.equal(shokzOutputConfirmed(root({
    'two-shore-shokz-confirm': { checked: false },
    'premaq-shokz-confirm': { checked: true },
  })), true);
  assert.equal(shokzOutputConfirmed(root({
    'two-shore-shokz-confirm': { checked: false },
    'premaq-shokz-confirm': { checked: false },
  })), false);
});
