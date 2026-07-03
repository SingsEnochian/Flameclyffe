import assert from 'node:assert/strict';
import test from 'node:test';

import { angularDistance, calculateBarbaultIndex } from '../src/scfe/barbault.js';
import { detectAspects, detectConfigurations } from '../src/scfe/aspects.js';
import { createFieldSnapshot, DEFAULT_SCFE_INPUT } from '../src/scfe/orchestrator.js';

const july2026Longitudes = {
  jupiter: 126,
  saturn: 14,
  uranus: 62,
  neptune: 4,
  pluto: 307,
};

test('angularDistance always returns the shortest zodiac arc', () => {
  assert.equal(angularDistance(350, 10), 20);
  assert.equal(angularDistance(10, 350), 20);
  assert.equal(angularDistance(126, 307), 179);
});

test('calculateBarbaultIndex sums all ten slow-planet distances', () => {
  const result = calculateBarbaultIndex(july2026Longitudes);

  assert.equal(result.cyclic_index, 832);
  assert.equal(result.compression_level, 'wide_distribution');
  assert.equal(Object.keys(result.pairwise_distances).length, 10);
  assert.equal(result.pairwise_distances.jupiter_pluto, 179);
});

test('detectAspects flags the July 2026 basket/cradle candidate ingredients', () => {
  const aspects = detectAspects(july2026Longitudes);
  const configurations = detectConfigurations(aspects, july2026Longitudes);

  assert.ok(aspects.some((aspect) => aspect.aspect_type === 'opposition'));
  assert.ok(aspects.filter((aspect) => ['trine', 'sextile'].includes(aspect.aspect_type)).length >= 3);
  assert.ok(configurations.some((configuration) => configuration.configuration_type === 'basket_cradle_candidate'));
});

test('createFieldSnapshot returns a read-only unified field packet', () => {
  const snapshot = createFieldSnapshot(DEFAULT_SCFE_INPUT);

  assert.equal(snapshot.schema_version, 'scfe.field_snapshot.v0.1');
  assert.equal(snapshot.barbault.cyclic_index, 832);
  assert.equal(snapshot.sacred_geometry.primary_form, 'cradle_vessel');
  assert.equal(snapshot.deep.field_label, 'threshold_vessel');
  assert.equal(snapshot.terra_aeterna.canon_candidate, false);
  assert.equal(snapshot.evidence_labels.frequency, 'evidence_informed_not_medical');
});

test('somatic safety suppresses sound recommendations', () => {
  const snapshot = createFieldSnapshot({
    ...DEFAULT_SCFE_INPUT,
    somatic: {
      ...DEFAULT_SCFE_INPUT.somatic,
      migraine: true,
    },
  });

  assert.equal(snapshot.somatic.interface_safety_mode, 'low_light_silent');
  assert.equal(snapshot.frequency_protocol, null);
});
