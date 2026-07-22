import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CERTIFIED_PREIMAGES,
  CERTIFIED_TARGET,
  calculateSheetConvergence,
  determinant3,
  sheetConvergenceJacobian,
  sheetConvergenceMap,
} from './sheetConvergence.js';

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
};

const vectorClose = (actual, expected, tolerance = 1e-9) => {
  actual.forEach((value, index) => close(value, expected[index], tolerance));
};

test('all certified preimages share the certified target', () => {
  CERTIFIED_PREIMAGES.forEach((point) => vectorClose(sheetConvergenceMap(point), CERTIFIED_TARGET));
});

test('Jacobian determinant remains -2 across representative states', () => {
  const states = [
    [0, 0, 0],
    ...CERTIFIED_PREIMAGES,
    [0.25, -0.75, 1.2],
    [-0.8, 0.4, -2.1],
    [2, -1, 0.125],
  ];

  states.forEach((state) => close(determinant3(sheetConvergenceJacobian(state)), -2, 1e-7));
});

test('local fold probability is exactly zero for this nonsingular map', () => {
  const result = calculateSheetConvergence([0.2, 0.3, -0.4]);
  close(result.determinant, -2, 1e-9);
  assert.equal(result.singularity, false);
  assert.equal(result.localFoldProbability, 0);
  assert.equal(result.orientation, 'reversing');
  assert.equal(result.volumeScale, 2);
});

test('physical fold probability remains unavailable without calibration', () => {
  const result = calculateSheetConvergence(CERTIFIED_PREIMAGES[0]);
  assert.equal(result.physicalFoldProbability, null);
  assert.equal(result.physicalStatus, 'UNAVAILABLE_UNTIL_CALIBRATED');
  assert.equal(result.register, 'MATHEMATICAL_DERIVATION');
  close(result.targetResidual, 0);
  close(result.nearestPreimageDistance, 0);
  close(result.convergenceScore, 1);
});
