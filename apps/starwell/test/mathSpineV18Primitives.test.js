import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  HEARTHGATE_MATH_V18_DONOR_BLOB,
  HEARTHGATE_MATH_V18_SCHEMA,
  createV18MeasurementReceipt,
  galdrAlignment,
  ir2Coupling,
  observationCoherence,
  relationalParticipation,
  temporal369,
  trajectoryPoint,
} from '../src/math-spine/v18-primitives.js';

const approximately = (actual, expected, epsilon = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} ≈ ${expected}`);
};

test('canonical v1.8 config preserves PREMAQ wire order and temporal clocks', async () => {
  const raw = await readFile(new URL('../../../config/hearthgate-math-v1.8.json', import.meta.url), 'utf8');
  const config = JSON.parse(raw);
  assert.equal(config.schema, HEARTHGATE_MATH_V18_SCHEMA);
  assert.deepEqual(config.premaq_wire_order, ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.deepEqual(config.temporal_clocks, [3, 6, 9]);
});

test('v1.8 relational participation isolates the US block', () => {
  const value = relationalParticipation([3, 4], [{ id: 'US', start: 0, end: 1 }]);
  approximately(value, 9 / 25);
});

test('v1.8 witness coherence and Galdr alignment are bounded and deterministic', () => {
  assert.equal(observationCoherence([[1, 2], [1, 2]]), 1);
  assert.ok(observationCoherence([[1, 0], [0, 1]]) < 1);
  approximately(galdrAlignment([1, 2, 3], [1, 2, 3]), 1);
  assert.equal(galdrAlignment([1], [1, 2]), null);
});

test('IR2 coupling composes bounded measurement factors', () => {
  approximately(ir2Coupling({
    galdrAlignment: 0.5,
    usParticipation: 0.4,
    observationCoherence: 0.75,
    realisation: 0.8,
  }), 0.12);
});

test('3/6/9 phase tracker has a stable zero origin', () => {
  assert.deepEqual(temporal369(0), {
    phase3: 0,
    phase6: 0,
    phase9: 0,
    delta36: 0,
    delta69: 0,
    delta39: 0,
  });
});

test('trajectory and measurement receipts retain lineage and donor provenance', () => {
  const point = trajectoryPoint({
    timestamp: 42,
    address: { omega: 'test', stratum: 'sound' },
    lineage: 'lineage-1',
  });
  assert.equal(point.math_spine, HEARTHGATE_MATH_V18_SCHEMA);
  assert.equal(point.address.stratum, 'sound');
  assert.equal(point.lineage, 'lineage-1');

  const receipt = createV18MeasurementReceipt({
    sourceReceipt: 'source-1',
    vMin: [1, 1],
    blocks: [{ id: 'US', start: 0, end: 1 }],
    witnesses: [[1, 1], [1, 1]],
    galdrVector: [1, 1],
    realisation: 0.5,
    address: { omega: 'test' },
    lineage: 'lineage-1',
    stratum: 'sound',
  });

  assert.equal(receipt.source_receipt, 'source-1');
  assert.equal(receipt.lineage, 'lineage-1');
  assert.equal(receipt.state_address.stratum, 'sound');
  assert.equal(receipt.donor_blob, HEARTHGATE_MATH_V18_DONOR_BLOB);
  assert.equal(receipt.metrics.observation_coherence, 1);
  approximately(receipt.metrics.ir2_coupling, 0.25);
});
