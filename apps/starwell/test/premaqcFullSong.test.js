import test from 'node:test';
import assert from 'node:assert/strict';

import { PREMAQ_AXES, premaqToTemporalState } from '../src/arcsweep-temporal-quantum/engine.js';
import { PREMAQC_AXIS_NAMES, PREMAQC_FULL_SONG_PLAN_SCHEMA } from '../src/premaqc-contract.js';
import { buildPremaqcSongPlan } from '../bifrost/premaqc-song.js';

const FIXED_TIME = new Date('2026-11-17T16:05:00.000Z');

function makeState() {
  const values = { P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 };
  return premaqToTemporalState({
    schema_version: '2.0.0',
    id: 'premaqc-song-test',
    observed_at: FIXED_TIME.toISOString(),
    registry_version: 'premaqc-registry/1.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: values[axis],
      derivative: 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    receipt_id: 'premaqc-song-test-receipt',
    sequence: 1,
    prior_state_ref: null,
    model_version: 'premaqc-song-test/1',
    provenance_refs: [],
    generated_at: FIXED_TIME.toISOString(),
    degraded: false,
  }, {
    clock: () => new Date(FIXED_TIME),
    idFactory: () => 'premaqc-song-source',
  });
}

test('canonical PREMAQC song exposes Entanglement rather than legacy Entropy', () => {
  const plan = buildPremaqcSongPlan({
    state: makeState(),
    rootHz: 220,
    bpm: 84,
    focus: 'R',
  });

  assert.equal(plan.schema, PREMAQC_FULL_SONG_PLAN_SCHEMA);
  assert.equal(plan.vocabulary, 'PREMAQC');
  assert.equal(plan.axis_names.E, 'Entanglement');
  assert.equal(PREMAQC_AXIS_NAMES.E, 'Entanglement');
  assert.deepEqual(plan.context_only_axes, ['Q']);
  assert.equal(plan.qualia_sonified, false);

  for (const cycle of plan.cycles) {
    const eVoice = cycle.voices.find((voice) => voice.axis === 'E');
    assert.equal(eVoice.axis_name, 'Entanglement');
    assert.notEqual(eVoice.axis_name, 'Entropy');
  }
});
