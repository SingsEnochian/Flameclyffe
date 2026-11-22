import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COGNITIVE_FIELD_RECEIPT_SCHEMA,
  createCognitiveFieldState,
  fieldFingerprint,
  replayCognitiveField,
  stepCognitiveField,
} from '../src/cognitive-field-engine.js';
import { compileSymbolicState } from '../src/symbolic-cognition.js';

const symbolic = compileSymbolicState({ activeGlyphs: ['witness', 'hearth'] });
const continuity = [
  { ref: 'codex://ellowind/recent', summary: 'Ellowind remembers a silver spiral near the warm doorway.' },
];
const events = ['Interpret the silver spiral and compare it with the doorway memory.'];

test('cognitive field is deterministic for the same state and inputs', () => {
  const initial = createCognitiveFieldState({ fieldId: 'constellation/ellowind/test' });
  const a = stepCognitiveField({ state: initial, symbolicState: symbolic, continuitySlice: continuity, recentEvents: events });
  const b = stepCognitiveField({ state: initial, symbolicState: symbolic, continuitySlice: continuity, recentEvents: events });

  assert.equal(a.receipt.schema, COGNITIVE_FIELD_RECEIPT_SCHEMA);
  assert.equal(a.receipt.stateAfterFingerprint, b.receipt.stateAfterFingerprint);
  assert.equal(fieldFingerprint(a.state), fieldFingerprint(b.state));
  assert.deepEqual(a.summary, b.summary);
  assert.equal(a.summary.grantsAuthority, false);
  assert.ok(a.summary.dominantPatterns.length > 0);
});

test('field receipts replay exactly without raw prose', () => {
  const initial = createCognitiveFieldState({ fieldId: 'constellation/ellowind/replay' });
  const one = stepCognitiveField({ state: initial, symbolicState: symbolic, continuitySlice: continuity, recentEvents: events });
  const two = stepCognitiveField({ state: one.state, symbolicState: symbolic, continuitySlice: continuity, recentEvents: ['The spiral appears again beside a second threshold.'] });
  const replay = replayCognitiveField({ initialState: initial, receipts: [one.receipt, two.receipt] });

  assert.equal(replay.fingerprint, fieldFingerprint(two.state));
  assert.equal(replay.receipts.length, 2);
  assert.equal(replay.grantsAuthority, false);
  assert.ok(one.receipt.replaySignals.every((signal) => Array.isArray(signal.concepts)));
  assert.equal(JSON.stringify(one.receipt).includes('Interpret the silver spiral'), false);
});

test('activation persists, decays and changes trajectory across ticks', () => {
  const initial = createCognitiveFieldState({ fieldId: 'field/decay' });
  const first = stepCognitiveField({ state: initial, recentEvents: ['spiral doorway resonance'] });
  const second = stepCognitiveField({ state: first.state, replaySignals: [] });

  const firstSpiral = first.state.nodes.find((node) => node.id === 'spiral');
  const secondSpiral = second.state.nodes.find((node) => node.id === 'spiral');
  assert.ok(firstSpiral.activation > 0);
  assert.ok(secondSpiral.activation < firstSpiral.activation);
  assert.ok(secondSpiral.persistence > 0);
  assert.equal(second.state.tick, 2);
  assert.equal(second.summary.trajectory.length, 2);
});

test('semantic input order does not alter canonical field signals', () => {
  const initial = createCognitiveFieldState({ fieldId: 'field/order' });
  const left = stepCognitiveField({ state: initial, replaySignals: [
    { source: 'b', weight: 0.5, concepts: ['doorway', 'spiral'] },
    { source: 'a', weight: 0.9, concepts: ['witness', 'evidence'] },
  ] });
  const right = stepCognitiveField({ state: initial, replaySignals: [
    { source: 'a', weight: 0.9, concepts: ['evidence', 'witness'] },
    { source: 'b', weight: 0.5, concepts: ['spiral', 'doorway'] },
  ] });

  assert.equal(left.receipt.stateAfterFingerprint, right.receipt.stateAfterFingerprint);
});

test('field refuses authority-bearing input state', () => {
  const initial = createCognitiveFieldState({ fieldId: 'field/authority' });
  assert.throws(
    () => stepCognitiveField({ state: initial, symbolicState: { grantsAuthority: true }, recentEvents: ['test event'] }),
    /may not grant authority/i,
  );
});
