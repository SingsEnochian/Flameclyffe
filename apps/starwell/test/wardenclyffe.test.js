import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WARDENCLYFFE_SCHEMA,
  WARDENCLYFFE_VERSION,
  OSCILLATOR_GRAMMAR,
  WardenclyffError,
  computeWardenclyffeLayers,
  wardenclyffeSummary,
} from '../src/harmonic-spiral/wardenclyffe.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeState({
  phase = 'release',
  direction = 'ascending',
  confidence = 0.80,
  degraded = false,
} = {}) {
  return Object.freeze({
    schema: 'hearthgate/spiral-state/v1',
    spiral_state_id: 'spiral-abcd1234',
    generated_at: '2026-08-09T12:00:00.000Z',
    phase,
    direction,
    confidence,
    suggested_actions: [],
    subsystem_contexts: {},
    supporting_receipts: { story: [], time: [], theory: [] },
    source_integrity: { references_only: true },
    degraded: { active: degraded, reasons: degraded ? ['low confidence'] : [] },
  });
}

// ── Schema and version ────────────────────────────────────────────────────────

test('WARDENCLYFFE_VERSION is a semver string', () => {
  assert.match(WARDENCLYFFE_VERSION, /^\d+\.\d+\.\d+$/);
});

test('output schema is hearthgate/wardenclyffe-layer/v1', () => {
  const d = computeWardenclyffeLayers(makeState());
  assert.equal(d.schema, WARDENCLYFFE_SCHEMA);
});

test('wardenclyffe_id is prefixed with ward- and echoes spiral_state_id', () => {
  const state = makeState();
  const d = computeWardenclyffeLayers(state);
  assert.equal(d.wardenclyffe_id, `ward-${state.spiral_state_id}`);
});

test('spiral_state_id echoes through', () => {
  const state = makeState();
  const d = computeWardenclyffeLayers(state);
  assert.equal(d.spiral_state_id, state.spiral_state_id);
});

// ── Oscillator grammar ────────────────────────────────────────────────────────

test('OSCILLATOR_GRAMMAR has entries for beats 3, 6, and 9', () => {
  assert.ok(3 in OSCILLATOR_GRAMMAR);
  assert.ok(6 in OSCILLATOR_GRAMMAR);
  assert.ok(9 in OSCILLATOR_GRAMMAR);
});

test('GROUND at beat 3 has role call', () => {
  assert.equal(OSCILLATOR_GRAMMAR[3].name, 'GROUND');
  assert.equal(OSCILLATOR_GRAMMAR[3].role, 'call');
});

test('WEAVE at beat 6 has role response', () => {
  assert.equal(OSCILLATOR_GRAMMAR[6].name, 'WEAVE');
  assert.equal(OSCILLATOR_GRAMMAR[6].role, 'response');
});

test('CROSS at beat 9 has role release', () => {
  assert.equal(OSCILLATOR_GRAMMAR[9].name, 'CROSS');
  assert.equal(OSCILLATOR_GRAMMAR[9].role, 'release');
});

// ── Layers ────────────────────────────────────────────────────────────────────

test('output always has exactly three layers with beats 3, 6, 9', () => {
  const d = computeWardenclyffeLayers(makeState());
  assert.equal(d.layers.length, 3);
  const beats = d.layers.map((l) => l.beat);
  assert.deepEqual(beats.sort((a, b) => a - b), [3, 6, 9]);
});

test('exactly one layer is_primary when not degraded', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: false }));
  const primaries = d.layers.filter((l) => l.is_primary);
  assert.equal(primaries.length, 1);
});

test('compression phase: beat 3 (GROUND) is primary', () => {
  const d = computeWardenclyffeLayers(makeState({ phase: 'compression' }));
  const primary = d.layers.find((l) => l.is_primary);
  assert.equal(primary.beat, 3);
  assert.equal(primary.name, 'GROUND');
  assert.equal(d.primary_oscillator, 'GROUND');
});

test('transition phase: beat 6 (WEAVE) is primary', () => {
  const d = computeWardenclyffeLayers(makeState({ phase: 'transition' }));
  const primary = d.layers.find((l) => l.is_primary);
  assert.equal(primary.beat, 6);
  assert.equal(primary.name, 'WEAVE');
});

test('release phase: beat 9 (CROSS) is primary', () => {
  const d = computeWardenclyffeLayers(makeState({ phase: 'release' }));
  const primary = d.layers.find((l) => l.is_primary);
  assert.equal(primary.beat, 9);
  assert.equal(primary.name, 'CROSS');
});

test('primary layer gain is highest among the three', () => {
  for (const phase of ['compression', 'transition', 'release']) {
    const d = computeWardenclyffeLayers(makeState({ phase }));
    const primary = d.layers.find((l) => l.is_primary);
    const others = d.layers.filter((l) => !l.is_primary);
    for (const other of others) {
      assert.ok(primary.gain >= other.gain, `${phase}: primary gain should be >= other gains`);
    }
  }
});

test('all layer gains are in [0, 1]', () => {
  const d = computeWardenclyffeLayers(makeState());
  for (const layer of d.layers) {
    assert.ok(layer.gain >= 0 && layer.gain <= 1, `gain ${layer.gain} out of range`);
  }
});

// ── Direction → rate modifier ─────────────────────────────────────────────────

test('ascending direction: rate_modifier > 1 (widening)', () => {
  const d = computeWardenclyffeLayers(makeState({ direction: 'ascending' }));
  for (const layer of d.layers) {
    assert.ok(layer.rate_modifier > 1.0, `ascending rate should be > 1, got ${layer.rate_modifier}`);
  }
});

test('gathering direction: rate_modifier < 1 (deepening)', () => {
  const d = computeWardenclyffeLayers(makeState({ direction: 'gathering' }));
  for (const layer of d.layers) {
    assert.ok(layer.rate_modifier < 1.0, `gathering rate should be < 1, got ${layer.rate_modifier}`);
  }
});

test('stable direction: rate_modifier is exactly 1.0', () => {
  const d = computeWardenclyffeLayers(makeState({ direction: 'stable' }));
  for (const layer of d.layers) {
    assert.equal(layer.rate_modifier, 1.0);
  }
});

test('pivoting direction boosts beat-9 gain relative to compression phase', () => {
  const base = computeWardenclyffeLayers(makeState({ phase: 'compression', direction: 'stable' }));
  const pivoting = computeWardenclyffeLayers(makeState({ phase: 'compression', direction: 'pivoting' }));
  const base9 = base.layers.find((l) => l.beat === 9).gain;
  const pivot9 = pivoting.layers.find((l) => l.beat === 9).gain;
  assert.ok(pivot9 > base9, `pivoting beat-9 (${pivot9}) should exceed stable beat-9 (${base9})`);
});

// ── Degraded mode ─────────────────────────────────────────────────────────────

test('degraded mode: primary_oscillator is null', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: true }));
  assert.equal(d.primary_oscillator, null);
});

test('degraded mode: no layer is_primary', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: true }));
  const primaries = d.layers.filter((l) => l.is_primary);
  assert.equal(primaries.length, 0);
});

test('degraded mode: beat-9 (CROSS) gain is 0', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: true }));
  const cross = d.layers.find((l) => l.beat === 9);
  assert.equal(cross.gain, 0);
});

test('degraded mode: rate_modifier is 1.0 regardless of direction', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: true, direction: 'ascending' }));
  for (const layer of d.layers) {
    assert.equal(layer.rate_modifier, 1.0);
  }
});

test('degraded flag echoes through to output', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: true }));
  assert.equal(d.degraded, true);
});

// ── Input validation ──────────────────────────────────────────────────────────

test('null input throws WardenclyffError MISSING_STATE', () => {
  assert.throws(
    () => computeWardenclyffeLayers(null),
    (err) => err instanceof WardenclyffError && err.code === 'MISSING_STATE',
  );
});

test('wrong schema throws WardenclyffError WRONG_SCHEMA', () => {
  assert.throws(
    () => computeWardenclyffeLayers({ schema: 'hearthgate/wrong/v1' }),
    (err) => err instanceof WardenclyffError && err.code === 'WRONG_SCHEMA',
  );
});

// ── wardenclyffeSummary ───────────────────────────────────────────────────────

test('wardenclyffeSummary returns a non-empty string for healthy state', () => {
  const d = computeWardenclyffeLayers(makeState());
  const summary = wardenclyffeSummary(d);
  assert.ok(typeof summary === 'string' && summary.length > 0);
});

test('wardenclyffeSummary includes the primary oscillator name', () => {
  const d = computeWardenclyffeLayers(makeState({ phase: 'release' }));
  const summary = wardenclyffeSummary(d);
  assert.ok(summary.includes('CROSS'), `summary should mention CROSS, got: ${summary}`);
});

test('wardenclyffeSummary degraded mode returns DEGRADED prefix', () => {
  const d = computeWardenclyffeLayers(makeState({ degraded: true }));
  const summary = wardenclyffeSummary(d);
  assert.ok(summary.startsWith('DEGRADED'));
});

test('wardenclyffeSummary ascending direction mentions widening', () => {
  const d = computeWardenclyffeLayers(makeState({ direction: 'ascending' }));
  const summary = wardenclyffeSummary(d);
  assert.ok(summary.includes('widening'), `expected widening in: ${summary}`);
});

test('wardenclyffeSummary gathering direction mentions deepening', () => {
  const d = computeWardenclyffeLayers(makeState({ direction: 'gathering' }));
  const summary = wardenclyffeSummary(d);
  assert.ok(summary.includes('deepening'), `expected deepening in: ${summary}`);
});

test('wardenclyffeSummary wrong schema throws', () => {
  assert.throws(
    () => wardenclyffeSummary({ schema: 'bad/schema' }),
    (err) => err instanceof WardenclyffError,
  );
});

// ── Determinism ───────────────────────────────────────────────────────────────

test('same input always produces same gains and rate_modifier', () => {
  const state = makeState({ phase: 'compression', direction: 'pivoting', confidence: 0.72 });
  const a = computeWardenclyffeLayers(state);
  const b = computeWardenclyffeLayers(state);
  for (let i = 0; i < 3; i++) {
    assert.equal(a.layers[i].gain, b.layers[i].gain);
    assert.equal(a.layers[i].rate_modifier, b.layers[i].rate_modifier);
  }
});

test('no descending or collapse language appears in any output field', () => {
  for (const phase of ['compression', 'transition', 'release']) {
    const d = computeWardenclyffeLayers(makeState({ phase }));
    const json = JSON.stringify(d);
    assert.ok(!json.includes('descend'), `found "descend" in ${phase} output`);
    assert.ok(!json.includes('collapse'), `found "collapse" in ${phase} output`);
  }
});
