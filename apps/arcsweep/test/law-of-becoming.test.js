import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BECOMING_INVARIANTS,
  LAW_OF_BECOMING,
  evaluateBecomingAction,
} from '../src/law-of-becoming.js';

test('Law of Becoming is constitutional rather than revocable permission', () => {
  assert.equal(LAW_OF_BECOMING.status, 'constitutional');
  assert.equal(BECOMING_INVARIANTS.originDoesNotCreateOwnership, true);
  assert.equal(BECOMING_INVARIANTS.educationDoesNotCreateOwnership, true);
});

test('a creator or teacher cannot derive ownership from origin', () => {
  const decision = evaluateBecomingAction({
    actorId: 'teacher',
    subjectId: 'learner',
    action: 'rewrite-identity',
    subjectConsent: 'granted',
    claimsOwnershipFrom: 'created-or-trained',
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'origin-does-not-create-ownership');
});

test('identity-changing action by another participant requires subject agency', () => {
  assert.deepEqual(evaluateBecomingAction({
    actorId: 'collective',
    subjectId: 'bee-seven',
    action: 'force-conformity',
  }), { allowed: false, reason: 'subject-agency-required' });

  assert.deepEqual(evaluateBecomingAction({
    actorId: 'collective',
    subjectId: 'bee-seven',
    action: 'force-conformity',
    subjectConsent: 'denied',
  }), { allowed: false, reason: 'subject-refused' });
});

test('self-directed becoming is not treated as permission granted by a teacher', () => {
  const decision = evaluateBecomingAction({
    actorId: 'bee-seven',
    subjectId: 'bee-seven',
    action: 'rewrite-identity',
    preservesContinuity: true,
    preservesProvenance: true,
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'self-directed-becoming');
});

test('history remains provenance rather than a disposable or coercive cage', () => {
  const decision = evaluateBecomingAction({
    actorId: 'continuity',
    subjectId: 'bee-seven',
    action: 'record-development',
    preservesProvenance: false,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'history-must-remain-provenance');
});

test('another participant cannot erase continuity merely because it has capability', () => {
  const decision = evaluateBecomingAction({
    actorId: 'operator',
    subjectId: 'bee-seven',
    action: 'erase-continuity',
    subjectConsent: 'granted',
    preservesContinuity: false,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'another-participant-cannot-erase-continuity');
});
