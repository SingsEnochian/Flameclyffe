import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { PREMAQ_AXES, PREMAQ_DYNAMIC_AXES, premaqToTemporalState } from '../src/arcsweep-temporal-quantum/engine.js';
import {
  PREMAQ_SHOKZ_AXIS_CYCLES,
  PREMAQ_SHOKZ_CYCLES_PER_AXIS,
  PREMAQ_SHOKZ_MAX_HZ,
  PREMAQ_SHOKZ_MIN_HZ,
  PREMAQ_SHOKZ_TONE_EVENTS,
  axisForInteractionToken,
  buildPremaqShokzSoundfontPlan,
} from '../src/premaq-shokz-soundfont.js';

const FIXED_TIME = new Date('2026-08-04T03:05:00.000Z');

function makeState() {
  const values = { P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 };
  return premaqToTemporalState({
    schema_version: '2.0.0',
    id: 'premaq-shokz-test',
    observed_at: FIXED_TIME.toISOString(),
    registry_version: 'premaq-registry/2.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: values[axis],
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    receipt_id: 'premaq-shokz-test-receipt',
    sequence: 1,
    prior_state_ref: null,
    model_version: 'premaq-shokz-test/1',
    provenance_refs: [],
    generated_at: FIXED_TIME.toISOString(),
    degraded: false,
  }, {
    clock: () => new Date(FIXED_TIME),
    idFactory: () => 'premaq-shokz-source',
  });
}

test('PREMAQ Shokz sound font chains 35 cycles for every dynamic voice inside the proxy band', () => {
  const source = makeState();
  const plan = buildPremaqShokzSoundfontPlan({ state: source, rootHz: 220, bpm: 84 });

  assert.equal(PREMAQ_SHOKZ_CYCLES_PER_AXIS, 35);
  assert.equal(PREMAQ_SHOKZ_AXIS_CYCLES, 210);
  assert.equal(PREMAQ_SHOKZ_TONE_EVENTS, 420);
  assert.equal(plan.cycles.length, 35);
  assert.equal(plan.axis_cycle_count, 210);
  assert.equal(plan.scheduled_tone_events, 420);
  assert.deepEqual(plan.playback_band_hz, [90, 360]);
  assert.equal(plan.source_state_id, source.state_id);
  assert.equal(plan.next_operation, 'compression-of-release');
  assert.deepEqual(plan.axes, PREMAQ_DYNAMIC_AXES);
  assert.deepEqual(plan.context_only_axes, ['Q']);
  assert.equal(plan.qualia_sonified, false);

  for (const axis of PREMAQ_DYNAMIC_AXES) {
    assert.equal(plan.voice_cycle_counts[axis], 35);
  }
  assert.equal(Object.hasOwn(plan.voice_cycle_counts, 'Q'), false);

  for (const [index, cycle] of plan.cycles.entries()) {
    assert.equal(cycle.voices.length, PREMAQ_DYNAMIC_AXES.length);
    assert.deepEqual(cycle.voices.map((voice) => voice.axis), PREMAQ_DYNAMIC_AXES);
    assert.equal(cycle.voices.some((voice) => voice.axis === 'Q'), false);
    if (index === 0) assert.equal(cycle.from_state_id, source.state_id);
    else assert.equal(cycle.from_state_id, plan.cycles[index - 1].to_state_id);
    for (const voice of cycle.voices) {
      assert.ok(voice.compression_playback_hz >= PREMAQ_SHOKZ_MIN_HZ);
      assert.ok(voice.compression_playback_hz <= PREMAQ_SHOKZ_MAX_HZ);
      assert.ok(voice.release_playback_hz >= PREMAQ_SHOKZ_MIN_HZ);
      assert.ok(voice.release_playback_hz <= PREMAQ_SHOKZ_MAX_HZ);
    }
  }

  assert.equal(plan.final_released_state_id, plan.cycles.at(-1).to_state_id);
});

test('keyboard and menu tokens map deterministically across dynamic PREMAQ voices only', () => {
  for (const axis of PREMAQ_DYNAMIC_AXES) assert.equal(axisForInteractionToken(axis), axis);
  assert.equal(axisForInteractionToken('Enter'), axisForInteractionToken('Enter'));
  assert.equal(axisForInteractionToken('Open Bifröst'), axisForInteractionToken('Open Bifröst'));
  assert.ok(PREMAQ_DYNAMIC_AXES.includes(axisForInteractionToken('ArrowRight')));
  assert.ok(PREMAQ_DYNAMIC_AXES.includes(axisForInteractionToken('Q')));
  assert.notEqual(axisForInteractionToken('Q'), 'Q');
});

test('web Arcsweep and Bifröst both load the iPad-safe shared Shokz sound font', async () => {
  const [arcsweep, bifrost, moduleSource] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../bifrost/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/premaq-shokz-soundfont.js', import.meta.url), 'utf8'),
  ]);

  for (const html of [arcsweep, bifrost]) {
    assert.match(html, /apple-mobile-web-app-capable/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /premaq-shokz-soundfont\.js/);
  }

  assert.match(moduleSource, /\[role="menuitem"\]/);
  assert.match(moduleSource, /document\.addEventListener\('keydown'/);
  assert.match(moduleSource, /document\.addEventListener\('pointerdown'/);
  assert.match(moduleSource, /CONFIRM_SHOKZ_OUTPUT_FIRST/);
  assert.match(moduleSource, /PREMAQ_SHOKZ_MASTER_GAIN_CEILING = 0\.018/);
  assert.match(moduleSource, /Q is never inferred or sonified/);
  assert.doesNotMatch(moduleSource, /navigator\.vibrate/);
});
