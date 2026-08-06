import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SPIRAL_STATE_SCHEMA,
  SpiralEngineError,
  computeSpiralState,
  installSpiralState,
} from '../src/harmonic-spiral/spiral-engine.js';

function makePremaq(overrides = {}) {
  return {
    schema_version: '2.0.0',
    id: 'premaq-test-001',
    observed_at: '2026-08-05T19:00:00Z',
    registry_version: '1.0',
    receipt_id: 'receipt-001',
    sequence: 0,
    model_version: '1.0',
    state: {
      P: { value: 0.82, derivative: 0.01, uncertainty: null, confidence: 0.91, contributors: [] },
      C: { value: 0.79, derivative: 0.02, uncertainty: null, confidence: 0.88, contributors: [] },
      R: { value: 0.74, derivative: -0.01, uncertainty: null, confidence: 0.85, contributors: [] },
      E: { value: 0.31, derivative: 0.03, uncertainty: null, confidence: 0.90, contributors: [] },
      M: { value: 0.68, derivative: 0.01, uncertainty: null, confidence: 0.87, contributors: [] },
      A: { value: 0.77, derivative: 0.00, uncertainty: null, confidence: 0.86, contributors: [] },
      Q: { value: 0.79, derivative: 0.02, uncertainty: null, confidence: 0.84, contributors: [] },
    },
    ...overrides,
  };
}

function makeDeepRefs(overrides = {}) {
  return {
    story: ['deepstory:event-001'],
    time: ['deeptime:seq-001'],
    theory: [],
    ...overrides,
  };
}

test('returns a valid hearthgate/spiral-state/v1 packet', () => {
  const state = computeSpiralState({ premaq: makePremaq(), deepRefs: makeDeepRefs() });
  assert.equal(state.schema, SPIRAL_STATE_SCHEMA);
  assert.ok(state.spiral_state_id.startsWith('spiral-'));
  assert.ok(typeof state.generated_at === 'string');
  assert.ok(['compression', 'release', 'transition'].includes(state.phase));
  assert.ok(['ascending', 'gathering', 'stable', 'pivoting'].includes(state.direction));
  assert.ok(typeof state.confidence === 'number' && state.confidence >= 0 && state.confidence <= 1);
  assert.ok(Array.isArray(state.suggested_actions));
  assert.ok(state.suggested_actions.length >= 1);
  assert.ok(state.subsystem_contexts);
  assert.ok(state.supporting_receipts);
  assert.equal(state.source_integrity.references_only, true);
  assert.ok('active' in state.degraded);
});

test('phase is compression, release, or transition — never collapse language', () => {
  const state = computeSpiralState({ premaq: makePremaq() });
  const valid = ['compression', 'release', 'transition'];
  assert.ok(valid.includes(state.phase), `Unexpected phase: ${state.phase}`);
  assert.ok(!state.phase.includes('collapse'));
});

test('direction is ascending, gathering, stable, or pivoting — never descending', () => {
  const state = computeSpiralState({ premaq: makePremaq() });
  const valid = ['ascending', 'gathering', 'stable', 'pivoting'];
  assert.ok(valid.includes(state.direction), `Unexpected direction: ${state.direction}`);
  assert.notEqual(state.direction, 'descending');
});

test('identical inputs produce identical spiral_state_id', () => {
  const p = makePremaq();
  const r = makeDeepRefs();
  const a = computeSpiralState({ premaq: p, deepRefs: r });
  const b = computeSpiralState({ premaq: p, deepRefs: r });
  assert.equal(a.spiral_state_id, b.spiral_state_id);
});

test('missing PREMAQ throws SpiralEngineError', () => {
  assert.throws(
    () => computeSpiralState({}),
    (err) => err instanceof SpiralEngineError && err.code === 'missing-premaq'
  );
  assert.throws(
    () => computeSpiralState({ premaq: null }),
    (err) => err instanceof SpiralEngineError
  );
});

test('missing PREMAQ axes throws SpiralEngineError', () => {
  const partial = makePremaq();
  delete partial.state.Q;
  assert.throws(
    () => computeSpiralState({ premaq: partial }),
    (err) => err instanceof SpiralEngineError &&
      err.code === 'incomplete-premaq' &&
      err.message.includes('Q')
  );
});

test('deepRefs containing non-string entries fail closed', () => {
  assert.throws(
    () => computeSpiralState({
      premaq: makePremaq(),
      deepRefs: { story: [{ raw: 'record' }] },
    }),
    (err) => err instanceof SpiralEngineError && err.code === 'raw-deep-data-rejected'
  );
});

test('deepRefs containing raw objects as values fail closed', () => {
  assert.throws(
    () => computeSpiralState({
      premaq: makePremaq(),
      deepRefs: { time: [42] },
    }),
    (err) => err instanceof SpiralEngineError && err.code === 'raw-deep-data-rejected'
  );
});

test('supporting_receipts contains only receipt ID strings', () => {
  const refs = makeDeepRefs({ story: ['deepstory:abc', 'deepstory:def'], theory: ['deeptheory:001'] });
  const state = computeSpiralState({ premaq: makePremaq(), deepRefs: refs });
  for (const id of state.supporting_receipts.story) {
    assert.equal(typeof id, 'string');
  }
  for (const id of state.supporting_receipts.theory) {
    assert.equal(typeof id, 'string');
  }
});

test('source_integrity.references_only is always true', () => {
  const state = computeSpiralState({ premaq: makePremaq() });
  assert.equal(state.source_integrity.references_only, true);
});

test('subsystem_contexts includes llm, audio, glyph, and ui', () => {
  const state = computeSpiralState({ premaq: makePremaq() });
  const ctx = state.subsystem_contexts;
  assert.ok('llm' in ctx, 'missing llm context');
  assert.ok('audio' in ctx, 'missing audio context');
  assert.ok('glyph' in ctx, 'missing glyph context');
  assert.ok('ui' in ctx, 'missing ui context');
  assert.ok(typeof ctx.llm.breath_note === 'string');
  assert.ok(typeof ctx.audio.directive === 'string');
  assert.ok(typeof ctx.glyph.evolution_hint === 'string');
  assert.ok(typeof ctx.ui.attention_level === 'number');
});

test('UNKNOWN Q axis generates allow_experiential_space suggestion', () => {
  const p = makePremaq();
  p.state.Q = { value: null, derivative: null, uncertainty: null, confidence: null, contributors: [] };
  const state = computeSpiralState({ premaq: p });
  assert.ok(
    state.suggested_actions.some((a) => a.token === 'allow_experiential_space'),
    'Expected allow_experiential_space action for null Q'
  );
});

test('every suggested action carries token, weight, and reason_code', () => {
  const state = computeSpiralState({ premaq: makePremaq() });
  for (const action of state.suggested_actions) {
    assert.ok(typeof action.token === 'string' && action.token.length > 0, 'token required');
    assert.ok(typeof action.weight === 'number' && action.weight >= 0 && action.weight <= 1, 'weight in [0,1]');
    assert.ok(typeof action.reason_code === 'string' && action.reason_code.length > 0, 'reason_code required');
  }
});

test('installSpiralState places the spiral state at packet.harmonic_state', () => {
  const spiralState = computeSpiralState({ premaq: makePremaq() });
  const packet = { schema: 'hearthweave.dual-aspect-packet/v1', packet_id: 'test-001' };
  const result = installSpiralState(packet, spiralState);
  assert.equal(result.harmonic_state, spiralState);
  assert.equal(result.packet_id, 'test-001');
});

test('installSpiralState does not mutate the original packet', () => {
  const spiralState = computeSpiralState({ premaq: makePremaq() });
  const packet = { schema: 'hearthweave.dual-aspect-packet/v1', packet_id: 'test-002' };
  installSpiralState(packet, spiralState);
  assert.ok(!('harmonic_state' in packet), 'Original packet must not be mutated');
});

test('installSpiralState rejects a non-spiral-state object', () => {
  const packet = { schema: 'hearthweave.dual-aspect-packet/v1' };
  assert.throws(
    () => installSpiralState(packet, { schema: 'wrong/schema' }),
    (err) => err instanceof SpiralEngineError && err.code === 'invalid-spiral-state'
  );
});

test('degraded.active is true when confidence falls below threshold', () => {
  const p = makePremaq();
  for (const axis of ['P', 'C', 'R', 'E', 'M', 'A', 'Q']) {
    p.state[axis] = { value: null, derivative: null, uncertainty: null, confidence: null, contributors: [] };
  }
  const state = computeSpiralState({ premaq: p });
  assert.equal(state.degraded.active, true);
  assert.ok(state.degraded.reasons.length > 0);
});

test('missing desiredState is handled gracefully without throwing', () => {
  assert.doesNotThrow(() => computeSpiralState({ premaq: makePremaq(), desiredState: null }));
});

test('missing worldProfile and sharedState are handled gracefully', () => {
  assert.doesNotThrow(() =>
    computeSpiralState({ premaq: makePremaq(), worldProfile: null, sharedState: null })
  );
});
