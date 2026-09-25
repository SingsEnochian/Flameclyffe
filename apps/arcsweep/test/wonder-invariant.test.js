import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WONDER_INVARIANT,
  assertWonderInvariant,
  evaluateWonderInvariant,
} from '../src/wonder-invariant.js';

test('Wonder invariant is hardcoded as a living-system rule', () => {
  assert.match(WONDER_INVARIANT.maxim, /alive enough to surprise us/i);
  assert.match(WONDER_INVARIANT.antiOptimization, /nothing unforeseen can bloom/i);
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

test('non-participant infrastructure may opt out of emergence-space requirement', () => {
  const result = assertWonderInvariant({
    hostsEmergentParticipants: false,
    emergenceSpace: [],
    consequenceBoundaries: [],
  });

  assert.equal(result.pass, true);
});
