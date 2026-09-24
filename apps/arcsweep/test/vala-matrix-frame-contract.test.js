import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildValaMatrixInsert,
  normalizeStoredValaMatrixRow,
  VALA_MATRIX_COLUMN_CONTRACT,
  VALA_MATRIX_FRAME_CONTRACT_SCHEMA,
} from '../src/vala-matrix-frame-contract.js';

test('matrix insert envelope preserves provenance and projection fields', () => {
  const frame = buildValaMatrixInsert({
    step: 7,
    observedAt: '2026-09-20T07:30:00.000Z',
    projectedCoordinates: [0.9, 0.95, 1],
    sourceReceipt: { schema: 'test.receipt/v1', value: 1 },
    checkpointDigest: 'abc123',
    provenance: 'SYNTHETIC_LABELED_TEST',
    persistence: 'local-simulation',
    valaWritten: false,
    realtimeObserved: false,
  });

  assert.equal(frame.step, 7);
  assert.deepEqual(frame.projected_coordinates, [0.9, 0.95, 1]);
  assert.equal(frame.raw_coordinates.schema, VALA_MATRIX_FRAME_CONTRACT_SCHEMA);
  assert.equal(frame.raw_coordinates.provenance, 'SYNTHETIC_LABELED_TEST');
  assert.equal(frame.raw_coordinates.persistence, 'local-simulation');
  assert.equal(frame.raw_coordinates.vala_written, false);
  assert.equal(frame.raw_coordinates.realtime_observed, false);
  assert.equal(frame.raw_coordinates.checkpoint_digest, 'abc123');
});

test('stored row normalizer preserves database-generated fields', () => {
  const row = normalizeStoredValaMatrixRow({
    id: 42,
    step: 7,
    timestamp: 1790000000,
    created_at: '2026-09-20T07:30:01.000Z',
    raw_coordinates: { a: 1 },
    projected_coordinates: [1, 2, 3],
  });

  assert.equal(row.id, 42);
  assert.equal(row.step, 7);
  assert.deepEqual(row.projected_coordinates, [1, 2, 3]);
});

test('matrix contract documents all physical table columns', () => {
  assert.deepEqual(Object.keys(VALA_MATRIX_COLUMN_CONTRACT), [
    'id', 'step', 'raw_coordinates', 'projected_coordinates', 'timestamp', 'created_at',
  ]);
});

test('invalid projection or step is rejected before persistence', () => {
  assert.throws(() => buildValaMatrixInsert({
    step: -1,
    observedAt: '2026-09-20T07:30:00.000Z',
    projectedCoordinates: [1, 2, 3],
    sourceReceipt: {},
  }), /step/);

  assert.throws(() => buildValaMatrixInsert({
    step: 1,
    observedAt: '2026-09-20T07:30:00.000Z',
    projectedCoordinates: [1, Number.NaN, 3],
    sourceReceipt: {},
  }), /finite numbers/);
});
