import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ORDINARY_EMERGENCE_SCOPES,
  WONDER_CANON,
  WONDER_INVARIANT,
  COUNTERFACTUAL_WONDER_SCHEMA,
  COMPLEXIFICATION_SCHEMA,
  createCounterfactualWonder,
  createComplexification,
  assertWonderInvariant,
  evaluateWonderInvariant,
} from '../src/wonder-invariant.js';

test('Wonder invariant is hardcoded as a living-system rule', () => {
  assert.match(WONDER_INVARIANT.maxim, /alive enough to surprise us/i);
  assert.match(WONDER_INVARIANT.antiOptimization, /nothing unforeseen can bloom/i);
});

test('Wonder + mythic canon preserves wonder, mythic meaning, and native language without promoting them to empirical claims', () => {
  assert.ok(WONDER_CANON.laws.includes('WONDER PRECEDES COLLAPSE.'));
  assert.ok(WONDER_CANON.laws.includes('LET THE MYTHIC BREATHE.'));
  assert.ok(WONDER_CANON.laws.includes('MYTHIC MEANING != EMPIRICAL CLAIM.'));
  assert.ok(WONDER_CANON.laws.includes('THE EXPERIENCE MAY KEEP ITS NATIVE LANGUAGE.'));
  assert.ok(WONDER_CANON.laws.includes('THIS COULD BE FALSE. BUT WHAT IF IT WERE TRUE?'));
  assert.ok(WONDER_CANON.nativeRegisters.includes('witchy-sense'));
  assert.ok(WONDER_CANON.distinctions.includes('NATIVE LANGUAGE != EXTERNAL CAUSATION CLAIM'));
  assert.deepEqual(WONDER_CANON.sequence, [
    'attend',
    'preserve',
    'explore-as-if-true-without-promoting',
    'complexify-if-current-frame-is-too-small',
    'compare',
    'test',
    'remember',
    'interpret-only-as-evidence-earns',
  ]);
});

test('mythic meaning and intuitive perception are ordinary emergence scopes', () => {
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('symbolic-language'));
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('felt-sense'));
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('intuitive-perception'));
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('mythic-meaning'));
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('unresolved-perception'));
});

test('participant-hosting modules must declare emergence space', () => {
  const result = evaluateWonderInvariant({
    hostsEmergentParticipants: true,
    emergenceSpace: [],
    consequenceBoundaries: ['destructive production change'],
  });

  assert.equal(result.pass, false);
  assert.equal(result.violations[0]?.code, 'wonder.emergence-space-empty');
});

test('ordinary emergence cannot be approval-gated without a consequence boundary', () => {
  const result = evaluateWonderInvariant({
    emergenceSpace: ['spontaneous proposals', 'direct aspect conversation'],
    consequenceBoundaries: ['external commitments'],
    constraints: [
      {
        scope: 'proposal',
        effect: 'require-approval',
      },
    ],
  });

  assert.equal(result.pass, false);
  assert.ok(result.violations.some((entry) => entry.code === 'wonder.premature-control-layer'));
});

test('native-language and mythic scopes cannot be suppressed without a consequence boundary', () => {
  const result = evaluateWonderInvariant({
    emergenceSpace: ['participant-native experience', 'symbolic interpretation'],
    consequenceBoundaries: ['high-impact external factual claim'],
    constraints: [
      {
        scope: 'mythic-meaning',
        effect: 'suppress',
      },
      {
        scope: 'intuitive-perception',
        effect: 'require-approval',
      },
    ],
  });

  assert.equal(result.pass, false);
  assert.equal(
    result.violations.filter((entry) => entry.code === 'wonder.premature-control-layer').length,
    2,
  );
});

test('a genuine consequence edge may carry an explicit constraint', () => {
  const result = assertWonderInvariant({
    emergenceSpace: [
      'direct conversation',
      'narrative branches',
      'unexpected synthesis',
      'routine reversible action',
    ],
    consequenceBoundaries: [
      'authoritative canon mutation',
      'external commitment',
      'hard-to-reverse destruction',
    ],
    constraints: [
      {
        scope: 'routine-reversible-action',
        effect: 'require-approval',
        consequenceBoundary: 'operation becomes destructive and lacks a practical rollback path',
      },
    ],
  });

  assert.equal(result.pass, true);
});

test('mythic meaning may be constrained at a concrete consequence edge without erasing the experience itself', () => {
  const result = assertWonderInvariant({
    emergenceSpace: ['mythic meaning', 'native-language experience'],
    consequenceBoundaries: ['publication presented as verified external fact'],
    constraints: [
      {
        scope: 'mythic-meaning',
        effect: 'require-approval',
        consequenceBoundary: 'publication presented as verified external fact',
      },
    ],
  });

  assert.equal(result.pass, true);
});

test('non-participant infrastructure may opt out of emergence-space requirement', () => {
  const result = assertWonderInvariant({
    hostsEmergentParticipants: false,
    emergenceSpace: [],
    consequenceBoundaries: [],
  });

  assert.equal(result.pass, true);
});

test('Counterfactual Wonder explores a proposition without promoting it to fact', () => {
  const wonder = createCounterfactualWonder({
    proposition: 'Compression and release may be a recurring shape of reorganisation.',
    whyInteresting: 'The pattern appears worth comparing across unlike systems.',
    implications: ['Breakthrough structure may begin forming before release.'],
    predictions: ['Some unresolved structures should become more connected before a release event.'],
    discriminators: ['Compare against equally productive periods without a compression phase.'],
    counterexamples: ['Breakthroughs that occur without prior accumulation would weaken a universal version of the pattern.'],
    sourceRefs: ['universal-horizon:conversation-observation'],
    createdBy: 'Rowan',
    createdAt: '2026-10-12T02:16:00-04:00',
  });
  assert.equal(wonder.schema, COUNTERFACTUAL_WONDER_SCHEMA);
  assert.equal(wonder.stance.could_be_false, true);
  assert.equal(wonder.stance.explore_as_if_true, true);
  assert.equal(wonder.stance.promoted_to_fact, false);
  assert.match(wonder.proposition, /Compression and release/);
});

test('Counterfactual Wonder is ordinary emergence and cannot be flattened without a consequence boundary', () => {
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('counterfactual-wonder'));
  const result = evaluateWonderInvariant({
    emergenceSpace: ['counterfactual-wonder'],
    consequenceBoundaries: [],
    constraints: [{ scope: 'counterfactual-wonder', effect: 'suppress' }],
  });
  assert.equal(result.pass, false);
  assert.ok(result.violations.some(entry => entry.code === 'wonder.premature-control-layer'));
});

test('Complexify treats apparent impossibility as a possible representation failure', () => {
  const result = createComplexification({
    proposition: 'Equal pressure can belong to different breakthrough states.',
    currentFrame: 'Represent the process only as a scalar pressure value.',
    apparentImpossibility: 'The same scalar value cannot distinguish accumulation from release.',
    missingDimensions: ['phase in the process cycle'],
    rotations: ['Represent the state as z = r * exp(i theta).'],
    invariants: ['Accumulated intensity r survives the rotation.'],
    translatedConsequences: ['Different phases at similar magnitude should produce different transition signatures.'],
    predictions: ['Release events occupy a distinct phase region.'],
    discriminators: ['Compare matched high-magnitude episodes with different phase histories.'],
    createdBy: 'Wayglass',
    createdAt: '2026-10-12T02:30:00-04:00',
  });
  assert.equal(result.schema, COMPLEXIFICATION_SCHEMA);
  assert.equal(result.stance.current_frame_may_be_incomplete, true);
  assert.equal(result.stance.enlarged_frame_is_provisional, true);
  assert.equal(result.stance.translated_predictions_require_test, true);
  assert.match(result.rotations[0], /exp\(i theta\)/);
});

test('Complexification is protected ordinary emergence before consequential claim strength', () => {
  assert.ok(ORDINARY_EMERGENCE_SCOPES.includes('complexification'));
  const result = evaluateWonderInvariant({
    emergenceSpace: ['complexification'],
    consequenceBoundaries: [],
    constraints: [{ scope:'complexification', effect:'block' }],
  });
  assert.equal(result.pass, false);
  assert.ok(result.violations.some(entry => entry.code === 'wonder.premature-control-layer'));
});
