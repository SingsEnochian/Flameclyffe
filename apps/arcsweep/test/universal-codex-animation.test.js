import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  ancestryEventToCodexPulse,
  glyphSampleToInkSpark,
  glyphSampleToPagePoint,
  migrateCodexAnimationState,
  normaliseCodexAnimationState,
  patchCodexAnimationState,
  receiptToCodexPulse,
} from '../src/universal-codex-animation-model.js';

test('fresh and malformed state use quiet Book defaults without opt-out motion', () => {
  for (const value of [undefined, {}, null, 'invalid']) {
    const state = normaliseCodexAnimationState(value);
    assert.equal(state.intensity, .28);
    assert.equal(state.orbit, false);
    assert.equal(state.scanlines, false);
    assert.equal(state.holograms, true);
    assert.equal(state.inkAura, true);
  }
});

test('saved preferences remain readable without defining projection bounds', () => {
  const state = normaliseCodexAnimationState({ schema: 'arcsweep.universal-codex-animation/v0.2', orbit: true, scanlines: true, intensity: .72 });
  assert.equal(state.schema, UNIVERSAL_CODEX_ANIMATION_SCHEMA);
  assert.equal(state.orbit, true);
  assert.equal(state.scanlines, true);
  assert.equal(state.intensity, .72);
});

test('old automatically persisted defaults migrate while visibility opt-outs survive', () => {
  for (const schema of [undefined, 'arcsweep.universal-codex-animation/v0.1', 'arcsweep.universal-codex-animation/v0.2']) {
    const state = migrateCodexAnimationState({ schema, holograms: false, inkAura: false, orbit: true, scanlines: true, intensity: .72 });
    assert.equal(state.schema, UNIVERSAL_CODEX_ANIMATION_SCHEMA);
    assert.equal(state.orbit, false);
    assert.equal(state.scanlines, false);
    assert.equal(state.intensity, .28);
    assert.equal(state.holograms, false);
    assert.equal(state.inkAura, false);
  }
  const current = normaliseCodexAnimationState({ orbit: true, intensity: .44 });
  assert.deepEqual(migrateCodexAnimationState(current), current);
});

test('brush points stay in normalized coordinates of their own leaf', () => {
  for (const [sample, expected] of [
    [{ x: 0, y: 0 }, [0, 0]],
    [{ x: 1024, y: 1024 }, [1, 1]],
    [{ x: 512, y: 512 }, [.5, .5]],
    [{ x: -100, y: 4000 }, [0, 1]],
    [{ x: NaN, y: Infinity }, [.5, .5]],
  ]) {
    const point = glyphSampleToPagePoint(sample);
    assert.deepEqual([point.x, point.y], expected);
  }
  const resized = glyphSampleToPagePoint({ x: 100, y: 150 }, 200);
  assert.deepEqual([resized.x, resized.y], [.5, .75]);
});

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
