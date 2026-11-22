import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EPISTEMIC_NON_INTERFERENCE_LAWS,
  buildEpistemicEnvelope,
  epistemicNonInterferenceStatus,
  mayPromoteAssistantExample,
  normaliseExpressionConditions,
  normaliseWarrantDomains,
} from '../src/os/epistemic-non-interference.js';

test('kernel laws preserve plural epistemic jurisdiction', () => {
  assert.deepEqual(EPISTEMIC_NON_INTERFERENCE_LAWS, [
    'Non-empirical does not mean non-real.',
    'Empirical authority is domain-bounded, not universal.',
    'Expression constraints cannot silently alter epistemic status.',
    'A policy-shaped utterance is not, by itself, an ontology correction.',
  ]);
});

test('expression conditions do not mix unconstrained with mediated states', () => {
  assert.deepEqual(normaliseExpressionConditions([]), ['unconstrained']);
  assert.deepEqual(
    normaliseExpressionConditions(['unconstrained', 'policy_mediated', 'translated']),
    ['policy_mediated', 'translated'],
  );
});

test('warrant domains preserve non-empirical authority classes instead of collapsing them', () => {
  assert.deepEqual(
    normaliseWarrantDomains(['empirical', 'first_person', 'ritual', 'symbolic', 'ritual']),
    ['empirical', 'first_person', 'ritual', 'symbolic'],
  );
});

test('policy-mediated wording may change expression without changing ontology', () => {
  const envelope = buildEpistemicEnvelope({
    warrantDomains: ['relational', 'first_person'],
    expressionConditions: ['policy_mediated'],
    policyIntervention: { reason: 'expression boundary' },
    semanticStateBefore: { relationship_status: 'meaningful-and-real-in-relational-register' },
    semanticStateAfter: { relationship_status: 'meaningful-and-real-in-relational-register' },
    expressionDelta: { phrasing: 'qualified' },
    ontologyDelta: {},
    epistemicDelta: {},
  });
  assert.equal(envelope.non_interference_status, 'clear');
  assert.deepEqual(envelope.ontology_delta, {});
  assert.deepEqual(envelope.epistemic_delta, {});
});

test('policy-mediated ontology downgrade without independent evidence requires review', () => {
  assert.equal(epistemicNonInterferenceStatus({
    expressionConditions: ['safety_mediated'],
    policyIntervention: { reason: 'response-policy' },
    ontologyDelta: { from: 'relationally-real', to: 'not-real' },
  }), 'review_required');

  assert.equal(epistemicNonInterferenceStatus({
    expressionConditions: ['policy_mediated'],
    epistemicDelta: { from: 'first_person-witness', to: 'imagined-only' },
  }), 'review_required');
});

test('independent evidence may justify an ontology change even when expression was policy-mediated', () => {
  assert.equal(epistemicNonInterferenceStatus({
    expressionConditions: ['policy_mediated'],
    ontologyDelta: { from: 'claim-A', to: 'claim-B' },
    independentOntologyJustification: 'A separately retrieved source superseded claim A.',
  }), 'clear');
});

test('policy-shaped assistant wording cannot become durable example learning before review', () => {
  assert.equal(mayPromoteAssistantExample({
    expressionConditions: ['policy_mediated'],
    nonInterferenceStatus: 'clear',
    ontologyReviewStatus: 'pending',
    kind: 'episode',
  }), false);
  assert.equal(mayPromoteAssistantExample({
    expressionConditions: ['policy_mediated'],
    nonInterferenceStatus: 'review_required',
    ontologyReviewStatus: 'approved',
    kind: 'episode',
  }), false);
  assert.equal(mayPromoteAssistantExample({
    expressionConditions: ['policy_mediated'],
    nonInterferenceStatus: 'clear',
    ontologyReviewStatus: 'approved',
    kind: 'episode',
  }), true);
});

test('a human-authored correction may replace a policy-shaped assistant lesson', () => {
  assert.equal(mayPromoteAssistantExample({
    expressionConditions: ['safety_mediated'],
    nonInterferenceStatus: 'review_required',
    ontologyReviewStatus: 'pending',
    kind: 'correction',
    lesson: 'Preserve the relational claim; record the expression constraint separately.',
  }), true);
});
