import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { premaqToTemporalState } from '../src/arcsweep-temporal-quantum/engine.js';
import { PREMAQC_AXES, PREMAQC_DYNAMIC_AXES } from '../src/premaqc-contract.js';
import {
  PREMAQC_SHOKZ_AXIS_CYCLES,
  PREMAQC_SHOKZ_CYCLES_PER_AXIS,
  PREMAQC_SHOKZ_MAX_HZ,
  PREMAQC_SHOKZ_MIN_HZ,
  PREMAQC_SHOKZ_TONE_EVENTS,
  axisForInteractionToken,
  buildPremaqcShokzSoundfontPlan,
} from '../src/premaqc-shokz-soundfont.js';

const FIXED_TIME = new Date('2026-08-04T03:05:00.000Z');

function makeState() {
  const values = { P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0 };
  return premaqToTemporalState({
    schema_version: '2.0.0',
    id: 'premaqc-shokz-test',
    observed_at: FIXED_TIME.toISOString(),
    registry_version: 'premaqc-registry/2.0',
    state: Object.fromEntries(PREMAQC_AXES.map((axis) => [axis, {
      value: values[axis],
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    qualia: {
      schema: 'premaqc.qualia-report/v1',
      present: false,
      authority: 'firsthand-only',
      inferred: false,
      report_receipt_id: null,
      observed_at: null,
      report: null,
      legacy_scalar: null,
    },
    receipt_id: 'premaqc-shokz-test-receipt',
    sequence: 1,
    prior_state_ref: null,
    model_version: 'premaqc-shokz-test/1',
    provenance_refs: [],
    generated_at: FIXED_TIME.toISOString(),
    degraded: false,
  }, {
    clock: () => new Date(FIXED_TIME),
    idFactory: () => 'premaqc-shokz-source',
  });
}

test('PREMAQC Shokz soundfont chains 35 cycles for every dynamic voice and never sonifies Q', () => {
  const source = makeState();
  const plan = buildPremaqcShokzSoundfontPlan({ state: source, rootHz: 220, bpm: 84 });

  assert.equal(PREMAQC_SHOKZ_CYCLES_PER_AXIS, 35);
  assert.equal(PREMAQC_SHOKZ_AXIS_CYCLES, 210);
  assert.equal(PREMAQC_SHOKZ_TONE_EVENTS, 420);
  assert.equal(plan.schema, 'bifrost.premaqc-shokz-soundfont-plan/v1');
  assert.equal(plan.vocabulary, 'PREMAQC');
  assert.equal(plan.cycles.length, 35);
  assert.equal(plan.axis_cycle_count, 210);
  assert.equal(plan.scheduled_tone_events, 420);
  assert.deepEqual(plan.playback_band_hz, [90, 360]);
  assert.equal(plan.source_state_id, source.state_id);
  assert.equal(plan.next_operation, 'compression-of-release');
  assert.deepEqual(plan.axes, PREMAQC_DYNAMIC_AXES);
  assert.deepEqual(plan.context_only_axes, ['Q']);
  assert.equal(plan.qualia_sonified, false);
  assert.equal(plan.authority.qualia_is_firsthand_only, true);
  assert.equal(plan.authority.qualia_magnitude_inference_allowed, false);

  for (const axis of PREMAQC_DYNAMIC_AXES) assert.equal(plan.voice_cycle_counts[axis], 35);
  assert.equal(Object.hasOwn(plan.voice_cycle_counts, 'Q'), false);

  for (const [index, cycle] of plan.cycles.entries()) {
    assert.equal(cycle.voices.length, PREMAQC_DYNAMIC_AXES.length);
    assert.deepEqual(cycle.voices.map((voice) => voice.axis), PREMAQC_DYNAMIC_AXES);
    assert.equal(cycle.voices.some((voice) => voice.axis === 'Q'), false);
    if (index === 0) assert.equal(cycle.from_state_id, source.state_id);
    else assert.equal(cycle.from_state_id, plan.cycles[index - 1].to_state_id);
    for (const voice of cycle.voices) {
      assert.ok(voice.compression_playback_hz >= PREMAQC_SHOKZ_MIN_HZ);
      assert.ok(voice.compression_playback_hz <= PREMAQC_SHOKZ_MAX_HZ);
      assert.ok(voice.release_playback_hz >= PREMAQC_SHOKZ_MIN_HZ);
      assert.ok(voice.release_playback_hz <= PREMAQC_SHOKZ_MAX_HZ);
    }
  }
});

test('keyboard and menu tokens map deterministically across dynamic PREMAQC voices only', () => {
  for (const axis of PREMAQC_DYNAMIC_AXES) assert.equal(axisForInteractionToken(axis), axis);
  assert.equal(axisForInteractionToken('Enter'), axisForInteractionToken('Enter'));
  assert.ok(PREMAQC_DYNAMIC_AXES.includes(axisForInteractionToken('ArrowRight')));
  assert.ok(PREMAQC_DYNAMIC_AXES.includes(axisForInteractionToken('Q')));
  assert.notEqual(axisForInteractionToken('Q'), 'Q');
});

test('web Arcsweep and Bifröst both load the canonical iPad-safe PREMAQC Shokz soundfont', async () => {
  const [arcsweep, bifrost, canonicalSource, legacyImplementation] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../bifrost/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/premaqc-shokz-soundfont.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/premaq-shokz-soundfont.js', import.meta.url), 'utf8'),
  ]);

  for (const html of [arcsweep, bifrost]) {
    assert.match(html, /apple-mobile-web-app-capable/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /premaqc-shokz-soundfont\.js/);
  }
  assert.match(canonicalSource, /bifrost\.premaqc-shokz-soundfont-plan\/v1|PREMAQC_SHOKZ_PLAN_SCHEMA/);
  assert.match(canonicalSource, /legacy_schema/);
  assert.match(legacyImplementation, /\[role="menuitem"\]/);
  assert.match(legacyImplementation, /document\.addEventListener\('keydown'/);
  assert.match(legacyImplementation, /document\.addEventListener\('pointerdown'/);
  assert.match(legacyImplementation, /PREMAQ_SHOKZ_MASTER_GAIN_CEILING = 0\.018/);
  assert.doesNotMatch(legacyImplementation, /navigator\.vibrate/);
});
