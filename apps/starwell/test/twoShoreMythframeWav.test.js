import test from 'node:test';
import assert from 'node:assert/strict';

import { calibrateEarthPrimePremaq } from '../src/two-shore-premaq-gate.js';
import {
  assertCompleteMythframeWavSequence,
  buildCompleteMythframeElevenYearSequence,
  renderCompleteMythframeElevenYearWav,
} from '../src/two-shore-mythframe-wav.js';
import {
  MYTHFRAME_AXES,
  TWO_SHORE_MYTHFRAME_HORIZON_SCHEMA,
} from '../src/two-shore-mythframe.js';

const FIXED_TIME = new Date('2026-08-04T05:30:00.000Z');

function ids() {
  let value = 0;
  return () => `mythframe-${String(value += 1).padStart(8, '0')}`;
}

const DEEP = Object.freeze({
  P: 0.61,
  C: 0.57,
  R: 0.52,
  E: 0.34,
  M: 0.43,
  A: 0.71,
  charge: 0.29,
});

const GROUNDWIRE = Object.freeze({
  hardware: Object.freeze({
    status: 'observed',
    userAgent: 'Mozilla/5.0 (iPad) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
    platform: 'iPad',
    language: 'en-US',
    timezone: 'America/New_York',
    hardwareConcurrency: 8,
    deviceMemoryGb: 8,
    maxTouchPoints: 10,
    screen: '2048 × 2732, 24 bit',
  }),
  network: Object.freeze({ status: 'observed', downlinkMbps: 20, rttMs: 45 }),
  microphone: Object.freeze({ status: 'active', rms: 0.012, peak: 0.08 }),
  location: Object.freeze({ status: 'verified', accuracyM: 24, altitudeM: null }),
  battery: Object.freeze({ status: 'observed', charging: false, levelPercent: 78 }),
});

function buildSequence() {
  const earthCalibration = calibrateEarthPrimePremaq({
    deepPacket: DEEP,
    groundwireSnapshot: GROUNDWIRE,
  });
  return buildCompleteMythframeElevenYearSequence({
    earthCalibration,
    targetProfile: 'terra-aeterna',
    clock: () => FIXED_TIME,
    idFactory: ids(),
    timing: {
      soloSeconds: 0.001,
      baseCycleSeconds: 0.0001,
      extensionCycleSeconds: 0.0001,
      yearGapSeconds: 0.001,
    },
  });
}

test('all eleven years bind math to Mythframe before every tone event', () => {
  const sequence = buildSequence();
  assert.equal(assertCompleteMythframeWavSequence(sequence), true);
  assert.equal(sequence.mythframe.schema, TWO_SHORE_MYTHFRAME_HORIZON_SCHEMA);
  assert.equal(sequence.mythframe.chapter_count, 11);
  assert.equal(sequence.mythframe.axis_frame_count, 11 * 2 * 7);
  assert.equal(sequence.mythframe.chapters[0].year, 2025);
  assert.equal(sequence.mythframe.chapters.at(-1).year, 2035);
  assert.equal(sequence.generation_law, 'math-state → mythframe → tone-event');
  assert.equal(sequence.audio_plan.cues.length, 11);
  assert.equal(sequence.audio_plan.mythframe_event_count, sequence.audio_plan.events.length);

  for (const [yearIndex, chapter] of sequence.mythframe.chapters.entries()) {
    assert.equal(chapter.domain_truth, true);
    assert.equal(chapter.complete, true);
    assert.deepEqual(Object.keys(chapter.earth_prime.axes), MYTHFRAME_AXES);
    assert.deepEqual(Object.keys(chapter.target_world.axes), MYTHFRAME_AXES);
    for (const shore of [chapter.earth_prime, chapter.target_world]) {
      for (const axis of MYTHFRAME_AXES) {
        const frame = shore.axes[axis];
        assert.ok(frame.frame_id);
        assert.ok(frame.compression_line);
        assert.ok(frame.release_line);
        assert.ok(frame.geometry_fingerprint);
        assert.ok(frame.tone.locked_hz >= 90 && frame.tone.locked_hz <= 360);
        assert.equal(frame.next_operation, 'compression-of-release');
      }
    }
    if (yearIndex > 0) {
      const prior = sequence.mythframe.chapters[yearIndex - 1];
      assert.equal(chapter.source_earth_state_id, prior.final_earth_state_id);
      assert.equal(chapter.source_target_state_id, prior.final_target_state_id);
    }
  }

  for (const event of sequence.audio_plan.events) {
    assert.equal(event.tone_generated_from_mythframe, true);
    assert.ok(event.mythframe_frame_id);
    assert.ok(event.mythframe_compression_line);
    assert.ok(event.mythframe_release_line);
  }
});

test('the eleven-year WAV refuses unframed tone plans and renders the complete framed sequence', () => {
  const sequence = buildSequence();
  const wav = renderCompleteMythframeElevenYearWav(sequence, { sampleRate: 8000 });
  assert.equal(wav.complete, true);
  assert.equal(wav.mythframe_chapter_count, 11);
  assert.equal(wav.mythframe_axis_frame_count, 154);
  assert.equal(wav.mythframe_tone_event_count, sequence.audio_plan.events.length);
  assert.equal(new TextDecoder().decode(wav.bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(wav.bytes.slice(8, 12)), 'WAVE');

  const broken = {
    ...sequence,
    audio_plan: {
      ...sequence.audio_plan,
      events: [{ ...sequence.audio_plan.events[0], mythframe_frame_id: null }],
    },
  };
  assert.throws(
    () => renderCompleteMythframeElevenYearWav(broken, { sampleRate: 8000 }),
    /MYTHFRAME_WAV_EVENT_UNBOUND/,
  );
});
