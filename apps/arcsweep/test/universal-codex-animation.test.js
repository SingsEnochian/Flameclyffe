import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  ancestryEventToCodexPulse,
  glyphSampleToInkSpark,
  normaliseCodexAnimationState,
  normalisePageSide,
  patchCodexAnimationState,
  receiptToCodexPulse,
} from '../src/universal-codex-animation-model.js';

test('animation state defaults to quiet physical page effects', () => {
  const state = normaliseCodexAnimationState(DEFAULT_CODEX_ANIMATION_STATE);
  assert.equal(state.schema, UNIVERSAL_CODEX_ANIMATION_SCHEMA);
  assert.equal(state.pageLight, true);
  assert.equal(state.latentInk, true);
  assert.equal(state.depthMotion, true);
  assert.equal(state.holograms, false);
  assert.equal(state.orbit, false);
  assert.equal(state.scanlines, false);
  assert.equal(state.intensity, 0.22);
});

test('legacy loud default migrates once without clobbering later user intensity choices', () => {
  const v02 = normaliseCodexAnimationState({
    schema: 'arcsweep.universal-codex-animation/v0.2',
    intensity: 0.72,
    inkAura: false,
  });
  assert.equal(v02.schema, UNIVERSAL_CODEX_ANIMATION_SCHEMA);
  assert.equal(v02.intensity, 0.22);
  assert.equal(v02.inkAura, false);

  const v03 = normaliseCodexAnimationState({
    schema: 'arcsweep.universal-codex-animation/v0.3',
    intensity: 0.72,
    pageLight: false,
  });
  assert.equal(v03.intensity, 0.22);
  assert.equal(v03.pageLight, false);

  const deliberateLegacyEraChoice = normaliseCodexAnimationState({
    schema: 'arcsweep.universal-codex-animation/v0.3',
    intensity: 0.44,
  });
  assert.equal(deliberateLegacyEraChoice.intensity, 0.44);

  const current = normaliseCodexAnimationState({
    schema: UNIVERSAL_CODEX_ANIMATION_SCHEMA,
    intensity: 0.72,
  });
  assert.equal(current.intensity, 0.72);
});

test('animation state clamps intensity and preserves page controls', () => {
  const state = normaliseCodexAnimationState({ pageLight: false, intensity: 4 });
  assert.equal(state.pageLight, false);
  assert.equal(state.inkAura, true);
  assert.equal(state.intensity, 1);

  const next = patchCodexAnimationState(state, { latentInk: false, intensity: 0.44 });
  assert.equal(next.pageLight, false);
  assert.equal(next.latentInk, false);
  assert.equal(next.inkAura, true);
  assert.equal(next.intensity, 0.44);
});

test('glyph samples map page coordinates into shallow page-local space', () => {
  const spark = glyphSampleToInkSpark({
    x: 1024,
    y: 0,
    pressure: 0.75,
    velocity_px_s: 900,
    page_side: 'left',
  }, 1024);
  assert.ok(spark.x > 1.9);
  assert.ok(spark.y > 2.3);
  assert.ok(spark.z > 0.1 && spark.z < 0.3);
  assert.ok(spark.energy > 0.5);
  assert.equal(spark.pageSide, 'left');
});

test('page side normalisation allows only left, right, or both', () => {
  assert.equal(normalisePageSide('LEFT'), 'left');
  assert.equal(normalisePageSide('both'), 'both');
  assert.equal(normalisePageSide('elsewhere', 'right'), 'right');
});

test('receipt pulses keep effect family and page routing local', () => {
  const stroke = receiptToCodexPulse({ kind: 'glyph-stroke', page_id: 'glyph-forge', page_side: 'left' });
  assert.equal(stroke.family, 'ink');
  assert.equal(stroke.pageSide, 'left');

  const page = receiptToCodexPulse({ kind: 'page-turn', page_id: 'right-receipts' });
  assert.equal(page.family, 'page');
  assert.equal(page.pageSide, 'right');

  const threshold = receiptToCodexPulse({ kind: 'room-crossing', page_id: 'threshold' });
  assert.equal(threshold.family, 'threshold');
  assert.equal(threshold.pageSide, 'both');
});

test('ancestry read and NarrativeNode plan receipts have distinct Codex pulse families', () => {
  const read = ancestryEventToCodexPulse({
    schema: 'arcsweep.ancestry-read-event/v0.1',
    ref: 'ancestral:amalthi-transition',
  });
  const plan = ancestryEventToCodexPulse({
    schema: 'arcsweep.ancestry-plan-event/v0.1',
    plan_id: 'narrativenode-ancestry-v0.1',
    page_side: 'left',
  });

  assert.equal(read.family, 'ancestry');
  assert.equal(read.pageId, 'ancestral:amalthi-transition');
  assert.equal(read.pageSide, 'right');
  assert.equal(plan.family, 'projection');
  assert.equal(plan.pageId, 'narrativenode-ancestry-v0.1');
  assert.equal(plan.pageSide, 'left');
  assert.ok(plan.strength > read.strength);
});
