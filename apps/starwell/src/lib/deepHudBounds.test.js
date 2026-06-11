import test from 'node:test';
import assert from 'node:assert/strict';

import {
  avoidRectsForDefaultPosition,
  getAvoidRects,
  makeHudSnapZones,
  makeRect,
} from './deepHudBounds.js';

function makeBounds({ width = 400, height = 300, viewportClass = 'wide', avoidRects = [] } = {}) {
  const safeRect = makeRect(0, 0, width, height);
  return {
    viewportClass,
    safeRect,
    avoidRects,
    snapZones: makeHudSnapZones(safeRect),
  };
}

test('getAvoidRects includes stage, readout, and explicit extras', () => {
  const stageRect = makeRect(20, 20, 120, 120);
  const readoutRect = makeRect(160, 20, 200, 220);
  const extraRect = makeRect(0, 250, 400, 50);

  assert.deepEqual(
    getAvoidRects({ stageRect, readoutRect, extraAvoidRects: [extraRect] }),
    [stageRect, readoutRect, extraRect],
  );
});

test('avoidance skips a repeated blocked fallback and selects the next clear zone', () => {
  const bounds = makeBounds({
    viewportClass: 'narrow',
    avoidRects: [makeRect(120, 230, 160, 70)],
  });

  const result = avoidRectsForDefaultPosition(
    'status',
    { width: 100, height: 50 },
    bounds,
    ['bottom-rail', 'top-right'],
  );

  assert.equal(result.zone, 'top-right');
  assert.equal(result.blocked, false);
  assert.deepEqual(result.attemptedZones, ['bottom-rail', 'top-right']);
});

test('avoidance keeps a clear default position without testing unnecessary fallbacks', () => {
  const bounds = makeBounds({
    viewportClass: 'wide',
    avoidRects: [makeRect(280, 0, 120, 80)],
  });

  const result = avoidRectsForDefaultPosition(
    'status',
    { width: 100, height: 50 },
    bounds,
    ['top-right', 'bottom-rail'],
  );

  assert.equal(result.zone, 'bottom-left');
  assert.equal(result.blocked, false);
  assert.deepEqual(result.attemptedZones, ['bottom-left']);
});

test('avoidance reports blocked when every candidate intersects an avoid rectangle', () => {
  const safeRect = makeRect(0, 0, 300, 200);
  const bounds = {
    viewportClass: 'wide',
    safeRect,
    avoidRects: [safeRect],
    snapZones: makeHudSnapZones(safeRect),
  };

  const result = avoidRectsForDefaultPosition(
    'status',
    { width: 100, height: 50 },
    bounds,
    ['top-right', 'top-left'],
  );

  assert.equal(result.zone, 'bottom-left');
  assert.equal(result.blocked, true);
  assert.deepEqual(result.attemptedZones, ['bottom-left', 'top-right', 'top-left']);
});
