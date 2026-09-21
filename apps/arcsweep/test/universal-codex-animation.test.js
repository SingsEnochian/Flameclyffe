import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  ancestryEventToCodexPulse,
  glyphSampleToInkSpark,
  normaliseCodexAnimationState,
  patchCodexAnimationState,
  receiptToCodexPulse,
} from '../src/universal-codex-animation-model.js';

test('animation state normalises toggles and clamps intensity', () => {
  const state = normaliseCodexAnimationState({ holograms: false, intensity: 4 });
  assert.equal(state.schema, UNIVERSAL_CODEX_ANIMATION_SCHEMA);
  assert.equal(state.holograms, false);
  assert.equal(state.inkAura, true);
  assert.equal(state.intensity, 1);
});

test('animation state patch preserves unrelated controls', () => {
  const base = normaliseCodexAnimationState(DEFAULT_CODEX_ANIMATION_STATE);
  const next = patchCodexAnimationState(base, { orbit: false, intensity: 0.44 });
  assert.equal(next.orbit, false);
  assert.equal(next.holograms, true);
  assert.equal(next.inkAura, true);
  assert.equal(next.intensity, 0.44);
});

test('glyph samples map page coordinates into projection space', () => {
  const spark = glyphSampleToInkSpark({ x: 1024, y: 0, pressure: 0.75, velocity_px_s: 900 }, 1024);
  assert.ok(spark.x > 2);
  assert.ok(spark.y > 2);
  assert.ok(spark.z > 0.5);
  assert.ok(spark.energy > 0.5);
});

test('receipt pulses keep effect family local to receipt kind', () => {
  assert.equal(receiptToCodexPulse({ kind: 'glyph-stroke', page_id: 'glyph-forge' }).family, 'ink');
  assert.equal(receiptToCodexPulse({ kind: 'page-turn', page_id: 'receipts' }).family, 'page');
  assert.equal(receiptToCodexPulse({ kind: 'room-crossing', page_id: 'threshold' }).family, 'threshold');
  assert.equal(receiptToCodexPulse({ kind: 'brush-select', page_id: 'glyph-forge' }).family, 'control');
});

test('ancestry read and NarrativeNode plan receipts have distinct Codex pulse families', () => {
  const read = ancestryEventToCodexPulse({
    schema: 'arcsweep.ancestry-read-event/v0.1',
    ref: 'ancestral:amalthi-transition',
  });
  const plan = ancestryEventToCodexPulse({
    schema: 'arcsweep.ancestry-plan-event/v0.1',
    plan_id: 'narrativenode-ancestry-v0.1',
  });

  assert.equal(read.family, 'ancestry');
  assert.equal(read.pageId, 'ancestral:amalthi-transition');
  assert.equal(plan.family, 'projection');
  assert.equal(plan.pageId, 'narrativenode-ancestry-v0.1');
  assert.ok(plan.strength > read.strength);
});
