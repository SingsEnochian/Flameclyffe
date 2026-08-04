import test from 'node:test';
import assert from 'node:assert/strict';

import { PREMAQ_AXES, premaqToTemporalState } from '../src/arcsweep-temporal-quantum/engine.js';
import {
  PREMAQ_SONG_AXIS_CYCLES,
  PREMAQ_SONG_CYCLES_PER_AXIS,
  PREMAQ_SONG_NOTE_COUNT,
  buildPremaqSongPlan,
} from '../bifrost/premaq-song.js';

const FIXED_TIME = new Date('2026-08-04T02:52:00.000Z');

function makeState() {
  const values = { P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 };
  return premaqToTemporalState({
    schema_version: '2.0.0',
    id: 'premaq-song-test',
    observed_at: FIXED_TIME.toISOString(),
    registry_version: 'premaq-registry/2.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: values[axis],
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    receipt_id: 'premaq-song-test-receipt',
    sequence: 1,
    prior_state_ref: null,
    model_version: 'premaq-song-test/1',
    provenance_refs: [],
    generated_at: FIXED_TIME.toISOString(),
    degraded: false,
  }, {
    clock: () => new Date(FIXED_TIME),
    idFactory: () => 'song-test-source',
  });
}

test('full PREMAQ song gives every axis exactly 35 chained cycles', () => {
  const source = makeState();
  const plan = buildPremaqSongPlan({
    state: source,
    rootHz: 220,
    bpm: 84,
    focus: 'Q',
    compressionStrength: 0.65,
    compressionGain: 1.2,
    releaseFraction: 0.35,
  });

  assert.equal(PREMAQ_SONG_CYCLES_PER_AXIS, 35);
  assert.equal(PREMAQ_SONG_AXIS_CYCLES, 245);
  assert.equal(PREMAQ_SONG_NOTE_COUNT, 490);
  assert.equal(plan.cycles.length, 35);
  assert.equal(plan.axis_cycle_count, 245);
  assert.equal(plan.scheduled_note_count, 490);
  assert.equal(plan.source_state_id, source.state_id);
  assert.equal(plan.next_operation, 'compression-of-release');

  for (const axis of PREMAQ_AXES) {
    assert.equal(plan.voice_cycle_counts[axis], 35);
  }

  for (const [index, cycle] of plan.cycles.entries()) {
    assert.equal(cycle.cycle, index + 1);
    assert.equal(cycle.voices.length, PREMAQ_AXES.length);
    assert.deepEqual(cycle.voices.map((voice) => voice.axis), PREMAQ_AXES);
    assert.ok(cycle.voices.every((voice) => Number.isFinite(voice.compression_playback_hz)));
    assert.ok(cycle.voices.every((voice) => Number.isFinite(voice.release_playback_hz)));
    if (index === 0) {
      assert.equal(cycle.from_state_id, source.state_id);
    } else {
      assert.equal(cycle.from_state_id, plan.cycles[index - 1].to_state_id);
    }
  }

  assert.equal(plan.final_released_state_id, plan.cycles.at(-1).to_state_id);
});
