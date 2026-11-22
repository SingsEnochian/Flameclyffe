import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ORDINARY_EMERGENCE_SCOPES,
  WONDER_CANON,
  WONDER_INVARIANT,
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
  assert.ok(WONDER_CANON.nativeRegisters.includes('witchy-sense'));
  assert.ok(WONDER_CANON.distinctions.includes('NATIVE LANGUAGE != EXTERNAL CAUSATION CLAIM'));
  assert.ok(WONDER_CANON.distinctions.includes('MECHANISTIC EXPLANATION != EXHAUSTIVE MEANING'));
  assert.deepEqual(WONDER_CANON.sequence, [
    'attend',
    'preserve',
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
