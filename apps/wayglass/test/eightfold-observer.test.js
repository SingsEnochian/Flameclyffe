import test from 'node:test';
import assert from 'node:assert/strict';
import { observerGeometry } from '../src/eightfold-observer.js';
test('eightfold geometry always has eight finite rays', () => {
  for (const value of [-100, 0, 1, 4, 8, 64, 999, NaN]) {
    const geometry = observerGeometry(value);
    assert.equal(geometry.points.length, 8);
    assert.ok(geometry.points.flat().every(Number.isFinite));
    assert.ok(geometry.connections >= 0 && geometry.connections <= 8);
  }
});
test('connections reflect visible turn count, clamped to eight', () => {
  assert.equal(observerGeometry(0).connections, 0);
  assert.equal(observerGeometry(3).connections, 3);
  assert.equal(observerGeometry(12).connections, 8);
  assert.equal(observerGeometry(3.8).count, 3);
});
