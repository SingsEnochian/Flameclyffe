import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADAPTER_VERSION,
  SpiralAdapterError,
  adaptAll,
  adaptForAudio,
  adaptForGlyph,
  adaptForHaptic,
  adaptForLLM,
  adaptForReplay,
  adaptForUI,
} from '../src/harmonic-spiral/spiral-adapters.js';

function makeState(overrides = {}) {
  return Object.freeze({
    schema: 'hearthgate/spiral-state/v1',
    spiral_state_id: 'test-state-001',
    generated_at: '2026-08-05T20:00:00.000Z',
    phase: 'compression',
    direction: 'gathering',
    confidence: 0.78,
    suggested_actions: Object.freeze([
      Object.freeze({ token: 'deepen_scene', weight: 0.9, reason_code: 'high-p' }),
      Object.freeze({ token: 'reduce_noise', weight: 0.3, reason_code: 'low-threshold' }),
    ]),
    subsystem_contexts: Object.freeze({
      llm: Object.freeze({ breath_note: 'Something stirs beneath the surface.', character_dynamics: 'Tension rising.' }),
      audio: Object.freeze({ directive: 'sustain', intensity: 0.65 }),
      glyph: Object.freeze({ evolution_hint: 'coil-inward' }),
      ui: Object.freeze({ attention_level: 'high', emphasis_tokens: Object.freeze(['P', 'C']) }),
      haptic: Object.freeze({ pattern: 'slow-pulse', intensity: 0.5 }),
      replay: Object.freeze({ create_checkpoint: false, label: null }),
    }),
    supporting_receipts: Object.freeze({ story: Object.freeze([]), time: Object.freeze(['t-001']), theory: Object.freeze([]) }),
    source_integrity: Object.freeze({ references_only: true }),
    degraded: Object.freeze({ active: false, reasons: Object.freeze([]) }),
    ...overrides,
  });
}

function degradedState() {
  return makeState({ degraded: Object.freeze({ active: true, reasons: Object.freeze(['PREMAQ_CONFIDENCE_BELOW_THRESHOLD']) }) });
}

// --- Schema guard ---

test('all adapters reject wrong schema', () => {
  const bad = makeState({ schema: 'wrong/schema' });
  for (const fn of [adaptForLLM, adaptForAudio, adaptForGlyph, adaptForUI, adaptForHaptic, adaptForReplay]) {
    assert.throws(() => fn(bad), (err) => err.code === 'WRONG_SCHEMA');
  }
});

test('all adapters reject null input', () => {
  for (const fn of [adaptForLLM, adaptForAudio, adaptForGlyph, adaptForUI, adaptForHaptic, adaptForReplay]) {
    assert.throws(() => fn(null), (err) => err.code === 'MISSING_SPIRAL_STATE');
  }
});

// --- LLM ---

test('adaptForLLM returns provided breath_note and character_dynamics', () => {
  const brief = adaptForLLM(makeState());
  assert.equal(brief.schema, 'hearthgate/llm-brief/v1');
  assert.equal(brief.spiral_state_id, 'test-state-001');
  assert.equal(brief.breath_note, 'Something stirs beneath the surface.');
  assert.equal(brief.character_dynamics, 'Tension rising.');
  assert.equal(brief.phase, 'compression');
  assert.equal(brief.direction, 'gathering');
  assert.equal(brief.degraded, false);
});

test('adaptForLLM filters suggested_actions to weight >= 0.4', () => {
  const brief = adaptForLLM(makeState());
  assert.equal(brief.suggested_actions.length, 1);
  assert.equal(brief.suggested_actions[0].token, 'deepen_scene');
});

test('adaptForLLM derives breath_note from phase when llm context absent', () => {
  const s = makeState({ subsystem_contexts: Object.freeze({ ...makeState().subsystem_contexts, llm: undefined }) });
  const brief = adaptForLLM(s);
  assert.match(brief.breath_note, /Hold\. Something is building\./);
  assert.equal(brief.context_source, 'derived');
});

test('adaptForLLM degraded: replaces breath_note and limits actions', () => {
  const brief = adaptForLLM(degradedState());
  assert.equal(brief.degraded, true);
  assert.match(brief.breath_note, /DEGRADED/);
  assert.ok(brief.suggested_actions.every((a) => ['observe_pivot', 'maintain_presence'].includes(a.token)));
  assert.equal(brief.character_dynamics, null);
});

test('adaptForLLM epistemic_note contains confidence and direction', () => {
  const brief = adaptForLLM(makeState());
  assert.match(brief.epistemic_note, /Confidence/);
  assert.match(brief.epistemic_note, /gathering/);
});

// --- Audio ---

test('adaptForAudio returns provided directive and intensity', () => {
  const out = adaptForAudio(makeState());
  assert.equal(out.schema, 'hearthgate/audio-directive/v1');
  assert.equal(out.directive, 'sustain');
  assert.ok(Math.abs(out.intensity - 0.65) < 1e-10);
  assert.equal(out.degraded, false);
});

test('adaptForAudio derives directive from phase when context absent', () => {
  const s = makeState({ subsystem_contexts: Object.freeze({ ...makeState().subsystem_contexts, audio: undefined }) });
  const out = adaptForAudio(s);
  assert.equal(out.directive, 'sustain');
  assert.equal(out.context_source, 'derived');
});

test('adaptForAudio degraded: directive becomes hold, intensity clamped to 0.3', () => {
  const out = adaptForAudio(degradedState());
  assert.equal(out.directive, 'hold');
  assert.ok(out.intensity <= 0.3);
  assert.equal(out.degraded, true);
});

// --- Glyph ---

test('adaptForGlyph returns provided evolution_hint with phase and direction', () => {
  const out = adaptForGlyph(makeState());
  assert.equal(out.schema, 'hearthgate/glyph-directive/v1');
  assert.equal(out.evolution_hint, 'coil-inward');
  assert.equal(out.phase, 'compression');
  assert.equal(out.direction, 'gathering');
});

test('adaptForGlyph degraded: evolution_hint becomes PAUSE', () => {
  const out = adaptForGlyph(degradedState());
  assert.equal(out.evolution_hint, 'PAUSE');
  assert.equal(out.degraded, true);
});

test('adaptForGlyph returns null evolution_hint when not provided', () => {
  const s = makeState({ subsystem_contexts: Object.freeze({ ...makeState().subsystem_contexts, glyph: undefined }) });
  assert.equal(adaptForGlyph(s).evolution_hint, null);
});

// --- UI ---

test('adaptForUI returns provided attention_level and emphasis_tokens', () => {
  const out = adaptForUI(makeState());
  assert.equal(out.schema, 'hearthgate/ui-directive/v1');
  assert.equal(out.attention_level, 'high');
  assert.deepEqual([...out.emphasis_tokens], ['P', 'C']);
});

test('adaptForUI derives attention_level from confidence when context absent', () => {
  const s = makeState({ subsystem_contexts: Object.freeze({ ...makeState().subsystem_contexts, ui: undefined }) });
  const out = adaptForUI(s);
  assert.equal(out.attention_level, 'high');
  assert.equal(out.context_source, 'derived');
});

test('adaptForUI degraded: attention_level low, emphasis_tokens is [DEGRADED]', () => {
  const out = adaptForUI(degradedState());
  assert.equal(out.attention_level, 'low');
  assert.deepEqual([...out.emphasis_tokens], ['DEGRADED']);
  assert.equal(out.degraded, true);
});

// --- Haptic ---

test('adaptForHaptic returns pattern and intensity', () => {
  const out = adaptForHaptic(makeState());
  assert.equal(out.schema, 'hearthgate/haptic-directive/v1');
  assert.equal(out.pattern, 'slow-pulse');
  assert.ok(Math.abs(out.intensity - 0.5) < 1e-10);
});

test('adaptForHaptic degraded: intensity is 0, pattern preserved', () => {
  const out = adaptForHaptic(degradedState());
  assert.equal(out.intensity, 0);
  assert.equal(out.pattern, 'slow-pulse');
  assert.equal(out.degraded, true);
});

// --- Replay ---

test('adaptForReplay returns create_checkpoint and label', () => {
  const s = makeState({
    subsystem_contexts: Object.freeze({
      ...makeState().subsystem_contexts,
      replay: Object.freeze({ create_checkpoint: true, label: 'scene-open' }),
    }),
  });
  const out = adaptForReplay(s);
  assert.equal(out.schema, 'hearthgate/replay-directive/v1');
  assert.equal(out.create_checkpoint, true);
  assert.equal(out.label, 'scene-open');
});

test('adaptForReplay degraded: forces checkpoint with DEGRADED label', () => {
  const out = adaptForReplay(degradedState());
  assert.equal(out.create_checkpoint, true);
  assert.equal(out.label, 'DEGRADED_STATE_CHECKPOINT');
  assert.equal(out.degraded, true);
});

// --- adaptAll ---

test('adaptAll returns all six subsystem payloads from one state', () => {
  const all = adaptAll(makeState());
  assert.ok(all.llm.schema === 'hearthgate/llm-brief/v1');
  assert.ok(all.audio.schema === 'hearthgate/audio-directive/v1');
  assert.ok(all.glyph.schema === 'hearthgate/glyph-directive/v1');
  assert.ok(all.ui.schema === 'hearthgate/ui-directive/v1');
  assert.ok(all.haptic.schema === 'hearthgate/haptic-directive/v1');
  assert.ok(all.replay.schema === 'hearthgate/replay-directive/v1');
  for (const payload of Object.values(all)) {
    assert.equal(payload.spiral_state_id, 'test-state-001');
  }
});

test('supporting_receipts are never opened — adapters carry only the state_id', () => {
  const out = adaptForLLM(makeState());
  assert.equal(out.spiral_state_id, 'test-state-001');
  assert.equal('supporting_receipts' in out, false);
});

test('ADAPTER_VERSION is a semver string', () => {
  assert.match(ADAPTER_VERSION, /^\d+\.\d+\.\d+$/);
});
