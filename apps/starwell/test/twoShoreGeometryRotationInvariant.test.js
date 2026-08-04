import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCompleteTwoShoreGeometry,
  generateTwoShoreGeometricForms,
} from '../src/two-shore-geometric-forms.js';

const PREMAQ = Object.freeze({
  P: 0.61,
  C: 0.57,
  R: 0.52,
  E: 0.34,
  M: 0.43,
  A: 0.71,
  Q: 0.66,
});

test('hypercube adjacency remains exact after PREMAQ and Elara rotations', () => {
  for (const year of [2025, 2028, 2031, 2035]) {
    const receipt = generateTwoShoreGeometricForms({
      shoreId: `rotation-invariant-${year}`,
      year,
      premaq: PREMAQ,
      sourceStateId: `state-${year}`,
      elaraMultiplier: 1.15 ** (year - 2025),
      clock: () => new Date('2026-08-04T05:50:00.000Z'),
    });

    assert.equal(assertCompleteTwoShoreGeometry(receipt), true);
    assert.equal(receipt.forms.dodecahedron.edge_count, 30);
    assert.equal(receipt.forms.tesseract.edge_count, 32);
    assert.equal(receipt.forms.penteract.edge_count, 80);
    assert.equal(receipt.forms.tesseract.claims.edge_count, 'VERIFIED');
    assert.equal(receipt.forms.penteract.claims.edge_count, 'VERIFIED');
  }
});
