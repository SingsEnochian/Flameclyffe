import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HIDDEN_RUNTIME_MODELS,
  HIDDEN_RUNTIME_PACKET_SCHEMA,
  compareHypotheses,
  createHiddenRuntimePacket,
  createResidualRecord,
  normaliseEvidence,
  scoreHypothesis,
} from '../src/hidden-runtime-hypothesis.js';

test('Hidden Runtime keeps competing model families visible', () => {
  assert.deepEqual(
    HIDDEN_RUNTIME_MODELS.map((model) => model.family),
    ['particle', 'field', 'hidden-sector', 'gravity', 'emergent', 'computational'],
  );
  for (const model of HIDDEN_RUNTIME_MODELS) {
    assert.ok(model.predicted_signatures.length > 0);
    assert.ok(model.falsifiers.length > 0);
  }
});

test('quality-weighted evidence ranks support above contradiction', () => {
  const evidence = [
    normaliseEvidence({ model_id: 'hidden-sector', direction: 'supports', quality: 0.9, note: 'repeatable transition energy' }),
    normaliseEvidence({ model_id: 'hidden-sector', direction: 'supports', quality: 0.6, note: 'second target compatible' }),
    normaliseEvidence({ model_id: 'particle-dark-matter', direction: 'contradicts', quality: 0.8, note: 'vanilla recoil spectrum absent' }),
  ];

  const ranking = compareHypotheses(evidence);
  assert.equal(ranking[0].model.id, 'hidden-sector');
  assert.ok(scoreHypothesis('hidden-sector', evidence).score > 0.9);
  assert.ok(scoreHypothesis('particle-dark-matter', evidence).score < 0);
});

test('residual records preserve observed minus predicted and uncertainty', () => {
  const residual = createResidualRecord({
    label: 'candidate recoil',
    observed: 248,
    predicted: 240,
    uncertainty: 4,
    unit: 'keV',
    context: 'held-out example',
  });

  assert.equal(residual.residual, 8);
  assert.equal(residual.standardised_residual, 2);
  assert.equal(residual.unit, 'keV');
});

test('export packet carries evidence, residuals, rankings, predictions, and falsifiers', () => {
  const evidence = [normaliseEvidence({ model_id: 'computational-substrate', direction: 'neutral', quality: 0.7, note: 'preregistered test pending' })];
  const residuals = [createResidualRecord({ observed: 10, predicted: 8, uncertainty: 1, label: 'example' })];
  const packet = createHiddenRuntimePacket({ evidence, residuals, note: 'test packet' });

  assert.equal(packet.schema, HIDDEN_RUNTIME_PACKET_SCHEMA);
  assert.equal(packet.evidence.length, 1);
  assert.equal(packet.residuals.length, 1);
  assert.equal(packet.rankings.length, HIDDEN_RUNTIME_MODELS.length);
  assert.equal(packet.models.length, HIDDEN_RUNTIME_MODELS.length);
  assert.ok(packet.models.every((model) => model.predicted_signatures.length && model.falsifiers.length));
});
