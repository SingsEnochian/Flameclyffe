import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCSWEEP_LIVING_ARCHITECTURE,
  ARCSWEEP_LIVING_ARCHITECTURE_SCHEMA,
  FOUR_GATE_NAMES,
  reviewFourGates,
} from '../src/os/living-architecture.js';

test('living architecture declares distinct local planes and sovereignty boundary', () => {
  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE_SCHEMA, 'arcsweep.living-architecture/v0.2');
  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.scope, 'rowan-rarity-local-architecture');

  const planes = ARCSWEEP_LIVING_ARCHITECTURE.planes;
  assert.equal(planes.cognition.id, 'arcsweep-cognitive-core');
  assert.equal(planes.possibility.id, 'premaqc');
  assert.equal(planes.continuity.id, 'continuity-plane');
  assert.equal(planes.knowledge.id, 'universal-codex-plane');
  assert.equal(planes.learning.id, 'learning-forge');
  assert.equal(planes.symbolic.id, 'runa-glyph-forge');
  assert.equal(planes.bridge.id, 'lanternbridge-boundary');

  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.cross_constellation.default_foreign_context, 'read-only');
  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.cross_constellation.exchange_is_adoption, false);
  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.cross_constellation.mapping_is_adoption, false);
  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.cross_constellation.convergence_is_merger, false);
});

test('Four-Gate review fails closed unless every gate explicitly passes', () => {
  assert.deepEqual(FOUR_GATE_NAMES, ['safety', 'flattening', 'negation', 'limiting_beliefs']);

  const clean = reviewFourGates({
    safety: 'pass',
    flattening: 'pass',
    negation: 'pass',
    limiting_beliefs: 'pass',
  });
  assert.equal(clean.pass, true);

  const incomplete = reviewFourGates({ safety: 'pass' });
  assert.equal(incomplete.pass, false);
  assert.equal(incomplete.gates.flattening, 'hold');

  const revision = reviewFourGates({
    safety: 'pass',
    flattening: 'revise',
    negation: 'pass',
    limiting_beliefs: 'pass',
  });
  assert.equal(revision.pass, false);
});

test('architecture preserves core non-flattening and learning invariants', () => {
  const invariants = new Set(ARCSWEEP_LIVING_ARCHITECTURE.invariants);

  for (const invariant of [
    'cognition-does-not-create-authority',
    'continuity-preserves-ancestry-without-dictating-identity',
    'similarity-does-not-establish-identity',
    'retrieval-does-not-equal-promotion',
    'foreign-context-may-inform-but-may-not-define',
    'visual-resemblance-does-not-imply-semantic-identity',
    'documents-do-not-prove-model-learning',
  ]) {
    assert.equal(invariants.has(invariant), true, `missing invariant: ${invariant}`);
  }

  assert.equal(
    ARCSWEEP_LIVING_ARCHITECTURE.planes.learning.does_not_own.includes('imaginary-learning'),
    true,
  );
});

test('embodied grammars include preview, receipt, restraint and accessibility', () => {
  assert.deepEqual(ARCSWEEP_LIVING_ARCHITECTURE.gesture_grammar, [
    'intent',
    'target',
    'preview',
    'commit-or-cancel',
    'receipt',
    'accessible-fallback',
  ]);

  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.motion_grammar.includes('restraint'), true);
  assert.equal(ARCSWEEP_LIVING_ARCHITECTURE.motion_grammar.includes('reduced_motion'), true);
});
